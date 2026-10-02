/**
 * Evidence traceability: every displayed metric must be traceable to the
 * response it came from, with both stored timestamps, the identity, the
 * transport status and the SHA-256 of the preserved payload.
 *
 * These are read-only view helpers. Fixtures are controlled; no assertion
 * depends on a live market value.
 */
import { describe, expect, it } from 'vitest'
import {
  allMetricEvidence, buildRun, evidenceHeader, formatUtc, LIVE_SOURCES, metricEvidence, sha256Hex,
  SUT_CONTRACT, type LiveFetchResult, type LiveSource, type LiveSyncRun,
} from '../src/core/live-market-sync'
import { MemoryStorage } from '../src/core/live-market-store'
import { LiveMarketSyncService } from '../src/service/live-market-sync-service'
import { BASELINE_CAPTURES } from '../src/data/baseline-captures'
import { EVIDENCE, EVIDENCE_BY_ID } from '../src/data/evidence'
import { HYPOTHESIS_BY_ID } from '../src/data/hypotheses'
import { PRE_REGISTRATION, OBSERVED_BASELINE_IMPACTS } from '../src/data/pre-registration'
import { CONFLICTS, TIMELINE } from '../src/data/timeline'
import { effectiveState, emptyGovernanceLedger, loadGovernanceLedger } from '../src/core/governance-store'
import { registrationSummary } from '../src/core/pre-registration'

const T1 = '2026-10-01T14:27:15.253Z'
const T2 = '2026-10-01T14:27:25.663Z'
const TS = Math.floor(Date.parse('2026-10-01T14:27:00Z') / 1000)

