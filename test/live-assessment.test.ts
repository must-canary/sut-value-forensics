/**
 * The live market assessment: current data → current condition → historical
 * evidence → problem/opportunity → proposed action → expected measurable
 * effect → evidence required → human decision.
 *
 * Fixtures are controlled; no assertion depends on a live market value.
 */
import { describe, expect, it } from 'vitest'
import {
  assertAssessmentLanguage, assessLiveRun, AssessmentLanguageError, assessmentApprovesNothing,
  assessmentExecutesIntervention, assessmentProducesMeasuredResult, ASSESSMENT_STATES, FORBIDDEN_CLAIMS,
  type LiveAssessment,
} from '../src/core/live-assessment'
import {
  buildRun, LIVE_SOURCES, SUT_CONTRACT, type LiveFetchResult, type LiveSource, type LiveSyncRun,
} from '../src/core/live-market-sync'
import { MemoryStorage } from '../src/core/live-market-store'
import { LiveMarketSyncService } from '../src/service/live-market-sync-service'
import { baselineImpacts, historicalAnchors } from '../src/data/current-state'
import { PROPOSED_THRESHOLDS } from '../src/data/proposed-thresholds'
import { BASELINE_CAPTURES, METHOD_FINGERPRINT_EXP001 } from '../src/data/baseline-captures'
import { HYPOTHESIS_BY_ID } from '../src/data/hypotheses'
import { OPPORTUNITY_BY_ID } from '../src/data/opportunities'
import { EVIDENCE, EVIDENCE_BY_ID } from '../src/data/evidence'
import { CONFLICTS, TIMELINE } from '../src/data/timeline'
import { PRE_REGISTRATION, OBSERVED_BASELINE_IMPACTS } from '../src/data/pre-registration'
import { effectiveState, emptyGovernanceLedger, loadGovernanceLedger } from '../src/core/governance-store'
import { registrationSummary } from '../src/core/pre-registration'
import type { GovernanceState } from '../src/core/governance'

const T1 = '2026-10-02T00:05:00Z'
const T2 = '2026-10-02T00:05:09Z'
const TS = Math.floor(Date.parse('2026-10-02T00:00:00Z') / 1000)

