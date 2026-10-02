/**
 * EXP-001 governance chain — the only missing link between a captured baseline
 * and a defensible result.
 *
 *   threshold registration (+rationale, immutable lock)
 *     -> baseline approval (named human)
 *       -> controlled intervention record
 *         -> same-method comparison capture
 *           -> before/after calculation
 *             -> final human review
 *
 * Nothing here fabricates a threshold, rationale, reviewer, intervention,
 * comparison or result. Absent human input, every stage stays PENDING/BLOCKED.
 */
import {
  assertImmutable, assertNotDerivedFromBaseline, assertRegistrationAllowed,
  type PreRegistrationEntry, type ThresholdDirection,
} from './pre-registration'

export class GovernanceError extends Error {}

const named = (s: string | null | undefined) => !!s && s.trim().length > 0

// ───────────────────────────────── 1. threshold registration + rationale

export interface ProposedThreshold {
  standardisedSize: string
  threshold: number | null
  authorName: string
  /** Why this number, independent of the observed runs. Required. */
  rationale: string
  independenceAttested: boolean
}

export interface RegistrationCommit {
  committed: boolean
  problems: string[]
  entry: PreRegistrationEntry | null
}

/**
 * Commit a threshold. Refuses without a number, named author, rationale and
 * independence confirmation; refuses a value read off a baseline; refuses once
 * comparison results exist; refuses to overwrite a locked entry.
 */
export function commitThreshold(
  slot: PreRegistrationEntry,
  p: ProposedThreshold,
  observedBaselineValues: number[],
  now: string,
  hasComparisonResults: boolean,
): RegistrationCommit {
  const problems: string[] = []
  try {
    assertRegistrationAllowed(hasComparisonResults)
  } catch (e) {
    problems.push((e as Error).message)
  }
  if (slot.state === 'REGISTERED') problems.push('this slot is already registered and is immutable for this experiment version')
  if (slot.state === 'NOT_REGISTERABLE') problems.push('this size is NOT REGISTERABLE — the venue cannot execute it')
  if (p.threshold === null || Number.isNaN(p.threshold)) problems.push('a numeric threshold is required')
  if (p.threshold !== null && p.threshold < 0) problems.push('a magnitude threshold must not be negative')
  if (!named(p.authorName)) problems.push('a named human author is required')
  if (!named(p.rationale)) problems.push('a written rationale is required — a number without a reason is not a criterion')
  if (!p.independenceAttested) problems.push('confirmation is required that the number was selected independently of the observed runs')
  if (p.threshold !== null && !Number.isNaN(p.threshold)) {
    try {
      assertNotDerivedFromBaseline(p.threshold, observedBaselineValues)
    } catch (e) {
      problems.push((e as Error).message)
    }
  }
  if (problems.length) return { committed: false, problems, entry: null }

  const entry: PreRegistrationEntry = {
    ...slot,
    successThreshold: p.threshold,
    reviewerName: p.authorName.trim(),
    registrationTimestamp: now,
    state: 'REGISTERED',
    independenceAttested: true,
    attestedBy: p.authorName.trim(),
    rationale: p.rationale.trim(),
    notes: `Registered by ${p.authorName.trim()} at ${now}.`,
  }
  assertImmutable(slot, entry) // no-op while slot was unregistered; guards misuse
  return { committed: true, problems: [], entry }
}

/** Any later write to a registered slot is refused. */
export function assertThresholdLock(prev: PreRegistrationEntry, next: PreRegistrationEntry): void {
  assertImmutable(prev, next)
  if (prev.state === 'REGISTERED' && prev.experimentVersion === next.experimentVersion
    && prev.rationale !== next.rationale) {
    throw new GovernanceError('the rationale is immutable once registered — register a new experiment version instead')
  }
}

// ───────────────────────────────── 2. baseline approval

export type ApprovalAction = 'APPROVE' | 'REJECT'

export interface BaselineApproval {
  runId: string
  reviewer: string
  action: ApprovalAction
  at: string
  note: string
}

