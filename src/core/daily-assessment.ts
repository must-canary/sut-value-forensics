/**
 * CURRENT — SUT MARKET STATE: the assessment layer.
 *
 * Three layers are kept apart, permanently:
 *
 *   1. HISTORICAL / FORENSIC EVIDENCE  — frozen research. Never written here.
 *   2. CURRENT MARKET STATE            — today's public observations.
 *   3. BUSINESS ACTION / INTERVENTION  — EXP-001 governance. Never written here.
 *
 * This module READS a persisted daily report, READS the frozen research
 * anchors and READS the live governance state, and produces a derived view.
 * It writes nothing, and it is recomputed on every load — so a candidate action
 * can never outrun the governance state it describes.
 *
 * Every sentence is typed: OBSERVATION, INTERPRETATION, PROPOSAL,
 * EXPECTED_EFFECT or MEASURED_RESULT. A MEASURED_RESULT is structurally
 * impossible until a real post-intervention measurement and a human review
 * exist — attempting one throws.
 */
import { valueOf, type DailyReport, type Observation } from './daily-sync'
import type { GovernanceState } from './governance'

export type StatementKind =
  | 'OBSERVATION' | 'INTERPRETATION' | 'PROPOSAL' | 'EXPECTED_EFFECT' | 'MEASURED_RESULT'

export interface Statement {
  kind: StatementKind
  text: string
  /** evidence ids, run ids, report ids or source ids backing the statement */
  evidence: string[]
}

export class StatementIntegrityError extends Error {}

/**
 * A MEASURED_RESULT may only be stated once a post-intervention measurement
 * exists AND a named human has reviewed it. Anything earlier is a proposal.
 */
export function assertMeasuredResultAllowed(gov: GovernanceState): void {
  if (!gov.comparison) {
    throw new StatementIntegrityError(
      'a MEASURED RESULT requires a post-intervention measurement — none exists',
    )
  }
  if (!gov.calculation) {
    throw new StatementIntegrityError('a MEASURED RESULT requires a calculated comparison')
  }
  if (!gov.finalReview) {
    throw new StatementIntegrityError(
      'a MEASURED RESULT requires a named human review — a calculation alone is provisional',
    )
  }
}

export function statement(kind: StatementKind, text: string, evidence: string[] = []): Statement {
  return { kind, text, evidence }
}

// ───────────────────────────────────────────── historical anchors (read-only)

export type AnchorKind = 'HYPOTHESIS' | 'OPPORTUNITY' | 'BASELINE_RUN' | 'EVIDENCE'

export interface HistoricalAnchor {
  kind: AnchorKind
  id: string
  title: string
  status: string
  note: string
  /** always true: the research layer is frozen and is never written by this layer */
  frozen: true
}

export interface AssessmentInputs {
  report: DailyReport
  previous: DailyReport | null
  gov: GovernanceState
  anchors: HistoricalAnchor[]
  /** measured baseline impacts per standardised size, from the captured runs */
  baselineImpacts: Array<{ size: string; value: number | null; runId: string; evidenceId: string | null }>
  /** registered targets, when a human has registered any */
  registeredTargets: Array<{ size: string; threshold: number | null }>
}

// ───────────────────────────────────────────── candidate action

export type ActionStatus =
  | 'PROPOSED' | 'APPROVED' | 'INTERVENTION_EXECUTED' | 'MEASUREMENT_PENDING'
  | 'SUPPORTED' | 'REJECTED' | 'INCONCLUSIVE'

export const ACTION_STATES: ActionStatus[] = [
  'PROPOSED', 'APPROVED', 'INTERVENTION_EXECUTED', 'MEASUREMENT_PENDING',
  'SUPPORTED', 'REJECTED', 'INCONCLUSIVE',
]

/**
 * The status is DERIVED from the governance chain, never set by this layer and
 * never advanced by observing the market. No state is skipped: each one is
 * reachable only once the stage before it has genuinely completed.
 */
