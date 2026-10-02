/**
 * Phase 4 — experiment lifecycle and measurement-integrity guards.
 */
import { describe, expect, it } from 'vitest'
import {
  assertExperimentIntegrity, assertKpiProvenance, assertNoFabricatedUnavailable,
  assertNoHistoricalSubstitution, assertNoOutcomePromiseInRun, assertNoResultBeforeMeasurement,
  assertNoResultWithoutReviewer, assertProvisionalLabelled, assertResultLinksEvidence,
  assertStageIntegrity, latestMeasurement, LifecycleError, MeasurementIntegrityError,
  reviewState, STAGE_ORDER, stageIndex, type ExperimentRun, type KpiReading,
} from '../src/core/experiment-runs'
import { EXPERIMENT_RUNS, RUN_BY_ID } from '../src/data/experiment-runs'
import { EVIDENCE_BY_ID } from '../src/data/evidence'
import { OPPORTUNITY_BY_ID } from '../src/data/opportunities'

const exp1 = () => structuredClone(RUN_BY_ID.get('EXP-001')!) as ExperimentRun
const reading = (over: Partial<KpiReading> = {}): KpiReading => ({
  kpi: 'K', dimension: 'd', modelled: false,
  measure: { value: 1, unit: 'USD', evidenceId: 'EV-100', observationTime: '2026-09-30T12:51:21Z', note: 'n' },
  ...over,
})

describe('lifecycle', () => {
  it('uses exactly the five defined stages in order', () => {
    expect(STAGE_ORDER).toEqual(['PLANNED', 'BASELINE_CAPTURE', 'MEASUREMENT', 'REVIEW', 'RESULT'])
    expect(stageIndex('REVIEW')).toBe(3)
  })

  it('EXP-001 is at REVIEW with a captured baseline and repeated measurement runs', () => {
    const e = RUN_BY_ID.get('EXP-001')!
    expect(e.stage).toBe('REVIEW')
    expect(e.baseline).not.toBeNull()
    // Phase 5 added a second prospective capture; both remain baseline-only runs.
    expect(e.measurements).toHaveLength(2)
    expect(e.measurements.map((m) => m.runId)).toEqual(['RUN-001', 'RUN-002'])
    expect(latestMeasurement(e)!.runId).toBe('RUN-002')
    for (const m of e.measurements) expect(m.isBaselineRun, m.runId).toBe(true)
    // repeated capture must NOT advance the stage or create a result
    expect(e.result).toBeNull()
  })

  it('EXP-002 is PLANNED with no baseline and no measurement', () => {
    const e = RUN_BY_ID.get('EXP-002')!
    expect(e.stage).toBe('PLANNED')
    expect(e.baseline).toBeNull()
    expect(e.measurements).toHaveLength(0)
  })

  it('MEASUREMENT / REVIEW require a baseline', () => {
    const e = exp1(); e.baseline = null
    expect(() => assertStageIntegrity(e)).toThrow(LifecycleError)
  })

  it('a result cannot exist at PLANNED or BASELINE_CAPTURE', () => {
    const e = exp1(); e.stage = 'BASELINE_CAPTURE'; e.result = 'SUPPORTED'
    expect(() => assertStageIntegrity(e)).toThrow(/cannot exist at stage/)
  })

  it('every experiment references a real opportunity', () => {
    for (const e of EXPERIMENT_RUNS) expect(OPPORTUNITY_BY_ID.has(e.opportunityId), e.id).toBe(true)
  })
})

describe('G1/G7 — no result before measurement', () => {
  it('no experiment currently carries a result', () => {
    for (const e of EXPERIMENT_RUNS) {
      expect(e.result, e.id).toBeNull()
      expect(e.resultRecordedBy, e.id).toBeNull()
      expect(e.resultRecordedAt, e.id).toBeNull()
    }
  })

  it('refuses a result with no measurement record', () => {
    const e = exp1(); e.measurements = []; e.result = 'SUPPORTED'
    expect(() => assertNoResultBeforeMeasurement(e)).toThrow(/requires at least one measurement/)
  })

  it('stage RESULT requires a measurement record', () => {
    const e = exp1(); e.stage = 'RESULT'; e.measurements = []
    expect(() => assertStageIntegrity(e)).toThrow(/requires a measurement record/)
  })

  it('stage RESULT requires a recorded result', () => {
    const e = exp1(); e.stage = 'RESULT'; e.resultRecordedBy = 'Reviewer'
    expect(() => assertStageIntegrity(e)).toThrow(/requires a recorded result/)
  })
})

