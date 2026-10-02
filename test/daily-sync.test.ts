/**
 * Daily market-data layer: source normalisation, provenance, missing data,
 * immutability, idempotency and isolation from EXP-001.
 *
 * Every payload below is a CONTROLLED TEST FIXTURE shaped like the real
 * responses. No test asserts a live market value.
 */
import { describe, expect, it } from 'vitest'
import {
  buildReport, coinMarketCapSource, DAILY_DISCLAIMER, fingerprintContent, freshnessOf,
  INTERPRETATION_NOTE, mapSource, rawRecordOf, SOURCES, spotFromSqrtPriceX96, STALE_AFTER_MINUTES,
  SUT_CONTRACT, SUT_POOL, syncStatusOf, valueOf,
  type FetchResult, type SourceDescriptor,
} from '../src/core/daily-sync'
import {
  appendReport, checkReportIntegrity, DAILY_STORE_KEY, dailyLedgerTouchesGovernance,
  emptyDailyLedger, historyRows, latestReport, loadDailyLedger, MemoryStorage, nextExpectedSync,
  nextSequence, saveDailyLedger, type DailyLedger,
} from '../src/core/daily-store'
import {
  DailyMarketSyncService, DAILY_CRON_SCHEDULE, serviceTouchesGovernance,
} from '../src/service/daily-market-sync-service'
import { effectiveState, emptyGovernanceLedger, loadGovernanceLedger } from '../src/core/governance-store'
import { PRE_REGISTRATION } from '../src/data/pre-registration'
import { registrationSummary } from '../src/core/pre-registration'

const T0 = '2026-10-02T00:05:00Z'
const DATA_TS = Math.floor(Date.parse('2026-10-02T00:00:00Z') / 1000)
const SQRT = '0x000000000000000000000000000000000000000000000b055455128e6729c8fa'
  + 'fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffba7c6'
  + '0'.repeat(64 * 5)

// ───────────────────────────────── controlled fixtures

const PAYLOADS: Record<string, unknown> = {
  'coingecko-token': {
    [SUT_CONTRACT]: {
      usd: 0.431152,
      usd_market_cap: 0,              // the source publishes none — must NOT become a value
      usd_24h_vol: 97303.21,
      usd_24h_change: 4.575,
      last_updated_at: DATA_TS,
    },
  },
  'coingecko-asset': {
    last_updated: '2026-10-02T00:00:00.000Z',
    market_cap_rank: null,            // no rank published
    market_data: { circulating_supply: 0, total_supply: 238403732, max_supply: 238403732 },
    tickers: [
      { base: 'SUT', target: 'USDT', market: { name: 'Gate' } },
      { base: '0X98965474', target: '0XC2132D05', market: { name: 'Uniswap V3 (Polygon)' } },
    ],
  },
  'coingecko-majors': {
    bitcoin: { usd: 83920, usd_24h_change: 0.178, last_updated_at: DATA_TS },
    ethereum: { usd: 2704.71, usd_24h_change: 0.45, last_updated_at: DATA_TS },
  },
  'coingecko-global': {
    data: { total_market_cap: { usd: 2.9e12 }, market_cap_change_percentage_24h_usd: -0.42, updated_at: DATA_TS },
  },
  'dexscreener-pair': {
    pairs: [{
      pairAddress: '0x092295c92BAB5e734c4a60DbC0F0FfdCdfC4E165',
      priceUsd: '0.4315', liquidity: { usd: 94440.93 }, volume: { h24: 41043.01 }, priceChange: { h24: 3.65 },
    }],
  },
  'polygon-rpc': [
    { jsonrpc: '2.0', id: 1, result: '0x5a60a3e' },
    { jsonrpc: '2.0', id: 2, result: SQRT },
    { jsonrpc: '2.0', id: 3, result: { number: '0x5a60a3e', timestamp: '0x' + (DATA_TS).toString(16) } },
  ],
  'coinmarketcap': {
    data: {
      SUT: [{
        circulating_supply: 120000000, total_supply: 238403732, cmc_rank: 2871,
        quote: { USD: { price: 0.4302, percent_change_24h: 4.4, volume_24h: 96000, market_cap: 51000000, last_updated: '2026-10-02T00:00:00.000Z' } },
      }],
    },
  },
}

