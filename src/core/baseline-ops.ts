/**
 * Phase 5 — baseline capture operations.
 *
 * A baseline capture is a first-class record. It is rejected without provenance,
 * it never invents a value for a missing day, and it never lets a creator
 * attribution stand in for a reviewer identity.
 */

export type DataStatus =
  | 'MEASURED'          // directly observed
  | 'PROVISIONAL'       // observed but subject to revision (short window, single sample)
  | 'INFERRED'          // derived from a model rather than observed
  | 'DATA_UNAVAILABLE'  // not obtainable; never substituted
  | 'NOT_EXECUTABLE'    // the standardised size cannot be filled at all
export type ReviewerStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'RE_MEASUREMENT_REQUESTED'
export type TimestampPrecision = 'EXACT_BLOCK' | 'INTERPOLATED' | 'NOT_APPLICABLE'

/** One captured KPI observation with the full mandatory field set. */
export interface BaselineCaptureRecord {
  experimentId: string
  runId: string
  kpi: string
  dimension: string
  value: number | string | null
  unit: string
  observationTime: string
  retrievedAt: string
  source: string
  evidenceId: string | null
  methodology: string
  limitations: string[]
  dataStatus: DataStatus
  reviewerStatus: ReviewerStatus
  /** Model output rather than a direct observation. */
  modelled: boolean
  /** Boundary-sensitive work must not rely on interpolated timestamps. */
  timestampPrecision: TimestampPrecision
}

export class BaselineProvenanceError extends Error {}
export class ReviewerError extends Error {}

/** A baseline without provenance is rejected outright. */
export function validateCapture(c: BaselineCaptureRecord): string[] {
  const errs: string[] = []
  if (!c.experimentId) errs.push('experimentId is required')
  if (!c.runId) errs.push('runId is required')
  if (!c.kpi) errs.push('kpi is required')
  if (!c.unit) errs.push('unit is required')
  if (!c.observationTime) errs.push('observationTime is required')
  if (!c.retrievedAt) errs.push('retrievedAt is required')
  if (!c.source) errs.push('source is required')
  if (!c.methodology) errs.push('methodology is required')

  const VALUED: DataStatus[] = ['MEASURED', 'PROVISIONAL', 'INFERRED']
  if (VALUED.includes(c.dataStatus)) {
    if (c.value === null) errs.push(`a ${c.dataStatus} capture cannot carry a null value`)
    if (!c.evidenceId) errs.push(`a ${c.dataStatus} capture requires an evidenceId`)
  } else if (c.value !== null) {
    errs.push(`a ${c.dataStatus} capture must carry a null value — never a fabricated one`)
  }
  if (c.dataStatus === 'INFERRED' && !c.modelled) {
    errs.push('an INFERRED capture must be flagged as modelled')
  }
  if (c.modelled && !c.limitations.some((l) => /model/i.test(l))) {
    errs.push('a modelled capture must declare in its limitations that it is a model output')
  }
  return errs
}

export function assertCapture(c: BaselineCaptureRecord): void {
  const errs = validateCapture(c)
  if (errs.length) throw new BaselineProvenanceError(`${c.experimentId}/${c.runId}/${c.kpi}: ${errs.join('; ')}`)
}

/** Boundary-sensitive KPIs (weekly/daily buckets) must use exact block timestamps. */
export function assertExactTimestamps(c: BaselineCaptureRecord, boundarySensitive: boolean): void {
  if (boundarySensitive && c.timestampPrecision !== 'EXACT_BLOCK') {
    throw new BaselineProvenanceError(
      `${c.experimentId}/${c.kpi}: boundary-sensitive measurement requires EXACT_BLOCK timestamps, got ${c.timestampPrecision}`,
    )
  }
}

// ───────────────────────────────────────────── 30-day coverage window

export interface CoverageDay {
  date: string
  value: number | null
  evidenceId: string | null
  /** Explicit reason when nothing was captured. Never a backfilled number. */
  note: string
}

export interface CoverageWindow {
  experimentId: string
  kpi: string
  unit: string
  startDate: string
  endDate: string
  plannedDays: number
  days: CoverageDay[]
  daysCaptured: number
  daysMissing: number
  coveragePct: number
  latest: { date: string; value: number } | null
  average: number | null
  median: number | null
  min: number | null
  max: number | null
}

/**
 * Build a coverage window. Missing days are rendered as DATA UNAVAILABLE and
 * are NEVER backfilled; statistics are computed over captured days only.
 */
export function buildCoverage(
  experimentId: string, kpi: string, unit: string,
  startDate: string, plannedDays: number,
  captured: Array<{ date: string; value: number; evidenceId: string }>,
): CoverageWindow {
  const start = new Date(`${startDate}T00:00:00Z`)
  const byDate = new Map(captured.map((c) => [c.date, c]))
  const days: CoverageDay[] = []
  for (let i = 0; i < plannedDays; i++) {
    const d = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10)
    const hit = byDate.get(d)
    days.push(hit
      ? { date: d, value: hit.value, evidenceId: hit.evidenceId, note: '' }
      : { date: d, value: null, evidenceId: null, note: 'No capture recorded for this day. Not backfilled.' })
  }
  const vals = days.filter((d) => d.value !== null).map((d) => d.value!)
  const sorted = [...vals].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const withVal = days.filter((d) => d.value !== null)
  const last = withVal.length ? withVal[withVal.length - 1]! : null

  return {
    experimentId, kpi, unit,
    startDate,
    endDate: new Date(start.getTime() + (plannedDays - 1) * 86_400_000).toISOString().slice(0, 10),
    plannedDays,
    days,
    daysCaptured: vals.length,
    daysMissing: plannedDays - vals.length,
    coveragePct: plannedDays === 0 ? 0 : (vals.length / plannedDays) * 100,
    latest: last ? { date: last.date, value: last.value! } : null,
    average: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
    median: sorted.length === 0 ? null
      : sorted.length % 2 ? sorted[mid]!
      : (sorted[mid - 1]! + sorted[mid]!) / 2,
    min: vals.length ? Math.min(...vals) : null,
    max: vals.length ? Math.max(...vals) : null,
  }
}

