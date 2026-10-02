/**
 * SUT Value Improvement Lab: gaps, opportunities, experiment view, evidence
 * steps and decision panel.
 *
 * Fixtures are controlled; no assertion depends on a live market value, and the
 * lab is proven unable to approve, execute or conclude anything.
 */
import { describe, expect, it } from 'vitest'
import {
  decisionPanel, evidenceSteps, experimentView, EXECUTION_CHAIN, identifiedGaps, LAB_PURPOSE, LAB_STATUSES,
  LAB_TITLE, labApprovesThreshold, labExecutesIntervention, labMutatesResearch, labOpportunities,
  labProducesResult, TOP100_CONTEXT, WEEK2_SUMMARY,
} from '../src/core/improvement-lab'
import { assertAssessmentLanguage, AssessmentLanguageError, FORBIDDEN_CLAIMS } from '../src/core/live-assessment'
import {
  buildRun, LIVE_SOURCES, SUT_CONTRACT, type LiveFetchResult, type LiveSource, type LiveSyncRun,
} from '../src/core/live-market-sync'
import { MemoryStorage } from '../src/core/live-market-store'
import { LiveMarketSyncService } from '../src/service/live-market-sync-service'
import { baselineImpacts, historicalAnchors, labAnchors } from '../src/data/current-state'
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

const fetchResult = (id: string): LiveFetchResult => {
  const body = BODIES[id] ?? null
  return id === 'coingecko-global'
    ? { sourceId: id, httpStatus: 429, bodyText: 'Throttled', parsed: null, error: null, retrievalTimestamp: T1 }
    : { sourceId: id, httpStatus: 200, bodyText: JSON.stringify(body), parsed: body, error: null, retrievalTimestamp: T1 }
}
const fixtureFetcher = async (s: LiveSource) => fetchResult(s.id)

const makeRun = async (): Promise<LiveSyncRun> => buildRun({
  results: LIVE_SOURCES.map((s) => fetchResult(s.id)),
  startedAt: T1, completedAt: T2, sequence: 1, trigger: 'MANUAL',
})

const emptyGov = (): GovernanceState => ({
  thresholdsRegistered: 0, thresholdsRequired: 4, thresholdsComplete: false,
  approvedBaselineRuns: [], intervention: null, comparison: null, calculation: null, finalReview: null,
})

const RUN_IDS = ['RUN-001', 'RUN-002', 'RUN-003']
const anchors = () => [...historicalAnchors(), ...labAnchors()]
const gapsFor = async (run: LiveSyncRun | null) =>
  identifiedGaps({ run, anchors: anchors(), baselineRunIds: RUN_IDS })

const labText = (gaps: ReturnType<typeof identifiedGaps>, gov: GovernanceState): string => {
  const opps = labOpportunities(gaps, gov)
  return [
    LAB_TITLE, LAB_PURPOSE, TOP100_CONTEXT, ...WEEK2_SUMMARY, ...EXECUTION_CHAIN,
    ...gaps.flatMap((g) => [g.title, g.evidenceBasis, ...g.known, ...g.unknown]),
    ...opps.flatMap((o) => [
      o.title, o.proposedInvestigation, ...o.evidenceRequired, o.nextAction.text, ...o.nextAction.preparedByQa,
    ]),
    ...decisionPanel(gov).qaCanContinue,
    // the statuses are displayed too, so they are part of the visible vocabulary
    ...gaps.map((g) => g.status),
    ...opps.flatMap((o) => [o.status, o.nextAction.status]),
    ...evidenceSteps(gov, 'fingerprint').flatMap((e) => [e.item, e.state]),
    ...Object.values(decisionPanel(gov)).filter((v): v is string => typeof v === 'string'),
  ].join(' ').replace(/_/g, ' ')
}

// ───────────────────────────── gaps

