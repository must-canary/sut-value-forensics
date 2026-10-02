/**
 * CoinMarketCap integration: configuration, identity safety, field capture,
 * supply tracking, error handling and secret hygiene.
 *
 * Every payload is a CONTROLLED FIXTURE and the key below is a placeholder.
 * No real credential appears in this file, and no assertion depends on a live
 * market value.
 */
import { describe, expect, it } from 'vitest'
import {
  buildReport, checkCmcIdentity, CMC_IDENTITY_UNVERIFIED, CMC_IDENTITY_VERIFIED, coinMarketCapSource,
  mapSource, SOURCES, SUT_CONTRACT, valueOf,
  type DailyReport, type FetchResult, type Observation, type SourceDescriptor,
} from '../src/core/daily-sync'
import {
  appendReport, DAILY_STORE_KEY, emptyDailyLedger, loadDailyLedger, MemoryStorage, saveDailyLedger,
} from '../src/core/daily-store'
import { DailyMarketSyncService } from '../src/service/daily-market-sync-service'
import { supplyTracking } from '../src/core/daily-assessment'
import { effectiveState, loadGovernanceLedger } from '../src/core/governance-store'
import { PRE_REGISTRATION } from '../src/data/pre-registration'

/** Placeholder only. A real key is never written into source or tests. */
const TEST_KEY = 'TEST-PLACEHOLDER-NOT-A-REAL-KEY'
const T0 = '2026-10-02T00:05:00Z'
const TS = Math.floor(Date.parse('2026-10-02T00:00:00Z') / 1000)
const CMC = () => coinMarketCapSource(TEST_KEY)

const listing = (over: Record<string, unknown> = {}) => ({
  id: 12345, name: 'Super Trust', symbol: 'SUT', cmc_rank: 2871,
  circulating_supply: 120_000_000, total_supply: 238_403_732, max_supply: 238_403_732,
  platform: { id: 3890, name: 'Polygon', symbol: 'MATIC', token_address: SUT_CONTRACT },
  quote: {
    USD: {
      price: 0.4302, percent_change_24h: 4.4, volume_24h: 96_000,
      market_cap: 51_000_000, fully_diluted_market_cap: 102_000_000,
      last_updated: '2026-10-02T00:00:00.000Z',
    },
  },
  ...over,
})

const cmcBody = (entries: unknown[]) => ({ status: { error_code: 0 }, data: { SUT: entries } })

const res = (over: Partial<FetchResult> = {}): FetchResult => ({
  sourceId: 'coinmarketcap', ok: true, httpStatus: 200,
  body: cmcBody([listing()]), error: null, retrievedAt: T0, ...over,
})

const mapCmc = (r: FetchResult, s: SourceDescriptor = CMC()) => mapSource(s, r, T0)
const field = (obs: Observation[], f: string) => obs.find((o) => o.field === f)!

// ───────────────────────────── 1 & 2. configured / not configured

describe('configuration', () => {
  it('is NOT CONFIGURED without a key, and says exactly how to configure it', () => {
    const base = SOURCES.find((s) => s.id === 'coinmarketcap')!
    expect(base.url).toBe('')
    expect(base.credentialEnvVar).toBe('CMC_API_KEY')
    const { observations, outcome } = mapSource(base, res({ body: null }), T0)
    expect(outcome.status).toBe('NOT_CONFIGURED')
    expect(observations.every((o) => o.value === null && o.status === 'DATA_UNAVAILABLE')).toBe(true)
    expect(field(observations, 'CMC circulating supply').unavailableReason).toContain('CMC_API_KEY')
    expect(field(observations, 'CMC circulating supply').unavailableReason)
      .toContain('scheduled server-side sync')
  })

  it('is configured by env var only — the key travels in a header, never a URL or source id', () => {
    const s = CMC()
    expect(s.url).toContain('pro-api.coinmarketcap.com')
    expect(s.url).not.toContain(TEST_KEY)
    expect(s.headers?.['X-CMC_PRO_API_KEY']).toBe(TEST_KEY)
    expect(JSON.stringify({ id: s.id, url: s.url, provides: s.provides })).not.toContain(TEST_KEY)
  })

  it('only the configured descriptor is actually called', () => {
    const withoutKey = new DailyMarketSyncService({ storage: new MemoryStorage(), fetcher: async () => res() })
    expect(withoutKey.callableSources().map((s) => s.id)).not.toContain('coinmarketcap')
    const withKey = new DailyMarketSyncService({
      storage: new MemoryStorage(), fetcher: async () => res(),
      sources: SOURCES.map((s) => (s.id === 'coinmarketcap' ? CMC() : s)),
    })
    expect(withKey.callableSources().map((s) => s.id)).toContain('coinmarketcap')
  })
})

