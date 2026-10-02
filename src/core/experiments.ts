/**
 * Improvement opportunities and controlled experiments.
 *
 * Derived ONLY from the frozen research. These guards exist because the failure
 * mode of an "improvement backlog" is promising an outcome it cannot deliver:
 *   - no intervention may be claimed to raise price or market rank
 *   - no experiment may be marked successful before it is measured
 *   - every baseline number carries provenance or is DATA UNAVAILABLE
 *   - a current-day figure may never stand in for a missing historical one
 */

export type OpportunityStatus =
  | 'IDENTIFIED'
  | 'READY_FOR_EXPERIMENT'
  | 'DATA_REQUIRED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'INCONCLUSIVE'

export type OpportunityCategory =
  | 'Liquidity / market depth'
  | 'Real SUT utility and usage'
  | 'Merchant / ecosystem activity'
  | 'Exchange access and market participation'
  | 'Token value capture'
  | 'Holder / distribution structure'
  | 'Transparency / information quality'
  | 'Company / SuperSave / SoloPay flow visibility'

export type EvidenceStrength = 'STRONG' | 'MODERATE' | 'WEAK' | 'ABSENT'
export type Readiness = 'READY' | 'PARTIAL' | 'BLOCKED'

/** A measurable value that either has provenance or is explicitly unavailable. */
export interface Measure {
  value: number | string | null
  unit: string
  /** REQUIRED when value !== null — links to an evidence record. */
  evidenceId: string | null
  /** When this was true. Never silently a current figure standing in for history. */
  observationTime: string | null
  note: string
  /** true when the only available figure is from a different period than needed */
  periodMismatch?: boolean
}

export interface Kpi {
  name: string
  unit: string
  baseline: Measure
  /** Predefined success criterion. Never asserted as achieved. */
  successCriterion: string
  measurableToday: boolean
}

export interface ExperimentDetail {
  /** 1. BASELINE */
  baseline: { description: string; windowDays: number; measures: Measure[]; blockers: string[] }
  /** 2. INTERVENTION */
  intervention: { description: string; controlled: boolean; method: string; whatIsHeldConstant: string[] }
  /** 3. MEASUREMENT */
  measurement: { windowDays: number; method: string; controlMethod: string; dataRequired: string[] }
  /** 4. INTERPRETATION — rules fixed BEFORE the run, so a result cannot be rationalised after it */
  interpretation: {
    supportedIf: string
    rejectedIf: string
    inconclusiveIf: string
    /** null until the experiment has actually been measured */
    result: 'SUPPORTED' | 'REJECTED' | 'INCONCLUSIVE' | null
    resultRecordedBy: string | null
  }
}

export interface Opportunity {
  id: string
  category: OpportunityCategory
  title: string
  problem: string
  evidence: { summary: string; evidenceIds: string[]; hypothesisIds: string[]; strength: EvidenceStrength }
  currentBaseline: Measure[]
  missingOrWeak: string[]
  intervention: string
  primaryKpi: Kpi
  secondaryKpis: Kpi[]
  experimentPeriod: string
  controlMethod: string
  requiredData: string[]
  dependencies: string[]
  risks: string[]
  evidenceRequiredBeforeExecution: string[]
  status: OpportunityStatus
  dataReadiness: Readiness
  experimentReadiness: Readiness
  experiment: ExperimentDetail
}

// ───────────────────────────────────────────────────────────── guards

export class OutcomePromiseError extends Error {}
export class PrematureResultError extends Error {}
export class ProvenanceError extends Error {}

/**
 * An intervention may target a business mechanism. It may NOT promise a price
 * or market-rank outcome — the frozen research explicitly refuses that link.
 */
export const FORBIDDEN_OUTCOME_PHRASES = [
  'increase the price',
  'raise the price',
  'boost the price',
  'price will rise',
  'higher market rank',
  'improve the rank',
  'reach the top 100',
  'guarantee',
  'guaranteed',
  'will succeed',
  'proven to work',
] as const

export function findOutcomePromises(text: string): string[] {
  const hay = text.toLowerCase()
  return FORBIDDEN_OUTCOME_PHRASES.filter((p) => hay.includes(p))
}

