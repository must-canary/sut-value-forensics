/**
 * Phase 3 — improvement opportunity and experiment integrity.
 */
import { describe, expect, it } from 'vitest'
import {
  assertMeasureProvenance, assertNoOutcomePromise, assertNotSucceededBeforeMeasurement,
  assertOpportunityIntegrity, findOutcomePromises, isPeriodMismatched, readinessCounts,
  OutcomePromiseError, PrematureResultError, ProvenanceError, type Opportunity,
} from '../src/core/experiments'
import { OPPORTUNITIES, OPPORTUNITY_BY_ID } from '../src/data/opportunities'
import { EVIDENCE_BY_ID } from '../src/data/evidence'
import { HYPOTHESIS_BY_ID } from '../src/data/hypotheses'

const base = () => structuredClone(OPPORTUNITIES[0]!) as Opportunity

describe('coverage of the frozen categories', () => {
  it('covers all eight required categories exactly once', () => {
    const required = [
      'Liquidity / market depth',
      'Real SUT utility and usage',
      'Merchant / ecosystem activity',
      'Exchange access and market participation',
      'Token value capture',
      'Holder / distribution structure',
      'Transparency / information quality',
      'Company / SuperSave / SoloPay flow visibility',
    ]
    const got = OPPORTUNITIES.map((o) => o.category)
    expect(got.sort()).toEqual(required.sort())
  })

  it('every opportunity has all 16 required fields populated', () => {
    for (const o of OPPORTUNITIES) {
      expect(o.problem, o.id).toBeTruthy()
      expect(o.evidence.summary, o.id).toBeTruthy()
      expect(o.currentBaseline.length, o.id).toBeGreaterThan(0)
      expect(o.missingOrWeak.length, o.id).toBeGreaterThan(0)
      expect(o.intervention, o.id).toBeTruthy()
      expect(o.primaryKpi.name, o.id).toBeTruthy()
      expect(o.secondaryKpis.length, o.id).toBeGreaterThan(0)
      expect(o.primaryKpi.successCriterion, o.id).toBeTruthy()
      expect(o.experimentPeriod, o.id).toBeTruthy()
      expect(o.controlMethod, o.id).toBeTruthy()
      expect(o.requiredData.length, o.id).toBeGreaterThan(0)
      expect(o.dependencies.length, o.id).toBeGreaterThanOrEqual(0)
      expect(o.risks.length, o.id).toBeGreaterThan(0)
      expect(o.evidenceRequiredBeforeExecution.length, o.id).toBeGreaterThan(0)
      expect(o.status, o.id).toBeTruthy()
    }
  })

  it('statuses use only the allowed vocabulary', () => {
    const allowed = ['IDENTIFIED', 'READY_FOR_EXPERIMENT', 'DATA_REQUIRED', 'RUNNING', 'COMPLETED', 'INCONCLUSIVE']
    for (const o of OPPORTUNITIES) expect(allowed, o.id).toContain(o.status)
  })
})

describe('no price or market-rank promises', () => {
  it('every opportunity passes the outcome-promise guard', () => {
    for (const o of OPPORTUNITIES) expect(() => assertNoOutcomePromise(o), o.id).not.toThrow()
  })

  it('detects a price promise', () => {
    expect(findOutcomePromises('this will increase the price of SUT')).toContain('increase the price')
  })

  it('detects a rank promise', () => {
    expect(findOutcomePromises('a path to reach the top 100')).toContain('reach the top 100')
  })

  it('refuses an opportunity that promises a price outcome', () => {
    const o = base()
    o.intervention = 'Add depth, which will increase the price of SUT.'
    expect(() => assertNoOutcomePromise(o)).toThrow(OutcomePromiseError)
  })

  it('refuses a guarantee in a success criterion', () => {
    const o = base()
    o.primaryKpi.successCriterion = 'This is guaranteed to improve.'
    expect(() => assertNoOutcomePromise(o)).toThrow(OutcomePromiseError)
  })

  it('no opportunity text mentions price or rank as a KPI', () => {
    for (const o of OPPORTUNITIES) {
      expect(o.primaryKpi.name.toLowerCase(), o.id).not.toContain('market rank')
      expect(o.primaryKpi.name.toLowerCase(), o.id).not.toMatch(/\bsut price\b/)
    }
  })
})

describe('no success before measurement', () => {
  it('no experiment carries a result yet', () => {
    for (const o of OPPORTUNITIES) {
      expect(o.experiment.interpretation.result, o.id).toBeNull()
      expect(o.experiment.interpretation.resultRecordedBy, o.id).toBeNull()
    }
  })

  it('no opportunity is COMPLETED', () => {
    expect(OPPORTUNITIES.filter((o) => o.status === 'COMPLETED')).toHaveLength(0)
  })

  it('refuses COMPLETED without a measured result', () => {
    const o = base()
    o.status = 'COMPLETED'
    expect(() => assertNotSucceededBeforeMeasurement(o)).toThrow(PrematureResultError)
  })

  it('refuses a result with no named recorder', () => {
    const o = base()
    o.status = 'RUNNING'
    o.experiment.interpretation.result = 'SUPPORTED'
    expect(() => assertNotSucceededBeforeMeasurement(o)).toThrow(/named human recorder/)
  })

  it('refuses a result recorded before the experiment ran', () => {
    const o = base()
    o.status = 'READY_FOR_EXPERIMENT'
    o.experiment.interpretation.result = 'SUPPORTED'
    o.experiment.interpretation.resultRecordedBy = 'Analyst'
    expect(() => assertNotSucceededBeforeMeasurement(o)).toThrow(/has not run/)
  })

  it('interpretation rules are fixed before the run', () => {
    for (const o of OPPORTUNITIES) {
      expect(o.experiment.interpretation.supportedIf, o.id).toBeTruthy()
      expect(o.experiment.interpretation.rejectedIf, o.id).toBeTruthy()
      expect(o.experiment.interpretation.inconclusiveIf, o.id).toBeTruthy()
    }
  })
})