// ───────────────────────────── 3. successful response

describe('successful response', () => {
  it('captures every documented field with provenance', () => {
    const { observations, outcome } = mapCmc(res())
    expect(outcome.status).toBe('OK')
    expect(outcome.httpStatus).toBe(200)
    expect(valueOf(observations, 'CMC price')).toBe(0.4302)
    expect(valueOf(observations, 'CMC 24h change')).toBe(4.4)
    expect(valueOf(observations, 'CMC 24h volume')).toBe(96_000)
    expect(valueOf(observations, 'CMC market cap')).toBe(51_000_000)
    expect(valueOf(observations, 'CMC fully diluted market cap')).toBe(102_000_000)
    expect(valueOf(observations, 'CMC circulating supply')).toBe(120_000_000)
    expect(valueOf(observations, 'CMC total supply')).toBe(238_403_732)
    expect(valueOf(observations, 'CMC max supply')).toBe(238_403_732)
    expect(valueOf(observations, 'CMC rank')).toBe(2871)
    for (const o of observations) {
      expect(o.sourceName).toContain('CoinMarketCap')
      expect(o.sourceUrl).toContain('coinmarketcap.com')
      expect(o.retrievedAt).toBe(T0)
      expect(o.provenance).toContain('queried by ticker SUT')
      expect(o.provenance).not.toContain(TEST_KEY)
    }
    expect(field(observations, 'CMC price').dataTimestamp).toBe('2026-10-02T00:00:00.000Z')
  })
})

// ───────────────────────────── 4 & 5. rate limit and server error

describe('error handling', () => {
  it('a rate limit yields DATA UNAVAILABLE with the reason, never a value', () => {
    const { observations, outcome } = mapCmc(res({ ok: false, httpStatus: 429, body: null }))
    expect(outcome.status).toBe('RATE_LIMITED')
    expect(observations.every((o) => o.value === null)).toBe(true)
    expect(observations[0]!.unavailableReason).toContain('rate-limited')
    expect(observations[0]!.unavailableReason).toContain('429')
  })

  it('a server error yields DATA UNAVAILABLE with the reason', () => {
    const { observations, outcome } = mapCmc(res({ ok: false, httpStatus: 500, body: null }))
    expect(outcome.status).toBe('HTTP_ERROR')
    expect(observations.every((o) => o.value === null && o.status === 'DATA_UNAVAILABLE')).toBe(true)
    expect(observations[0]!.unavailableReason).toContain('error status')
  })

  it('an unauthorised key is reported as an error, not as missing data', () => {
    const { outcome } = mapCmc(res({ ok: false, httpStatus: 401, body: null }))
    expect(outcome.status).toBe('HTTP_ERROR')
    expect(outcome.httpStatus).toBe(401)
  })

  it('an empty payload yields DATA UNAVAILABLE for every field', () => {
    const { observations } = mapCmc(res({ body: cmcBody([]) }))
    expect(observations).toHaveLength(CMC().provides.length)
    expect(observations.every((o) => o.value === null)).toBe(true)
    expect(observations[0]!.unavailableReason).toContain('no quote for this ticker')
  })
})

// ───────────────────────────── 6. missing circulating supply