describe('identified gaps', () => {
  it('derives four gaps from existing evidence only', async () => {
    const gaps = await gapsFor(await makeRun())
    expect(gaps.map((g) => g.id)).toEqual(['GAP-A', 'GAP-B', 'GAP-C', 'GAP-D'])
    for (const g of gaps) {
      expect(LAB_STATUSES).toContain(g.status)
      expect(g.evidenceBasis).toBeTruthy()
      expect(g.known.length + g.unknown.length).toBeGreaterThan(0)
    }
  })

  it('GAP-A rests on the real EXP-001 baseline runs', async () => {
    const a = (await gapsFor(await makeRun()))[0]!
    expect(a.status).toBe('SUPPORTED')
    expect(a.evidenceBasis).toContain('RUN-001, RUN-002, RUN-003')
    expect(a.references).toEqual(expect.arrayContaining(['RUN-001', 'RUN-003', 'H2', 'EV-901']))
    expect(a.known.join(' ')).toContain('NOT EXECUTABLE')
    expect(a.unknown.join(' ')).toContain('no post-intervention run exists')
  })

  it('GAP-B lists the metrics this run could not verify, with their reasons', async () => {
    const b = (await gapsFor(await makeRun()))[1]!
    expect(b.status).toBe('SUPPORTED')
    expect(b.evidenceBasis).toContain('DATA UNAVAILABLE')
    const known = b.known.join(' ')
    expect(known).toContain('Market cap')
    expect(known).toContain('Circulating supply')
    expect(known).toContain('Market rank')
    expect(known).toContain('it reports 0, which is not a measurement')
    expect(b.references).toContain('market_cap')
  })

  it('GAP-B states the gap honestly when no sync is stored', async () => {
    const b = (await gapsFor(null))[1]!
    expect(b.status).toBe('DATA_INSUFFICIENT')
    expect(b.evidenceBasis).toContain('No live sync is stored')
    expect(b.evidenceBasis).toContain('nothing is assumed in its absence')
    expect(b.known).toEqual([])
  })

  it('GAP-C and GAP-D stay unresolved and invent no activity', async () => {
    const gaps = await gapsFor(await makeRun())
    const c = gaps[2]!
    expect(c.status).toBe('DATA_INSUFFICIENT')
    expect(c.evidenceBasis).toContain('H4')
    expect(c.references).toContain('EV-902')

    const d = gaps[3]!
    expect(d.status).toBe('DATA_UNAVAILABLE')
    expect(d.evidenceBasis).toContain('H7')
    expect(d.evidenceBasis).toContain('H8')
    expect(d.evidenceBasis).toContain('No product telemetry')
    expect(d.known.join(' ')).toContain('not evidence of product usage')
  })
})

// ───────────────────────────── opportunities

describe('product / QA opportunities', () => {
  it('produces four opportunities, each tied to a gap', async () => {
    const gaps = await gapsFor(await makeRun())
    const opps = labOpportunities(gaps, emptyGov())
    expect(opps.map((o) => o.id)).toEqual(['OPP-L1', 'OPP-L2', 'OPP-L3', 'OPP-L4'])
    expect(opps.map((o) => o.relatedGapId)).toEqual(['GAP-A', 'GAP-B', 'GAP-C', 'GAP-D'])
    for (const o of opps) {
      expect(o.title).toBeTruthy()
      expect(o.proposedInvestigation).toBeTruthy()
      expect(o.evidenceRequired.length).toBeGreaterThan(0)
      expect(LAB_STATUSES).toContain(o.status)
      expect(LAB_STATUSES).toContain(o.nextAction.status)
      expect(o.nextAction.preparedByQa.length).toBeGreaterThan(0)
    }
  })

  it('OPP-L1 is blocked by the business decision while QA work continues', async () => {
    const opps = labOpportunities(await gapsFor(await makeRun()), emptyGov())
    const l1 = opps[0]!
    expect(l1.status).toBe('BUSINESS_REVIEW_REQUIRED')
    expect(l1.nextAction.status).toBe('BLOCKED_BY_BUSINESS_DECISION')
    expect(l1.nextAction.text).toContain('Obtain business approval')
    expect(l1.nextAction.text).toContain('register the approved thresholds before any intervention')
    expect(l1.nextAction.preparedByQa.join(' ')).toContain('Baseline captured from three real runs')
    expect(l1.nextAction.preparedByQa.join(' ')).toContain('Post-intervention comparison path ready')
  })

  it('the other three state their own real status', async () => {
    const opps = labOpportunities(await gapsFor(await makeRun()), emptyGov())
    expect(opps[1]!.status).toBe('PROPOSED')
    expect(opps[1]!.nextAction.text).toContain('additional verified public source')
    expect(opps[2]!.status).toBe('DATA_INSUFFICIENT')
    expect(opps[2]!.nextAction.text).toContain('venue-level evidence')
    expect(opps[3]!.status).toBe('DATA_UNAVAILABLE')
    expect(opps[3]!.nextAction.text).toContain('product telemetry')
  })

  it('OPP-L1 becomes PROPOSED only once thresholds are genuinely registered', async () => {
    const gaps = await gapsFor(await makeRun())
    const registered = { ...emptyGov(), thresholdsComplete: true, thresholdsRegistered: 4 }
    expect(labOpportunities(gaps, registered)[0]!.status).toBe('PROPOSED')
  })
})