/** Guard: statistics must never be computed as if missing days were zero. */
export function assertNoBackfill(w: CoverageWindow): void {
  const counted = w.days.filter((d) => d.value !== null).length
  if (counted !== w.daysCaptured) {
    throw new BaselineProvenanceError(`${w.experimentId}/${w.kpi}: coverage count does not match captured days`)
  }
  for (const d of w.days) {
    if (d.value === null && d.evidenceId !== null) {
      throw new BaselineProvenanceError(`${w.experimentId}/${w.kpi}: a missing day must not carry an evidenceId`)
    }
  }
}

// ───────────────────────────────────────────────────── human review

export type ReviewAction = 'ACCEPT_BASELINE' | 'REJECT_BASELINE' | 'REQUEST_REMEASUREMENT'

export interface ReviewRecord {
  /** A real person's name. Never auto-filled, never the creator attribution. */
  reviewer: string
  action: ReviewAction
  at: string
  notes: string
  runId: string
}

/**
 * The creator attribution is a product credit, not a review identity.
 * Assigning it as a reviewer without explicit configuration is refused.
 */
export const CREATOR_ATTRIBUTION = 'Magha Ram'

export function assertReviewerIdentity(rec: ReviewRecord, explicitlyConfiguredReviewers: string[]): void {
  if (!rec.reviewer || !rec.reviewer.trim()) {
    throw new ReviewerError('a review requires a named human reviewer')
  }
  if (rec.reviewer.trim() === CREATOR_ATTRIBUTION && !explicitlyConfiguredReviewers.includes(CREATOR_ATTRIBUTION)) {
    throw new ReviewerError(
      'the creator attribution must not be used as a reviewer identity unless explicitly configured — ' +
      'product credit and review authority are separate concepts',
    )
  }
  if (!rec.at) throw new ReviewerError('a review requires a timestamp')
}

/** Reviewers explicitly configured for this deployment. Empty by design. */
export const CONFIGURED_REVIEWERS: string[] = []

export function reviewerStatusFor(reviews: ReviewRecord[], runId: string): ReviewerStatus {
  const r = [...reviews].reverse().find((x) => x.runId === runId)
  if (!r) return 'PENDING'
  return r.action === 'ACCEPT_BASELINE' ? 'ACCEPTED'
    : r.action === 'REJECT_BASELINE' ? 'REJECTED'
    : 'RE_MEASUREMENT_REQUESTED'
}

// ─────────────────────────────────────────── executive roll-up

export interface OpsSummary {
  activeExperiments: number
  baselinesCaptured: number
  totalCaptureRecords: number
  measuredRecords: number
  unavailableRecords: number
  reviewRequired: number
  blocked: number
  readyForIntervention: number
  coveragePct: number | null
}


// ─────────────────────────────────────────── pre-registration

/**
 * A success threshold that was never pre-registered must say so, not imply a
 * number exists. Inventing one after seeing the baseline is the failure mode
 * this guards against.
 */
export const PRE_REGISTRATION_REQUIRED = 'PRE-REGISTRATION REQUIRED' as const

export type PreRegistrationStatus = 'PRE_REGISTERED' | 'PRE_REGISTRATION_REQUIRED'

export class PreRegistrationError extends Error {}

/** A criterion claiming a threshold must actually state a number. */
export function assertThresholdHonest(status: PreRegistrationStatus, criterion: string): void {
  if (status === 'PRE_REGISTERED' && !/\d/.test(criterion)) {
    throw new PreRegistrationError(
      'a PRE_REGISTERED criterion must state an actual threshold value, not refer to an unspecified amount',
    )
  }
  if (status === 'PRE_REGISTRATION_REQUIRED' && !criterion.includes(PRE_REGISTRATION_REQUIRED)) {
    throw new PreRegistrationError(
      `an unregistered criterion must surface "${PRE_REGISTRATION_REQUIRED}" explicitly`,
    )
  }
}

// ─────────────────────────────────────────── experiment history

/** One immutable entry so future runs can be compared on identical terms. */
export interface ExperimentHistoryEntry {
  experimentId: string
  runId: string
  capturedAt: string
  blockNumber: number | null
  stageAtCapture: string
  /** the comparison key: same method + same sizes = comparable */
  methodFingerprint: string
  primaryKpiSummary: string
  notes: string
}

/** Two entries may only be compared when their method fingerprints match. */
export function comparable(a: ExperimentHistoryEntry, b: ExperimentHistoryEntry): boolean {
  return a.experimentId === b.experimentId && a.methodFingerprint === b.methodFingerprint
}