const result = (id: string, over: Partial<FetchResult> = {}): FetchResult => ({
  sourceId: id, ok: true, httpStatus: 200, body: PAYLOADS[id] ?? null, error: null, retrievedAt: T0, ...over,
})

const fixtureFetcher = (over: Record<string, Partial<FetchResult>> = {}) =>
  async (s: SourceDescriptor): Promise<FetchResult> => result(s.id, over[s.id] ?? {})

const sourcesWithCmc = (): SourceDescriptor[] =>
  SOURCES.map((s) => (s.id === 'coinmarketcap' ? coinMarketCapSource('TEST-KEY-NOT-A-REAL-SECRET') : s))

const allResults = (sources = SOURCES) =>
  sources.filter((s) => s.url !== '').map((s) => result(s.id))

const report = (over: Partial<Parameters<typeof buildReport>[0]> = {}) => buildReport({
  results: allResults(over.sources ?? SOURCES),
  now: T0, retrievalStartedAt: T0, sequence: 1, previous: null, ...over,
})

// ───────────────────────────────── source normalisation

describe('source normalisation', () => {
  it('maps the contract-addressed price source to observations with units and symbols', () => {
    const s = SOURCES.find((x) => x.id === 'coingecko-token')!
    const { observations, outcome } = mapSource(s, result('coingecko-token'), T0)
    expect(outcome.status).toBe('OK')
    const price = observations.find((o) => o.field === 'SUT price')!
    expect(price.value).toBe(0.431152)
    expect(price.unit).toBe('USD')
    expect(price.symbol).toBe('SUT')
    expect(price.identity).toBe('CONTRACT_VERIFIED')
    expect(price.status).toBe('OK')
    expect(valueOf(observations, 'SUT 24h change')).toBe(4.575)
    expect(valueOf(observations, 'SUT 24h volume')).toBe(97303.21)
  })

  it('maps the pool source and rejects a pair that is not the SUT/USDT pool', () => {
    const s = SOURCES.find((x) => x.id === 'dexscreener-pair')!
    const ok = mapSource(s, result('dexscreener-pair'), T0).observations
    expect(valueOf(ok, 'Pool liquidity (USD)')).toBe(94440.93)
    expect(valueOf(ok, 'Pair price')).toBe(0.4315)
    const other = mapSource(s, result('dexscreener-pair', {
      body: { pairs: [{ pairAddress: '0xdeadbeef', priceUsd: '9.99' }] },
    }), T0).observations
    expect(other.every((o) => o.value === null)).toBe(true)
    expect(other[0]!.unavailableReason).toContain(SUT_POOL)
  })

  it('decodes the on-chain spot price from slot0 and the block number', () => {
    const s = SOURCES.find((x) => x.id === 'polygon-rpc')!
    const o = mapSource(s, result('polygon-rpc'), T0).observations
    const spot = valueOf(o, 'On-chain spot price')!
    expect(spot).toBeGreaterThan(0)
    expect(spot).toBeCloseTo(spotFromSqrtPriceX96(BigInt('0x0b055455128e6729c8fa')), 9)
    expect(valueOf(o, 'Block number')).toBe(Number(BigInt('0x5a60a3e')))
    expect(o[0]!.identity).toBe('CONTRACT_VERIFIED')
  })

  it('separates SUT observations from broader-market observations', () => {
    const r = report()
    const sut = r.observations.filter((o) => o.symbol === 'SUT')
    const market = r.observations.filter((o) => o.symbol !== 'SUT')
    expect(sut.length).toBeGreaterThan(0)
    expect(market.map((o) => o.symbol)).toContain('BTC')
    expect(market.map((o) => o.symbol)).toContain('ETH')
    expect(market.map((o) => o.symbol)).toContain('MARKET')
  })
})

// ───────────────────────────────── CoinMarketCap

