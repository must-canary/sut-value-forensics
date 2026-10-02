/**
 * Live market sync: immutable runs, raw evidence, identity safety, comparison,
 * and the permanent protection of the frozen research and EXP-001 governance.
 *
 * Every payload is a CONTROLLED FIXTURE. No assertion depends on a live value.
 */
import { describe, expect, it } from 'vitest'
import {
  buildRun, buildSnapshot, checkRunIntegrity, compareRuns, DEFERRED_SOURCES, LIVE_SOURCES,
  liveSyncMutatesGovernance, liveSyncMutatesResearch, liveSyncProducesResult, sha256Hex,
  SUT_CONTRACT, SUT_POOL, syncId,
  type LiveFetchResult, type LiveSource, type LiveSyncRun,
} from '../src/core/live-market-sync'
import {
  appendRun, emptyLiveLedger, exportRun, latestRun, LIVE_STORE_KEY, loadLiveLedger, MemoryStorage,
  nextSequence, previousRunOf, runRows, saveLiveLedger, type LiveLedger,
} from '../src/core/live-market-store'
import { LiveMarketSyncService, liveServiceTouchesGovernance } from '../src/service/live-market-sync-service'
import { assessLiveRun, assessmentApprovesNothing } from '../src/core/live-assessment'
import { historicalAnchors } from '../src/data/current-state'
import { effectiveState, emptyGovernanceLedger, loadGovernanceLedger } from '../src/core/governance-store'
import { PRE_REGISTRATION, OBSERVED_BASELINE_IMPACTS } from '../src/data/pre-registration'
import { HYPOTHESIS_BY_ID } from '../src/data/hypotheses'
import { OPPORTUNITY_BY_ID } from '../src/data/opportunities'
import { BASELINE_CAPTURES } from '../src/data/baseline-captures'
import { EVIDENCE } from '../src/data/evidence'
import { CONFLICTS, TIMELINE } from '../src/data/timeline'
import { registrationSummary } from '../src/core/pre-registration'
import type { GovernanceState } from '../src/core/governance'

const T1 = '2026-10-02T00:05:00Z'
const T2 = '2026-10-02T00:05:09Z'
const TS = Math.floor(Date.parse('2026-10-02T00:00:00Z') / 1000)

