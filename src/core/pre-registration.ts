/**
 * Phase 6 — pre-registration and the full experiment timeline.
 *
 * A threshold registered AFTER seeing results is not a threshold, it is a
 * rationalisation. Everything here exists to make that impossible:
 *   - a threshold requires a named human and a timestamp
 *   - once registered it is immutable for that experiment version
 *   - it cannot be created or altered once comparison results exist
 *   - no threshold may be derived from an existing baseline run
 */

export type ThresholdDirection = 'LOWER_IS_BETTER' | 'HIGHER_IS_BETTER'

export type RegistrationState =
  | 'AWAITING_HUMAN_ENTRY'   // slot defined, no number supplied
  | 'REGISTERED'             // number supplied by a named human, now immutable
  | 'NOT_REGISTERABLE'       // the size cannot be executed at all

/** All ten fields the workflow requires before a comparison run is accepted. */
export interface PreRegistrationEntry {
  experimentId: string
  experimentVersion: string
  metric: string
  standardisedSize: string
  baselineMethod: string
  /** null while AWAITING_HUMAN_ENTRY — never inferred from a captured run. */
  successThreshold: number | null
  thresholdUnit: string
  thresholdDirection: ThresholdDirection
  measurementWindow: string
  comparisonMethod: string
  /** null until a named human registers it. */
  reviewerName: string | null
  registrationTimestamp: string | null
  state: RegistrationState
  notes: string
  /**
   * The registering human must confirm the number was chosen independently of
   * the observed baseline runs. Without it the threshold is not admissible.
   */
  independenceAttested: boolean
  attestedBy: string | null
  /** Why this number. Required once REGISTERED; a number without a reason is not a criterion. */
  rationale: string | null
}

export class PreRegistrationLockedError extends Error {}
export class ThresholdMissingError extends Error {}
export class ThresholdDerivationError extends Error {}

/** A registered entry must carry a number, a named human, and a timestamp. */
export function validateRegistration(e: PreRegistrationEntry): string[] {
  const errs: string[] = []
  for (const f of ['experimentId', 'experimentVersion', 'metric', 'standardisedSize',
    'baselineMethod', 'thresholdUnit', 'measurementWindow', 'comparisonMethod'] as const) {
    if (!e[f]) errs.push(`${f} is required`)
  }
  if (e.state === 'REGISTERED') {
    if (e.successThreshold === null) errs.push('a REGISTERED entry requires a numeric successThreshold')
    if (!e.reviewerName) errs.push('a REGISTERED entry requires a named human reviewer')
    if (!e.registrationTimestamp) errs.push('a REGISTERED entry requires a registration timestamp')
    if (!e.independenceAttested) {
      errs.push('a REGISTERED entry requires confirmation that the threshold was chosen independently of the observed baseline runs')
    }
    if (!e.attestedBy) errs.push('the independence confirmation requires a named attester')
    if (!e.rationale || !e.rationale.trim()) errs.push('a REGISTERED entry requires a written rationale')
  }
  if (e.state !== 'REGISTERED' && e.independenceAttested) {
    errs.push('independence cannot be attested before a threshold is supplied')
  }
  if (e.state !== 'REGISTERED' && e.successThreshold !== null) {
    errs.push(`state ${e.state} must not carry a threshold value`)
  }
  if (e.state === 'NOT_REGISTERABLE' && !/not executable|cannot be/i.test(e.notes)) {
    errs.push('a NOT_REGISTERABLE entry must explain why the size cannot be executed')
  }
  return errs
}

/** Registration is refused when any comparison result already exists. */
export function assertRegistrationAllowed(hasComparisonResults: boolean): void {
  if (hasComparisonResults) {
    throw new PreRegistrationLockedError(
      'a threshold may not be registered or altered once comparison results exist — ' +
      'that is retro-fitting a criterion to an outcome',
    )
  }
}

/** Once REGISTERED the entry is immutable for that experiment version. */
export function assertImmutable(prev: PreRegistrationEntry, next: PreRegistrationEntry): void {
  if (prev.state !== 'REGISTERED') return
  if (prev.experimentVersion !== next.experimentVersion) return // a new version may re-register
  const frozen: Array<keyof PreRegistrationEntry> = [
    'successThreshold', 'thresholdDirection', 'thresholdUnit',
    'standardisedSize', 'metric', 'baselineMethod', 'comparisonMethod',
    'measurementWindow', 'reviewerName', 'registrationTimestamp',
  ]
  for (const f of frozen) {
    if (prev[f] !== next[f]) {
      throw new PreRegistrationLockedError(
        `${prev.experimentId} ${prev.experimentVersion}: "${String(f)}" is immutable once registered ` +
        `(was ${JSON.stringify(prev[f])}, attempted ${JSON.stringify(next[f])}). ` +
        'Register a new experiment version instead.',
      )
    }
  }
}

/** A threshold must not equal or be derived from an observed baseline value. */
export function assertNotDerivedFromBaseline(threshold: number, observedBaselineValues: number[]): void {
  if (observedBaselineValues.some((v) => Math.abs(v - threshold) < 1e-9)) {
    throw new ThresholdDerivationError(
      'the proposed threshold matches an observed baseline value — a threshold must be set ' +
      'independently of the captured runs, not read off them',
    )
  }
}