describe('G2 — no result without a named human reviewer', () => {
  it('refuses a result with no reviewer', () => {
    const e = exp1(); e.result = 'SUPPORTED'
    expect(() => assertNoResultWithoutReviewer(e)).toThrow(/named human reviewer/)
  })

  it('refuses a result with no timestamp', () => {
    const e = exp1(); e.result = 'SUPPORTED'; e.resultRecordedBy = 'Reviewer'
    expect(() => assertNoResultWithoutReviewer(e)).toThrow(/recorded timestamp/)
  })

  it('stage RESULT requires a reviewer', () => {
    const e = exp1(); e.stage = 'RESULT'; e.result = 'INCONCLUSIVE'
    expect(() => assertStageIntegrity(e)).toThrow(/named human reviewer/)
  })

  it('the measurement run has no reviewer yet and reports as awaiting review', () => {
    const e = RUN_BY_ID.get('EXP-001')!
    expect(latestMeasurement(e)!.reviewer).toBeNull()
    expect(reviewState(e)).toBe('AWAITING HUMAN REVIEW')
  })

  it('EXP-002 reports as not yet measured', () => {
    expect(reviewState(RUN_BY_ID.get('EXP-002')!)).toBe('NOT YET MEASURED')
  })
})

describe('G3/G10 — provenance and evidence linkage', () => {
  it('every reading with a value has an evidenceId and an observationTime', () => {
    for (const e of EXPERIMENT_RUNS) {
      const all = [...(e.baseline?.readings ?? []), ...e.measurements.flatMap((m) => m.readings)]
      for (const rr of all) expect(() => assertKpiProvenance(rr, e.id), `${e.id}/${rr.kpi}`).not.toThrow()
    }
  })

  it('every referenced evidence id exists', () => {
    for (const e of EXPERIMENT_RUNS) {
      for (const m of e.measurements) {
        for (const id of m.evidenceIds) expect(EVIDENCE_BY_ID.has(id), `${e.id} -> ${id}`).toBe(true)
        for (const rr of m.readings) {
          if (rr.measure.evidenceId) expect(EVIDENCE_BY_ID.has(rr.measure.evidenceId), rr.measure.evidenceId).toBe(true)
        }
      }
    }
  })

  it('refuses a value without provenance', () => {
    expect(() => assertKpiProvenance(reading({
      measure: { value: 5, unit: 'USD', evidenceId: null, observationTime: '2026-09-30', note: '' },
    }), 'ctx')).toThrow(MeasurementIntegrityError)
  })

  it('a recorded result must link to evidence', () => {
    const e = exp1()
    e.stage = 'RESULT'; e.result = 'SUPPORTED'
    e.resultRecordedBy = 'Reviewer'; e.resultRecordedAt = '2026-09-30'; e.resultEvidenceIds = []
    expect(() => assertResultLinksEvidence(e)).toThrow(/must link to evidence/)
  })
})

describe('G4 — no historical-period substitution', () => {
  it('the May 2026 pool TVL stays DATA UNAVAILABLE in the baseline', () => {
    const e = RUN_BY_ID.get('EXP-001')!
    const vd = e.baseline!.readings.find((x) => x.dimension.includes('May 2026'))!
    expect(vd.measure.value).toBeNull()
    expect(vd.measure.note).toContain('NOT a substitute')
  })

  it('the September reading is not presented as the May figure', () => {
    const e = RUN_BY_ID.get('EXP-001')!
    expect(e.limitations.join(' ')).toMatch(/May 2026 pool TVL remains DATA UNAVAILABLE/)
  })

  it('refuses a period-mismatched value without the disclaimer', () => {
    expect(() => assertNoHistoricalSubstitution(reading({
      measure: { value: 1, unit: 'USD', evidenceId: 'EV-013', observationTime: '2026-09-30', note: 'september figure', periodMismatch: true },
    }), 'ctx')).toThrow(/not a substitute/)
  })
})