// ───────────────────────────── experiment view

describe('experiment view', () => {
  const view = () => experimentView({
    gov: emptyGov(),
    baselineKpis: baselineImpacts(),
    proposedThresholds: PROPOSED_THRESHOLDS.map((t) => ({ size: t.tradeSize, value: t.proposedThreshold })),
  })

  it('shows the real captured baseline, labelled as not a target', () => {
    const v = view()
    expect(v.experimentId).toBe('EXP-001')
    expect(v.baselineLabel).toBe('Observed baseline — not a target.')
    const by = (size: string) => v.baseline.find((b) => b.size === size)!
    expect(by('$10,000 buy').magnitudeRounded).toBe('10.6%')
    expect(by('$10,000 sell').magnitudeRounded).toBe('9.6%')
    expect(by('$50,000 buy').magnitudeRounded).toBe('58.6%')
    expect(by('$50,000 sell').magnitudeRounded).toBe('36.9%')
    for (const b of v.baseline) {
      const source = BASELINE_CAPTURES.find((c) =>
        c.runId === b.runId && c.kpi === 'Price impact' && c.dimension === b.size)!
      expect(b.value).toBe(source.value)          // read from the frozen capture, unchanged
      expect(b.evidenceId).toBe(source.evidenceId)
      expect(b.note).toBe('Observed baseline — not a target.')
    }
  })

  it('keeps $100,000 out of the baseline and marks it not registerable', () => {
    const v = view()
    expect(v.baseline.map((b) => b.size)).not.toContain('$100,000 both sides')
    expect(v.notExecutable.status).toBe('NOT EXECUTABLE / NOT REGISTERABLE')
  })

  it('shows the proposed thresholds separately and never as approved', () => {
    const v = view()
    expect(v.proposedThresholds).toHaveLength(4)
    expect(v.proposedThresholds.map((t) => t.proposed)).toEqual([8, 8, 40, 30])
    expect(v.proposedThresholds.every((t) => t.status === 'PROPOSED — PENDING BUSINESS APPROVAL')).toBe(true)
    expect(v.proposedThresholdStatus).toBe('PROPOSED — PENDING BUSINESS APPROVAL')
    expect(PROPOSED_THRESHOLDS.every((t) => t.approvalStatus !== 'APPROVED')).toBe(true)
  })

  it('reports every downstream stage as pending and cannot be executed by the lab', () => {
    const v = view()
    expect(v.businessApproval).toBe('PENDING')
    expect(v.baselineApproval).toBe('PENDING')
    expect(v.intervention).toBe('NOT EXECUTED')
    expect(v.postInterventionMeasurement).toBe('DATA UNAVAILABLE')
    expect(v.measuredResult).toBe('DATA UNAVAILABLE')
    expect(v.executableByLab).toBe(false)
  })

  it('reflects real governance progress without inventing any', () => {
    const v = experimentView({
      gov: {
        ...emptyGov(), thresholdsComplete: true, thresholdsRegistered: 4,
        approvedBaselineRuns: ['RUN-001'], intervention: {} as never,
      },
      baselineKpis: baselineImpacts(),
      proposedThresholds: [],
    })
    expect(v.businessApproval).toBe('REGISTERED')
    expect(v.baselineApproval).toBe('APPROVED: RUN-001')
    expect(v.intervention).toBe('RECORDED')
    expect(v.postInterventionMeasurement).toBe('DATA UNAVAILABLE')
    expect(v.measuredResult).toBe('DATA UNAVAILABLE')
  })
})