describe('CoinMarketCap source', () => {
  it('is NOT CONFIGURED without a key, and never guesses a value', () => {
    const s = SOURCES.find((x) => x.id === 'coinmarketcap')!
    expect(s.url).toBe('')
    expect(s.credentialEnvVar).toBe('CMC_API_KEY')
    const { observations, outcome } = mapSource(s, result('coinmarketcap', { body: null }), T0)
    expect(outcome.status).toBe('NOT_CONFIGURED')
    expect(observations.every((o) => o.value === null && o.status === 'DATA_UNAVAILABLE')).toBe(true)
    expect(observations[0]!.unavailableReason).toContain('CMC_API_KEY')
  })

  it('carries the key in a header, never in the URL, and is labelled TICKER_ONLY', () => {
    const s = coinMarketCapSource('TEST-KEY-NOT-A-REAL-SECRET')
    expect(s.url).not.toContain('TEST-KEY')
    expect(s.headers?.['X-CMC_PRO_API_KEY']).toBe('TEST-KEY-NOT-A-REAL-SECRET')
    expect(s.identity).toBe('TICKER_ONLY')
    const { observations } = mapSource(s, result('coinmarketcap'), T0)
    expect(valueOf(observations, 'CMC price')).toBe(0.4302)
    expect(valueOf(observations, 'CMC rank')).toBe(2871)
    for (const o of observations) {
      expect(o.identity).toBe('TICKER_ONLY')
      expect(o.provenance).toContain('queried by ticker SUT')
      expect(o.provenance).toContain('TICKER ONLY / IDENTITY NOT VERIFIED')
      expect(o.provenance).toContain('cannot be shown to be the Polygon contract')
    }
  })

  it('a ticker source is never merged with the contract-verified price field', () => {
    const r = report({ sources: sourcesWithCmc(), results: allResults(sourcesWithCmc()) })
    expect(valueOf(r.observations, 'SUT price')).toBe(0.431152)       // contract source
    expect(valueOf(r.observations, 'CMC price')).toBe(0.4302)          // ticker source, separate field
  })
})

// ───────────────────────────────── supply

describe('supply capture', () => {
  it('captures total supply and refuses a zero circulating supply', () => {
    const s = SOURCES.find((x) => x.id === 'coingecko-asset')!
    const o = mapSource(s, result('coingecko-asset'), T0).observations
    expect(valueOf(o, 'SUT total supply')).toBe(238403732)
    const circ = o.find((x) => x.field === 'SUT circulating supply')!
    expect(circ.value).toBeNull()
    expect(circ.status).toBe('DATA_UNAVAILABLE')
    expect(circ.unavailableReason).toContain('circulating supply')
  })

  it('reports a day-over-day supply change only when both retrievals have a value', () => {
    const day1 = report({ sources: sourcesWithCmc(), results: allResults(sourcesWithCmc()) })
    const moved = {
      ...PAYLOADS['coingecko-asset'] as Record<string, unknown>,
      market_data: { circulating_supply: 0, total_supply: 238403000, max_supply: 238403732 },
    }
    const day2 = buildReport({
      results: allResults().map((r) => (r.sourceId === 'coingecko-asset' ? { ...r, body: moved } : r)),
      now: '2026-10-03T00:05:00Z', retrievalStartedAt: '2026-10-03T00:05:00Z',
      sequence: 1, previous: day1,
    })
    const supplyLine = day2.significantChanges.find((c) => c.startsWith('SUT total supply'))!
    expect(supplyLine).toContain('238403732.00 → 238403000.00')
    expect(supplyLine).toContain('-732.00')
    expect(day2.significantChanges.find((c) => c.startsWith('SUT circulating supply')))
      .toContain('not comparable')
  })
})

// ───────────────────────────────── missing data