describe('provenance on every stated number', () => {
  it('every non-null measure has an evidenceId and an observationTime', () => {
    for (const o of OPPORTUNITIES) {
      const all = [
        ...o.currentBaseline, o.primaryKpi.baseline,
        ...o.secondaryKpis.map((k) => k.baseline), ...o.experiment.baseline.measures,
      ]
      for (const m of all) expect(() => assertMeasureProvenance(m, o.id), `${o.id}/${m.note}`).not.toThrow()
    }
  })

  it('every referenced evidence id exists in the evidence register', () => {
    for (const o of OPPORTUNITIES) {
      for (const id of o.evidence.evidenceIds) expect(EVIDENCE_BY_ID.has(id), `${o.id} -> ${id}`).toBe(true)
      const all = [...o.currentBaseline, o.primaryKpi.baseline, ...o.secondaryKpis.map((k) => k.baseline)]
      for (const m of all) if (m.evidenceId) expect(EVIDENCE_BY_ID.has(m.evidenceId), `${o.id} -> ${m.evidenceId}`).toBe(true)
    }
  })

  it('every referenced hypothesis exists', () => {
    for (const o of OPPORTUNITIES) {
      for (const h of o.evidence.hypothesisIds) expect(HYPOTHESIS_BY_ID.has(h), `${o.id} -> ${h}`).toBe(true)
    }
  })

  it('refuses a value without provenance', () => {
    expect(() => assertMeasureProvenance(
      { value: 42, unit: 'USD', evidenceId: null, observationTime: '2026-05-17', note: '' }, 'test',
    )).toThrow(ProvenanceError)
  })

  it('refuses a value without an observation time', () => {
    expect(() => assertMeasureProvenance(
      { value: 42, unit: 'USD', evidenceId: 'EV-010', observationTime: null, note: '' }, 'test',
    )).toThrow(ProvenanceError)
  })
})

describe('missing historical data is never substituted', () => {
  it('period-mismatched figures are flagged, not silently used', () => {
    const flagged = OPPORTUNITIES.flatMap((o) => o.currentBaseline).filter(isPeriodMismatched)
    expect(flagged.length).toBeGreaterThan(0)
    for (const m of flagged) expect(m.note.length).toBeGreaterThan(0)
  })

  it('the May 2026 pool TVL stays DATA UNAVAILABLE in the liquidity opportunity', () => {
    const o = OPPORTUNITY_BY_ID.get('OPP-01')!
    const tvl = o.currentBaseline.find((m) => m.note.includes('May 2026 pool TVL'))!
    expect(tvl.value).toBeNull()
    const sept = o.currentBaseline.find((m) => m.evidenceId === 'EV-013')!
    expect(sept.periodMismatch).toBe(true)
  })

  it('opportunities blocked on data declare unmeasurable primary KPIs', () => {
    for (const o of OPPORTUNITIES.filter((x) => x.status === 'DATA_REQUIRED')) {
      expect(o.primaryKpi.measurableToday, o.id).toBe(false)
      expect(o.experimentReadiness, o.id).not.toBe('READY')
    }
  })
})

describe('readiness integrity', () => {
  it('every opportunity passes the full integrity check', () => {
    for (const o of OPPORTUNITIES) expect(() => assertOpportunityIntegrity(o), o.id).not.toThrow()
  })

  it('refuses DATA_REQUIRED marked experiment-READY', () => {
    const o = base()
    o.status = 'DATA_REQUIRED'
    o.experimentReadiness = 'READY'
    expect(() => assertOpportunityIntegrity(o)).toThrow(/cannot be experiment-READY/)
  })

  it('refuses experiment-READY when the primary KPI is not measurable', () => {
    const o = base()
    o.experimentReadiness = 'READY'
    o.primaryKpi.measurableToday = false
    expect(() => assertOpportunityIntegrity(o)).toThrow(/not measurable today/)
  })

  it('reports the backlog split', () => {
    const c = readinessCounts(OPPORTUNITIES)
    expect(c.total).toBe(8)
    // OPP-01 moved to RUNNING once baseline collection actually started.
    expect(c.readyForExperiment + c.dataRequired + c.running).toBe(8)
    expect(c.running).toBe(1)
    // RUNNING must still not imply any result
    expect(c.completed).toBe(0)
    expect(c.inconclusive).toBe(0)
  })

  it('the RUNNING opportunity is exactly OPP-01 and carries no result', () => {
    const running = OPPORTUNITIES.filter((o) => o.status === 'RUNNING')
    expect(running.map((o) => o.id)).toEqual(['OPP-01'])
    expect(running[0]!.experiment.interpretation.result).toBeNull()
  })
})