export function actionStatus(gov: GovernanceState): { status: ActionStatus; reason: string } {
  if (!gov.thresholdsComplete) {
    return {
      status: 'PROPOSED',
      reason: 'a candidate only. No success threshold is registered, so no action is approved.',
    }
  }
  if (gov.approvedBaselineRuns.length === 0) {
    return {
      status: 'PROPOSED',
      reason: 'thresholds are registered, but no baseline run has been approved by a named human.',
    }
  }
  if (!gov.intervention) {
    return {
      status: 'APPROVED',
      reason: 'thresholds are registered and a baseline is approved. No intervention has been recorded.',
    }
  }
  if (!gov.comparison) {
    return {
      status: 'INTERVENTION_EXECUTED',
      reason: 'an intervention is recorded. No post-intervention measurement exists yet.',
    }
  }
  if (!gov.calculation || !gov.finalReview) {
    return {
      status: 'MEASUREMENT_PENDING',
      reason: gov.calculation
        ? 'a result is calculated but provisional until a named human records the final review.'
        : 'a measurement exists but no comparison has been calculated against the registered thresholds.',
    }
  }
  const result = gov.finalReview.result
  const status: ActionStatus = result === 'SUPPORTED' ? 'SUPPORTED'
    : result === 'REJECTED' ? 'REJECTED' : 'INCONCLUSIVE'
  return { status, reason: `recorded by ${gov.finalReview.reviewer} at ${gov.finalReview.at}.` }
}

export interface CandidateAction {
  id: string
  problemObserved: Statement
  historicalEvidence: HistoricalAnchor[]
  proposedAction: Statement
  expectedEffect: Statement
  baseline: Array<{ size: string; value: number | null; runId: string; evidenceId: string | null }>
  target: Array<{ size: string; threshold: number | null }>
  postInterventionMeasurement: Statement
  evidence: string[]
  status: ActionStatus
  statusReason: string
  nextRequiredHumanAction: string
  /** never true in this layer: an action is executed only through governance */
  executedAutomatically: false
}

const NEXT_ACTION: Record<ActionStatus, string> = {
  PROPOSED: 'A business owner must decide the acceptable thresholds, and a named human must register them '
    + 'and approve a baseline run. Nothing proceeds until then.',
  APPROVED: 'A named human must carry out and record the controlled intervention. This application cannot perform it.',
  INTERVENTION_EXECUTED: 'A post-intervention measurement must be captured with the identical method fingerprint.',
  MEASUREMENT_PENDING: 'A named human must review the calculated comparison and record the final result.',
  SUPPORTED: 'Decide whether to CONTINUE, CHANGE or STOP, on the recorded evidence.',
  REJECTED: 'Decide whether to CONTINUE, CHANGE or STOP, on the recorded evidence.',
  INCONCLUSIVE: 'Decide whether to CONTINUE, CHANGE or STOP, on the recorded evidence.',
}

const fmt = (v: number | null, unit = '') =>
  v === null ? 'DATA UNAVAILABLE' : `${v.toLocaleString('en-US', { maximumFractionDigits: 8 })}${unit ? ` ${unit}` : ''}`

