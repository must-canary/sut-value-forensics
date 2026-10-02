/**
 * Experiment execution lifecycle and measurement-integrity guards.
 *
 * Lifecycle: PLANNED → BASELINE_CAPTURE → MEASUREMENT → REVIEW → RESULT
 *
 * RESULT is unreachable without (a) an actual measurement record and
 * (b) a named human reviewer. The result vocabulary is unchanged from the
 * frozen research: SUPPORTED / REJECTED / INCONCLUSIVE / DATA_UNAVAILABLE.
 */
import type { Measure } from './experiments'
import { findOutcomePromises } from './experiments'

export type ExperimentStage =
  | 'PLANNED'
  | 'BASELINE_CAPTURE'
  | 'MEASUREMENT'
  | 'REVIEW'
  | 'RESULT'

/** Unchanged vocabulary — no new statuses are introduced. */
export type ExperimentResult = 'SUPPORTED' | 'REJECTED' | 'INCONCLUSIVE' | 'DATA_UNAVAILABLE'

export const STAGE_ORDER: ExperimentStage[] = [
  'PLANNED', 'BASELINE_CAPTURE', 'MEASUREMENT', 'REVIEW', 'RESULT',
]

export interface KpiReading {
  kpi: string
  /** Standardised size or dimension this reading belongs to. */
  dimension: string
  measure: Measure
  /** true when the reading is a model output rather than a direct observation */
  modelled: boolean
  /** Set when the order cannot be filled at all — never report a % in that case. */
  notExecutable?: boolean
  /** Visible label for anything provisional. */
  provisional?: boolean
}

export interface BaselineCapture {
  capturedAt: string
  observationPeriod: string
  blockNumber: number | null
  source: string
  methodology: string
  readings: KpiReading[]
  provenanceNote: string
}

export interface MeasurementRecord {
  runId: string
  timestamp: string
  blockNumber: number | null
  readings: KpiReading[]
  evidenceIds: string[]
  /** null until a named human records the review. */
  reviewer: string | null
  note: string
  /** A baseline run has no intervention to compare against. */
  isBaselineRun: boolean
}

export interface ExperimentRun {
  id: string
  opportunityId: string
  title: string
  whyItExists: string
  mechanismTested: string
  stage: ExperimentStage
  procedure: string[]
  primaryKpi: string
  secondaryKpis: string[]
  successCriterion: string
  falsificationCriterion: string
  dataSources: string[]
  limitations: string[]
  nextAction: string
  baseline: BaselineCapture | null
  measurements: MeasurementRecord[]
  /** null until a human reviewer records it at stage RESULT. */
  result: ExperimentResult | null
  resultRecordedBy: string | null
  resultRecordedAt: string | null
  resultEvidenceIds: string[]
}

// ─────────────────────────────────────────────────────────────── guards

export class LifecycleError extends Error {}
export class MeasurementIntegrityError extends Error {}

/** G1 — no result before a measurement record exists. */
export function assertNoResultBeforeMeasurement(e: ExperimentRun): void {
  if (e.result !== null && e.measurements.length === 0) {
    throw new MeasurementIntegrityError(`${e.id}: a result requires at least one measurement record`)
  }
}

/** G2 — no result without a named human reviewer. */
export function assertNoResultWithoutReviewer(e: ExperimentRun): void {
  if (e.result !== null && !e.resultRecordedBy) {
    throw new MeasurementIntegrityError(
      `${e.id}: a result requires a named human reviewer — no automated result may be recorded`,
    )
  }
  if (e.result !== null && !e.resultRecordedAt) {
    throw new MeasurementIntegrityError(`${e.id}: a result requires a recorded timestamp`)
  }
}

/** G3 — no KPI reading without provenance. */
export function assertKpiProvenance(r: KpiReading, ctx: string): void {
  const m = r.measure
  if (m.value !== null) {
    if (!m.evidenceId) throw new MeasurementIntegrityError(`${ctx}/${r.kpi}: a stated value requires an evidenceId`)
    if (!m.observationTime) throw new MeasurementIntegrityError(`${ctx}/${r.kpi}: a stated value requires an observationTime`)
  }
}

/** G4 — a current figure may never stand in for a missing historical period. */
export function assertNoHistoricalSubstitution(r: KpiReading, ctx: string): void {
  if (r.measure.periodMismatch && r.measure.value !== null && !r.measure.note.toLowerCase().includes('not a substitute')) {
    throw new MeasurementIntegrityError(
      `${ctx}/${r.kpi}: a period-mismatched figure must state that it is not a substitute for the missing period`,
    )
  }
}