const BODIES: Record<string, unknown> = {
  'coingecko-token': {
    [SUT_CONTRACT]: {
      usd: 0.43, usd_market_cap: 0, usd_24h_vol: 97_303.21, usd_24h_change: 4.5, last_updated_at: TS,
    },
  },
  'coingecko-asset': {
    last_updated: '2026-10-02T00:00:00.000Z', market_cap_rank: null,
    market_data: { circulating_supply: 0, total_supply: 238_403_732, max_supply: 238_403_732 },
  },
  'dexscreener-pair': {
    pairs: [{
      chainId: 'polygon', dexId: 'uniswap', pairAddress: '0x092295c92BAB5e734c4a60DbC0F0FfdCdfC4E165',
      baseToken: { address: SUT_CONTRACT, symbol: 'SUT' },
      quoteToken: { address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', symbol: 'USDT' },
      priceUsd: '0.43', liquidity: { usd: 94_440.93 }, volume: { h24: 41_043.01 }, priceChange: { h24: 3.65 },
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
    bitcoin: { usd: 83_920, usd_24h_change: 0.178, last_updated_at: TS },
    ethereum: { usd: 2_704.71, usd_24h_change: 0.45, last_updated_at: TS },
  },
  'coingecko-global': {
    data: { total_market_cap: { usd: 2.9e12 }, market_cap_change_percentage_24h_usd: -0.42, updated_at: TS },
  },
}

const fetchResult = (id: string, over: Partial<LiveFetchResult> = {}): LiveFetchResult => {
  const body = BODIES[id] ?? null
  return {
    sourceId: id, httpStatus: 200, bodyText: JSON.stringify(body), parsed: body,
    error: null, retrievalTimestamp: T1, ...over,
  }
}

const fixtureFetcher = async (s: LiveSource) => fetchResult(s.id)
const allResults = (over: Record<string, Partial<LiveFetchResult>> = {}) =>
  LIVE_SOURCES.map((s) => fetchResult(s.id, over[s.id] ?? {}))

const makeRun = async (
  over: { results?: LiveFetchResult[]; sequence?: number; completedAt?: string; trigger?: 'MANUAL' | 'SCHEDULED' } = {},
): Promise<LiveSyncRun> => buildRun({
  results: over.results ?? allResults(),
  startedAt: T1,
  completedAt: over.completedAt ?? T2,
  sequence: over.sequence ?? 1,
  trigger: over.trigger ?? 'MANUAL',
})

const emptyGov = (): GovernanceState => ({
  thresholdsRegistered: 0, thresholdsRequired: 4, thresholdsComplete: false,
  approvedBaselineRuns: [], intervention: null, comparison: null, calculation: null, finalReview: null,
})

const metric = (run: LiveSyncRun, m: string) => run.observations.find((o) => o.metric === m)!
const snap = (run: LiveSyncRun, m: string) => run.snapshot.find((f) => f.metric === m)!

// ───────────────────────────── 1, 2. immutable, appended runs

describe('sync runs are immutable and append-only', () => {
  it('creates a run with a dated sync id and a full observation set', async () => {
    const run = await makeRun()
    expect(run.id).toBe('LMS-2026-10-02-001')
    expect(syncId('2026-10-02', 7)).toBe('LMS-2026-10-02-007')
    expect(run.trigger).toBe('MANUAL')
    expect(run.startedAt).toBe(T1)
    expect(run.completedAt).toBe(T2)
    expect(run.status).toBe('VALIDATED')
    expect(run.observations.length).toBeGreaterThan(15)
    expect(run.evidence).toHaveLength(LIVE_SOURCES.length)
    expect(checkRunIntegrity(run)).toBe('OK')
  })

  it('repeated syncs create separate records and never overwrite', async () => {
    const first = appendRun(emptyLiveLedger(SUT_CONTRACT), await makeRun())
    expect(first.stored).toBe(true)
    const second = appendRun(first.ledger, await makeRun({
      sequence: nextSequence(first.ledger, T2), completedAt: T2,
      results: allResults({ 'coingecko-token': { bodyText: JSON.stringify({ [SUT_CONTRACT]: { usd: 0.5, usd_market_cap: 0, usd_24h_vol: 1, usd_24h_change: 1, last_updated_at: TS } }), parsed: { [SUT_CONTRACT]: { usd: 0.5, usd_market_cap: 0, usd_24h_vol: 1, usd_24h_change: 1, last_updated_at: TS } } } }),
    }))
    expect(second.stored).toBe(true)
    expect(second.ledger.runs.map((r) => r.id)).toEqual(['LMS-2026-10-02-001', 'LMS-2026-10-02-002'])
    // an identical repeat is still its own record — every retrieval is evidence
    expect(snap(second.ledger.runs[0]!, 'price').value).toBe(0.43)
    expect(snap(second.ledger.runs[1]!, 'price').value).toBe(0.5)
  })

  it('an existing sync id is refused, and a tampered run is detected', async () => {
    const run = await makeRun()
    const l = appendRun(emptyLiveLedger(SUT_CONTRACT), run)
    expect(appendRun(l.ledger, run).problems.join(' ')).toContain('already exists and is immutable')

    const s = new MemoryStorage()
    saveLiveLedger(s, l.ledger)
    const raw = JSON.parse(s.getItem(LIVE_STORE_KEY)!) as LiveLedger
    raw.runs[0]!.observations[0]!.value = 99
    s.setItem(LIVE_STORE_KEY, JSON.stringify(raw))
    const back = loadLiveLedger(s, SUT_CONTRACT)
    expect(checkRunIntegrity(back.runs[0]!)).toBe('TAMPERED')
    expect(latestRun(back)).toBeNull()
    expect(runRows(back)[0]!.integrity).toBe('TAMPERED')
  })

  it('survives a storage round-trip with its evidence intact', async () => {
    const s = new MemoryStorage()
    saveLiveLedger(s, appendRun(emptyLiveLedger(SUT_CONTRACT), await makeRun()).ledger)
    const back = loadLiveLedger(s, SUT_CONTRACT)
    expect(back.runs).toHaveLength(1)
    expect(back.runs[0]!.evidence).toHaveLength(LIVE_SOURCES.length)
    expect(JSON.parse(exportRun(back.runs[0]!)).id).toBe('LMS-2026-10-02-001')
  })
})

// ───────────────────────────── 3, 4, 5. raw evidence and timestamps

describe('raw evidence and timestamps', () => {
  it('preserves the verbatim payload, its byte count and a SHA-256', async () => {
    const run = await makeRun()
    const e = run.evidence.find((x) => x.sourceId === 'coingecko-token')!
    expect(e.endpoint).toContain(SUT_CONTRACT)
    expect(e.method).toBe('GET')
    expect(e.httpStatus).toBe(200)
    expect(e.payloadBytes).toBe(JSON.stringify(BODIES['coingecko-token']).length)
    expect(e.payload).toBe(JSON.stringify(BODIES['coingecko-token']))
    expect(e.payloadHash).toMatch(/^sha256:[0-9a-f]{64}$/)
    expect(e.payloadHash).toBe(await sha256Hex(e.payload))
    expect(e.truncated).toBe(false)
    expect(e.status).toBe('VALIDATED')
  })

  it('every observation carries both timestamps, source, endpoint and the payload hash', async () => {
    const run = await makeRun()
    for (const o of run.observations) {
      expect(o.id).toMatch(/^LMS-2026-10-02-001-OBS-\d{3}$/)
      expect(o.retrievalTimestamp).toBe(T1)
      expect(o.source).toBeTruthy()
      expect(o.endpoint).toBeTruthy()
      expect(o.methodology).toBeTruthy()
      expect(o.rawPayloadHash).toMatch(/^sha256:[0-9a-f]{64}$/)
      expect(o.rawPayload.length).toBeGreaterThan(0)
    }
    expect(metric(run, 'price').observationTimestamp).toBe('2026-10-02T00:00:00.000Z')
    expect(metric(run, 'price').observationTimestamp).not.toBe(metric(run, 'price').retrievalTimestamp)
    expect(metric(run, 'block_timestamp').value).toBe('2026-10-02T00:00:00.000Z')
  })

  it('records an error with its reason and the HTTP status', async () => {
    const run = await makeRun({
      results: allResults({ 'coingecko-global': { httpStatus: 429, bodyText: 'Throttled', parsed: null, error: null } }),
    })
    const e = run.evidence.find((x) => x.sourceId === 'coingecko-global')!
    expect(e.status).toBe('ERROR')
    expect(e.httpStatus).toBe(429)
    expect(e.payload).toBe('Throttled')
    expect(metric(run, 'total_market_cap_usd').status).toBe('ERROR')
    expect(metric(run, 'total_market_cap_usd').value).toBeNull()
    expect(metric(run, 'total_market_cap_usd').limitation).toContain('rate-limited')
    expect(run.status).toBe('PARTIAL')
  })

  it('a network failure is recorded, never silently dropped', async () => {
    const run = await makeRun({
      results: allResults({ 'polygon-rpc': { httpStatus: null, bodyText: '', parsed: null, error: 'fetch failed' } }),
    })
    const e = run.evidence.find((x) => x.sourceId === 'polygon-rpc')!
    expect(e.status).toBe('ERROR')
    expect(e.error).toBe('fetch failed')
    expect(e.payloadHash).toBeNull()
    expect(metric(run, 'onchain_spot_price').limitation).toContain('fetch failed')
  })
})

// ───────────────────────────── 6, 7. missing data

describe('missing data', () => {
  it('becomes DATA_UNAVAILABLE with the real reason, never zero', async () => {
    const run = await makeRun()
    for (const m of ['market_cap', 'circulating_supply', 'market_rank']) {
      const o = metric(run, m)
      expect(o.value).toBeNull()
      expect(o.status).toBe('DATA_UNAVAILABLE')
      expect(o.limitation).toBeTruthy()
    }
    expect(metric(run, 'market_cap').limitation).toContain('0, which is not a measurement')
    expect(metric(run, 'circulating_supply').limitation).toContain('it reports 0')
    // and the snapshot shows nothing rather than a zero
    expect(snap(run, 'market_cap').value).toBeNull()
    expect(snap(run, 'market_cap').reason).toContain('not a measurement')
  })

  it('the snapshot is built only from valid observations', async () => {
    const run = await makeRun({
      results: allResults({ 'coingecko-token': { httpStatus: 500, bodyText: '{}', parsed: {}, error: null } }),
    })
    expect(snap(run, 'price').value).toBeNull()
    expect(snap(run, 'price').status).toBe('ERROR')
    expect(snap(run, 'price').reason).toContain('HTTP 500')
    expect(snap(run, 'pair_liquidity_usd').value).toBe(94_440.93)   // other sources unaffected
  })

  it('a metric no source supplies is reported as such', () => {
    const fields = buildSnapshot([])
    expect(fields.every((f) => f.value === null)).toBe(true)
    expect(fields[0]!.reason).toContain('no source in this run supplies this metric')
  })
})

// ───────────────────────────── 8, 9, 10. identity safety

describe('identity safety', () => {
  it('v1 depends on no credentialed API and defers CoinMarketCap', () => {
    expect(LIVE_SOURCES.map((s) => s.id)).not.toContain('coinmarketcap')
    expect(DEFERRED_SOURCES[0].id).toBe('coinmarketcap')
    expect(DEFERRED_SOURCES[0].reason).toContain('collision-prone')
    expect(JSON.stringify(LIVE_SOURCES)).not.toMatch(/api[_-]?key/i)
  })

  it('validates the Polygon contract identity on contract-addressed sources', async () => {
    const run = await makeRun()
    // identity is asserted for every contract-addressed metric…
    for (const m of ['price', 'volume_24h', 'circulating_supply', 'onchain_spot_price', 'block_number']) {
      const o = metric(run, m)
      expect(o.contractAddress).toBe(SUT_CONTRACT)
      expect(o.chain).toBe('polygon')
      expect(o.identityStatus).toBe('CONTRACT_VERIFIED')
    }
    // …and VALIDATED only where the source actually published a value
    for (const m of ['price', 'volume_24h', 'total_supply', 'onchain_spot_price', 'block_number']) {
      expect(metric(run, m).status, m).toBe('VALIDATED')
    }
    // circulating supply is published as 0 by the source, so it stays unavailable
    expect(metric(run, 'circulating_supply').status).toBe('DATA_UNAVAILABLE')
    expect(LIVE_SOURCES.filter((s) => s.identityStatus === 'CONTRACT_VERIFIED')
      .every((s) => s.endpoint.includes(SUT_CONTRACT) || s.endpoint.includes('rpc'))).toBe(true)
  })

  it('preserves the DexScreener pair identity and refuses any other pool', async () => {
    const run = await makeRun()
    const o = metric(run, 'pair_liquidity_usd')
    expect(o.venue).toBe('uniswap')
    expect(o.pair).toBe('SUT/USDT')
    expect(o.chain).toBe('polygon')
    expect(o.identityStatus).toBe('CONTRACT_VERIFIED')   // base token address matches
    expect(metric(run, 'pair_address').value).toBe('0x092295c92BAB5e734c4a60DbC0F0FfdCdfC4E165')

    const wrongPool = {
      pairs: [{ chainId: 'bsc', dexId: 'pancake', pairAddress: '0xdeadbeef', priceUsd: '9.99' }],
    }
    const other = await makeRun({
      results: allResults({ 'dexscreener-pair': { bodyText: JSON.stringify(wrongPool), parsed: wrongPool } }),
    })
    expect(metric(other, 'pair_liquidity_usd').value).toBeNull()
    expect(metric(other, 'pair_liquidity_usd').limitation).toContain(SUT_POOL)
    expect(metric(other, 'pair_liquidity_usd').limitation).toContain('no other pair is substituted')
  })

  it('a ticker-only observation is isolated and never merged into contract-verified data', async () => {
    const tickerOnlySource: LiveSource = {
      id: 'ticker-only-demo', name: 'Ticker-only venue', endpoint: 'https://example.invalid/ticker/SUT',
      method: 'GET', identityStatus: 'TICKER_ONLY',
      methodology: 'ticker lookup; no contract address published',
      metrics: ['price'],
    }
    const run = await buildRun({
      results: [
        fetchResult('coingecko-token'),
        { sourceId: 'ticker-only-demo', httpStatus: 200, bodyText: '{"price":9.99}', parsed: { price: 9.99 }, error: null, retrievalTimestamp: T1 },
      ],
      sources: [LIVE_SOURCES[0]!, tickerOnlySource],
      startedAt: T1, completedAt: T2, sequence: 1, trigger: 'MANUAL',
    })
    const contractPrice = run.observations.find((o) => o.identityStatus === 'CONTRACT_VERIFIED' && o.metric === 'price')!
    const tickerPrice = run.observations.find((o) => o.identityStatus === 'TICKER_ONLY')!
    expect(contractPrice.value).toBe(0.43)
    expect(contractPrice.contractAddress).toBe(SUT_CONTRACT)
    expect(tickerPrice.contractAddress).toBe(SUT_CONTRACT)   // the field is present…
    expect(tickerPrice.identityStatus).toBe('TICKER_ONLY')   // …but identity is NOT claimed
    // the snapshot takes the contract-verified value, not the ticker-only one
    expect(snap(run, 'price').value).toBe(0.43)
    expect(snap(run, 'price').identityStatus).toBe('CONTRACT_VERIFIED')
  })
})

// ───────────────────────────── 11, 12. comparison

describe('comparison with the previous sync', () => {
  const movedToken = {
    [SUT_CONTRACT]: { usd: 0.4515, usd_market_cap: 0, usd_24h_vol: 100_000, usd_24h_change: 1, last_updated_at: TS },
  }

  it('compares two runs metric by metric', async () => {
    const first = await makeRun()
    const second = await makeRun({
      sequence: 2,
      results: allResults({ 'coingecko-token': { bodyText: JSON.stringify(movedToken), parsed: movedToken } }),
    })
    const price = compareRuns(second, first).find((c) => c.metric === 'price')!
    expect(price.previousValue).toBe(0.43)
    expect(price.currentValue).toBe(0.4515)
    expect(price.absoluteChange).toBeCloseTo(0.0215, 10)
    expect(price.percentChange).toBeCloseTo(5, 6)
    expect(price.status).toBe('COMPARED')
    expect(price.previousTimestamp).toBeTruthy()
    expect(price.currentTimestamp).toBeTruthy()
    expect(price.source).toContain('CoinGecko')
  })

  it('reports COMPARISON UNAVAILABLE instead of inferring a missing value', async () => {
    const first = await makeRun()
    expect(compareRuns(first, null).every((c) => c.status === 'COMPARISON_UNAVAILABLE')).toBe(true)
    expect(compareRuns(first, null)[0]!.reason).toBe('no earlier sync is stored')

    const broken = await makeRun({
      sequence: 2,
      results: allResults({ 'coingecko-token': { httpStatus: 500, bodyText: '{}', parsed: {}, error: null } }),
    })
    const afterBreak = compareRuns(broken, first).find((c) => c.metric === 'price')!
    expect(afterBreak.status).toBe('COMPARISON_UNAVAILABLE')
    expect(afterBreak.absoluteChange).toBeNull()
    expect(afterBreak.percentChange).toBeNull()
    expect(afterBreak.reason).toContain('not a comparable number')

    const recovered = compareRuns(await makeRun({ sequence: 3 }), broken).find((c) => c.metric === 'price')!
    expect(recovered.status).toBe('COMPARISON_UNAVAILABLE')
    expect(recovered.reason).toContain('previous sync has no comparable value')
  })

  it('a percentage is only produced when it is mathematically valid', async () => {
    const zero = { [SUT_CONTRACT]: { usd: 0, usd_market_cap: 0, usd_24h_vol: 0, usd_24h_change: 0, last_updated_at: TS } }
    const first = await makeRun({
      results: allResults({ 'coingecko-token': { bodyText: JSON.stringify(zero), parsed: zero } }),
    })
    const second = await makeRun({ sequence: 2 })
    const c = compareRuns(second, first).find((m) => m.metric === 'price')!
    expect(c.previousValue).toBe(0)
    expect(c.absoluteChange).toBe(0.43)
    expect(c.percentChange).toBeNull()
    expect(c.reason).toContain('percentage change is undefined against a previous value of 0')
  })
})

// ───────────────────────────── 13, 14, 15. frozen layers

describe('frozen layers are untouched', () => {
  const snapshotOfFrozen = () => JSON.stringify({
    hypotheses: [...HYPOTHESIS_BY_ID.values()],
    opportunities: [...OPPORTUNITY_BY_ID.values()],
    captures: BASELINE_CAPTURES,
    evidence: EVIDENCE,
    timeline: TIMELINE,
    conflicts: CONFLICTS,
    prereg: PRE_REGISTRATION,
    observedBaseline: OBSERVED_BASELINE_IMPACTS,
  })

  it('research files are byte-identical before and after a sync', async () => {
    const before = snapshotOfFrozen()
    const storage = new MemoryStorage()
    const out = await new LiveMarketSyncService({ storage, fetcher: fixtureFetcher, now: () => T1 }).run('MANUAL')
    expect(out.stored).toBe(true)
    assessLiveRun({ run: out.run, previous: null, gov: emptyGov(), anchors: historicalAnchors() })
    expect(snapshotOfFrozen()).toBe(before)
  })

  it('EXP-001 baseline values remain unchanged', async () => {
    const storage = new MemoryStorage()
    await new LiveMarketSyncService({ storage, fetcher: fixtureFetcher, now: () => T1 }).run('MANUAL')
    const impact = (runId: string, dim: string) => BASELINE_CAPTURES
      .find((c) => c.runId === runId && c.kpi === 'Price impact' && c.dimension === dim)?.value
    expect(impact('RUN-001', '$10,000 buy')).toBe(10.59)
    expect(impact('RUN-002', '$10,000 buy')).toBe(10.68)
    expect(impact('RUN-003', '$10,000 buy')).toBe(10.64)
    expect(impact('RUN-003', '$100,000 both sides')).toBeNull()
    expect(BASELINE_CAPTURES.every((c) => c.reviewerStatus === 'PENDING')).toBe(true)
  })

  it('governance remains unchanged and the gate does not move', async () => {
    const storage = new MemoryStorage()
    await new LiveMarketSyncService({ storage, fetcher: fixtureFetcher, now: () => T1 }).run('SCHEDULED')
    const gov = effectiveState(loadGovernanceLedger(storage), PRE_REGISTRATION)
    expect(gov.gate).toBe('THRESHOLDS_PENDING')
    expect(loadGovernanceLedger(storage)).toEqual(emptyGovernanceLedger())
    expect(registrationSummary(PRE_REGISTRATION).registered).toBe(0)
    expect(liveSyncMutatesGovernance()).toBe(false)
    expect(liveSyncMutatesResearch()).toBe(false)
    expect(liveServiceTouchesGovernance()).toBe(false)
  })
})

// ───────────────────────────── 16. proposal is never a result

describe('a proposal never becomes a measured result', () => {
  it('the assessment stays PROPOSED and states that nothing is approved', async () => {
    const run = await makeRun()
    const a = assessLiveRun({ run, previous: null, gov: emptyGov(), anchors: historicalAnchors() })
    expect(a.status).toBe('PROPOSED')
    expect(a.proposedAction.kind).toBe('PROPOSAL')
    expect(a.expectedEffect.kind).toBe('EXPECTED_EFFECT')
    expect(a.observation.every((s) => s.kind === 'OBSERVATION')).toBe(true)
    expect(a.interpretation.every((s) => s.kind === 'INTERPRETATION')).toBe(true)
    expect(a.evidenceRequired.every((s) => s.kind === 'PROPOSAL')).toBe(true)
    expect(JSON.stringify(a)).not.toContain('MEASURED_RESULT')
    expect(a.statusNote).toContain('not a measured result')
    expect(a.governanceGateNote).toContain('no registered success threshold')
    expect(liveSyncProducesResult()).toBe(false)
    expect(assessmentApprovesNothing()).toBe(false)
  })

  it('observations are stated side by side without a causal claim', async () => {
    const a = assessLiveRun({ run: await makeRun(), previous: null, gov: emptyGov(), anchors: historicalAnchors() })
    const text = [...a.observation, ...a.interpretation, a.problemOpportunity, a.proposedAction]
      .map((s) => s.text).join(' ')
    expect(text).toContain('no causal relationship')
    expect(text.toLowerCase()).not.toContain('caused')
    expect(text.toLowerCase()).not.toContain('because of')
    for (const p of ['will increase the price', 'guaranteed', 'experiment succeeded', 'higher market rank']) {
      expect(text.toLowerCase()).not.toContain(p)
    }
  })

  it('references only the frozen evidence that is actually relevant', async () => {
    const a = assessLiveRun({ run: await makeRun(), previous: null, gov: emptyGov(), anchors: historicalAnchors() })
    const ids = a.historicalEvidence.map((h) => h.id)
    expect(ids).toContain('H2')
    expect(ids).toContain('OPP-01')
    expect(ids).toContain('RUN-003')
    expect(a.historicalEvidence.every((h) => h.frozen === true)).toBe(true)
  })
})

// ───────────────────────────── 17, 18. secrets and shared service

describe('secrets and the shared service', () => {
  it('no credential is persisted in the ledger or the raw evidence', async () => {
    const storage = new MemoryStorage()
    await new LiveMarketSyncService({ storage, fetcher: fixtureFetcher, now: () => T1 }).run('MANUAL')
    const raw = storage.getItem(LIVE_STORE_KEY) ?? ''
    expect(raw.length).toBeGreaterThan(0)
    expect(raw).not.toContain('X-CMC_PRO_API_KEY')
    expect(raw).not.toMatch(/api[_-]?key/i)
    expect(raw).not.toMatch(/authorization/i)
    expect(raw).not.toContain('Bearer ')
  })

  it('manual and scheduled syncs use the same service and produce the same observations', async () => {
    const manual = await new LiveMarketSyncService({
      storage: new MemoryStorage(), fetcher: fixtureFetcher, now: () => T1,
    }).run('MANUAL')
    const scheduled = await new LiveMarketSyncService({
      storage: new MemoryStorage(), fetcher: fixtureFetcher, now: () => T1,
    }).run('SCHEDULED')
    expect(manual.run.trigger).toBe('MANUAL')
    expect(scheduled.run.trigger).toBe('SCHEDULED')
    const strip = (r: LiveSyncRun) => r.observations.map(({ id: _i, ...o }) => o)
    expect(strip(scheduled.run)).toEqual(strip(manual.run))
    expect(scheduled.run.evidence.map((e) => e.payloadHash)).toEqual(manual.run.evidence.map((e) => e.payloadHash))
  })

  it('one failing source never aborts the others', async () => {
    const out = await new LiveMarketSyncService({
      storage: new MemoryStorage(), now: () => T1,
      fetcher: async (s) => {
        if (s.id === 'coingecko-asset') throw new Error('socket hang up')
        return fetchResult(s.id)
      },
    }).run('SCHEDULED')
    expect(out.run.status).toBe('PARTIAL')
    expect(snap(out.run, 'price').value).toBe(0.43)
    expect(snap(out.run, 'total_supply').value).toBeNull()
    expect(metric(out.run, 'total_supply').limitation).toContain('socket hang up')
  })

  it('a ledger written for another contract is never adopted', async () => {
    const s = new MemoryStorage()
    saveLiveLedger(s, { ...appendRun(emptyLiveLedger(SUT_CONTRACT), await makeRun()).ledger, contract: '0xother' })
    expect(loadLiveLedger(s, SUT_CONTRACT).runs).toHaveLength(0)
  })

  it('previousRunOf walks the stored history, not the clock', async () => {
    let l = emptyLiveLedger(SUT_CONTRACT)
    l = appendRun(l, await makeRun({ sequence: 1 })).ledger
    l = appendRun(l, await makeRun({ sequence: 2, completedAt: '2026-10-03T00:05:09Z' })).ledger
    const last = latestRun(l)!
    expect(last.id).toBe('LMS-2026-10-03-002')
    expect(previousRunOf(l, last)!.id).toBe('LMS-2026-10-02-001')
    expect(previousRunOf(l, l.runs[0]!)).toBeNull()
  })
})