/** Applied to every author-written field of an opportunity. */
export function assertNoOutcomePromise(o: Opportunity): void {
  const fields = [
    o.problem, o.intervention, o.primaryKpi.successCriterion, o.controlMethod,
    ...o.secondaryKpis.map((k) => k.successCriterion),
    o.experiment.intervention.description,
    o.experiment.interpretation.supportedIf,
    o.experiment.interpretation.rejectedIf,
  ]
  for (const f of fields) {
    const bad = findOutcomePromises(f)
    if (bad.length > 0) {
      throw new OutcomePromiseError(
        `${o.id}: an intervention may not promise a price or rank outcome — found ${JSON.stringify(bad)} in "${f.slice(0, 80)}…"`,
      )
    }
  }
}

/** An experiment cannot be COMPLETED or carry a result before it is measured. */
export function assertNotSucceededBeforeMeasurement(o: Opportunity): void {
  const { result, resultRecordedBy } = o.experiment.interpretation
  if (o.status === 'COMPLETED' && result === null) {
    throw new PrematureResultError(`${o.id}: status COMPLETED requires a recorded measurement result`)
  }
  if (result !== null && resultRecordedBy === null) {
    throw new PrematureResultError(`${o.id}: a recorded result requires a named human recorder`)
  }
  if (result !== null && (o.status === 'IDENTIFIED' || o.status === 'READY_FOR_EXPERIMENT' || o.status === 'DATA_REQUIRED')) {
    throw new PrematureResultError(`${o.id}: a result is recorded but the experiment has not run (status ${o.status})`)
  }
}

/** Every stated number carries provenance; every absent one is explicit. */
export function assertMeasureProvenance(m: Measure, ctx: string): void {
  if (m.value !== null && !m.evidenceId) {
    throw new ProvenanceError(`${ctx}: a stated value requires an evidenceId`)
  }
  if (m.value !== null && !m.observationTime) {
    throw new ProvenanceError(`${ctx}: a stated value requires an observationTime`)
  }
}

export function assertOpportunityIntegrity(o: Opportunity): void {
  assertNoOutcomePromise(o)
  assertNotSucceededBeforeMeasurement(o)
  for (const m of o.currentBaseline) assertMeasureProvenance(m, `${o.id} baseline`)
  assertMeasureProvenance(o.primaryKpi.baseline, `${o.id} primary KPI`)
  for (const k of o.secondaryKpis) assertMeasureProvenance(k.baseline, `${o.id} secondary KPI "${k.name}"`)
  for (const m of o.experiment.baseline.measures) assertMeasureProvenance(m, `${o.id} experiment baseline`)

  // A DATA_REQUIRED opportunity must not claim experiment readiness.
  if (o.status === 'DATA_REQUIRED' && o.experimentReadiness === 'READY') {
    throw new Error(`${o.id}: DATA_REQUIRED cannot be experiment-READY`)
  }
  // Readiness must not exceed the measurability of the primary KPI.
  if (o.experimentReadiness === 'READY' && !o.primaryKpi.measurableToday) {
    throw new Error(`${o.id}: cannot be experiment-READY while the primary KPI is not measurable today`)
  }
}

/** A measure that comes from a different period than the analysis needs. */
export function isPeriodMismatched(m: Measure): boolean {
  return m.periodMismatch === true
}

export function readinessCounts(list: Opportunity[]) {
  return {
    total: list.length,
    readyForExperiment: list.filter((o) => o.status === 'READY_FOR_EXPERIMENT').length,
    dataRequired: list.filter((o) => o.status === 'DATA_REQUIRED').length,
    identified: list.filter((o) => o.status === 'IDENTIFIED').length,
    running: list.filter((o) => o.status === 'RUNNING').length,
    completed: list.filter((o) => o.status === 'COMPLETED').length,
    inconclusive: list.filter((o) => o.status === 'INCONCLUSIVE').length,
    measurableKpis: list.filter((o) => o.primaryKpi.measurableToday).length,
    blockedKpis: list.filter((o) => !o.primaryKpi.measurableToday).length,
  }
}