export function commitBaselineApproval(
  p: { runId: string; reviewer: string; action: ApprovalAction; note: string },
  knownRunIds: string[],
  now: string,
): { committed: boolean; problems: string[]; record: BaselineApproval | null } {
  const problems: string[] = []
  if (!knownRunIds.includes(p.runId)) problems.push(`unknown run "${p.runId}"`)
  if (!named(p.reviewer)) problems.push('a named human reviewer is required — approval is never automatic')
  if (p.action === 'REJECT' && !named(p.note)) problems.push('a rejection requires a stated reason')
  if (problems.length) return { committed: false, problems, record: null }
  return {
    committed: true, problems: [],
    record: { runId: p.runId, reviewer: p.reviewer.trim(), action: p.action, at: now, note: p.note.trim() },
  }
}

export function approvedBaselineRunIds(approvals: BaselineApproval[]): string[] {
  const last = new Map<string, BaselineApproval>()
  for (const a of approvals) last.set(a.runId, a)
  return [...last.values()].filter((a) => a.action === 'APPROVE').map((a) => a.runId)
}

// ───────────────────────────────── 3. controlled intervention record

export interface InterventionRecord {
  experimentId: string
  description: string
  /** the baseline this intervention is measured against */
  baselineRunId: string
  startedAt: string
  endedAt: string | null
  recordedBy: string
  /** must match the baseline's fingerprint or the comparison is invalid */
  methodFingerprint: string
  heldConstant: string[]
  evidenceIds: string[]
}

export function commitIntervention(
  p: Partial<InterventionRecord>,
  approvedRunIds: string[],
  thresholdsComplete: boolean,
  baselineFingerprint: string,
): { committed: boolean; problems: string[]; record: InterventionRecord | null } {
  const problems: string[] = []
  if (!thresholdsComplete) problems.push('thresholds must be registered before an intervention')
  if (!p.baselineRunId || !approvedRunIds.includes(p.baselineRunId)) {
    problems.push('an approved baseline run must be named as the comparison reference')
  }
  if (!named(p.description)) problems.push('a description of the controlled intervention is required')
  if (!named(p.recordedBy)) problems.push('a named human must record the intervention')
  if (!named(p.startedAt)) problems.push('a start timestamp is required')
  if (p.methodFingerprint !== baselineFingerprint) {
    problems.push('the intervention must declare the baseline method fingerprint unchanged')
  }
  if (!p.evidenceIds?.length) problems.push('an intervention requires at least one evidence reference')
  if (problems.length) return { committed: false, problems, record: null }
  return {
    committed: true, problems: [],
    record: {
      experimentId: 'EXP-001',
      description: p.description!.trim(),
      baselineRunId: p.baselineRunId!,
      startedAt: p.startedAt!,
      endedAt: p.endedAt ?? null,
      recordedBy: p.recordedBy!.trim(),
      methodFingerprint: p.methodFingerprint!,
      heldConstant: p.heldConstant ?? [],
      evidenceIds: p.evidenceIds!,
    },
  }
}

// ───────────────────────────────── 4. post-intervention comparison

export interface ComparisonReading {
  standardisedSize: string
  /** signed impact percent; null when the size is not executable */
  value: number | null
  notExecutable: boolean
  evidenceId: string | null
}

export interface ComparisonCapture {
  runId: string
  capturedAt: string
  blockNumber: number | null
  methodFingerprint: string
  readings: ComparisonReading[]
  /** the intervention this follows */
  afterInterventionStartedAt: string
}

export function validateComparison(
  c: ComparisonCapture,
  intervention: InterventionRecord | null,
): string[] {
  const problems: string[] = []
  if (!intervention) { problems.push('no intervention has been recorded — a comparison has nothing to follow'); return problems }
  if (c.methodFingerprint !== intervention.methodFingerprint) {
    problems.push('comparison method fingerprint differs from the baseline/intervention — the runs are not comparable')
  }
  if (c.capturedAt <= intervention.startedAt) {
    problems.push('the comparison capture must postdate the intervention start')
  }
  for (const r of c.readings) {
    if (r.value !== null && !r.evidenceId) problems.push(`${r.standardisedSize}: a stated value requires provenance`)
    if (r.notExecutable && r.value !== null) problems.push(`${r.standardisedSize}: a not-executable size must not report a value`)
  }
  return problems
}