describe('missing circulating supply', () => {
  it('stays null with the real reason and is never estimated', () => {
    const { observations } = mapCmc(res({ body: cmcBody([listing({ circulating_supply: null })]) }))
    const o = field(observations, 'CMC circulating supply')
    expect(o.value).toBeNull()
    expect(o.status).toBe('DATA_UNAVAILABLE')
    expect(o.unavailableReason).toContain('no circulating supply')
    // the other fields still come through
    expect(valueOf(observations, 'CMC total supply')).toBe(238_403_732)
  })

  it('a zero supply is treated as "not published", never as a measurement', () => {
    const { observations } = mapCmc(res({ body: cmcBody([listing({ circulating_supply: 0 })]) }))
    expect(field(observations, 'CMC circulating supply').value).toBeNull()
  })

  it('no change is calculated unless both observations are real', () => {
    const withSupply = buildReport({
      results: [res()], sources: [CMC()], now: T0, retrievalStartedAt: T0, sequence: 1, previous: null,
    })
    const withoutSupply = buildReport({
      results: [res({ body: cmcBody([listing({ circulating_supply: null })]) })], sources: [CMC()],
      now: '2026-10-03T00:05:00Z', retrievalStartedAt: '2026-10-03T00:05:00Z', sequence: 1, previous: withSupply,
    })
    const missingRow = supplyTracking(withoutSupply, withSupply)
      .find((x) => x.field === 'CMC circulating supply')!
    expect(missingRow.current).toBeNull()
    expect(missingRow.absoluteChange).toBeNull()
    expect(missingRow.percentChange).toBeNull()
    expect(missingRow.status).toBe('DATA_UNAVAILABLE')

    const firstRow = supplyTracking(withSupply, null).find((x) => x.field === 'CMC circulating supply')!
    expect(firstRow.current).toBe(120_000_000)
    expect(firstRow.status).toBe('NO_PRIOR_OBSERVATION')
    expect(firstRow.absoluteChange).toBeNull()
  })

  it('a real change is calculated from two real observations', () => {
    const day1 = buildReport({
      results: [res()], sources: [CMC()], now: T0, retrievalStartedAt: T0, sequence: 1, previous: null,
    })
    const day2 = buildReport({
      results: [res({ body: cmcBody([listing({ circulating_supply: 121_200_000 })]) })], sources: [CMC()],
      now: '2026-10-03T00:05:00Z', retrievalStartedAt: '2026-10-03T00:05:00Z', sequence: 1, previous: day1,
    })
    const row = supplyTracking(day2, day1).find((x) => x.field === 'CMC circulating supply')!
    expect(row.current).toBe(121_200_000)
    expect(row.previous).toBe(120_000_000)
    expect(row.absoluteChange).toBe(1_200_000)
    expect(row.percentChange).toBeCloseTo(1, 6)
    expect(row.status).toBe('OK')
    expect(row.source).toContain('CoinMarketCap')
    expect(row.retrievedAt).toBe(T0)
  })
})

// ───────────────────────────── 7 & 8. identity safety