describe('missing data is never fabricated', () => {
  it('a market cap of 0 is DATA UNAVAILABLE with a reason', () => {
    const r = report()
    const mcap = r.observations.find((o) => o.field === 'SUT market cap')!
    expect(mcap.value).toBeNull()
    expect(mcap.status).toBe('DATA_UNAVAILABLE')
    expect(mcap.unavailableReason).toContain('0, which is not a measurement')
    expect(r.limitations.join(' ')).toContain('SUT market cap')
    expect(r.limitations.join(' ')).toContain('No value was substituted')
  })

  it('a missing rank stays null rather than becoming a number', () => {
    const rank = report().observations.find((o) => o.field === 'SUT market rank')!
    expect(rank.value).toBeNull()
    expect(rank.unavailableReason).toContain('no market-cap rank')
  })

  it('an HTTP error, a rate limit and a network block each yield DATA UNAVAILABLE, never a value', () => {
    const cases: Array<[Partial<FetchResult>, string]> = [
      [{ ok: false, httpStatus: 500, body: null }, 'error status'],
      [{ ok: false, httpStatus: 429, body: null }, 'rate-limited'],
      [{ ok: false, httpStatus: null, body: null, error: 'Failed to fetch' }, 'CORS'],
    ]
    for (const [over, expected] of cases) {
      const s = SOURCES.find((x) => x.id === 'coingecko-token')!
      const { observations, outcome } = mapSource(s, result('coingecko-token', over), T0)
      expect(outcome.status).not.toBe('OK')
      expect(observations).toHaveLength(s.provides.length)
      for (const o of observations) {
        expect(o.value).toBeNull()
        expect(o.status).toBe('DATA_UNAVAILABLE')
        expect(o.unavailableReason).toBeTruthy()
      }
      expect(observations[0]!.unavailableReason).toContain(expected)
    }
  })

  it('news has no configured public source and says so', () => {
    const news = report().observations.find((o) => o.field === 'Market events / news')!
    expect(news.value).toBeNull()
    expect(news.unavailableReason).toContain('no public, browser-reachable news')
    expect(news.unavailableReason).toContain('no event is inferred')
  })

  it('status is PARTIAL when some sources fail and FAILED when all do', () => {
    const allOk = report()
    expect(allOk.status).toBe('SUCCESS')
    const partial = report({
      results: allResults().map((r) => (r.sourceId === 'coingecko-global' ? { ...r, ok: false, httpStatus: 429, body: null } : r)),
    })
    expect(partial.status).toBe('PARTIAL')
    const failed = report({ results: allResults().map((r) => ({ ...r, ok: false, httpStatus: 500, body: null })) })
    expect(failed.status).toBe('FAILED')
    expect(syncStatusOf([])).toBe('FAILED')
  })
})

// ───────────────────────────────── provenance and timestamps

describe('provenance and retrieval timestamps', () => {
  it('every observation carries source, url, retrieval time, data time and provenance', () => {
    for (const o of report().observations) {
      expect(o.sourceId).toBeTruthy()
      expect(o.sourceName).toBeTruthy()
      expect(o.retrievedAt).toBe(T0)
      expect(o.provenance).toBeTruthy()
      expect(o.unit !== undefined).toBe(true)
      expect(['CONTRACT_VERIFIED', 'PAIR_VERIFIED', 'TICKER_ONLY', 'NOT_APPLICABLE']).toContain(o.identity)
      if (o.value !== null) expect(o.sourceUrl).toBeTruthy()
    }
  })

  it('the data timestamp comes from the source, not from the clock', () => {
    const price = report().observations.find((o) => o.field === 'SUT price')!
    expect(price.dataTimestamp).toBe('2026-10-02T00:00:00.000Z')
    expect(price.retrievedAt).toBe(T0)
    expect(price.dataTimestamp).not.toBe(price.retrievedAt)
  })

  it('detects stale data against the retrieval time', () => {
    expect(freshnessOf('2026-10-02T00:00:00Z', T0)).toBe('CURRENT')
    expect(freshnessOf('2026-10-01T20:00:00Z', T0)).toBe('STALE')
    expect(freshnessOf(null, T0)).toBe('UNKNOWN')
    const old = { ...PAYLOADS['coingecko-token'] as Record<string, unknown> }
    const stale = buildReport({
      results: allResults().map((r) => (r.sourceId === 'coingecko-token'
        ? { ...r, body: { [SUT_CONTRACT]: { ...(old[SUT_CONTRACT] as object), last_updated_at: DATA_TS - 7200 } } }
        : r)),
      now: T0, retrievalStartedAt: T0, sequence: 1, previous: null,
    })
    expect(stale.observations.find((o) => o.field === 'SUT price')!.freshness).toBe('STALE')
    expect(stale.limitations.join(' ')).toContain(`Older than ${STALE_AFTER_MINUTES} minutes`)
  })

  it('preserves a bounded raw record of exactly what each source returned', () => {
    const r = report()
    const raw = r.raw.find((x) => x.sourceId === 'coingecko-token')!
    expect(raw.httpStatus).toBe(200)
    expect(raw.retrievedAt).toBe(T0)
    expect(raw.payloadExcerpt).toContain('0.431152')
    expect(raw.payloadBytes).toBeGreaterThan(0)
    expect(raw.payloadHash).toMatch(/^[0-9a-f]{8}$/)
    expect(rawRecordOf(result('coingecko-token')).payloadHash).toBe(raw.payloadHash)
  })
})