// ───────────────────────────────── 5. before/after calculation

export type KpiOutcome = 'MET' | 'NOT_MET' | 'NOT_EXECUTABLE' | 'DATA_UNAVAILABLE'

export interface KpiComparison {
  standardisedSize: string
  direction: ThresholdDirection
  threshold: number | null
  baselineValue: number | null
  comparisonValue: number | null
  /** absolute magnitudes used for LOWER_IS_BETTER */
  baselineMagnitude: number | null
  comparisonMagnitude: number | null
  deltaMagnitude: number | null
  improved: boolean | null
  outcome: KpiOutcome
  note: string
}

/**
 * LOWER_IS_BETTER compares SIGNED price impact by ABSOLUTE MAGNITUDE:
 * a sell impact of -9.61% is worse than -8.00% because |9.61| > |8.00|.
 */
export function compareKpi(
  size: string,
  direction: ThresholdDirection,
  threshold: number | null,
  baselineValue: number | null,
  comparison: ComparisonReading | undefined,
): KpiComparison {
  const base = {
    standardisedSize: size, direction, threshold,
    baselineValue, comparisonValue: comparison?.value ?? null,
    baselineMagnitude: baselineValue === null ? null : Math.abs(baselineValue),
    comparisonMagnitude: comparison?.value == null ? null : Math.abs(comparison.value),
    deltaMagnitude: null as number | null,
    improved: null as boolean | null,
  }
  if (comparison?.notExecutable) {
    return { ...base, outcome: 'NOT_EXECUTABLE', note: 'the venue cannot execute this standardised size' }
  }
  if (threshold === null) {
    return { ...base, outcome: 'DATA_UNAVAILABLE', note: 'no threshold registered — the outcome cannot be judged' }
  }
  if (base.baselineMagnitude === null || base.comparisonMagnitude === null) {
    return { ...base, outcome: 'DATA_UNAVAILABLE', note: 'baseline or comparison value missing' }
  }
  const delta = base.comparisonMagnitude - base.baselineMagnitude
  const improved = direction === 'LOWER_IS_BETTER' ? delta < 0 : delta > 0
  const met = direction === 'LOWER_IS_BETTER'
    ? base.comparisonMagnitude <= threshold
    : base.comparisonMagnitude >= threshold
  return {
    ...base, deltaMagnitude: delta, improved,
    outcome: met ? 'MET' : 'NOT_MET',
    note: `|${base.comparisonMagnitude}| vs threshold ${threshold} (${direction.replace(/_/g, ' ').toLowerCase()}); ` +
      `magnitude change ${delta > 0 ? '+' : ''}${delta.toFixed(4)}`,
  }
}

export type OverallResult = 'SUPPORTED' | 'REJECTED' | 'INCONCLUSIVE' | 'DATA_UNAVAILABLE'

export interface ResultCalculation {
  perKpi: KpiComparison[]
  /** computed, but NOT a finding until a human reviews it */
  provisionalResult: OverallResult
  rationale: string
}

export function calculateResult(perKpi: KpiComparison[]): ResultCalculation {
  if (perKpi.length === 0) {
    return { perKpi, provisionalResult: 'DATA_UNAVAILABLE', rationale: 'no comparable KPI pairs' }
  }
  const judged = perKpi.filter((k) => k.outcome === 'MET' || k.outcome === 'NOT_MET')
  if (judged.length === 0) {
    return { perKpi, provisionalResult: 'DATA_UNAVAILABLE', rationale: 'no KPI could be judged against a registered threshold' }
  }
  const allMet = judged.every((k) => k.outcome === 'MET')
  const noneMet = judged.every((k) => k.outcome === 'NOT_MET')
  const provisionalResult: OverallResult = allMet ? 'SUPPORTED' : noneMet ? 'REJECTED' : 'INCONCLUSIVE'
  return {
    perKpi, provisionalResult,
    rationale: `${judged.filter((k) => k.outcome === 'MET').length} of ${judged.length} judged KPIs met their ` +
      `pre-registered threshold; ${perKpi.length - judged.length} could not be judged. ` +
      'Provisional only — not a finding until a named human records the final review.',
  }
}