const BODIES: Record<string, unknown> = {
  'coingecko-token': {
    [SUT_CONTRACT]: { usd: 0.426378, usd_market_cap: 0, usd_24h_vol: 90_243.75, usd_24h_change: 3.9587, last_updated_at: TS },
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
  // the real run was rate-limited here; the fixture reproduces that
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

const makeRun = async (over: { results?: LiveFetchResult[]; sequence?: number } = {}): Promise<LiveSyncRun> =>
  buildRun({
    results: over.results ?? allResults(), startedAt: T1, completedAt: T2,
    sequence: over.sequence ?? 1, trigger: 'MANUAL',
  })

const emptyGov = (): GovernanceState => ({
  thresholdsRegistered: 0, thresholdsRequired: 4, thresholdsComplete: false,
  approvedBaselineRuns: [], intervention: null, comparison: null, calculation: null, finalReview: null,
})

const fullInputs = async (over: { gov?: GovernanceState; previous?: LiveSyncRun | null; run?: LiveSyncRun } = {}) => ({
  run: over.run ?? await makeRun(),
  previous: over.previous ?? null,
  gov: over.gov ?? emptyGov(),
  anchors: historicalAnchors(),
  baselineKpis: baselineImpacts(),
  proposedTargets: PROPOSED_THRESHOLDS.map((t) => ({
    size: t.tradeSize, value: t.proposedThreshold, status: 'PROPOSED' as const,
  })),
  methodFingerprint: METHOD_FINGERPRINT_EXP001,
})

const allText = (a: LiveAssessment): string => [
  ...a.observation, ...a.interpretation, ...a.unresolved, a.historicalNote, a.liquidityComparison,
  ...a.problems.map((p) => p.statement), ...a.proposedActions.map((p) => p.statement),
  a.expectedMeasurableEffect.statement, ...a.evidenceRequired, a.measuredResult,
].map((s) => s.text).join(' ')

// ───────────────────────────── 1. current observations are used

describe('observation uses only what the run measured', () => {
  it('quotes the actual values from this run', async () => {
    const a = assessLiveRun(await fullInputs())
    const text = a.observation.map((s) => s.text).join(' ')
    expect(text).toContain('0.426378')
    expect(text).toContain('3.9587')
    expect(text).toContain('90,243.75')
    expect(text).toContain('93,876.36')
    expect(text).toContain('35,749.29')
    expect(text).toContain('84,004')
    expect(text).toContain('2,694.12')
    expect(a.observation.every((s) => s.kind === 'OBSERVATION')).toBe(true)
    expect(a.observation.every((s) => s.category === 'CURRENT_OBSERVATION')).toBe(true)
    expect(a.runId).toBe('LMS-2026-10-02-001')
  })

  it('states no causal interpretation in the observation section', async () => {
    const a = assessLiveRun(await fullInputs())
    const text = a.observation.map((s) => s.text).join(' ').toLowerCase()
    expect(text).toContain('no causal relationship')
    for (const p of ['because', 'caused', 'due to', 'as a result of']) expect(text).not.toContain(p)
  })

  it('uses cautious language in the interpretation section', async () => {
    const a = assessLiveRun(await fullInputs())
    const text = a.interpretation.map((s) => s.text).join(' ')
    expect(text).toMatch(/may indicate|consistent with|requires investigation|cannot establish causality/)
    expect(a.interpretation.every((s) => s.kind === 'INTERPRETATION')).toBe(true)
  })
})

// ───────────────────────────── 2, 13. historical evidence referenced, never mutated

describe('historical evidence is referenced and never mutated', () => {
  const frozen = () => JSON.stringify({
    hypotheses: [...HYPOTHESIS_BY_ID.values()], opportunities: [...OPPORTUNITY_BY_ID.values()],
    captures: BASELINE_CAPTURES, evidence: EVIDENCE, timeline: TIMELINE, conflicts: CONFLICTS,
    prereg: PRE_REGISTRATION, observedBaseline: OBSERVED_BASELINE_IMPACTS,
  })

  it('references the relevant frozen records with their real status', async () => {
    const a = assessLiveRun(await fullInputs())
    const ids = a.historicalEvidence.map((h) => h.id)
    expect(ids).toContain('H2')
    expect(ids).toContain('OPP-01')
    expect(ids).toContain('RUN-001')
    expect(ids).toContain('RUN-003')
    expect(a.historicalEvidence.find((h) => h.id === 'H2')!.status).toBe('SUPPORTED')
    expect(a.historicalEvidence.every((h) => h.frozen === true)).toBe(true)
    expect(a.historicalNote.category).toBe('HISTORICAL_EVIDENCE')
    expect(a.historicalNote.text).toContain('never modifies, recalculates or reinterprets them')
  })

  it('names the unresolved items the frozen research leaves open', async () => {
    const a = assessLiveRun(await fullInputs())
    const text = a.unresolved.map((s) => s.text).join(' ')
    expect(text).toContain('initiating catalyst')
    expect(text).toContain('EV-901')
    expect(text).toContain('EV-902')
    expect(text).toContain('H3b')
    expect(text).toContain('H4')
    expect(a.unresolved.every((s) => s.category === 'UNRESOLVED')).toBe(true)
  })

  it('keeps the four categories separate', async () => {
    const a = assessLiveRun(await fullInputs())
    expect(a.observation.every((s) => s.category === 'CURRENT_OBSERVATION')).toBe(true)
    expect(a.historicalNote.category).toBe('HISTORICAL_EVIDENCE')
    expect(a.unresolved.every((s) => s.category === 'UNRESOLVED')).toBe(true)
    expect(a.proposedActions.every((p) => p.statement.category === 'PROPOSED_INVESTIGATION')).toBe(true)
    expect(a.liquidityComparison.category).toBe('UNRESOLVED')
  })

  it('research files are byte-identical before and after an assessment', async () => {
    const before = frozen()
    const storage = new MemoryStorage()
    const out = await new LiveMarketSyncService({ storage, fetcher: fixtureFetcher, now: () => T1 }).run('MANUAL')
    assessLiveRun(await fullInputs({ run: out.run }))
    expect(frozen()).toBe(before)
    expect(EVIDENCE_BY_ID.get('EV-901')!.value).toBeNull()
    expect(HYPOTHESIS_BY_ID.get('H2')!.status).toBe('SUPPORTED')
  })
})

// ───────────────────────────── 3. missing values stay unavailable

describe('missing values', () => {
  it('are reported as DATA UNAVAILABLE with the source reason, never as zero', async () => {
    const a = assessLiveRun(await fullInputs())
    const text = allText(a)
    expect(text).toContain('DATA UNAVAILABLE')
    expect(text).toContain('it reports 0, which is not a measurement')
    const dq = a.dataQuality
    expect(dq.find((d) => d.metric === 'Market cap')!.status).toBe('DATA_UNAVAILABLE')
    expect(dq.find((d) => d.metric === 'Circulating supply')!.status).toBe('DATA_UNAVAILABLE')
    expect(dq.find((d) => d.metric === 'Market rank')!.status).toBe('DATA_UNAVAILABLE')
    expect(dq.find((d) => d.metric === 'Market cap')!.reason).toBeTruthy()
    // the rate-limited global source stays an error, not a zero
    expect(dq.filter((d) => d.status === 'ERROR').length).toBeGreaterThan(0)
  })

  it('raises the coverage gap as a real current problem', async () => {
    const a = assessLiveRun(await fullInputs())
    const coverage = a.problems.find((p) => p.id === 'P-COVERAGE')!
    expect(coverage.status).toBe('SUPPORTED_BY_CURRENT_EVIDENCE')
    expect(coverage.statement.text).toContain('No value is substituted')
  })

  it('marks a condition DATA INSUFFICIENT when this run cannot support it', async () => {
    const a = assessLiveRun(await fullInputs())
    expect(a.problems.find((p) => p.id === 'P-VENUE')!.status).toBe('DATA_INSUFFICIENT')
    expect(a.problems.find((p) => p.id === 'P-VENUE')!.statement.text).toContain('DATA INSUFFICIENT')

    const noPool = await makeRun({
      results: allResults({ 'dexscreener-pair': { httpStatus: 500, bodyText: '{}', parsed: {}, error: null } }),
    })
    const b = assessLiveRun(await fullInputs({ run: noPool }))
    expect(b.problems.find((p) => p.id === 'P-DEPTH')!.status).toBe('DATA_INSUFFICIENT')
    expect(b.problems.find((p) => p.id === 'P-DEPTH')!.statement.text).toContain('DATA INSUFFICIENT')
  })
})

// ───────────────────────────── 4. no May liquidity comparison

describe('current liquidity is never compared with May 2026', () => {
  it('states the limitation explicitly and names the missing evidence', async () => {
    const a = assessLiveRun(await fullInputs())
    expect(a.liquidityComparison.text).toContain('does not establish historical May 2026 liquidity')
    expect(a.liquidityComparison.text).toContain('EV-901')
    expect(a.liquidityComparison.text).toContain('never measured')
    expect(a.liquidityComparison.text).toContain('in either direction')
  })

  it('never claims liquidity improved or deteriorated', async () => {
    const a = assessLiveRun(await fullInputs())
    const text = allText(a).toLowerCase()
    for (const p of ['liquidity improved', 'liquidity has improved', 'liquidity deteriorated',
      'better than may', 'worse than may', 'deeper than in may']) {
      expect(text, `must not contain "${p}"`).not.toContain(p)
    }
  })
})

// ───────────────────────────── 5, 6. baseline unchanged, targets unapproved

describe('expected measurable effect', () => {
  it('quotes the real EXP-001 baseline measurements unchanged', async () => {
    const a = assessLiveRun(await fullInputs())
    const kpis = a.expectedMeasurableEffect.primaryKpis
    expect(kpis).toHaveLength(4)
    const by = (size: string) => kpis.find((k) => k.size === size)!
    // values come from the frozen captures, not from this module
    for (const k of kpis) {
      const source = BASELINE_CAPTURES.find((c) =>
        c.runId === k.runId && c.kpi === 'Price impact' && c.dimension === k.size)!
      expect(k.baselineValue).toBe(source.value)
      expect(k.evidenceId).toBe(source.evidenceId)
      expect(k.direction).toBe('LOWER_IS_BETTER')
    }
    // and they round to the stated baseline magnitudes
    expect(by('$10,000 buy').baselineRounded).toBe('10.6%')
    expect(by('$10,000 sell').baselineRounded).toBe('9.6%')
    expect(by('$50,000 buy').baselineRounded).toBe('58.6%')
    expect(by('$50,000 sell').baselineRounded).toBe('36.9%')
    expect(a.expectedMeasurableEffect.baselineNote).toContain('baseline MEASUREMENTS, not targets')
  })

  it('excludes the unexecutable size entirely', async () => {
    const a = assessLiveRun(await fullInputs())
    expect(a.expectedMeasurableEffect.primaryKpis.map((k) => k.size))
      .not.toContain('$100,000 both sides')
  })

  it('keeps the target as BUSINESS APPROVAL REQUIRED and the proposals unapproved', async () => {
    const a = assessLiveRun(await fullInputs())
    expect(a.expectedMeasurableEffect.target).toBe('BUSINESS APPROVAL REQUIRED')
    expect(a.expectedMeasurableEffect.targetNote).toContain('No target exists')
    expect(a.expectedMeasurableEffect.proposedTargets).toHaveLength(4)
    expect(a.expectedMeasurableEffect.proposedTargets.every((t) => t.status === 'PROPOSED')).toBe(true)
    expect(PROPOSED_THRESHOLDS.every((t) => t.approvalStatus !== 'APPROVED')).toBe(true)
    expect(JSON.stringify(a.expectedMeasurableEffect)).not.toContain('APPROVED_TARGET')
  })

  it('states the metric to be measured without predicting it', async () => {
    const a = assessLiveRun(await fullInputs())
    expect(a.expectedEffect.kind).toBe('EXPECTED_EFFECT')
    expect(a.expectedEffect.text).toContain('should fall relative to the approved baseline')
    expect(a.expectedEffect.text).toContain('not a prediction of price')
  })
})

// ───────────────────────────── 7, 8, 9. status discipline

describe('status discipline', () => {
  it('is PROPOSED while no human has approved anything', async () => {
    const a = assessLiveRun(await fullInputs())
    expect(a.status).toBe('PROPOSED')
    expect(ASSESSMENT_STATES).toContain(a.status)
    expect(a.proposedActions.every((p) => p.status === 'PROPOSED')).toBe(true)
    expect(a.statusNote).toContain('not a business decision')
    expect(a.governanceGateNote).toContain('no registered success threshold')
  })

  it('never advances itself: the status follows the governance chain only', async () => {
    const steps: Array<[Partial<GovernanceState>, string]> = [
      [{}, 'PROPOSED'],
      [{ thresholdsComplete: true, thresholdsRegistered: 4 }, 'PROPOSED'],
      [{ thresholdsComplete: true, thresholdsRegistered: 4, approvedBaselineRuns: ['RUN-001'] }, 'APPROVED'],
      [{ thresholdsComplete: true, approvedBaselineRuns: ['RUN-001'], intervention: {} as never }, 'INTERVENTION_EXECUTED'],
      [{ thresholdsComplete: true, approvedBaselineRuns: ['RUN-001'], intervention: {} as never, comparison: {} as never }, 'MEASUREMENT_PENDING'],
    ]
    for (const [patch, expected] of steps) {
      const a = assessLiveRun(await fullInputs({ gov: { ...emptyGov(), ...patch } }))
      expect(a.status, JSON.stringify(patch)).toBe(expected)
    }
  })

  it('a proposal never becomes an intervention or a measured result', async () => {
    const a = assessLiveRun(await fullInputs())
    expect(a.measuredResult.kind).toBe('PROPOSAL')
    expect(a.measuredResult.text).toContain('DATA UNAVAILABLE')
    expect(a.measuredResult.text).toContain('no post-intervention measurement exists')
    expect(a.measuredResult.text).toContain('This is not the proposal above')
    expect(assessmentApprovesNothing()).toBe(false)
    expect(assessmentExecutesIntervention()).toBe(false)
    expect(assessmentProducesMeasuredResult()).toBe(false)
  })

  it('a measured result appears only after a measurement AND a human review', async () => {
    const reviewed: GovernanceState = {
      ...emptyGov(), thresholdsComplete: true, thresholdsRegistered: 4, approvedBaselineRuns: ['RUN-001'],
      intervention: {} as never, comparison: {} as never, calculation: {} as never,
      finalReview: { experimentId: 'EXP-001', reviewer: 'F. Human', at: T1, result: 'INCONCLUSIVE', note: 'n', evidenceIds: ['EV-100'] },
    }
    const a = assessLiveRun(await fullInputs({ gov: reviewed }))
    expect(a.measuredResult.kind).toBe('MEASURED_RESULT')
    expect(a.measuredResult.text).toContain('INCONCLUSIVE')
    expect(a.measuredResult.text).toContain('F. Human')
    expect(a.status).toBe('INCONCLUSIVE')
  })
})

// ───────────────────────────── 7 (evidence required)

describe('evidence required', () => {
  it('lists every phase with its current state', async () => {
    const a = assessLiveRun(await fullInputs())
    const items = a.evidenceRequirements
    expect(items.map((r) => r.phase)).toEqual([
      'BEFORE_INTERVENTION', 'BEFORE_INTERVENTION', 'INTERVENTION', 'AFTER_INTERVENTION',
      'AFTER_INTERVENTION', 'REVIEW',
    ])
    expect(items.every((r) => r.satisfied === false)).toBe(true)
    expect(items.find((r) => r.item === 'Registered success threshold')!.currentState).toContain('NOT REGISTERED')
    expect(items.find((r) => r.item === 'Baseline evidence')!.currentState).toContain('NOT APPROVED')
    expect(items.find((r) => r.item === 'Post-intervention measurement run')!.currentState)
      .toContain('DATA UNAVAILABLE')
    expect(items.find((r) => r.item === 'Identical measurement methodology')!.requirement)
      .toContain(METHOD_FINGERPRINT_EXP001)
    expect(items.find((r) => r.item === 'Named human reviewer and decision')!.currentState).toBe('NOT RECORDED')
  })

  it('refuses to compare unrelated measurements', async () => {
    const a = assessLiveRun(await fullInputs())
    expect(a.evidenceRequirements.find((r) => r.item === 'Identical measurement methodology')!.requirement)
      .toContain('unrelated measurements are never compared')
  })
})

// ───────────────────────────── 10, 11, 12. language guards

describe('language guards', () => {
  it('rejects every forbidden claim', () => {
    for (const p of FORBIDDEN_CLAIMS) {
      expect(() => assertAssessmentLanguage(`the market ${p} tomorrow`)).toThrow(AssessmentLanguageError)
    }
    expect(() => assertAssessmentLanguage('pool liquidity was 93,876.36 USD at the observation time')).not.toThrow()
  })

  it('generates no price prediction, no causal claim and no fabricated approval', async () => {
    const a = assessLiveRun(await fullInputs())
    const text = allText(a).toLowerCase()
    for (const p of [
      'will rise', 'will increase', 'price target', 'guaranteed', 'target achieved',
      'proves demand', 'proves adoption', 'this caused', 'do this intervention',
      'approved by the business', 'business has approved', 'intervention executed',
    ]) expect(text, `must not contain "${p}"`).not.toContain(p)
    expect(text).toContain('proposed action for business review')
    expect(text).toContain('not approved')
  })

  it('invents no company, user, exchange or adoption activity', async () => {
    const a = assessLiveRun(await fullInputs())
    const text = allText(a).toLowerCase()
    for (const p of ['users joined', 'new users', 'the company launched', 'partnership', 'listing announced',
      'marketing', 'burn event', 'staking rewards']) {
      expect(text, `must not contain "${p}"`).not.toContain(p)
    }
  })
})

// ───────────────────────────── 14. governance unchanged

describe('governance is unchanged by an assessment', () => {
  it('leaves the ledger empty and the gate closed', async () => {
    const storage = new MemoryStorage()
    const out = await new LiveMarketSyncService({ storage, fetcher: fixtureFetcher, now: () => T1 }).run('MANUAL')
    const gov = effectiveState(loadGovernanceLedger(storage), PRE_REGISTRATION)
    assessLiveRun({
      run: out.run, previous: null, gov: gov.state, anchors: historicalAnchors(),
      baselineKpis: baselineImpacts(), methodFingerprint: METHOD_FINGERPRINT_EXP001,
    })
    expect(loadGovernanceLedger(storage)).toEqual(emptyGovernanceLedger())
    expect(effectiveState(loadGovernanceLedger(storage), PRE_REGISTRATION).gate).toBe('THRESHOLDS_PENDING')
    expect(registrationSummary(PRE_REGISTRATION).registered).toBe(0)
    expect(PRE_REGISTRATION.every((e) => e.successThreshold === null)).toBe(true)
  })

  it('EXP-001 baseline captures keep their measured values', async () => {
    assessLiveRun(await fullInputs())
    const impact = (runId: string, dim: string) => BASELINE_CAPTURES
      .find((c) => c.runId === runId && c.kpi === 'Price impact' && c.dimension === dim)?.value
    expect(impact('RUN-001', '$10,000 buy')).toBe(10.59)
    expect(impact('RUN-002', '$10,000 buy')).toBe(10.68)
    expect(impact('RUN-003', '$10,000 buy')).toBe(10.64)
    expect(impact('RUN-003', '$10,000 sell')).toBe(-9.61)
    expect(impact('RUN-003', '$50,000 buy')).toBe(58.56)
    expect(impact('RUN-003', '$50,000 sell')).toBe(-36.93)
    expect(impact('RUN-003', '$100,000 both sides')).toBeNull()
  })
})