// ───────────────────────────────── report generation

describe('report generation', () => {
  it('contains every required section', () => {
    const r = report()
    expect(r.id).toBe('DMR-2026-10-02-1')
    expect(r.reportDate).toBe('2026-10-02')
    expect(r.generatedAt).toBe(T0)
    expect(r.retrievalStartedAt).toBe(T0)
    expect(r.observations.length).toBeGreaterThan(10)
    expect(r.sources).toHaveLength(SOURCES.length)
    expect(r.comparison.text).toBeTruthy()
    expect(r.significantChanges.length).toBeGreaterThan(0)
    expect(r.limitations.length).toBeGreaterThan(0)
    expect(r.fingerprint).toMatch(/^DMR-[0-9a-f]{8}$/)
    expect(r.contentFingerprint).toMatch(/^DMC-[0-9a-f]{8}$/)
  })

  it('carries the exact disclaimer and interpretation note', () => {
    const r = report()
    expect(r.disclaimer).toBe(DAILY_DISCLAIMER)
    expect(r.disclaimer).toContain('does not by itself establish causality')
    expect(r.disclaimer).toContain('may be delayed, revised, unavailable, or source-dependent')
    expect(r.interpretationNote).toBe(INTERPRETATION_NOTE)
    expect(r.interpretationNote).toContain('retrieval timestamp and source provenance')
  })

  it('states the SUT/market comparison as an observation and never as a cause', () => {
    const t = report().comparison.text
    expect(t).toContain('SUT +4.58%')
    expect(t).toContain('BTC +0.18%')
    expect(t).toContain('no causal relationship')
    expect(t.toLowerCase()).not.toContain('because')
    expect(t.toLowerCase()).not.toContain('caused')
  })

  it('says plainly that it is not part of the experiment', () => {
    expect(report().limitations.join(' ')).toContain('not part of the EXP-001 governance chain')
  })

  it('has no day-over-day line when nothing earlier is stored', () => {
    expect(report().significantChanges).toEqual(['No earlier retrieval is stored, so no day-over-day change can be stated.'])
  })
})

// ───────────────────────────────── persistence, immutability, idempotency