/** G5 — no price or market-rank outcome promises anywhere in the experiment text. */
export function assertNoOutcomePromiseInRun(e: ExperimentRun): void {
  const fields = [
    e.whyItExists, e.mechanismTested, e.successCriterion, e.falsificationCriterion,
    e.nextAction, ...e.procedure, ...e.limitations,
  ]
  for (const f of fields) {
    const bad = findOutcomePromises(f)
    if (bad.length > 0) {
      throw new MeasurementIntegrityError(`${e.id}: outcome promise ${JSON.stringify(bad)} in "${f.slice(0, 70)}…"`)
    }
  }
}

/** G6 — a DATA UNAVAILABLE reading must carry null, never a fabricated value. */
export function assertNoFabricatedUnavailable(r: KpiReading, ctx: string): void {
  if (r.notExecutable && r.measure.value !== null) {
    throw new MeasurementIntegrityError(
      `${ctx}/${r.kpi}: an order that cannot be filled must not report a numeric impact — it is not an executable quote`,
    )
  }
}

/** G7 — stage RESULT requires a measurement record and a reviewer. */
export function assertStageIntegrity(e: ExperimentRun): void {
  if (e.stage === 'RESULT') {
    if (e.measurements.length === 0) throw new LifecycleError(`${e.id}: stage RESULT requires a measurement record`)
    if (!e.resultRecordedBy) throw new LifecycleError(`${e.id}: stage RESULT requires a named human reviewer`)
    if (e.result === null) throw new LifecycleError(`${e.id}: stage RESULT requires a recorded result`)
  }
  if (e.stage === 'MEASUREMENT' || e.stage === 'REVIEW') {
    if (!e.baseline) throw new LifecycleError(`${e.id}: stage ${e.stage} requires a baseline capture`)
  }
  if ((e.stage === 'PLANNED' || e.stage === 'BASELINE_CAPTURE') && e.result !== null) {
    throw new LifecycleError(`${e.id}: a result cannot exist at stage ${e.stage}`)
  }
}

/** G9 — anything provisional must be visibly labelled. */
export function assertProvisionalLabelled(r: KpiReading, ctx: string): void {
  if (r.provisional && !r.measure.note) {
    throw new MeasurementIntegrityError(`${ctx}/${r.kpi}: a provisional reading requires a visible explanatory note`)
  }
  if (r.modelled && !r.measure.note.toLowerCase().includes('model')) {
    throw new MeasurementIntegrityError(
      `${ctx}/${r.kpi}: a modelled reading must say so in its note — a model output is not an observation`,
    )
  }
}

/** G10 — every recorded result links to evidence. */
export function assertResultLinksEvidence(e: ExperimentRun): void {
  if (e.result !== null && e.resultEvidenceIds.length === 0) {
    throw new MeasurementIntegrityError(`${e.id}: a recorded result must link to evidence`)
  }
}

export function assertExperimentIntegrity(e: ExperimentRun): void {
  assertNoResultBeforeMeasurement(e)
  assertNoResultWithoutReviewer(e)
  assertNoOutcomePromiseInRun(e)
  assertStageIntegrity(e)
  assertResultLinksEvidence(e)
  const all: Array<[KpiReading, string]> = [
    ...(e.baseline?.readings ?? []).map((r) => [r, `${e.id} baseline`] as [KpiReading, string]),
    ...e.measurements.flatMap((m) => m.readings.map((r) => [r, `${e.id}/${m.runId}`] as [KpiReading, string])),
  ]
  for (const [r, ctx] of all) {
    assertKpiProvenance(r, ctx)
    assertNoHistoricalSubstitution(r, ctx)
    assertNoFabricatedUnavailable(r, ctx)
    assertProvisionalLabelled(r, ctx)
  }
}

export function stageIndex(s: ExperimentStage): number {
  return STAGE_ORDER.indexOf(s)
}

export function latestMeasurement(e: ExperimentRun): MeasurementRecord | null {
  return e.measurements.length ? e.measurements[e.measurements.length - 1]! : null
}

export function reviewState(e: ExperimentRun): string {
  if (e.result !== null && e.resultRecordedBy) return `REVIEWED by ${e.resultRecordedBy}`
  if (e.measurements.length > 0) return 'AWAITING HUMAN REVIEW'
  return 'NOT YET MEASURED'
}
