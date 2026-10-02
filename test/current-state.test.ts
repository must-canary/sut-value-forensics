/**
 * CURRENT — SUT MARKET STATE: layer separation, evidence linkage, candidate
 * actions and the permanent protection of the historical research.
 *
 * Fixtures are controlled; no assertion depends on a live market value.
 */
import { describe, expect, it } from 'vitest'
import {
  ACTION_STATES, actionStatus, assessCurrentState, assertMeasuredResultAllowed, buildCandidateAction,
  buildReportSections, CURRENT_STATE_QUESTION, LAYER_LABELS, observationsFor,
  assessmentExecutesAction, assessmentWritesHistory, StatementIntegrityError,
  type AssessmentInputs, type HistoricalAnchor,
} from '../src/core/daily-assessment'
import { buildReport, SOURCES, SUT_CONTRACT, valueOf, type DailyReport, type FetchResult } from '../src/core/daily-sync'
import { appendReport, emptyDailyLedger, loadDailyLedger, MemoryStorage, saveDailyLedger } from '../src/core/daily-store'
import { DailyMarketSyncService } from '../src/service/daily-market-sync-service'
import { baselineImpacts, historicalAnchors, registeredTargets } from '../src/data/current-state'
import { effectiveState, emptyGovernanceLedger, loadGovernanceLedger } from '../src/core/governance-store'
import { PRE_REGISTRATION, OBSERVED_BASELINE_IMPACTS } from '../src/data/pre-registration'
import { HYPOTHESIS_BY_ID } from '../src/data/hypotheses'
import { OPPORTUNITY_BY_ID } from '../src/data/opportunities'
import { BASELINE_CAPTURES } from '../src/data/baseline-captures'
import { EVIDENCE, EVIDENCE_BY_ID } from '../src/data/evidence'
import { CONFLICTS, TIMELINE } from '../src/data/timeline'
import { registrationSummary } from '../src/core/pre-registration'
import type { GovernanceState } from '../src/core/governance'

const T0 = '2026-10-02T00:05:00Z'
const TS = Math.floor(Date.parse('2026-10-02T00:00:00Z') / 1000)