describe('persistence, immutability and idempotency', () => {
  const store = () => new MemoryStorage()
  const roundTrip = (l: DailyLedger) => {
    const s = store()
    saveDailyLedger(s, l)
    return loadDailyLedger(s, SUT_CONTRACT)
  }

  it('a stored report survives a round-trip with its observations and raw records', () => {
    const r = report()
    const back = roundTrip(appendReport(emptyDailyLedger(SUT_CONTRACT), r).ledger)
    expect(back.reports).toHaveLength(1)
    expect(back.reports[0]!.id).toBe(r.id)
    expect(back.reports[0]!.fingerprint).toBe(r.fingerprint)
    expect(checkReportIntegrity(back.reports[0]!)).toBe('OK')
    expect(back.reports[0]!.raw.length).toBe(r.raw.length)
    expect(valueOf(back.reports[0]!.observations, 'SUT price')).toBe(0.431152)
  })

  it('an identical retrieval is a no-op — duplicates are not stored twice', () => {
    const first = appendReport(emptyDailyLedger(SUT_CONTRACT), report())
    expect(first.stored).toBe(true)
    const again = appendReport(first.ledger, buildReport({
      results: allResults(), now: '2026-10-02T06:00:00Z', retrievalStartedAt: '2026-10-02T06:00:00Z',
      sequence: 2, previous: latestReport(first.ledger),
    }))
    expect(again.stored).toBe(false)
    expect(again.duplicateOf).toBe('DMR-2026-10-02-1')
    expect(again.problems).toEqual([])
    expect(again.ledger.reports).toHaveLength(1)
  })

  it('a changed value is stored as a NEW report and never rewrites the old one', () => {
    const first = appendReport(emptyDailyLedger(SUT_CONTRACT), report())
    const movedBody = { [SUT_CONTRACT]: { ...(PAYLOADS['coingecko-token'] as Record<string, Record<string, unknown>>)[SUT_CONTRACT], usd: 0.5 } }
    const second = buildReport({
      results: allResults().map((r) => (r.sourceId === 'coingecko-token' ? { ...r, body: movedBody } : r)),
      now: '2026-10-02T12:00:00Z', retrievalStartedAt: '2026-10-02T12:00:00Z',
      sequence: nextSequence(first.ledger, '2026-10-02T12:00:00Z'), previous: latestReport(first.ledger),
    })
    const out = appendReport(first.ledger, second)
    expect(out.stored).toBe(true)
    const back = roundTrip(out.ledger)
    expect(back.reports).toHaveLength(2)
    expect(back.reports[0]!.id).toBe('DMR-2026-10-02-1')
    expect(valueOf(back.reports[0]!.observations, 'SUT price')).toBe(0.431152)   // untouched
    expect(back.reports[1]!.id).toBe('DMR-2026-10-02-2')
    expect(valueOf(back.reports[1]!.observations, 'SUT price')).toBe(0.5)
    expect(back.reports[0]!.fingerprint).not.toBe(back.reports[1]!.fingerprint)
  })

  it('re-using an existing report id is refused outright', () => {
    const first = appendReport(emptyDailyLedger(SUT_CONTRACT), report())
    const clash = appendReport(first.ledger, report())
    expect(clash.stored).toBe(false)
    expect(clash.problems.join(' ')).toContain('already exists and is immutable')
  })

  it('an edited stored report is TAMPERED and is not served as the latest', () => {
    const s = store()
    saveDailyLedger(s, appendReport(emptyDailyLedger(SUT_CONTRACT), report()).ledger)
    const raw = JSON.parse(s.getItem(DAILY_STORE_KEY)!) as DailyLedger
    raw.reports[0]!.observations[0]!.value = 9.99
    s.setItem(DAILY_STORE_KEY, JSON.stringify(raw))
    const back = loadDailyLedger(s, SUT_CONTRACT)
    expect(checkReportIntegrity(back.reports[0]!)).toBe('TAMPERED')
    expect(latestReport(back)).toBeNull()
    expect(historyRows(back)[0]!.integrity).toBe('TAMPERED')
  })

  it('history rows expose the required columns for every retrieval', () => {
    const l = appendReport(emptyDailyLedger(SUT_CONTRACT), report()).ledger
    const row = historyRows(l)[0]!
    expect(row.date).toBe('2026-10-02')
    expect(row.status).toBe('SUCCESS')
    expect(row.sutPrice).toBe(0.431152)
    expect(row.change24h).toBe(4.575)
    expect(row.volume24h).toBe(97303.21)
    expect(row.marketCap).toBeNull()                 // DATA UNAVAILABLE stays null in history
    expect(row.btcChange).toBe(0.178)
    expect(row.ethChange).toBe(0.45)
    expect(row.generatedAt).toBe(T0)
    expect(row.sourceStatus).toContain('OK')
  })

  it('a store written for another contract is never adopted', () => {
    const s = store()
    saveDailyLedger(s, { ...appendReport(emptyDailyLedger(SUT_CONTRACT), report()).ledger, contract: '0xother' })
    expect(loadDailyLedger(s, SUT_CONTRACT).reports).toHaveLength(0)
  })

  it('the browser schedule only reports an intended time', () => {
    const l = emptyDailyLedger(SUT_CONTRACT)
    expect(nextExpectedSync(l, T0)).toBeNull()
    const on = { ...l, schedule: { enabled: true, hourUtc: 0 } }
    expect(nextExpectedSync(on, T0)).toBe('2026-10-03T00:00:00.000Z')
  })
})

// ───────────────────────────────── the shared service