// ───────────────────────────────── 6. final human review

export interface FinalReview {
  experimentId: string
  reviewer: string
  at: string
  result: OverallResult
  note: string
  evidenceIds: string[]
}

export function commitFinalReview(
  p: Partial<FinalReview>,
  calculation: ResultCalculation | null,
): { committed: boolean; problems: string[]; record: FinalReview | null } {
  const problems: string[] = []
  if (!calculation) problems.push('no result has been calculated — there is nothing to review')
  if (!named(p.reviewer)) problems.push('a named human reviewer is required')
  if (!named(p.at)) problems.push('a review timestamp is required')
  if (!p.result) problems.push('the reviewer must record a result')
  if (!named(p.note)) problems.push('a review note is required')
  if (!p.evidenceIds?.length) problems.push('the recorded result must link to evidence')
  if (problems.length) return { committed: false, problems, record: null }
  return {
    committed: true, problems: [],
    record: {
      experimentId: 'EXP-001', reviewer: p.reviewer!.trim(), at: p.at!,
      result: p.result!, note: p.note!.trim(), evidenceIds: p.evidenceIds!,
    },
  }
}

// ───────────────────────────────── governance state roll-up

export interface GovernanceState {
  thresholdsRegistered: number
  thresholdsRequired: number
  thresholdsComplete: boolean
  approvedBaselineRuns: string[]
  intervention: InterventionRecord | null
  comparison: ComparisonCapture | null
  calculation: ResultCalculation | null
  finalReview: FinalReview | null
}

export type GovernanceGate =
  | 'THRESHOLDS_PENDING' | 'BASELINE_APPROVAL_PENDING' | 'INTERVENTION_PENDING'
  | 'COMPARISON_PENDING' | 'CALCULATION_PENDING' | 'FINAL_REVIEW_PENDING' | 'COMPLETE'

export function currentGate(s: GovernanceState): GovernanceGate {
  if (!s.thresholdsComplete) return 'THRESHOLDS_PENDING'
  if (s.approvedBaselineRuns.length === 0) return 'BASELINE_APPROVAL_PENDING'
  if (!s.intervention) return 'INTERVENTION_PENDING'
  if (!s.comparison) return 'COMPARISON_PENDING'
  if (!s.calculation) return 'CALCULATION_PENDING'
  if (!s.finalReview) return 'FINAL_REVIEW_PENDING'
  return 'COMPLETE'
}

export const GATE_ACTION: Record<GovernanceGate, string> = {
  THRESHOLDS_PENDING: 'A named human must register the four numeric thresholds with a written rationale.',
  BASELINE_APPROVAL_PENDING: 'A named human must approve one of the captured baseline runs.',
  INTERVENTION_PENDING: 'Record the controlled intervention against the approved baseline.',
  COMPARISON_PENDING: 'Capture a post-intervention comparison using the identical method fingerprint.',
  CALCULATION_PENDING: 'Calculate the before/after comparison against the registered thresholds.',
  FINAL_REVIEW_PENDING: 'A named human must record the final review of the calculated result.',
  COMPLETE: 'Governance chain complete.',
}

/** The experiment is only COMPLETED when every gate has genuinely passed. */
export function assertCompletable(s: GovernanceState): void {
  const gate = currentGate(s)
  if (gate !== 'COMPLETE') {
    throw new GovernanceError(`EXP-001 cannot be COMPLETED: ${GATE_ACTION[gate]}`)
  }
}
