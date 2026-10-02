/**
 * Assessment of a live market sync run.
 *
 * The chain this module implements, and never short-circuits:
 *
 *   CURRENT LIVE DATA → CURRENT CONDITION → HISTORICAL EVIDENCE →
 *   PROBLEM / OPPORTUNITY → PROPOSED ACTION → EXPECTED MEASURABLE EFFECT →
 *   EVIDENCE REQUIRED → HUMAN DECISION
 *
 * Every sentence is built from exactly three permitted inputs:
 *   A. observations actually present in the current sync run,
 *   B. frozen historical evidence already in the project,
 *   C. explicitly documented limitations.
 *
 * Nothing else may enter: no cause, no business impact, no adoption, no company
 * or exchange activity, no liquidity improvement, no market improvement and no
 * intervention result. Four categories are kept apart — CURRENT OBSERVATION,
 * HISTORICAL EVIDENCE, UNRESOLVED, PROPOSED INVESTIGATION — and a MEASURED
 * RESULT is structurally impossible until a real post-intervention measurement
 * has been reviewed by a named human.
 */
import {
  assertMeasuredResultAllowed, statement, type HistoricalAnchor, type Statement,
} from './daily-assessment'
import type { GovernanceState } from './governance'
import {
  compareRuns, type LiveSyncRun, type MetricComparison, type SnapshotField,
} from './live-market-sync'

export type AssessmentStatus =
  | 'PROPOSED' | 'APPROVED' | 'INTERVENTION_EXECUTED' | 'MEASUREMENT_PENDING'
  | 'SUPPORTED' | 'REJECTED' | 'INCONCLUSIVE'

export const ASSESSMENT_STATES: AssessmentStatus[] = [
  'PROPOSED', 'APPROVED', 'INTERVENTION_EXECUTED', 'MEASUREMENT_PENDING',
  'SUPPORTED', 'REJECTED', 'INCONCLUSIVE',
]

/** The four categories that must never be merged. */
export type Category = 'CURRENT_OBSERVATION' | 'HISTORICAL_EVIDENCE' | 'UNRESOLVED' | 'PROPOSED_INVESTIGATION'

export interface CategorisedStatement extends Statement {
  category: Category
}

const say = (
  kind: Statement['kind'], category: Category, text: string, evidence: string[] = [],
): CategorisedStatement => ({ ...statement(kind, text, evidence), category })

// ───────────────────────────────────────────── language guards

/** Phrases this layer may never produce, whatever the data says. */
export const FORBIDDEN_CLAIMS = [
  'will rise', 'will increase', 'will go up', 'price target', 'guaranteed',
  'target achieved', 'liquidity improved', 'liquidity has improved', 'adoption proven',
  'proves demand', 'proves adoption', 'caused the price', 'this caused', 'because of this',
  'experiment succeeded', 'do this intervention', 'we should execute',
  // Value Improvement Lab additions
  'will improve ranking', 'will reach top 100', 'adoption increased', 'this will increase demand',
  'this guarantees value', 'the intervention succeeded', 'this caused the price increase',
] as const

export class AssessmentLanguageError extends Error {}

/** Every generated sentence is screened before it leaves this module. */
export function assertAssessmentLanguage(text: string): void {
  const lower = text.toLowerCase()
  for (const p of FORBIDDEN_CLAIMS) {
    if (lower.includes(p)) {
      throw new AssessmentLanguageError(
        `the assessment may not state "${p}" — this layer observes and proposes, it never predicts, `
        + 'approves or concludes',
      )
    }
  }
}

const screen = <T extends Statement>(s: T): T => {
  assertAssessmentLanguage(s.text)
  return s
}

// ───────────────────────────────────────────── inputs

export interface BaselineKpi {
  /** standardised size, exactly as captured */
  size: string
  /** signed price impact as measured; sells are negative */
  value: number | null
  runId: string
  evidenceId: string | null
}