describe('one service, two triggers', () => {
  it('the manual and scheduled runs use the same logic and produce the same data', async () => {
    const manual = await new DailyMarketSyncService({
      storage: new MemoryStorage(), fetcher: fixtureFetcher(), now: () => T0,
    }).run('MANUAL')
    const scheduled = await new DailyMarketSyncService({
      storage: new MemoryStorage(), fetcher: fixtureFetcher(), now: () => T0,
    }).run('SCHEDULED')
    expect(manual.report.trigger).toBe('MANUAL')
    expect(scheduled.report.trigger).toBe('SCHEDULED')
    expect(scheduled.report.contentFingerprint).toBe(manual.report.contentFingerprint)
    expect(scheduled.report.observations).toEqual(manual.report.observations)
    expect(manual.stored && scheduled.stored).toBe(true)
  })

  it('a second scheduled run over unchanged data writes nothing', async () => {
    const storage = new MemoryStorage()
    const svc = new DailyMarketSyncService({ storage, fetcher: fixtureFetcher(), now: () => T0 })
    await svc.run('SCHEDULED')
    const second = await svc.run('SCHEDULED')
    expect(second.stored).toBe(false)
    expect(second.duplicateOf).toBe('DMR-2026-10-02-1')
    expect(loadDailyLedger(storage, SUT_CONTRACT).reports).toHaveLength(1)
  })

  it('one failing source never aborts the others', async () => {
    const svc = new DailyMarketSyncService({
      storage: new MemoryStorage(), now: () => T0,
      fetcher: async (s) => {
        if (s.id === 'dexscreener-pair') throw new Error('socket hang up')
        return result(s.id)
      },
    })
    const r = await svc.run('SCHEDULED')
    expect(r.status).toBe('PARTIAL')
    expect(valueOf(r.report.observations, 'SUT price')).toBe(0.431152)
    expect(r.report.observations.find((o) => o.field === 'Pool liquidity (USD)')!.value).toBeNull()
  })

  it('only configured sources are called', () => {
    const svc = new DailyMarketSyncService({ storage: new MemoryStorage(), fetcher: fixtureFetcher() })
    const ids = svc.callableSources().map((s) => s.id)
    expect(ids).not.toContain('coinmarketcap')      // no key in this environment
    expect(ids).not.toContain('public-news')
    expect(ids).toContain('coingecko-token')
    const withKey = new DailyMarketSyncService({
      storage: new MemoryStorage(), fetcher: fixtureFetcher(), sources: sourcesWithCmc(),
    })
    expect(withKey.callableSources().map((s) => s.id)).toContain('coinmarketcap')
  })

  it('the cron schedule is 00:05 UTC daily', () => {
    expect(DAILY_CRON_SCHEDULE).toBe('5 0 * * *')
  })
})

// ───────────────────────────────── isolation from EXP-001

describe('governance isolation', () => {
  it('a completed sync changes no governance state', async () => {
    const storage = new MemoryStorage()
    const before = effectiveState(loadGovernanceLedger(storage), PRE_REGISTRATION)
    const r = await new DailyMarketSyncService({ storage, fetcher: fixtureFetcher(), now: () => T0 }).run('SCHEDULED')
    expect(r.stored).toBe(true)
    const after = effectiveState(loadGovernanceLedger(storage), PRE_REGISTRATION)
    expect(after.gate).toBe(before.gate)
    expect(after.gate).toBe('THRESHOLDS_PENDING')
    expect(after.state.thresholdsRegistered).toBe(0)
    expect(after.state.approvedBaselineRuns).toEqual([])
    expect(after.state.intervention).toBeNull()
    expect(after.state.comparison).toBeNull()
    expect(after.state.calculation).toBeNull()
    expect(after.state.finalReview).toBeNull()
    expect(loadGovernanceLedger(storage)).toEqual(emptyGovernanceLedger())
  })

  it('the daily layer declares that it touches nothing in the experiment', () => {
    expect(dailyLedgerTouchesGovernance(emptyDailyLedger(SUT_CONTRACT))).toBe(false)
    expect(serviceTouchesGovernance()).toBe(false)
  })

  it('the frozen pre-registration and baseline data are untouched by a sync', async () => {
    await new DailyMarketSyncService({
      storage: new MemoryStorage(), fetcher: fixtureFetcher(), now: () => T0,
    }).run('SCHEDULED')
    expect(registrationSummary(PRE_REGISTRATION).registered).toBe(0)
    expect(PRE_REGISTRATION.every((e) => e.successThreshold === null)).toBe(true)
    expect(PRE_REGISTRATION.find((e) => e.state === 'NOT_REGISTERABLE')!.standardisedSize)
      .toBe('$100,000 (both sides)')
  })

  it('a daily observation never becomes a measurement or a threshold', () => {
    const r = report()
    const text = JSON.stringify(r)
    expect(text).not.toContain('successThreshold')
    expect(text).not.toContain('provisionalResult')
    expect(text).not.toContain('REGISTERED')
    expect(fingerprintContent(r.observations, r.sources)).toBe(r.contentFingerprint)
  })
})