describe('SUT identity safety', () => {
  it('a listing with no platform address stays TICKER_ONLY / IDENTITY NOT VERIFIED', () => {
    const check = checkCmcIdentity([listing({ platform: null }) as Record<string, unknown>])
    expect(check.identity).toBe('TICKER_ONLY')
    expect(check.label).toBe(CMC_IDENTITY_UNVERIFIED)
    expect(check.reason).toContain('publishes no platform token address')
    expect(check.reason).toContain('known to collide')

    const { observations } = mapCmc(res({ body: cmcBody([listing({ platform: null })]) }))
    for (const o of observations) expect(o.identity).toBe('TICKER_ONLY')
    expect(field(observations, 'CMC identity check').value).toContain(CMC_IDENTITY_UNVERIFIED)
    expect(field(observations, 'CMC price').provenance).toContain('TICKER ONLY / IDENTITY NOT VERIFIED')
  })

  it('a listing for a DIFFERENT contract under the same ticker is refused as identity', () => {
    const other = listing({ platform: { name: 'BNB Smart Chain', token_address: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' } })
    const check = checkCmcIdentity([other as Record<string, unknown>])
    expect(check.identity).toBe('TICKER_ONLY')
    expect(check.reason).toContain('different asset trading under the same ticker')
    const { observations } = mapCmc(res({ body: cmcBody([other]) }))
    expect(observations.every((o) => o.identity === 'TICKER_ONLY')).toBe(true)
  })

  it('only an exact Polygon contract match is accepted as contract-verified', () => {
    const check = checkCmcIdentity([listing() as Record<string, unknown>])
    expect(check.identity).toBe('CONTRACT_VERIFIED')
    expect(check.label).toBe(CMC_IDENTITY_VERIFIED)
    expect(check.tokenAddress?.toLowerCase()).toBe(SUT_CONTRACT.toLowerCase())
    const { observations } = mapCmc(res())
    expect(observations.every((o) => o.identity === 'CONTRACT_VERIFIED')).toBe(true)
    expect(field(observations, 'CMC identity check').value).toContain(CMC_IDENTITY_VERIFIED)
  })

  it('a ticker collision picks the contract-matching listing and reports the count', () => {
    const impostor = listing({ platform: { name: 'BNB Smart Chain', token_address: '0xdeadbeef' }, cmc_rank: 99 })
    const { observations } = mapCmc(res({ body: cmcBody([impostor, listing()]) }))
    expect(field(observations, 'CMC identity check').value).toContain('2 listing(s)')
    expect(valueOf(observations, 'CMC rank')).toBe(2871)         // the contract-matching listing, not the impostor
    expect(observations.every((o) => o.identity === 'CONTRACT_VERIFIED')).toBe(true)
  })

  it('CMC values are never merged into the contract-verified SUT fields', () => {
    const cgPrice = 0.431152
    const report = buildReport({
      results: [
        {
          sourceId: 'coingecko-token', ok: true, httpStatus: 200, retrievedAt: T0, error: null,
          body: { [SUT_CONTRACT]: { usd: cgPrice, usd_market_cap: 0, usd_24h_vol: 1, usd_24h_change: 1, last_updated_at: TS } },
        },
        res({ body: cmcBody([listing({ platform: null })]) }),
      ],
      sources: [SOURCES.find((s) => s.id === 'coingecko-token')!, CMC()],
      now: T0, retrievalStartedAt: T0, sequence: 1, previous: null,
    })
    // separate fields, separate identities, separate sources
    expect(valueOf(report.observations, 'SUT price')).toBe(cgPrice)
    expect(valueOf(report.observations, 'CMC price')).toBe(0.4302)
    expect(field(report.observations, 'SUT price').identity).toBe('CONTRACT_VERIFIED')
    expect(field(report.observations, 'CMC price').identity).toBe('TICKER_ONLY')
    expect(field(report.observations, 'SUT price').sourceId).toBe('coingecko-token')
    expect(field(report.observations, 'CMC price').sourceId).toBe('coinmarketcap')
  })

  it('a missing CMC value is never back-filled from a contract-verified source', () => {
    const report = buildReport({
      results: [
        {
          sourceId: 'coingecko-asset', ok: true, httpStatus: 200, retrievedAt: T0, error: null,
          body: {
            last_updated: '2026-10-02T00:00:00.000Z', market_cap_rank: null,
            market_data: { circulating_supply: 0, total_supply: 238_403_732 }, tickers: [],
          },
        },
        res({ body: cmcBody([listing({ circulating_supply: null })]) }),
      ],
      sources: [SOURCES.find((s) => s.id === 'coingecko-asset')!, CMC()],
      now: T0, retrievalStartedAt: T0, sequence: 1, previous: null,
    })
    expect(valueOf(report.observations, 'SUT total supply')).toBe(238_403_732)
    expect(field(report.observations, 'CMC circulating supply').value).toBeNull()
    expect(field(report.observations, 'CMC total supply').value).toBe(238_403_732)  // CMC's own value
    expect(field(report.observations, 'CMC circulating supply').unavailableReason)
      .not.toContain('CoinGecko')
  })
})

// ───────────────────────────── 9. secret hygiene

describe('the key never leaks', () => {
  const persisted = async (): Promise<{ raw: string; report: DailyReport }> => {
    const storage = new MemoryStorage()
    const r = await new DailyMarketSyncService({
      storage,
      sources: SOURCES.map((s) => (s.id === 'coinmarketcap' ? CMC() : s)),
      fetcher: async (s) => res({ sourceId: s.id, body: s.id === 'coinmarketcap' ? cmcBody([listing()]) : null }),
      now: () => T0,
    }).run('SCHEDULED')
    saveDailyLedger(storage, appendReport(emptyDailyLedger(SUT_CONTRACT), r.report).ledger)
    return { raw: storage.getItem(DAILY_STORE_KEY) ?? '', report: r.report }
  }

  it('does not appear anywhere in the persisted dataset or report', async () => {
    const { raw, report } = await persisted()
    expect(raw.length).toBeGreaterThan(0)
    expect(raw).not.toContain(TEST_KEY)
    expect(raw).not.toContain('X-CMC_PRO_API_KEY')
    expect(JSON.stringify(report)).not.toContain(TEST_KEY)
    expect(JSON.stringify(report.raw)).not.toContain(TEST_KEY)
    expect(JSON.stringify(report.sources)).not.toContain(TEST_KEY)
  })

  it('does not appear in any observation, provenance string or source URL', () => {
    const { observations, outcome } = mapCmc(res())
    for (const o of observations) {
      expect(JSON.stringify(o)).not.toContain(TEST_KEY)
    }
    expect(JSON.stringify(outcome)).not.toContain(TEST_KEY)
    expect(outcome.url).not.toContain(TEST_KEY)
  })

  it('the client bundle holds no credential variable and no VITE_ key', () => {
    const src = SOURCES.find((s) => s.id === 'coinmarketcap')!
    expect(src.headers).toBeUndefined()
    expect(JSON.stringify(SOURCES)).not.toContain('API_KEY=')
    expect(JSON.stringify(SOURCES)).not.toContain('VITE_')
  })
})

// ───────────────────────────── 10. cron + isolation

describe('scheduled execution and isolation', () => {
  it('the scheduled run uses the same service and the server-supplied source list', async () => {
    const seen: string[] = []
    const storage = new MemoryStorage()
    const service = new DailyMarketSyncService({
      storage,
      sources: SOURCES.map((s) => (s.id === 'coinmarketcap' ? CMC() : s)),
      fetcher: async (s) => {
        seen.push(s.id)
        if (s.id === 'coinmarketcap') {
          expect(s.headers?.['X-CMC_PRO_API_KEY']).toBe(TEST_KEY)   // the header is actually sent
          return res()
        }
        return { sourceId: s.id, ok: false, httpStatus: 503, body: null, error: null, retrievedAt: T0 }
      },
      now: () => T0,
    })
    const r = await service.run('SCHEDULED')
    expect(seen).toContain('coinmarketcap')
    expect(r.report.trigger).toBe('SCHEDULED')
    expect(valueOf(r.report.observations, 'CMC price')).toBe(0.4302)
    expect(r.status).toBe('PARTIAL')                                // the other sources failed, CMC did not
    const back = loadDailyLedger(storage, SUT_CONTRACT)
    expect(back.reports).toHaveLength(1)
    expect(JSON.stringify(back)).not.toContain(TEST_KEY)
  })

  it('a CMC retrieval changes no governance state', async () => {
    const storage = new MemoryStorage()
    await new DailyMarketSyncService({
      storage, sources: [CMC()], fetcher: async () => res(), now: () => T0,
    }).run('SCHEDULED')
    const gov = effectiveState(loadGovernanceLedger(storage), PRE_REGISTRATION)
    expect(gov.gate).toBe('THRESHOLDS_PENDING')
    expect(gov.state.thresholdsRegistered).toBe(0)
    expect(gov.state.intervention).toBeNull()
    expect(gov.state.comparison).toBeNull()
    expect(PRE_REGISTRATION.every((e) => e.successThreshold === null)).toBe(true)
  })
})