export interface ProposedTarget {
  size: string
  value: number
  /** always PROPOSED — never an approved target */
  status: 'PROPOSED'
}

export interface LiveAssessmentInputs {
  run: LiveSyncRun
  previous: LiveSyncRun | null
  gov: GovernanceState
  anchors: HistoricalAnchor[]
  /** measured EXP-001 baseline impacts, read from the frozen captures */
  baselineKpis?: BaselineKpi[]
  /** working proposals — never presented as approved targets */
  proposedTargets?: ProposedTarget[]
  /** the baseline method fingerprint a comparison must reproduce */
  methodFingerprint?: string
}

// ───────────────────────────────────────────── problems and actions

export interface ProblemCandidate {
  id: string
  title: string
  /** 'SUPPORTED_BY_CURRENT_EVIDENCE' only when this run actually measured it */
  status: 'SUPPORTED_BY_CURRENT_EVIDENCE' | 'DATA_INSUFFICIENT'
  statement: CategorisedStatement
  currentEvidence: string[]
}

export interface ProposedActionItem {
  id: string
  title: string
  statement: CategorisedStatement
  scope: string
  testable: string
  reversibility: string
  /** never advanced by this layer */
  status: 'PROPOSED'
}

export interface ExpectedMeasurableEffect {
  primaryKpis: Array<{
    size: string
    baselineValue: number | null
    baselineMagnitude: number | null
    baselineRounded: string
    runId: string
    evidenceId: string | null
    direction: 'LOWER_IS_BETTER'
  }>
  baselineNote: string
  /** targets are never derived here */
  target: 'BUSINESS APPROVAL REQUIRED'
  targetNote: string
  proposedTargets: ProposedTarget[]
  statement: CategorisedStatement
}

export interface EvidenceRequirement {
  phase: 'BEFORE_INTERVENTION' | 'INTERVENTION' | 'AFTER_INTERVENTION' | 'REVIEW'
  item: string
  requirement: string
  currentState: string
  satisfied: boolean
}

export interface DataQualityLine {
  metric: string
  status: string
  reason: string | null
}

export interface LiveAssessment {
  runId: string
  generatedAt: string
  // 1 — what the run actually measured
  observation: CategorisedStatement[]
  // 2 — what it may indicate
  interpretation: CategorisedStatement[]
  // 3 — frozen evidence, quoted and never rewritten
  historicalEvidence: HistoricalAnchor[]
  historicalNote: CategorisedStatement
  // what is still unknown
  unresolved: CategorisedStatement[]
  // 4 — current problem / opportunity
  problems: ProblemCandidate[]
  problemOpportunity: Statement
  // 5 — proposed action
  proposedActions: ProposedActionItem[]
  proposedAction: Statement
  // 6 — expected measurable effect
  expectedMeasurableEffect: ExpectedMeasurableEffect
  expectedEffect: Statement
  // 7 — evidence required
  evidenceRequirements: EvidenceRequirement[]
  evidenceRequired: Statement[]
  // the result slot — empty until a measurement exists and a human reviews it
  measuredResult: Statement
  // 8 — status
  status: AssessmentStatus
  statusNote: string
  statusReason: string
  governanceGateNote: string
  liquidityComparison: CategorisedStatement
  dataQuality: DataQualityLine[]
}

// ───────────────────────────────────────────── helpers

const field = (run: LiveSyncRun, metric: string): SnapshotField | undefined =>
  run.snapshot.find((s) => s.metric === metric)

const has = (run: LiveSyncRun, metric: string): boolean => {
  const f = field(run, metric)
  return f !== undefined && f.value !== null
}

const show = (f: SnapshotField | undefined): string => {
  if (!f) return 'DATA UNAVAILABLE'
  if (f.value === null) return `DATA UNAVAILABLE (${f.reason ?? 'no reason recorded'})`
  return typeof f.value === 'number'
    ? `${f.value.toLocaleString('en-US', { maximumFractionDigits: 8 })}${f.unit ? ` ${f.unit}` : ''}`
    : String(f.value)
}