/** The depth/liquidity candidate action, built from current data + frozen evidence + governance. */
export function buildCandidateAction(a: AssessmentInputs): CandidateAction {
  const liquidity = valueOf(a.report.observations, 'Pool liquidity (USD)')
  const volume = valueOf(a.report.observations, 'SUT 24h volume')
  const { status, reason } = actionStatus(a.gov)

  const problemText = liquidity === null
    ? 'Pool liquidity was DATA UNAVAILABLE at this retrieval, so the current depth condition cannot be stated. '
      + 'No condition is assumed in its absence.'
    : `Observed pool liquidity ${fmt(liquidity, 'USD')} against 24h volume ${fmt(volume, 'USD')} at `
      + `${a.report.generatedAt}. The frozen research established depth exhaustion as the supported amplification `
      + 'mechanism for the May 2026 move; this observation describes the current depth condition only, and '
      + 'attributes nothing to it.'

  const measured: Statement = (() => {
    try {
      assertMeasuredResultAllowed(a.gov)
    } catch {
      return statement('PROPOSAL',
        'DATA UNAVAILABLE — no post-intervention measurement exists. A measured result may only be stated after '
        + 'a real post-intervention capture has been taken and reviewed by a named human.', [])
    }
    return statement('MEASURED_RESULT',
      `Reviewed result ${a.gov.finalReview!.result}, recorded by ${a.gov.finalReview!.reviewer} `
      + `at ${a.gov.finalReview!.at}.`, a.gov.finalReview!.evidenceIds)
  })()

  return {
    id: 'CA-DEPTH-01',
    problemObserved: statement('INTERPRETATION', problemText,
      [a.report.id, 'dexscreener-pair', 'coingecko-token']),
    historicalEvidence: a.anchors,
    proposedAction: statement('PROPOSAL',
      'Candidate: improve measurable market depth for the SUT/USDT pool. This is a candidate for human decision '
      + 'only. It is not approved, it is not scheduled, and this application will not execute it.',
      a.anchors.flatMap((x) => (x.kind === 'EVIDENCE' ? [x.id] : []))),
    expectedEffect: statement('EXPECTED_EFFECT',
      'If the intervention is effective, the modelled price impact at the standardised trade sizes should fall '
      + 'relative to the approved baseline, compared by absolute magnitude. This is the effect to be MEASURED — '
      + 'it is not a prediction of price, market capitalisation or market rank, and it is not a claim that the '
      + 'intervention will work.', []),
    baseline: a.baselineImpacts,
    target: a.registeredTargets,
    postInterventionMeasurement: measured,
    evidence: [
      a.report.id,
      ...a.anchors.map((x) => x.id),
      ...a.baselineImpacts.map((b) => b.evidenceId).filter((x): x is string => x !== null),
    ],
    status,
    statusReason: reason,
    nextRequiredHumanAction: NEXT_ACTION[status],
    executedAutomatically: false,
  }
}

// ───────────────────────────────────────────── supply tracking

export interface SupplyChange {
  field: string
  current: number | null
  previous: number | null
  previousObservedAt: string | null
  absoluteChange: number | null
  percentChange: number | null
  status: 'OK' | 'DATA_UNAVAILABLE' | 'NO_PRIOR_OBSERVATION'
  reason: string | null
  source: string
  identity: string
  retrievedAt: string | null
}

const SUPPLY_FIELDS = [
  'SUT circulating supply', 'SUT total supply', 'SUT max supply',
  'CMC circulating supply', 'CMC total supply', 'CMC max supply',
] as const

/**
 * Day-over-day supply movement. A change is calculated ONLY when both the
 * current and the previous observation are real values; a missing reading is
 * never estimated, interpolated or carried over.
 */
export function supplyTracking(report: DailyReport, previous: DailyReport | null): SupplyChange[] {
  return SUPPLY_FIELDS.map((field) => {
    const o = report.observations.find((x) => x.field === field)
    const p = previous?.observations.find((x) => x.field === field) ?? null
    const current = o && typeof o.value === 'number' ? o.value : null
    const before = p && typeof p.value === 'number' ? p.value : null
    const row: SupplyChange = {
      field,
      current,
      previous: before,
      previousObservedAt: before === null ? null : (p?.dataTimestamp ?? previous?.generatedAt ?? null),
      absoluteChange: null,
      percentChange: null,
      status: current === null ? 'DATA_UNAVAILABLE' : 'OK',
      reason: current === null ? (o?.unavailableReason ?? 'the field was not captured in this retrieval') : null,
      source: o?.sourceName ?? 'not captured',
      identity: (o?.identity ?? 'NOT_APPLICABLE').replace(/_/g, ' '),
      retrievedAt: o?.retrievedAt ?? null,
    }
    if (current === null) return row
    if (before === null) {
      return {
        ...row,
        status: 'NO_PRIOR_OBSERVATION',
        reason: previous
          ? 'the previous retrieval has no real value for this field, so no change is calculated'
          : 'no earlier retrieval is stored, so no change is calculated',
      }
    }
    const absoluteChange = current - before
    return {
      ...row,
      absoluteChange,
      percentChange: before === 0 ? null : (absoluteChange / before) * 100,
    }
  })
}

// ───────────────────────────────────────────── the 12-section report view

export interface ReportSection {
  n: number
  title: string
  /** observations rendered as a table, when the section is a data section */
  fields: string[]
  statements: Statement[]
}