// ───────────────────────────── evidence steps + decision panel

describe('evidence steps and decision status', () => {
  it('lists the eight required evidence steps, none satisfied yet', () => {
    const steps = evidenceSteps(emptyGov(), METHOD_FINGERPRINT_EXP001)
    expect(steps.map((s) => s.step)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(steps.map((s) => s.item)).toEqual([
      'Registered business-approved thresholds', 'Approved baseline', 'Intervention evidence',
      'Same measurement methodology', 'Same method fingerprint', 'New post-intervention measurement',
      'Named human review', 'Final decision',
    ])
    expect(steps.every((s) => s.satisfied === false)).toBe(true)
    expect(steps[0]!.state).toContain('business approval required')
    expect(steps[4]!.state).toContain(METHOD_FINGERPRINT_EXP001)
    expect(steps[7]!.state).toBe('NOT DETERMINED')
  })

  it('tracks real governance progress step by step', () => {
    const gov = {
      ...emptyGov(), thresholdsComplete: true, thresholdsRegistered: 4, approvedBaselineRuns: ['RUN-002'],
    }
    const steps = evidenceSteps(gov, METHOD_FINGERPRINT_EXP001)
    expect(steps[0]!.satisfied).toBe(true)
    expect(steps[1]!.satisfied).toBe(true)
    expect(steps[1]!.state).toContain('RUN-002')
    expect(steps.slice(2).every((s) => s.satisfied === false)).toBe(true)
  })

  it('the decision panel shows pending business review and what QA continues doing', () => {
    const d = decisionPanel(emptyGov())
    expect(d.businessThreshold).toBe('PENDING BUSINESS REVIEW')
    expect(d.experiment).toBe('READY FOR BUSINESS DECISION')
    expect(d.intervention).toBe('NOT EXECUTED')
    expect(d.measuredImprovement).toBe('DATA UNAVAILABLE')
    expect(d.finalResult).toBe('NOT DETERMINED')
    expect(d.qaCanContinue.length).toBeGreaterThan(3)
  })
})

// ───────────────────────────── language discipline

describe('language discipline', () => {
  it('generates no forbidden claim anywhere in the lab', async () => {
    const text = labText(await gapsFor(await makeRun()), emptyGov())
    expect(() => assertAssessmentLanguage(text)).not.toThrow()
    const lower = text.toLowerCase()
    for (const p of [
      'will increase price', 'will improve ranking', 'will reach top 100', 'liquidity improved',
      'adoption increased', 'the intervention succeeded', 'this caused the price increase',
      'this will increase demand', 'this guarantees value',
    ]) expect(lower, `must not contain "${p}"`).not.toContain(p)
  })

  it('uses the allowed vocabulary', async () => {
    const lower = labText(await gapsFor(await makeRun()), emptyGov()).toLowerCase()
    for (const p of ['proposed', 'data unavailable', 'data insufficient', 'business approval',
      'business review', 'observ', 'historical', 'not determined']) {
      expect(lower, `should contain "${p}"`).toContain(p)
    }
  })

  it('the shared guard rejects every forbidden phrase', () => {
    for (const p of FORBIDDEN_CLAIMS) {
      expect(() => assertAssessmentLanguage(`something ${p} here`)).toThrow(AssessmentLanguageError)
    }
  })

  it('states the ranking context without predicting a ranking', () => {
    expect(TOP100_CONTEXT).toContain('downstream market outcome, not a direct operating KPI')
    expect(TOP100_CONTEXT).toContain('does not predict or claim ranking improvement')
    expect(TOP100_CONTEXT.toLowerCase()).not.toContain('top 100 by')
  })

  it('states the week-2 summary and the execution chain verbatim', () => {
    expect(WEEK2_SUMMARY).toHaveLength(8)
    expect(WEEK2_SUMMARY[0]).toBe('Historical research frozen as reference layer.')
    expect(WEEK2_SUMMARY[7]).toBe('No business result is fabricated.')
    expect(EXECUTION_CHAIN).toHaveLength(5)
    expect(EXECUTION_CHAIN[0]).toContain('Research tells us what the problem areas are')
    expect(EXECUTION_CHAIN[4]).toContain('Business review decides what to scale, continue, change, or stop')
  })
})

// ───────────────────────────── isolation

describe('the lab changes nothing', () => {
  const frozen = () => JSON.stringify({
    hypotheses: [...HYPOTHESIS_BY_ID.values()], opportunities: [...OPPORTUNITY_BY_ID.values()],
    captures: BASELINE_CAPTURES, evidence: EVIDENCE, timeline: TIMELINE, conflicts: CONFLICTS,
    prereg: PRE_REGISTRATION, observedBaseline: OBSERVED_BASELINE_IMPACTS,
    proposedThresholds: PROPOSED_THRESHOLDS,
  })

  it('approves, executes and concludes nothing', () => {
    expect(labApprovesThreshold()).toBe(false)
    expect(labExecutesIntervention()).toBe(false)
    expect(labProducesResult()).toBe(false)
    expect(labMutatesResearch()).toBe(false)
  })

  it('leaves the frozen research byte-identical', async () => {
    const before = frozen()
    const gaps = await gapsFor(await makeRun())
    labOpportunities(gaps, emptyGov())
    experimentView({
      gov: emptyGov(), baselineKpis: baselineImpacts(),
      proposedThresholds: PROPOSED_THRESHOLDS.map((t) => ({ size: t.tradeSize, value: t.proposedThreshold })),
    })
    evidenceSteps(emptyGov(), METHOD_FINGERPRINT_EXP001)
    decisionPanel(emptyGov())
    expect(frozen()).toBe(before)
    expect(EVIDENCE_BY_ID.get('EV-901')!.value).toBeNull()
    expect(HYPOTHESIS_BY_ID.get('H2')!.status).toBe('SUPPORTED')
  })

  it('leaves EXP-001 governance untouched after reading a real sync', async () => {
    const storage = new MemoryStorage()
    const out = await new LiveMarketSyncService({ storage, fetcher: fixtureFetcher, now: () => T1 }).run('MANUAL')
    const gov = effectiveState(loadGovernanceLedger(storage), PRE_REGISTRATION)
    const gaps = identifiedGaps({ run: out.run, anchors: anchors(), baselineRunIds: RUN_IDS })
    labOpportunities(gaps, gov.state)
    expect(loadGovernanceLedger(storage)).toEqual(emptyGovernanceLedger())
    expect(gov.gate).toBe('THRESHOLDS_PENDING')
    expect(registrationSummary(PRE_REGISTRATION).registered).toBe(0)
    expect(PRE_REGISTRATION.every((e) => e.successThreshold === null)).toBe(true)
  })

  it('keeps the EXP-001 baseline values exactly as captured', async () => {
    await gapsFor(await makeRun())
    const impact = (runId: string, dim: string) => BASELINE_CAPTURES
      .find((c) => c.runId === runId && c.kpi === 'Price impact' && c.dimension === dim)?.value
    expect(impact('RUN-001', '$10,000 buy')).toBe(10.59)
    expect(impact('RUN-002', '$10,000 buy')).toBe(10.68)
    expect(impact('RUN-003', '$10,000 buy')).toBe(10.64)
    expect(impact('RUN-003', '$100,000 both sides')).toBeNull()
    expect(BASELINE_CAPTURES.every((c) => c.reviewerStatus === 'PENDING')).toBe(true)
  })
})