const PAYLOADS: Record<string, unknown> = {
  'coingecko-token': {
    [SUT_CONTRACT]: { usd: 0.43, usd_market_cap: 0, usd_24h_vol: 97303.21, usd_24h_change: 4.5, last_updated_at: TS },
  },
  'coingecko-asset': {
    last_updated: '2026-10-02T00:00:00.000Z', market_cap_rank: null,
    market_data: { circulating_supply: 0, total_supply: 238403732, max_supply: 238403732 },
    tickers: [{ base: 'SUT', target: 'USDT', market: { name: 'Gate' } }],
  },
  'coingecko-majors': {
    bitcoin: { usd: 83920, usd_24h_change: 0.178, last_updated_at: TS },
    ethereum: { usd: 2704.71, usd_24h_change: 0.45, last_updated_at: TS },
  },
  'coingecko-global': { data: { total_market_cap: { usd: 2.9e12 }, market_cap_change_percentage_24h_usd: -0.42, updated_at: TS } },
  'dexscreener-pair': {
    pairs: [{
      pairAddress: '0x092295c92BAB5e734c4a60DbC0F0FfdCdfC4E165', priceUsd: '0.43',
      liquidity: { usd: 94440.93 }, volume: { h24: 41043.01 }, priceChange: { h24: 3.65 },
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
}

const result = (id: string, over: Partial<FetchResult> = {}): FetchResult => ({
  sourceId: id, ok: true, httpStatus: 200, body: PAYLOADS[id] ?? null, error: null, retrievedAt: T0, ...over,
})
const fixtureFetcher = async (s: { id: string }) => result(s.id)
const allResults = () => SOURCES.filter((s) => s.url !== '').map((s) => result(s.id))

const report = (over: Partial<Parameters<typeof buildReport>[0]> = {}): DailyReport => buildReport({
  results: allResults(), now: T0, retrievalStartedAt: T0, sequence: 1, previous: null, ...over,
})

const emptyGov = (): GovernanceState => ({
  thresholdsRegistered: 0, thresholdsRequired: 4, thresholdsComplete: false,
  approvedBaselineRuns: [], intervention: null, comparison: null, calculation: null, finalReview: null,
})

const inputs = (over: Partial<AssessmentInputs> = {}): AssessmentInputs => ({
  report: report(), previous: null, gov: emptyGov(), anchors: historicalAnchors(),
  baselineImpacts: baselineImpacts(), registeredTargets: registeredTargets(emptyGovernanceLedger()),
  ...over,
})

// ───────────────────────────── layer separation

describe('three separated layers', () => {
  it('labels the historical, current and governance layers distinctly', () => {
    expect(LAYER_LABELS.historical).toContain('HISTORICAL RESEARCH')
    expect(LAYER_LABELS.historical).toContain('FROZEN')
    expect(LAYER_LABELS.current).toBe('CURRENT — SUT MARKET STATE')
    expect(LAYER_LABELS.governance).toContain('EXPERIMENT & GOVERNANCE')
    expect(new Set(Object.values(LAYER_LABELS)).size).toBe(3)
  })

  it('states the single question the current layer answers', () => {
    expect(CURRENT_STATE_QUESTION).toContain('current observable condition')
    expect(assessCurrentState(inputs()).question).toBe(CURRENT_STATE_QUESTION)
  })

  it('declares that it executes nothing and writes no history', () => {
    expect(assessmentExecutesAction()).toBe(false)
    expect(assessmentWritesHistory()).toBe(false)
    expect(buildCandidateAction(inputs()).executedAutomatically).toBe(false)
  })
})

// ───────────────────────────── historical protection

describe('historical research is never modified', () => {
  it('a full sync leaves every frozen record byte-identical', async () => {
    const before = JSON.stringify({
      hypotheses: [...HYPOTHESIS_BY_ID.values()],
      opportunities: [...OPPORTUNITY_BY_ID.values()],
      captures: BASELINE_CAPTURES,
      evidence: EVIDENCE,
      timeline: TIMELINE,
      conflicts: CONFLICTS,
      prereg: PRE_REGISTRATION,
      observedBaseline: OBSERVED_BASELINE_IMPACTS,
    })
    const storage = new MemoryStorage()
    const r = await new DailyMarketSyncService({ storage, fetcher: fixtureFetcher, now: () => T0 }).run('SCHEDULED')
    expect(r.stored).toBe(true)
    assessCurrentState(inputs({ report: r.report }))
    const after = JSON.stringify({
      hypotheses: [...HYPOTHESIS_BY_ID.values()],
      opportunities: [...OPPORTUNITY_BY_ID.values()],
      captures: BASELINE_CAPTURES,
      evidence: EVIDENCE,
      timeline: TIMELINE,
      conflicts: CONFLICTS,
      prereg: PRE_REGISTRATION,
      observedBaseline: OBSERVED_BASELINE_IMPACTS,
    })
    expect(after).toBe(before)
  })

  it('RUN-001, RUN-002 and RUN-003 keep their captured values', () => {
    const impact = (runId: string, dim: string) => BASELINE_CAPTURES
      .find((c) => c.runId === runId && c.kpi === 'Price impact' && c.dimension === dim)?.value
    expect(impact('RUN-001', '$10,000 buy')).toBe(10.59)
    expect(impact('RUN-002', '$10,000 buy')).toBe(10.68)
    expect(impact('RUN-003', '$10,000 buy')).toBe(10.64)
    expect(impact('RUN-001', '$100,000 both sides')).toBeNull()
    expect(BASELINE_CAPTURES.every((c) => c.reviewerStatus === 'PENDING')).toBe(true)
  })

  it('the anchors are copies of the frozen records, marked frozen', () => {
    const anchors = historicalAnchors()
    const h2 = anchors.find((a) => a.id === 'H2')!
    expect(h2.kind).toBe('HYPOTHESIS')
    expect(h2.status).toBe('SUPPORTED')
    expect(h2.title).toBe(HYPOTHESIS_BY_ID.get('H2')!.title)
    expect(anchors.map((a) => a.id)).toEqual(
      expect.arrayContaining(['H2', 'OPP-01', 'RUN-001', 'RUN-002', 'RUN-003', 'EV-010', 'EV-014']))
    for (const a of anchors) expect(a.frozen).toBe(true)
    // mutating a returned anchor cannot reach the frozen store
    const copy: HistoricalAnchor = { ...h2, status: 'REJECTED' }
    expect(copy.status).toBe('REJECTED')
    expect(HYPOTHESIS_BY_ID.get('H2')!.status).toBe('SUPPORTED')
    expect(EVIDENCE_BY_ID.get('EV-010')!.value).toBe(26981)
  })

  it('the baseline the action quotes is read from the captured runs, not recomputed', () => {
    const b = baselineImpacts('RUN-003')
    expect(b.length).toBeGreaterThan(0)
    for (const row of b) {
      const source = BASELINE_CAPTURES.find((c) => c.runId === 'RUN-003' && c.kpi === 'Price impact' && c.dimension === row.size)!
      expect(row.value).toBe(typeof source.value === 'number' ? source.value : null)
      expect(row.evidenceId).toBe(source.evidenceId)
    }
  })
})

// ───────────────────────────── statement discipline

describe('observation, interpretation, proposal and measured result stay distinct', () => {
  it('a measured result is refused until a measurement AND a human review exist', () => {
    expect(() => assertMeasuredResultAllowed(emptyGov())).toThrow(StatementIntegrityError)
    expect(() => assertMeasuredResultAllowed({ ...emptyGov(), comparison: {} as never }))
      .toThrow(/calculated comparison/)
    expect(() => assertMeasuredResultAllowed({
      ...emptyGov(), comparison: {} as never, calculation: {} as never,
    })).toThrow(/named human review/)
    expect(() => assertMeasuredResultAllowed({
      ...emptyGov(), comparison: {} as never, calculation: {} as never, finalReview: {} as never,
    })).not.toThrow()
  })

  it('with no measurement the post-intervention field is a proposal, never a result', () => {
    const a = buildCandidateAction(inputs())
    expect(a.postInterventionMeasurement.kind).toBe('PROPOSAL')
    expect(a.postInterventionMeasurement.text).toContain('DATA UNAVAILABLE')
    expect(a.postInterventionMeasurement.text).toContain('no post-intervention measurement exists')
  })

  it('the proposal promises nothing and the expected effect is a metric, not an outcome', () => {
    const a = buildCandidateAction(inputs())
    expect(a.proposedAction.kind).toBe('PROPOSAL')
    expect(a.proposedAction.text).toContain('candidate for human decision')
    expect(a.expectedEffect.kind).toBe('EXPECTED_EFFECT')
    expect(a.expectedEffect.text).toContain('should fall')
    const text = `${a.proposedAction.text} ${a.expectedEffect.text} ${a.problemObserved.text}`.toLowerCase()
    for (const p of ['will increase the price', 'guaranteed', 'experiment succeeded', 'higher market rank']) {
      expect(text).not.toContain(p)
    }
  })

  it('the current condition is an interpretation that attributes nothing', () => {
    const a = buildCandidateAction(inputs())
    expect(a.problemObserved.kind).toBe('INTERPRETATION')
    expect(a.problemObserved.text).toContain('attributes nothing to it')
    expect(a.problemObserved.text).toContain('94,440.93 USD')
  })

  it('an unavailable liquidity reading states the gap instead of assuming a condition', () => {
    const noLiquidity = report({
      results: allResults().map((r) => (r.sourceId === 'dexscreener-pair' ? { ...r, ok: false, httpStatus: 500, body: null } : r)),
    })
    const a = buildCandidateAction(inputs({ report: noLiquidity }))
    expect(a.problemObserved.text).toContain('DATA UNAVAILABLE')
    expect(a.problemObserved.text).toContain('No condition is assumed')
  })
})

// ───────────────────────────── candidate action status machine

describe('candidate action status never skips a state', () => {
  it('stays PROPOSED until a threshold is registered and a baseline approved', () => {
    expect(actionStatus(emptyGov()).status).toBe('PROPOSED')
    expect(actionStatus({ ...emptyGov(), thresholdsComplete: true }).status).toBe('PROPOSED')
    expect(actionStatus({ ...emptyGov(), thresholdsComplete: true }).reason).toContain('no baseline run has been approved')
  })

  it('advances one state at a time with the governance chain', () => {
    const base = { ...emptyGov(), thresholdsComplete: true, approvedBaselineRuns: ['RUN-001'] }
    expect(actionStatus(base).status).toBe('APPROVED')
    const iv = { ...base, intervention: {} as never }
    expect(actionStatus(iv).status).toBe('INTERVENTION_EXECUTED')
    const cmp = { ...iv, comparison: {} as never }
    expect(actionStatus(cmp).status).toBe('MEASUREMENT_PENDING')
    const calc = { ...cmp, calculation: {} as never }
    expect(actionStatus(calc).status).toBe('MEASUREMENT_PENDING')
    expect(actionStatus(calc).reason).toContain('provisional until a named human')
    const reviewed = { ...calc, finalReview: { result: 'SUPPORTED', reviewer: 'F. Human', at: T0, evidenceIds: ['EV-100'] } as never }
    expect(actionStatus(reviewed).status).toBe('SUPPORTED')
  })

  it('reports the reviewed result verbatim, never a better one', () => {
    const base = {
      ...emptyGov(), thresholdsComplete: true, approvedBaselineRuns: ['RUN-001'],
      intervention: {} as never, comparison: {} as never, calculation: {} as never,
    }
    for (const r of ['SUPPORTED', 'REJECTED', 'INCONCLUSIVE', 'DATA_UNAVAILABLE'] as const) {
      const gov = { ...base, finalReview: { result: r, reviewer: 'F. Human', at: T0, evidenceIds: [] } as never }
      const expected = r === 'SUPPORTED' ? 'SUPPORTED' : r === 'REJECTED' ? 'REJECTED' : 'INCONCLUSIVE'
      expect(actionStatus(gov).status).toBe(expected)
    }
  })

  it('every state carries the next required human action, and none is automatic', () => {
    for (const s of ACTION_STATES) expect(s).toMatch(/^[A-Z_]+$/)
    const a = buildCandidateAction(inputs())
    expect(a.status).toBe('PROPOSED')
    expect(a.nextRequiredHumanAction).toContain('business owner')
    expect(a.target.every((t) => t.threshold === null)).toBe(true)
  })

  it('the live governance state drives the status — observing the market cannot advance it', async () => {
    const storage = new MemoryStorage()
    const r = await new DailyMarketSyncService({ storage, fetcher: fixtureFetcher, now: () => T0 }).run('MANUAL')
    const gov = effectiveState(loadGovernanceLedger(storage), PRE_REGISTRATION).state
    const a = buildCandidateAction(inputs({ report: r.report, gov }))
    expect(a.status).toBe('PROPOSED')
    expect(gov.thresholdsRegistered).toBe(0)
    expect(registrationSummary(PRE_REGISTRATION).registered).toBe(0)
  })
})

// ───────────────────────────── the twelve sections

describe('the twelve-section report', () => {
  it('builds every required section in order', () => {
    const sections = buildReportSections(inputs())
    expect(sections.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(sections.map((s) => s.title)).toEqual([
      'Current market snapshot', 'Supply snapshot', 'Liquidity / market structure',
      'Exchange / venue context', 'BTC / ETH context', 'Changes since the previous observation',
      'Historical evidence relevant to the current condition', 'Current problem / opportunity',
      'Candidate action', 'Expected measurable effect', 'Evidence required', 'Data quality / limitations',
    ])
  })

  it('uses the persisted observations, not a recomputation', () => {
    const r = report()
    const sections = buildReportSections(inputs({ report: r }))
    const snapshot = observationsFor(r, sections[0]!.fields)
    expect(snapshot.find((o) => o.field === 'SUT price')!.value).toBe(valueOf(r.observations, 'SUT price'))
    const supply = observationsFor(r, sections[1]!.fields)
    expect(supply.map((o) => o.field)).toContain('SUT total supply')
    expect(supply.map((o) => o.field)).toContain('SUT max supply')
    const venue = observationsFor(r, sections[3]!.fields)
    expect(venue.map((o) => o.field)).toContain('SUT venues')
  })

  it('section 7 cites the frozen records and marks them frozen', () => {
    const s7 = buildReportSections(inputs())[6]!
    expect(s7.statements.length).toBeGreaterThan(4)
    for (const st of s7.statements) {
      expect(st.kind).toBe('OBSERVATION')
      expect(st.text).toContain('FROZEN')
    }
    expect(s7.statements.map((x) => x.evidence[0])).toContain('H2')
    expect(s7.statements.map((x) => x.evidence[0])).toContain('RUN-003')
  })

  it('section 6 states day-over-day change only from stored observations', () => {
    const day1 = report()
    const day2 = buildReport({
      results: allResults().map((r) => (r.sourceId === 'coingecko-token'
        ? { ...r, body: { [SUT_CONTRACT]: { usd: 0.5, usd_market_cap: 0, usd_24h_vol: 90000, usd_24h_change: 1, last_updated_at: TS } } }
        : r)),
      now: '2026-10-03T00:05:00Z', retrievalStartedAt: '2026-10-03T00:05:00Z', sequence: 1, previous: day1,
    })
    const s6 = buildReportSections(inputs({ report: day2, previous: day1 }))[5]!
    expect(s6.statements.every((x) => x.kind === 'INTERPRETATION')).toBe(true)
    expect(s6.statements.map((x) => x.text).join(' ')).toContain('0.4300 → 0.5000')
  })
})

// ───────────────────────────── history, immutability, no backfill

describe('daily history', () => {
  it('each day is a separate record and an earlier day is never rewritten', () => {
    const d1 = report({ now: '2026-10-02T00:05:00Z', retrievalStartedAt: '2026-10-02T00:05:00Z' })
    const l1 = appendReport(emptyDailyLedger(SUT_CONTRACT), d1)
    const d2 = buildReport({
      results: allResults().map((r) => (r.sourceId === 'coingecko-token'
        ? { ...r, body: { [SUT_CONTRACT]: { usd: 0.5, usd_market_cap: 0, usd_24h_vol: 90000, usd_24h_change: 1, last_updated_at: TS } } }
        : r)),
      now: '2026-10-03T00:05:00Z', retrievalStartedAt: '2026-10-03T00:05:00Z', sequence: 1, previous: d1,
    })
    const l2 = appendReport(l1.ledger, d2)
    const s = new MemoryStorage()
    saveDailyLedger(s, l2.ledger)
    const back = loadDailyLedger(s, SUT_CONTRACT)
    expect(back.reports).toHaveLength(2)
    expect(back.reports[0]!.reportDate).toBe('2026-10-02')
    expect(back.reports[1]!.reportDate).toBe('2026-10-03')
    expect(valueOf(back.reports[0]!.observations, 'SUT price')).toBe(0.43)
    expect(valueOf(back.reports[1]!.observations, 'SUT price')).toBe(0.5)
  })

  it('a missing day is never filled in with today values', () => {
    const d1 = report({ now: '2026-10-02T00:05:00Z', retrievalStartedAt: '2026-10-02T00:05:00Z' })
    const d3 = buildReport({
      results: allResults().map((r) => (r.sourceId === 'coingecko-token'
        ? { ...r, body: { [SUT_CONTRACT]: { usd: 0.47, usd_market_cap: 0, usd_24h_vol: 80000, usd_24h_change: 2, last_updated_at: TS } } }
        : r)),
      now: '2026-10-04T00:05:00Z', retrievalStartedAt: '2026-10-04T00:05:00Z', sequence: 1, previous: d1,
    })
    const l = appendReport(appendReport(emptyDailyLedger(SUT_CONTRACT), d1).ledger, d3)
    const dates = l.ledger.reports.map((r) => r.reportDate)
    expect(dates).toEqual(['2026-10-02', '2026-10-04'])
    expect(dates).not.toContain('2026-10-03')          // the gap stays a gap
  })

  it('today data is never presented as a historical observation', () => {
    const r = report()
    expect(r.reportDate).toBe('2026-10-02')
    for (const o of r.observations) {
      if (o.dataTimestamp) expect(Date.parse(o.dataTimestamp)).toBeLessThanOrEqual(Date.parse(r.generatedAt))
    }
    // the frozen capture dates are untouched by any daily record
    expect(BASELINE_CAPTURES.filter((c) => c.experimentId === 'EXP-001')
      .every((c) => c.observationTime.startsWith('2026-09-30'))).toBe(true)
  })
})