const SECTION_FIELDS: Array<[number, string, string[]]> = [
  [1, 'Current market snapshot', ['SUT price', 'SUT 24h change', 'SUT 24h volume', 'SUT market cap',
    'On-chain spot price', 'Block number', 'CMC price', 'CMC 24h change', 'CMC 24h volume']],
  [2, 'Supply snapshot', ['SUT circulating supply', 'SUT total supply', 'SUT max supply',
    'CMC circulating supply', 'CMC total supply', 'CMC max supply']],
  [3, 'Liquidity / market structure', ['Pool liquidity (USD)', 'Pool 24h volume', 'Pair price', 'Pair 24h change']],
  [4, 'Exchange / venue context', ['SUT venues', 'SUT market rank', 'CMC rank', 'CMC identity check',
    'CMC market cap', 'CMC fully diluted market cap', 'Market events / news']],
  [5, 'BTC / ETH context', ['BTC price', 'BTC 24h change', 'ETH price', 'ETH 24h change', 'Total crypto market cap', 'Total market cap 24h change']],
]

export function observationsFor(report: DailyReport, fields: string[]): Observation[] {
  return fields
    .map((f) => report.observations.find((o) => o.field === f))
    .filter((o): o is Observation => o !== undefined)
}

/** The twelve sections, derived — never stored, so they always reflect live governance. */
export function buildReportSections(a: AssessmentInputs): ReportSection[] {
  const action = buildCandidateAction(a)
  const sections: ReportSection[] = SECTION_FIELDS.map(([n, title, fields]) => ({
    n, title, fields,
    statements: [statement('OBSERVATION',
      `Values as published by the named sources at ${a.report.generatedAt}; each carries its own data timestamp.`,
      [a.report.id])],
  }))

  sections.push({
    n: 6,
    title: 'Changes since the previous observation',
    fields: [],
    statements: a.report.significantChanges.map((c) => statement('INTERPRETATION', c, [a.report.id])),
  })
  sections.push({
    n: 7,
    title: 'Historical evidence relevant to the current condition',
    fields: [],
    statements: a.anchors.map((x) => statement('OBSERVATION',
      `${x.kind} ${x.id} — ${x.title} (${x.status}). ${x.note} FROZEN: this record is never modified by the daily layer.`,
      [x.id])),
  })
  sections.push({ n: 8, title: 'Current problem / opportunity', fields: [], statements: [action.problemObserved] })
  sections.push({ n: 9, title: 'Candidate action', fields: [], statements: [action.proposedAction] })
  sections.push({ n: 10, title: 'Expected measurable effect', fields: [], statements: [action.expectedEffect] })
  sections.push({
    n: 11,
    title: 'Evidence required',
    fields: [],
    statements: [
      statement('PROPOSAL',
        'Required before any result: a registered success threshold, an approved baseline run, a recorded '
        + 'intervention, and a post-intervention capture taken with the identical method fingerprint.', []),
      action.postInterventionMeasurement,
    ],
  })
  sections.push({
    n: 12,
    title: 'Data quality / limitations',
    fields: [],
    statements: a.report.limitations.map((l) => statement('OBSERVATION', l, [a.report.id])),
  })
  return sections
}

export interface CurrentStateAssessment {
  reportId: string
  generatedAt: string
  sections: ReportSection[]
  action: CandidateAction
  /** the daily layer answers this question, and only this one */
  question: string
}

export const CURRENT_STATE_QUESTION =
  'What is the current observable condition of SUT in the market, and what should be investigated or improved next?'

export const LAYER_LABELS = {
  historical: 'HISTORICAL RESEARCH — FROZEN 2026-09-30',
  current: 'CURRENT — SUT MARKET STATE',
  governance: 'EXPERIMENT & GOVERNANCE — EXP-001',
} as const

export function assessCurrentState(a: AssessmentInputs): CurrentStateAssessment {
  return {
    reportId: a.report.id,
    generatedAt: a.report.generatedAt,
    sections: buildReportSections(a),
    action: buildCandidateAction(a),
    question: CURRENT_STATE_QUESTION,
  }
}

/** This layer never advances a business decision by itself. */
export function assessmentExecutesAction(): false { return false }
/** This layer never writes to the research or governance layers. */
export function assessmentWritesHistory(): false { return false }