const pct = (c: MetricComparison | undefined): string =>
  !c || c.status !== 'COMPARED' ? 'COMPARISON UNAVAILABLE'
    : c.percentChange === null
      ? `${c.absoluteChange! >= 0 ? '+' : ''}${c.absoluteChange} (percentage undefined)`
      : `${c.percentChange >= 0 ? '+' : ''}${c.percentChange.toFixed(4)}%`

const round1 = (v: number | null): string => (v === null ? 'DATA UNAVAILABLE' : `${Math.abs(v).toFixed(1)}%`)

// ───────────────────────────────────────────── the assessment

export function assessLiveRun(a: LiveAssessmentInputs): LiveAssessment {
  const { run, previous, gov, anchors } = a
  const baselineKpis = a.baselineKpis ?? []
  const proposedTargets = a.proposedTargets ?? []
  const comparisons = compareRuns(run, previous)
  const cmp = (metric: string) => comparisons.find((c) => c.metric === metric)

  // ── 1. OBSERVATION — only what this run measured, with no interpretation
  const observation: CategorisedStatement[] = [
    say('OBSERVATION', 'CURRENT_OBSERVATION',
      `Sync ${run.id} completed ${run.completedAt} with status ${run.status}. `
      + `${run.evidence.filter((e) => e.status === 'VALIDATED').length} of ${run.evidence.length} sources responded; `
      + `${run.observations.filter((o) => o.status === 'VALIDATED').length} of ${run.observations.length} `
      + 'observations carry a value.', [run.id]),
    say('OBSERVATION', 'CURRENT_OBSERVATION',
      `SUT price was ${show(field(run, 'price'))} at the stated observation time. 24h change was `
      + `${show(field(run, 'price_change_24h_pct'))}. 24h volume was ${show(field(run, 'volume_24h'))}.`, [run.id]),
    say('OBSERVATION', 'CURRENT_OBSERVATION',
      `Pool liquidity was ${show(field(run, 'pair_liquidity_usd'))} and pool 24h volume was `
      + `${show(field(run, 'pair_volume_24h'))} on the canonical pool. On-chain spot was `
      + `${show(field(run, 'onchain_spot_price'))} at block ${show(field(run, 'block_number'))}.`, [run.id]),
    say('OBSERVATION', 'CURRENT_OBSERVATION',
      `Supply: circulating ${show(field(run, 'circulating_supply'))}, total ${show(field(run, 'total_supply'))}, `
      + `max ${show(field(run, 'max_supply'))}. Market cap ${show(field(run, 'market_cap'))}; market rank `
      + `${show(field(run, 'market_rank'))}.`, [run.id]),
    say('OBSERVATION', 'CURRENT_OBSERVATION',
      `BTC was ${show(field(run, 'btc_price'))} (${show(field(run, 'btc_change_24h_pct'))}) and ETH was `
      + `${show(field(run, 'eth_price'))} (${show(field(run, 'eth_change_24h_pct'))}). Recorded side by side only; `
      + 'no causal relationship with SUT is claimed or implied.', [run.id]),
  ].map(screen)

  // ── 2. INTERPRETATION — cautious, and never causal
  const interpretation: CategorisedStatement[] = previous === null
    ? [say('INTERPRETATION', 'CURRENT_OBSERVATION',
      'No earlier sync is stored, so no change can be stated. A single observation cannot establish causality, '
      + 'a trend, or any effect; it requires further observation.', [run.id])]
    : [
      say('INTERPRETATION', 'CURRENT_OBSERVATION',
        `Against ${previous.id} (${previous.completedAt}): price ${pct(cmp('price'))}, 24h volume `
        + `${pct(cmp('volume_24h'))}, pool liquidity ${pct(cmp('pair_liquidity_usd'))}.`,
        [run.id, previous.id]),
      say('INTERPRETATION', 'CURRENT_OBSERVATION',
        'These are differences between two retrievals of public data. They may indicate a change in the '
        + 'observable market condition, and are consistent with ordinary market movement; they cannot establish '
        + 'causality and are not evidence of any intervention effect.', [run.id, previous.id]),
    ]
  interpretation.push(screen(say('INTERPRETATION', 'CURRENT_OBSERVATION',
    has(run, 'pair_liquidity_usd')
      ? 'The observed pool liquidity may indicate how much notional the venue can absorb at present. Whether it '
        + 'is sufficient requires investigation through a measured price-impact run, not inference from the '
        + 'liquidity figure alone.'
      : 'Pool liquidity is DATA UNAVAILABLE in this run, so the present depth condition cannot be stated and '
        + 'nothing is assumed in its absence.',
    [run.id])))

  // ── 3. HISTORICAL EVIDENCE — quoted, never rewritten
  const historicalNote = screen(say('OBSERVATION', 'HISTORICAL_EVIDENCE',
    'The records below are the frozen forensic findings. They describe May 2026 and the September 2026 captures. '
    + 'They are quoted here for context only: this layer never modifies, recalculates or reinterprets them, and '
    + 'they are not evidence about the current market state.',
    anchors.map((x) => x.id)))

  // what the frozen research explicitly leaves open
  const unresolved: CategorisedStatement[] = [
    say('OBSERVATION', 'UNRESOLVED',
      'The initiating catalyst of the May 2026 move remains unresolved in the frozen research. The amplification '
      + 'mechanism is supported; who sold first, and why, is not established.', ['research-freeze']),
    say('OBSERVATION', 'UNRESOLVED',
      'May 2026 pool liquidity was never measured (EV-901), and historical CEX order-book depth for that window '
      + 'is unrecoverable (EV-902). Neither can be reconstructed from any later observation.', ['EV-901', 'EV-902']),
    say('OBSERVATION', 'UNRESOLVED',
      'Diffuse distribution-driven selling (H3b) and exchange-access deterioration (H4) remain INCONCLUSIVE in '
      + 'the frozen research. Nothing in a current market snapshot resolves either.', ['H3b', 'H4']),
  ].map(screen)

  // the explicit limitation on comparing today's liquidity with May
  const liquidityComparison = screen(say('OBSERVATION', 'UNRESOLVED',
    `Current pool liquidity (${show(field(run, 'pair_liquidity_usd'))}) is observable, but this observation does `
    + 'not establish historical May 2026 liquidity or a time-aligned liquidity change. May 2026 pool TVL was '
    + 'never measured (EV-901), so no before/after liquidity comparison against the event window is possible, in '
    + 'either direction.', [run.id, 'EV-901']))

  // ── 4. CURRENT PROBLEM / OPPORTUNITY — only where this run supports it
  const problems: ProblemCandidate[] = [
    {
      id: 'P-DEPTH',
      title: 'Price impact at standardised trade sizes is unmeasured in the current state',
      status: has(run, 'pair_liquidity_usd') ? 'SUPPORTED_BY_CURRENT_EVIDENCE' : 'DATA_INSUFFICIENT',
      currentEvidence: has(run, 'pair_liquidity_usd') ? ['pair_liquidity_usd', 'pair_volume_24h'] : [],
      statement: screen(say('INTERPRETATION', 'CURRENT_OBSERVATION',
        has(run, 'pair_liquidity_usd')
          ? `Pool liquidity ${show(field(run, 'pair_liquidity_usd'))} against 24h volume `
            + `${show(field(run, 'volume_24h'))} is measurable now, but the live sync does not model price impact `
            + 'at the standardised sizes. The current depth condition is therefore observable while its '
            + 'consequence for a $10K or $50K order is not — that gap requires an EXP-001 measurement run.'
          : 'Pool liquidity is DATA UNAVAILABLE in this run, so no statement about the current depth condition '
            + 'is possible. STATUS: DATA INSUFFICIENT.',
        [run.id])),
    },
    {
      id: 'P-COVERAGE',
      title: 'Market-data coverage gap: market cap, circulating supply and rank',
      status: (!has(run, 'market_cap') || !has(run, 'circulating_supply') || !has(run, 'market_rank'))
        ? 'SUPPORTED_BY_CURRENT_EVIDENCE' : 'DATA_INSUFFICIENT',
      currentEvidence: ['market_cap', 'circulating_supply', 'market_rank'],
      statement: screen(say('INTERPRETATION', 'CURRENT_OBSERVATION',
        `Market cap is ${show(field(run, 'market_cap'))}, circulating supply is `
        + `${show(field(run, 'circulating_supply'))} and market rank is ${show(field(run, 'market_rank'))}. `
        + 'The absence of these fields is itself an observable condition: public coverage of this contract is '
        + 'incomplete, which limits what any external party can assess. No value is substituted for them.',
        [run.id])),
    },
    {
      id: 'P-VENUE',
      title: 'Exchange / venue access evidence gap',
      status: 'DATA_INSUFFICIENT',
      currentEvidence: [],
      statement: screen(say('INTERPRETATION', 'UNRESOLVED',
        'The live sync observes one DEX pool and public aggregator data. It does not observe exchange listings, '
        + 'order books or access conditions, so it can neither support nor rule out the exchange-access gap that '
        + 'the frozen research left INCONCLUSIVE (H4). STATUS: DATA INSUFFICIENT.', ['H4'])),
    },
  ]

  // ── 5. PROPOSED ACTION — specific, measurable, testable, scoped, reversible
  const proposedActions: ProposedActionItem[] = [
    {
      id: 'PA-01',
      title: 'Measure price-impact sensitivity to executable depth on the canonical pool',
      scope: 'One pool (the canonical SUT/USDT pool on Polygon), four standardised sizes, one measurement method.',
      testable: 'Falsifiable: if added executable depth does not reduce the measured price impact at the '
        + 'standardised sizes, the proposition is not supported.',
      reversibility: 'Depth added to a pool can be withdrawn; the measurement itself changes nothing.',
      status: 'PROPOSED',
      statement: screen(say('PROPOSAL', 'PROPOSED_INVESTIGATION',
        'Investigate whether increasing executable liquidity around the canonical SUT pool can reduce the '
        + 'standardised $10K and $50K price impact, measured by the existing EXP-001 method. Proposed action for '
        + 'business review — not approved, not scheduled, and not executed by this application.',
        anchors.filter((x) => x.kind === 'EVIDENCE').map((x) => x.id))),
    },
    {
      id: 'PA-02',
      title: 'Close the public market-data coverage gap',
      scope: 'Data sources only. No market action, no intervention in the pool.',
      testable: 'Measurable: either a verified source publishes circulating supply, market cap and rank for this '
        + 'contract, or it does not.',
      reversibility: 'Fully reversible: a data source can be added or removed without market effect.',
      status: 'PROPOSED',
      statement: screen(say('PROPOSAL', 'PROPOSED_INVESTIGATION',
        'Investigate additional verified market-data sources that publish circulating supply, market '
        + 'capitalisation and rank for this contract address, so the coverage gap observed in this run can be '
        + 'closed without inferring any value. Proposed action for business review.', [run.id])),
    },
  ]

  // ── 6. EXPECTED MEASURABLE EFFECT — baselines are measurements, not targets
  const primaryKpis = baselineKpis
    .filter((k) => k.size !== '$100,000 both sides' && k.size !== '$100,000 (both sides)')
    .map((k) => ({
      size: k.size,
      baselineValue: k.value,
      baselineMagnitude: k.value === null ? null : Math.abs(k.value),
      baselineRounded: round1(k.value),
      runId: k.runId,
      evidenceId: k.evidenceId,
      direction: 'LOWER_IS_BETTER' as const,
    }))

  const expectedMeasurableEffect: ExpectedMeasurableEffect = {
    primaryKpis,
    baselineNote: primaryKpis.length === 0
      ? 'Baseline DATA UNAVAILABLE in this view — the EXP-001 captures were not supplied to the assessment.'
      : `Baseline values are the measurements captured in ${primaryKpis[0]!.runId}, quoted unchanged. They are `
        + 'baseline MEASUREMENTS, not targets, and they are never modified by this layer.',
    target: 'BUSINESS APPROVAL REQUIRED',
    targetNote: 'No target exists. The working proposals below are PROPOSED only and are not approved success '
      + 'criteria; converting one into a target requires a business decision and a human registration.',
    proposedTargets,
    statement: screen(say('EXPECTED_EFFECT', 'PROPOSED_INVESTIGATION',
      'If such an intervention were carried out and were effective, the modelled price impact at the four '
      + 'standardised sizes should fall relative to the approved baseline, compared by absolute magnitude '
      + '(LOWER_IS_BETTER). That is the metric to be measured. It is not a prediction of price, market '
      + 'capitalisation or market rank, and it is not a claim about what the intervention would do.', [])),
  }

  // ── 7. EVIDENCE REQUIRED
  const registeredCount = gov.thresholdsRegistered
  const evidenceRequirements: EvidenceRequirement[] = [
    {
      phase: 'BEFORE_INTERVENTION',
      item: 'Registered success threshold',
      requirement: 'A named human registers a numeric threshold per standardised size, with a written rationale '
        + 'and an independence confirmation, before any measurement exists.',
      currentState: gov.thresholdsComplete
        ? `REGISTERED (${registeredCount} of ${gov.thresholdsRequired})`
        : `NOT REGISTERED (${registeredCount} of ${gov.thresholdsRequired})`,
      satisfied: gov.thresholdsComplete,
    },
    {
      phase: 'BEFORE_INTERVENTION',
      item: 'Baseline evidence',
      requirement: 'A captured baseline run with its evidence IDs, method fingerprint and exact block, approved '
        + 'by a named human reviewer.',
      currentState: gov.approvedBaselineRuns.length > 0
        ? `APPROVED: ${gov.approvedBaselineRuns.join(', ')}`
        : 'CAPTURED but NOT APPROVED — no named human has accepted a baseline run',
      satisfied: gov.approvedBaselineRuns.length > 0,
    },
    {
      phase: 'INTERVENTION',
      item: 'Intervention evidence',
      requirement: 'A record of what was actually done, when it started, who recorded it, and at least one '
        + 'evidence reference that already exists in the catalogue.',
      currentState: gov.intervention ? 'RECORDED' : 'NOT RECORDED — no intervention has taken place',
      satisfied: gov.intervention !== null,
    },
    {
      phase: 'AFTER_INTERVENTION',
      item: 'Post-intervention measurement run',
      requirement: 'A new measurement run, not a reuse of an earlier capture, with timestamp, source and '
        + 'evidence references.',
      currentState: gov.comparison ? 'CAPTURED' : 'DATA UNAVAILABLE — no post-intervention measurement exists',
      satisfied: gov.comparison !== null,
    },
    {
      phase: 'AFTER_INTERVENTION',
      item: 'Identical measurement methodology',
      requirement: `The comparison must declare the unchanged baseline method fingerprint`
        + `${a.methodFingerprint ? ` (${a.methodFingerprint})` : ''}. A changed method invalidates the comparison, `
        + 'and unrelated measurements are never compared.',
      currentState: gov.comparison ? 'DECLARED' : 'NOT APPLICABLE until a comparison exists',
      satisfied: gov.comparison !== null,
    },
    {
      phase: 'REVIEW',
      item: 'Named human reviewer and decision',
      requirement: 'A named human reviews the calculated comparison and records the final result with a note and '
        + 'evidence links. The product credit is not a reviewer identity.',
      currentState: gov.finalReview ? `RECORDED by ${gov.finalReview.reviewer}` : 'NOT RECORDED',
      satisfied: gov.finalReview !== null,
    },
  ]

  const evidenceRequired: Statement[] = [
    screen(say('PROPOSAL', 'PROPOSED_INVESTIGATION',
      'Required before any result: a registered success threshold, an approved baseline run, a recorded '
      + 'controlled intervention, and a post-intervention capture taken with the identical method fingerprint.',
      [])),
    screen(say('PROPOSAL', 'PROPOSED_INVESTIGATION',
      'Post-intervention measurement: DATA UNAVAILABLE. A measured result may only be stated after a real '
      + 'capture exists and a named human has reviewed it.', [])),
  ]

  // ── the MEASURED RESULT slot — never filled by a proposal
  let measuredResult: Statement
  try {
    assertMeasuredResultAllowed(gov)
    measuredResult = screen(statement('MEASURED_RESULT',
      `Reviewed result ${gov.finalReview!.result}, recorded by ${gov.finalReview!.reviewer} at `
      + `${gov.finalReview!.at}.`, gov.finalReview!.evidenceIds))
  } catch (e) {
    measuredResult = screen(statement('PROPOSAL',
      'DATA UNAVAILABLE — no post-intervention measurement exists. '
      + `${e instanceof Error ? e.message : ''}`.trim()
      + ' This is not the proposal above: a proposal states what could be tested, a measured result states what '
      + 'was actually measured and reviewed.', []))
  }

  // ── 8. STATUS — derived from the governance chain, never advanced here
  const satisfiedPhases = evidenceRequirements.filter((r) => r.satisfied).length
  const status: AssessmentStatus = gov.finalReview
    ? (gov.finalReview.result === 'SUPPORTED' ? 'SUPPORTED'
      : gov.finalReview.result === 'REJECTED' ? 'REJECTED' : 'INCONCLUSIVE')
    : gov.comparison ? 'MEASUREMENT_PENDING'
    : gov.intervention ? 'INTERVENTION_EXECUTED'
    : (gov.thresholdsComplete && gov.approvedBaselineRuns.length > 0) ? 'APPROVED'
    : 'PROPOSED'

  const dataQuality: DataQualityLine[] = run.snapshot.map((f) => ({
    metric: f.label,
    status: f.status,
    reason: f.reason,
  }))

  return {
    runId: run.id,
    generatedAt: run.completedAt,
    observation,
    interpretation,
    historicalEvidence: anchors,
    historicalNote,
    unresolved,
    problems,
    problemOpportunity: problems[0]!.statement,
    proposedActions,
    proposedAction: proposedActions[0]!.statement,
    expectedMeasurableEffect,
    expectedEffect: expectedMeasurableEffect.statement,
    evidenceRequirements,
    evidenceRequired,
    measuredResult,
    status,
    statusNote: 'A proposal is not a business decision, not an intervention and not a measured result. '
      + 'No approval, intervention or outcome is created by a market observation.',
    statusReason: `${satisfiedPhases} of ${evidenceRequirements.length} evidence requirements are satisfied. `
      + 'The status is derived from the governance chain and is never advanced by this layer.',
    governanceGateNote: gov.thresholdsComplete
      ? `EXP-001 thresholds are registered; ${gov.approvedBaselineRuns.length} baseline run(s) approved.`
      : 'EXP-001 has no registered success threshold, so no action is approved and no result can exist.',
    liquidityComparison,
    dataQuality,
  }
}

/** The assessment never advances the experiment. */
export function assessmentApprovesNothing(): false { return false }
/** The assessment never performs an intervention. */
export function assessmentExecutesIntervention(): false { return false }
/** The assessment never produces a measured result. */
export function assessmentProducesMeasuredResult(): false { return false }
