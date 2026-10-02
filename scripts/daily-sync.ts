/**
 * Cron entrypoint for the daily market sync.
 *
 *   npm run daily-sync
 *
 * Crontab (UTC):
 *   5 0 * * *  cd /path/to/SUT-Value-Forensics && npm run daily-sync >> logs/daily-sync.log 2>&1
 *
 * This is the SERVER-SIDE boundary. The browser cannot run while closed, so
 * unattended execution happens here. It uses the SAME DailyMarketSyncService as
 * the [Run Daily Sync] button — only the storage port, the source list and the
 * trigger differ.
 *
 * Environment variables (never hard-coded, never shipped to the browser):
 *   CMC_API_KEY              optional. Enables the CoinMarketCap source (ticker-addressed).
 *   SUT_DAILY_STORE          optional. Path of the JSON store. Default work/daily-market-store.json
 *   SUT_DAILY_RPC_URL        optional. Overrides the public Polygon RPC endpoint.
 *   SUT_DAILY_REQUEST_GAP_MS optional. Pause between source calls. Default 1500.
 *
 * Values are read from the process environment first, then from .env.local and
 * .env (gitignored). No value is ever logged: the key is reported only as
 * "configured: YES/NO".
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { coinMarketCapSource, SOURCES, type SourceDescriptor } from '../src/core/daily-sync'
import { DailyMarketSyncService, DAILY_CRON_SCHEDULE } from '../src/service/daily-market-sync-service'
import { liveFetcher } from '../src/data/market-sources'
import { DAILY_STORE_KEY } from '../src/core/daily-store'
import { LiveMarketSyncService } from '../src/service/live-market-sync-service'
import { liveMarketFetcher } from '../src/data/market-sources'

/**
 * Minimal .env reader — no dependency, no logging of values. The process
 * environment always wins, so a real deployment can set the variable directly.
 */
function loadEnvFile(path: string): number {
  if (!existsSync(path)) return 0
  let loaded = 0
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    if (key.startsWith('VITE_')) {
      console.warn(`[daily-sync] ignoring ${key} from ${path}: VITE_* variables reach the client bundle `
        + 'and must never hold a credential')
      continue
    }
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (value === '' || process.env[key] !== undefined) continue
    process.env[key] = value
    loaded++
  }
  return loaded
}

for (const f of ['.env.local', '.env']) {
  const n = loadEnvFile(resolve(f))
  if (n > 0) console.log(`[daily-sync] loaded ${n} variable(s) from ${f} (values are never printed)`)
}

const STORE_PATH = resolve(process.env.SUT_DAILY_STORE ?? 'work/daily-market-store.json')

/** The same StoragePort contract the browser uses, backed by one JSON file. */
function fileStorage(path: string) {
  const read = (): Record<string, string> => {
    if (!existsSync(path)) return {}
    try { return JSON.parse(readFileSync(path, 'utf8')) as Record<string, string> } catch { return {} }
  }
  const write = (data: Record<string, string>) => {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(data, null, 2), 'utf8')
  }
  return {
    getItem: (k: string) => read()[k] ?? null,
    setItem: (k: string, v: string) => { const d = read(); d[k] = v; write(d) },
    removeItem: (k: string) => { const d = read(); delete d[k]; write(d) },
  }
}

function sourcesForServer(): SourceDescriptor[] {
  const key = process.env.CMC_API_KEY?.trim()
  const rpc = process.env.SUT_DAILY_RPC_URL
  return SOURCES.map((s) => {
    if (s.id === 'coinmarketcap' && key) return coinMarketCapSource(key)
    if (s.id === 'polygon-rpc' && rpc) return { ...s, url: rpc }
    return s
  })
}

async function main() {
  const startedAt = new Date().toISOString()
  console.log(`[daily-sync] schedule "${DAILY_CRON_SCHEDULE}" (00:05 UTC) · started ${startedAt}`)
  console.log(`[daily-sync] store ${STORE_PATH} (storage key ${DAILY_STORE_KEY})`)

  const service = new DailyMarketSyncService({
    storage: fileStorage(STORE_PATH),
    fetcher: liveFetcher,
    sources: sourcesForServer(),
    requestGapMs: Number(process.env.SUT_DAILY_REQUEST_GAP_MS ?? 1500),
  })
  // the key itself is NEVER printed — only whether one is present
  const cmcConfigured = Boolean(process.env.CMC_API_KEY && process.env.CMC_API_KEY.trim())
  console.log(`[daily-sync] CMC API configured: ${cmcConfigured ? 'YES' : 'NO'}`
    + `${cmcConfigured ? '' : ' — set CMC_API_KEY in .env.local (server-side only)'}`)

  const result = await service.run('SCHEDULED')

  for (const s of result.report.sources) {
    console.log(`  ${s.status.padEnd(24)} ${s.sourceName}${s.httpStatus ? ` (HTTP ${s.httpStatus})` : ''}`)
  }
  const unavailable = result.report.observations.filter((o) => o.status === 'DATA_UNAVAILABLE')
  console.log(`[daily-sync] ${result.report.observations.length - unavailable.length} values captured, `
    + `${unavailable.length} DATA UNAVAILABLE (never substituted)`)

  if (result.stored) {
    console.log(`[daily-sync] stored ${result.report.id} · status ${result.status} · `
      + `fingerprint ${result.report.fingerprint}`)
  } else if (result.duplicateOf && result.problems.length === 0) {
    console.log(`[daily-sync] identical to ${result.duplicateOf} — nothing written (idempotent)`)
  } else {
    console.error(`[daily-sync] NOT stored: ${result.problems.join('; ')}`)
    process.exitCode = 1
  }
  console.log(`[daily-sync] reports in store: ${result.ledger.reports.length}`)

  // ── live production market sync — the SAME service the [Run Live Market Sync]
  //    button uses; only the storage port and the trigger differ.
  const storage = fileStorage(STORE_PATH)
  const live = new LiveMarketSyncService({
    storage,
    fetcher: liveMarketFetcher,
    requestGapMs: Number(process.env.SUT_DAILY_REQUEST_GAP_MS ?? 1500),
  })
  const liveOut = await live.run('SCHEDULED')
  console.log(`[live-sync] ${liveOut.run.id} · status ${liveOut.run.status} · trigger ${liveOut.run.trigger}`)
  for (const e of liveOut.run.evidence) {
    console.log(`  ${e.status.padEnd(10)} ${e.source.padEnd(14)} ${e.sourceId.padEnd(18)}`
      + `${e.httpStatus ? `HTTP ${e.httpStatus} ` : ''}${e.payloadBytes} bytes `
      + `${e.payloadHash ? e.payloadHash.slice(0, 23) + '…' : 'no hash'}`)
  }
  const valid = liveOut.run.observations.filter((o) => o.status === 'VALIDATED').length
  console.log(`[live-sync] ${valid} of ${liveOut.run.observations.length} observations carry a value; `
    + `${liveOut.run.observations.length - valid} DATA UNAVAILABLE (never substituted)`)
  console.log(`[live-sync] ${liveOut.stored ? 'stored' : 'NOT stored'} · runs in store: ${liveOut.ledger.runs.length}`)
  if (!liveOut.stored) {
    console.error(`[live-sync] ${liveOut.problems.join('; ')}`)
    process.exitCode = 1
  }

  if (result.status === 'FAILED') process.exitCode = 1
}

main().catch((e) => {
  console.error('[daily-sync] run failed:', e instanceof Error ? e.message : e)
  process.exitCode = 1
})