describe('G5 — no price or market-rank promises', () => {
  it('every experiment passes the outcome-promise guard', () => {
    for (const e of EXPERIMENT_RUNS) expect(() => assertNoOutcomePromiseInRun(e), e.id).not.toThrow()
  })

  it('refuses a price promise in the success criterion', () => {
    const e = exp1(); e.successCriterion = 'Depth work will increase the price of SUT.'
    expect(() => assertNoOutcomePromiseInRun(e)).toThrow(MeasurementIntegrityError)
  })

  it('refuses a rank promise in the next action', () => {
    const e = exp1(); e.nextAction = 'Proceed so SUT can reach the top 100.'
    expect(() => assertNoOutcomePromiseInRun(e)).toThrow(MeasurementIntegrityError)
  })

  it('EXP-001 explicitly states it is not a forecast', () => {
    expect(RUN_BY_ID.get('EXP-001')!.whyItExists).toMatch(/not a forecast/i)
  })
})

describe('G6 — no fabricated DATA UNAVAILABLE values', () => {
  it('the $100K size is recorded as not executable with NO percentage', () => {
    const e = RUN_BY_ID.get('EXP-001')!
    const k = e.baseline!.readings.find((x) => x.dimension.includes('$100,000'))!
    expect(k.notExecutable).toBe(true)
    expect(k.measure.value).toBeNull()
    expect(k.measure.note).toContain('deliberately withheld')
    expect(EVIDENCE_BY_ID.get('EV-108')!.value).toBeNull()
  })

  it('refuses a numeric impact on an unfillable order', () => {
    expect(() => assertNoFabricatedUnavailable(reading({ notExecutable: true }), 'ctx'))
      .toThrow(/not an executable quote/)
  })

  it('fillable sizes do carry values', () => {
    const e = RUN_BY_ID.get('EXP-001')!
    const k10 = e.baseline!.readings.find((x) => x.dimension === '$10,000 buy')!
    expect(k10.measure.value).toBe(10.59)
    expect(k10.notExecutable).toBeUndefined()
  })
})

describe('G9 — provisional and modelled readings are labelled', () => {
  it('every modelled reading says so in its note', () => {
    for (const e of EXPERIMENT_RUNS) {
      const all = [...(e.baseline?.readings ?? []), ...e.measurements.flatMap((m) => m.readings)]
      for (const rr of all) expect(() => assertProvisionalLabelled(rr, e.id), `${e.id}/${rr.dimension}`).not.toThrow()
    }
  })

  it('refuses a modelled reading that does not declare itself', () => {
    expect(() => assertProvisionalLabelled(reading({
      modelled: true,
      measure: { value: 1, unit: '%', evidenceId: 'EV-104', observationTime: '2026-09-30', note: 'plain note' },
    }), 'ctx')).toThrow(/model output is not an observation/)
  })

  it('price-impact readings are marked modelled, not observed', () => {
    const e = RUN_BY_ID.get('EXP-001')!
    for (const rr of e.baseline!.readings.filter((x) => x.kpi === 'Price impact')) {
      expect(rr.modelled, rr.dimension).toBe(true)
    }
  })

  it('direct contract reads are NOT marked modelled', () => {
    const e = RUN_BY_ID.get('EXP-001')!
    expect(e.baseline!.readings.find((x) => x.kpi === 'Pool spot price')!.modelled).toBe(false)
  })
})

describe('full integrity', () => {
  it('every experiment passes the complete integrity check', () => {
    for (const e of EXPERIMENT_RUNS) expect(() => assertExperimentIntegrity(e), e.id).not.toThrow()
  })

  it('the baseline records a real block number and observation time', () => {
    const b = RUN_BY_ID.get('EXP-001')!.baseline!
    expect(b.blockNumber).toBe(94_711_694)
    expect(b.capturedAt).toBe('2026-09-30T12:51:21Z')
  })

  it('EXP-002 defines its methodology and exclusions before any reading', () => {
    const e = RUN_BY_ID.get('EXP-002')!
    const proc = e.procedure.join(' ')
    expect(proc).toMatch(/EXCLUDE/)
    expect(proc).toMatch(/fan-out/)
    expect(e.limitations.join(' ')).toMatch(/not reproducible|not a valid baseline/i)
  })
})