/** A comparison run is refused while any required threshold is unregistered. */
export function assertThresholdsRegistered(entries: PreRegistrationEntry[]): void {
  const pending = entries.filter((e) => e.state === 'AWAITING_HUMAN_ENTRY')
  if (pending.length > 0) {
    throw new ThresholdMissingError(
      `cannot accept a comparison run: ${pending.length} threshold(s) awaiting human entry — ` +
      pending.map((p) => p.standardisedSize).join(', '),
    )
  }
}

export function registrationSummary(entries: PreRegistrationEntry[]) {
  return {
    total: entries.length,
    registered: entries.filter((e) => e.state === 'REGISTERED').length,
    awaiting: entries.filter((e) => e.state === 'AWAITING_HUMAN_ENTRY').length,
    notRegisterable: entries.filter((e) => e.state === 'NOT_REGISTERABLE').length,
    complete: entries.every((e) => e.state !== 'AWAITING_HUMAN_ENTRY'),
  }
}

// ──────────────────────────────────────────────── experiment timeline

export const TIMELINE_STAGES = [
  'PLANNED',
  'PRE_REGISTERED',
  'BASELINE_COLLECTION',
  'BASELINE_REVIEWED',
  'INTERVENTION',
  'COMPARISON_CAPTURE',
  'RESULT_CALCULATED',
  'HUMAN_REVIEW',
  'COMPLETED',
] as const
export type TimelineStage = (typeof TIMELINE_STAGES)[number]

export const STAGE_LABELS: Record<TimelineStage, string> = {
  PLANNED: 'PLANNED',
  PRE_REGISTERED: 'PRE-REGISTERED',
  BASELINE_COLLECTION: 'BASELINE COLLECTION',
  BASELINE_REVIEWED: 'BASELINE REVIEWED',
  INTERVENTION: 'INTERVENTION',
  COMPARISON_CAPTURE: 'COMPARISON CAPTURE',
  RESULT_CALCULATED: 'RESULT CALCULATED',
  HUMAN_REVIEW: 'HUMAN REVIEW',
  COMPLETED: 'COMPLETED',
}

export class StageTransitionError extends Error {}

export interface StageContext {
  thresholdsComplete: boolean
  baselineRuns: number
  approvedBaselineRuns: number
  interventionOccurred: boolean
  comparisonRuns: number
  resultCalculated: boolean
  humanReviewRecorded: boolean
}

/** What blocks progress past the current stage, in plain business terms. */
export function blockersFor(stage: TimelineStage, c: StageContext): string[] {
  const b: string[] = []
  if (!c.thresholdsComplete) b.push('Success thresholds are not pre-registered (human entry required)')
  if (c.baselineRuns === 0) b.push('No baseline run has been captured')
  if (c.approvedBaselineRuns === 0) b.push('No baseline run has been approved by a named human reviewer')
  if (!c.interventionOccurred) b.push('No intervention has occurred')
  if (c.comparisonRuns === 0) b.push('No comparison capture exists')
  if (!c.humanReviewRecorded) b.push('No human review of a result has been recorded')
  void stage
  return b
}

/** A stage may only be entered when every prerequisite is genuinely satisfied. */
export function assertStageAllowed(target: TimelineStage, c: StageContext): void {
  const need = (cond: boolean, why: string) => {
    if (!cond) throw new StageTransitionError(`cannot enter ${STAGE_LABELS[target]}: ${why}`)
  }
  switch (target) {
    case 'PLANNED':
      break
    case 'PRE_REGISTERED':
      need(c.thresholdsComplete, 'thresholds are not fully registered')
      break
    case 'BASELINE_COLLECTION':
      need(c.baselineRuns > 0, 'no baseline run has been captured')
      break
    case 'BASELINE_REVIEWED':
      need(c.approvedBaselineRuns > 0, 'no baseline run has been approved by a named human')
      break
    case 'INTERVENTION':
      need(c.thresholdsComplete, 'thresholds must be pre-registered before an intervention')
      need(c.approvedBaselineRuns > 0, 'an approved baseline is required before an intervention')
      break
    case 'COMPARISON_CAPTURE':
      need(c.interventionOccurred, 'no intervention has occurred')
      break
    case 'RESULT_CALCULATED':
      need(c.comparisonRuns > 0, 'no comparison capture exists')
      need(c.thresholdsComplete, 'a result cannot be calculated without a pre-registered threshold')
      break
    case 'HUMAN_REVIEW':
      need(c.resultCalculated, 'no result has been calculated')
      break
    case 'COMPLETED':
      need(c.comparisonRuns > 0, 'a measured comparison is required')
      need(c.resultCalculated, 'no result has been calculated')
      need(c.humanReviewRecorded, 'human review is required before COMPLETED')
      break
  }
}