const BODIES: Record<string, unknown> = {
  'coingecko-token': {
    [SUT_CONTRACT]: { usd: 0.426378, usd_market_cap: 0, usd_24h_vol: 90_243.75, usd_24h_change: 3.9587, last_updated_at: TS },
  },
  'coingecko-asset': {
    last_updated: '2026-10-01T14:27:00.000Z', market_cap_rank: null,
    market_data: { circulating_supply: 0, total_supply: 238_403_732, max_supply: 238_403_732 },
  },
  'dexscreener-pair': {
    pairs: [{
      chainId: 'polygon', dexId: 'uniswap', pairAddress: '0x092295c92BAB5e734c4a60DbC0F0FfdCdfC4E165',
      baseToken: { address: SUT_CONTRACT, symbol: 'SUT' },
      quoteToken: { address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', symbol: 'USDT' },
      priceUsd: '0.4250', liquidity: { usd: 93_876.36 }, volume: { h24: 35_749.29 }, priceChange: { h24: 3.33 },
    }],
  },
  'polygon-rpc': [
    { jsonrpc: '2.0', id: 1, result: '0x5a60a3e' },
    {
      jsonrpc: '2.0', id: 2,
      result: '0x000000000000000000000000000000000000000000000b055455128e6729c8fa'
        + 'fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffba7c6' + '0'.repeat(320),
    },
    { jsonrpc: '2.0', id: 3, result: { number: '0x5a60a3e', timestamp: `0x${TS.toString(16)}` } },
  ],
  'coingecko-majors': {
    bitcoin: { usd: 84_004, usd_24h_change: 0.1228, last_updated_at: TS },
    ethereum: { usd: 2_694.12, usd_24h_change: 0.3694, last_updated_at: TS },
  },
  'coingecko-global': null,
}

const fetchResult = (id: string, over: Partial<LiveFetchResult> = {}): LiveFetchResult => {
  const body = BODIES[id] ?? null
  const base: LiveFetchResult = id === 'coingecko-global'
    ? { sourceId: id, httpStatus: 429, bodyText: 'Throttled', parsed: null, error: null, retrievalTimestamp: T1 }
    : { sourceId: id, httpStatus: 200, bodyText: JSON.stringify(body), parsed: body, error: null, retrievalTimestamp: T1 }
  return { ...base, ...over }
}

const fixtureFetcher = async (s: LiveSource) => fetchResult(s.id)
const allResults = (over: Record<string, Partial<LiveFetchResult>> = {}) =>
  LIVE_SOURCES.map((s) => fetchResult(s.id, over[s.id] ?? {}))

const makeRun = async (over: { results?: LiveFetchResult[] } = {}): Promise<LiveSyncRun> => buildRun({
  results: over.results ?? allResults(), startedAt: T1, completedAt: T2, sequence: 1, trigger: 'MANUAL',
})

const ev = (run: LiveSyncRun, metric: string) => metricEvidence(run, metric)!

// ───────────────────────────── 1–6. every displayed metric is traceable

describe('every displayed metric carries full provenance', () => {
  it('exposes source, endpoint and methodology', async () => {
    const run = await makeRun()
    for (const m of allMetricEvidence(run)) {
      expect(m.source, m.metric).toBeTruthy()
      expect(m.endpoint, m.metric).toMatch(/^https:\/\//)
      expect(m.methodology, m.metric).toBeTruthy()
      expect(m.syncId).toBe('LMS-2026-10-01-001')
    }
    expect(ev(run, 'price').source).toBe('CoinGecko')
    expect(ev(run, 'price').endpoint).toContain(SUT_CONTRACT)
    expect(ev(run, 'pair_liquidity_usd').source).toBe('DexScreener')
    expect(ev(run, 'onchain_spot_price').source).toBe('Polygon RPC')
  })

  it('exposes both stored timestamps, never a generated one', async () => {
    const run = await makeRun()
    const price = ev(run, 'price')
    expect(price.retrievalTimestamp).toBe(T1)
    expect(price.observationTimestamp).toBe('2026-10-01T14:27:00.000Z')
    expect(price.observationTimestamp).not.toBe(price.retrievalTimestamp)
    // the values come straight from the stored observation
    const stored = run.observations.find((o) => o.metric === 'price')!
    expect(price.observationTimestamp).toBe(stored.observationTimestamp)
    expect(price.retrievalTimestamp).toBe(stored.retrievalTimestamp)
    for (const m of allMetricEvidence(run)) expect(m.retrievalTimestamp, m.metric).toBeTruthy()
  })

  it('formats a stored timestamp as UTC without converting it', () => {
    expect(formatUtc('2026-10-01T14:27:25.663Z')).toBe('2026-10-01 14:27:25 UTC')
    expect(formatUtc('2026-10-01T00:00:00.000Z')).toBe('2026-10-01 00:00:00 UTC')
    expect(formatUtc(null)).toBe('DATA UNAVAILABLE')
    expect(formatUtc('not-a-timestamp')).toBe('not-a-timestamp')
    // the hour digits are taken from the string, so no local offset can be applied
    expect(formatUtc('2026-10-01T23:59:59Z')).toContain('23:59:59')
  })

  it('exposes the asset identity, contract and chain for contract-verified metrics', async () => {
    const run = await makeRun()
    for (const metric of ['price', 'volume_24h', 'total_supply', 'onchain_spot_price', 'block_number']) {
      const m = ev(run, metric)
      expect(m.identityStatus, metric).toBe('CONTRACT_VERIFIED')
      expect(m.contractAddress, metric).toBe(SUT_CONTRACT)
      expect(m.chain, metric).toBe('polygon')
      expect(m.asset).toBe('Super Trust')
      expect(m.ticker).toBe('SUT')
    }
    const market = ev(run, 'btc_price')
    expect(market.identityStatus).toBe('NOT_APPLICABLE')
    expect(market.contractAddress).toBeNull()
    expect(market.ticker).toBe('BTC')
  })

  it('exposes venue and pair where the source provides them', async () => {
    const run = await makeRun()
    const pool = ev(run, 'pair_liquidity_usd')
    expect(pool.venue).toBe('uniswap')
    expect(pool.pair).toBe('SUT/USDT')
    const chain = ev(run, 'onchain_spot_price')
    expect(chain.venue).toBe('Uniswap V3 (Polygon)')
    expect(chain.pair).toBe('SUT/USDT')
    expect(ev(run, 'price').venue).toBeNull()
  })

  it('exposes the transport status and the SHA-256 of the preserved payload', async () => {
    const run = await makeRun()
    const price = ev(run, 'price')
    expect(price.httpStatus).toBe(200)
    expect(price.sourceStatus).toBe('VALIDATED')
    expect(price.payloadHash).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(price.payloadHash).toBe(await sha256Hex(price.payload))
    expect(price.payloadBytes).toBe(JSON.stringify(BODIES['coingecko-token']).length)
    expect(price.truncated).toBe(false)
    // every metric from the same source shares that evidence hash
    expect(ev(run, 'volume_24h').payloadHash).toBe(price.payloadHash)
    expect(ev(run, 'pair_liquidity_usd').payloadHash).not.toBe(price.payloadHash)
  })

  it('covers every row the UI displays', async () => {
    const run = await makeRun()
    const evidence = allMetricEvidence(run)
    expect(evidence).toHaveLength(run.snapshot.length)
    expect(evidence.map((m) => m.metric)).toEqual(run.snapshot.map((f) => f.metric))
    expect(metricEvidence(run, 'no_such_metric')).toBeNull()
  })
})

// ───────────────────────────── 7. unavailable values keep the real reason

describe('unavailable values', () => {
  it('carry the source-specific reason, never a zero', async () => {
    const run = await makeRun()
    const mcap = ev(run, 'market_cap')
    expect(mcap.value).toBeNull()
    expect(mcap.status).toBe('DATA_UNAVAILABLE')
    expect(mcap.reason).toContain('it reports 0, which is not a measurement')
    expect(mcap.httpStatus).toBe(200)          // the source answered; the field is simply absent
    expect(mcap.payloadHash).toMatch(/^sha256:/)

    const rank = ev(run, 'market_rank')
    expect(rank.value).toBeNull()
    expect(rank.reason).toContain('no market-cap rank')
  })

  it('distinguish an absent field from a failed source', async () => {
    const run = await makeRun()
    const global = ev(run, 'total_market_cap_usd')
    expect(global.value).toBeNull()
    expect(global.status).toBe('ERROR')
    expect(global.httpStatus).toBe(429)
    expect(global.sourceStatus).toBe('ERROR')
    expect(global.reason).toContain('rate-limited')

    const network = ev(await makeRun({
      results: allResults({ 'polygon-rpc': { httpStatus: null, bodyText: '', parsed: null, error: 'fetch failed' } }),
    }), 'onchain_spot_price')
    expect(network.status).toBe('ERROR')
    expect(network.httpStatus).toBeNull()
    expect(network.error).toBe('fetch failed')
    expect(network.payloadHash).toBeNull()
  })
})

// ───────────────────────────── header

describe('the evidence header summarises the run', () => {
  it('reports sync id, capture time, status, sources, observations and integrity', async () => {
    const run = await makeRun()
    const h = evidenceHeader(run)
    expect(h.syncId).toBe('LMS-2026-10-01-001')
    expect(h.capturedAt).toBe(T2)
    expect(formatUtc(h.capturedAt)).toBe('2026-10-01 14:27:25 UTC')
    expect(h.status).toBe('PARTIAL')
    expect(h.sourcesOk).toBe(5)
    expect(h.sourcesTotal).toBe(6)
    expect(h.observationsWithValue).toBeGreaterThan(0)
    expect(h.observationsTotal).toBe(run.observations.length)
    expect(h.integrity).toBe('OK')
  })

  it('reports TAMPERED when a stored run no longer matches its fingerprint', async () => {
    const run = await makeRun()
    const edited = { ...run, observations: run.observations.map((o, i) => (i === 0 ? { ...o, value: 99 } : o)) }
    expect(evidenceHeader(edited).integrity).toBe('TAMPERED')
  })
})

// ───────────────────────────── 8, 9, 10. nothing else changed

describe('the view layer changes nothing', () => {
  it('raw evidence is unchanged by reading it', async () => {
    const run = await makeRun()
    const before = JSON.stringify(run)
    const beforeHashes = run.evidence.map((e) => e.payloadHash)
    allMetricEvidence(run)
    evidenceHeader(run)
    allMetricEvidence(run)
    expect(JSON.stringify(run)).toBe(before)
    expect(run.evidence.map((e) => e.payloadHash)).toEqual(beforeHashes)
    // the payload shown is the payload stored
    const e = run.evidence.find((x) => x.sourceId === 'coingecko-token')!
    expect(ev(run, 'price').payload).toBe(e.payload)
    expect(ev(run, 'price').payloadBytes).toBe(e.payloadBytes)
  })

  it('a stored run round-trips through the service unchanged', async () => {
    const storage = new MemoryStorage()
    const out = await new LiveMarketSyncService({ storage, fetcher: fixtureFetcher, now: () => T1 }).run('MANUAL')
    const header = evidenceHeader(out.run)
    expect(header.integrity).toBe('OK')
    expect(allMetricEvidence(out.run).every((m) => m.syncId === out.run.id)).toBe(true)
  })

  it('frozen research and EXP-001 remain untouched', async () => {
    const before = JSON.stringify({
      hypotheses: [...HYPOTHESIS_BY_ID.values()], captures: BASELINE_CAPTURES, evidence: EVIDENCE,
      timeline: TIMELINE, conflicts: CONFLICTS, prereg: PRE_REGISTRATION,
      observedBaseline: OBSERVED_BASELINE_IMPACTS,
    })
    const run = await makeRun()
    allMetricEvidence(run)
    evidenceHeader(run)
    expect(JSON.stringify({
      hypotheses: [...HYPOTHESIS_BY_ID.values()], captures: BASELINE_CAPTURES, evidence: EVIDENCE,
      timeline: TIMELINE, conflicts: CONFLICTS, prereg: PRE_REGISTRATION,
      observedBaseline: OBSERVED_BASELINE_IMPACTS,
    })).toBe(before)
    expect(EVIDENCE_BY_ID.get('EV-901')!.value).toBeNull()
    expect(BASELINE_CAPTURES.find((c) => c.runId === 'RUN-003' && c.kpi === 'Price impact'
      && c.dimension === '$10,000 buy')!.value).toBe(10.64)
    const gov = effectiveState(loadGovernanceLedger(new MemoryStorage()), PRE_REGISTRATION)
    expect(gov.gate).toBe('THRESHOLDS_PENDING')
    expect(loadGovernanceLedger(new MemoryStorage())).toEqual(emptyGovernanceLedger())
    expect(registrationSummary(PRE_REGISTRATION).registered).toBe(0)
  })
})
