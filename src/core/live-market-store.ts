/**
 * Append-only store for live market sync runs.
 *
 * A stored run is evidence: it is immutable. A later retrieval is appended as a
 * NEW run with its own sync id; an earlier run is never rewritten, and a missing
 * date is never backfilled.
 */
import { checkRunIntegrity, dateOf, type LiveSyncRun } from './live-market-sync'
import { MemoryStorage, type StoragePort } from './decision-store'

export { MemoryStorage, type StoragePort }

export const LIVE_STORE_KEY = 'sut-value-forensics:live-market:v1'
export const LIVE_SCHEMA_VERSION = 1

export interface LiveLedger {
  schemaVersion: number
  contract: string
  runs: LiveSyncRun[]
}

export function emptyLiveLedger(contract: string): LiveLedger {
  return { schemaVersion: LIVE_SCHEMA_VERSION, contract, runs: [] }
}

function isLedger(x: unknown): x is LiveLedger {
  if (!x || typeof x !== 'object') return false
  const l = x as Partial<LiveLedger>
  return Array.isArray(l.runs) && typeof l.contract === 'string'
}

export function loadLiveLedger(storage: StoragePort, contract: string): LiveLedger {
  let raw: string | null = null
  try { raw = storage.getItem(LIVE_STORE_KEY) } catch { return emptyLiveLedger(contract) }
  if (!raw) return emptyLiveLedger(contract)
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return emptyLiveLedger(contract) }
  if (!isLedger(parsed)) return emptyLiveLedger(contract)
  if (parsed.schemaVersion !== LIVE_SCHEMA_VERSION) return emptyLiveLedger(contract)
  if (parsed.contract.toLowerCase() !== contract.toLowerCase()) return emptyLiveLedger(contract)
  return { schemaVersion: LIVE_SCHEMA_VERSION, contract, runs: parsed.runs }
}

export function saveLiveLedger(storage: StoragePort, ledger: LiveLedger): void {
  try { storage.setItem(LIVE_STORE_KEY, JSON.stringify(ledger)) } catch { /* quota / blocked: non-fatal */ }
}

/** The sequence a new run gets for a given day — 1-based, never reused. */
export function nextSequence(ledger: LiveLedger, nowIso: string): number {
  const date = dateOf(nowIso)
  return ledger.runs.filter((r) => r.date === date).length + 1
}

export interface AppendRunOutcome {
  ledger: LiveLedger
  stored: boolean
  problems: string[]
}

/** Append a run. An existing sync id is never replaced. */
export function appendRun(ledger: LiveLedger, run: LiveSyncRun): AppendRunOutcome {
  if (ledger.runs.some((r) => r.id === run.id)) {
    return {
      ledger, stored: false,
      problems: [`${run.id} already exists and is immutable — a later retrieval is appended under a new sync id`],
    }
  }
  if (checkRunIntegrity(run) !== 'OK') {
    return { ledger, stored: false, problems: [`${run.id} does not match its own fingerprint and was not stored`] }
  }
  return { ledger: { ...ledger, runs: [...ledger.runs, run] }, stored: true, problems: [] }
}

export function latestRun(ledger: LiveLedger): LiveSyncRun | null {
  const ok = ledger.runs.filter((r) => checkRunIntegrity(r) === 'OK')
  return ok.length ? ok[ok.length - 1]! : null
}

export function previousRunOf(ledger: LiveLedger, run: LiveSyncRun | null): LiveSyncRun | null {
  if (!run) return null
  const ok = ledger.runs.filter((r) => checkRunIntegrity(r) === 'OK')
  const i = ok.findIndex((r) => r.id === run.id)
  return i > 0 ? ok[i - 1]! : null
}

export function runById(ledger: LiveLedger, id: string): LiveSyncRun | null {
  return ledger.runs.find((r) => r.id === id) ?? null
}

export interface RunRow {
  id: string
  date: string
  trigger: string
  completedAt: string
  status: string
  integrity: 'OK' | 'TAMPERED'
  sourcesOk: string
  observations: number
  unavailable: number
}

export function runRows(ledger: LiveLedger): RunRow[] {
  return [...ledger.runs].reverse().map((r) => ({
    id: r.id,
    date: r.date,
    trigger: r.trigger,
    completedAt: r.completedAt,
    status: r.status,
    integrity: checkRunIntegrity(r),
    sourcesOk: `${r.evidence.filter((e) => e.status === 'VALIDATED').length}/${r.evidence.length}`,
    observations: r.observations.length,
    unavailable: r.observations.filter((o) => o.status !== 'VALIDATED' && o.status !== 'PARTIAL').length,
  }))
}

/** Full JSON export of one run, or of the whole append-only history. */
export function exportRun(run: LiveSyncRun): string {
  return JSON.stringify(run, null, 2)
}

export function exportLedger(ledger: LiveLedger): string {
  return JSON.stringify(ledger, null, 2)
}