export function currentStage(c: StageContext): TimelineStage {
  if (c.humanReviewRecorded && c.resultCalculated && c.comparisonRuns > 0) return 'COMPLETED'
  if (c.resultCalculated) return 'HUMAN_REVIEW'
  if (c.comparisonRuns > 0) return 'RESULT_CALCULATED'
  if (c.interventionOccurred) return 'COMPARISON_CAPTURE'
  if (c.approvedBaselineRuns > 0) return 'BASELINE_REVIEWED'
  if (c.baselineRuns > 0) return 'BASELINE_COLLECTION'
  if (c.thresholdsComplete) return 'PRE_REGISTERED'
  return 'PLANNED'
}

export function nextRequiredAction(c: StageContext): string {
  if (!c.thresholdsComplete) {
    return 'A named human must register the numeric success thresholds for $10K buy, $10K sell, $50K buy and $50K sell. ' +
      'No threshold may be derived from RUN-001, RUN-002 or RUN-003.'
  }
  if (c.approvedBaselineRuns === 0) return 'A named human reviewer must ACCEPT or REJECT a captured baseline run.'
  if (!c.interventionOccurred) return 'Carry out the disclosed depth intervention, holding the measurement method constant.'
  if (c.comparisonRuns === 0) return 'Capture a comparison run using the identical method fingerprint.'
  if (!c.resultCalculated) return 'Calculate the result against the pre-registered thresholds.'
  if (!c.humanReviewRecorded) return 'A named human must review and record the result.'
  return 'No further action outstanding.'
}


// ─────────────────────────────────────── handoff: proposed registration

export const BLOCKING_NOTICE =
  'No intervention or comparison run may proceed until all four thresholds are registered and approved.'

export const NEXT_REQUIRED_ACTION =
  'Register four thresholds and approve the baseline before intervention.'

export interface ProposedRegistration {
  standardisedSize: string
  threshold: number | null
  authorName: string
  /** Why this number. Required — a number without a reason is not a criterion. */
  rationale: string
  independenceAttested: boolean
}

export interface DraftResult {
  admissible: boolean
  problems: string[]
  record: PreRegistrationEntry | null
}

/**
 * Validate a human-proposed registration WITHOUT committing it.
 * Returns the exact record that would be written, or the reasons it is refused.
 */
export function draftRegistration(
  slot: PreRegistrationEntry,
  proposed: ProposedRegistration,
  observedBaselineValues: number[],
  now: string,
): DraftResult {
  const problems: string[] = []
  if (slot.state === 'NOT_REGISTERABLE') {
    problems.push('this size is NOT REGISTERABLE — the pool cannot execute it')
  }
  if (proposed.threshold === null || Number.isNaN(proposed.threshold)) {
    problems.push('a numeric threshold is required')
  }
  if (!proposed.authorName.trim()) {
    problems.push('a named human author is required')
  }
  if (!proposed.rationale?.trim()) {
    problems.push('a written rationale is required — a number without a reason is not a criterion')
  }
  if (!proposed.independenceAttested) {
    problems.push('confirmation is required that the number was selected independently of RUN-001, RUN-002 and RUN-003')
  }
  if (proposed.threshold !== null && !Number.isNaN(proposed.threshold)) {
    try {
      assertNotDerivedFromBaseline(proposed.threshold, observedBaselineValues)
    } catch (e) {
      problems.push((e as Error).message)
    }
  }
  if (problems.length > 0) return { admissible: false, problems, record: null }
  return {
    admissible: true,
    problems: [],
    record: {
      ...slot,
      successThreshold: proposed.threshold,
      reviewerName: proposed.authorName.trim(),
      registrationTimestamp: now,
      state: 'REGISTERED',
      independenceAttested: true,
      attestedBy: proposed.authorName.trim(),
      rationale: proposed.rationale.trim(),
      notes: `Registered by ${proposed.authorName.trim()} at ${now}. ` +
        'Confirmed selected independently of the observed baseline runs.',
    },
  }
}

// ─────────────────────────────────────── handoff: proposed baseline review

export type BaselineReviewAction = 'ACCEPT' | 'REJECT'

export interface ProposedBaselineReview {
  runId: string
  reviewerName: string
  action: BaselineReviewAction
  note: string
}

export interface BaselineReviewDraft {
  admissible: boolean
  problems: string[]
  record: { runId: string; reviewer: string; action: BaselineReviewAction; at: string; note: string } | null
}

/** Validate a proposed baseline review. Approval is never automatic. */
export function draftBaselineReview(
  proposed: ProposedBaselineReview,
  knownRunIds: string[],
  now: string,
): BaselineReviewDraft {
  const problems: string[] = []
  if (!knownRunIds.includes(proposed.runId)) problems.push(`unknown run "${proposed.runId}"`)
  if (!proposed.reviewerName.trim()) problems.push('a named human reviewer is required — approval is never automatic')
  if (proposed.action === 'REJECT' && !proposed.note.trim()) {
    problems.push('a rejection requires a stated reason')
  }
  if (problems.length > 0) return { admissible: false, problems, record: null }
  return {
    admissible: true,
    problems: [],
    record: {
      runId: proposed.runId,
      reviewer: proposed.reviewerName.trim(),
      action: proposed.action,
      at: now,
      note: proposed.note.trim(),
    },
  }
}
