/**
 * Experiment 01 — pre-registration honesty, 4-way classification, history.
 */
import { describe, expect, it } from 'vitest'
import {
  assertThresholdHonest, comparable, PRE_REGISTRATION_REQUIRED, PreRegistrationError,
  validateCapture, type BaselineCaptureRecord,
} from '../src/core/baseline-ops'
import {
  BASELINE_CAPTURES, EXPERIMENT_HISTORY, METHOD_FINGERPRINT_EXP001,
} from '../src/data/baseline-captures'
import { OPPORTUNITY_BY_ID } from '../src/data/opportunities'
import { RUN_BY_ID } from '../src/data/experiment-runs'
import { EVIDENCE_BY_ID } from '../src/data/evidence'

describe('pre-registration honesty', () => {
  it('EXP-001 surfaces PRE-REGISTRATION REQUIRED rather than implying a threshold', () => {
    const e = RUN_BY_ID.get('EXP-001')!
    expect(e.successCriterion).toContain(PRE_REGISTRATION_REQUIRED)
    expect(e.successCriterion).toMatch(/has NOT been agreed/)
    expect(e.successCriterion).toMatch(/never be chosen after a result is seen/)
  })

  it('OPP-01 primary KPI surfaces the same', () => {
    const o = OPPORTUNITY_BY_ID.get('OPP-01')!
    expect(o.primaryKpi.successCriterion).toContain(PRE_REGISTRATION_REQUIRED)
  })

  it('the criterion states no invented numeric threshold', () => {
    const e = RUN_BY_ID.get('EXP-001')!
    // no "reduce by N%" style figure may appear in the criterion
    expect(e.successCriterion).not.toMatch(/\b\d+(\.\d+)?\s*%/)
  })

  it('refuses a PRE_REGISTERED claim with no actual number', () => {
    expect(() => assertThresholdHonest('PRE_REGISTERED', 'lower by the pre-registered amount'))
      .toThrow(PreRegistrationError)
  })

  it('accepts a PRE_REGISTERED claim that states a real threshold', () => {
    expect(() => assertThresholdHonest('PRE_REGISTERED', 'impact at $10K falls below 5%')).not.toThrow()
  })

  it('refuses an unregistered criterion that hides the fact', () => {
    expect(() => assertThresholdHonest('PRE_REGISTRATION_REQUIRED', 'we will see an improvement'))
      .toThrow(/surface "PRE-REGISTRATION REQUIRED"/)
  })
})

describe('OPP-01 status reflects that collection started', () => {
  it('OPP-01 is RUNNING, not READY_FOR_EXPERIMENT', () => {
    expect(OPPORTUNITY_BY_ID.get('OPP-01')!.status).toBe('RUNNING')
  })

  it('RUNNING is justified by actual captured runs', () => {
    const runs = new Set(BASELINE_CAPTURES.filter((c) => c.experimentId === 'EXP-001').map((c) => c.runId))
    expect(runs.size).toBeGreaterThanOrEqual(2)
    expect([...runs]).toEqual(expect.arrayContaining(['RUN-001', 'RUN-002']))
  })

  it('RUNNING does not create a result', () => {
    const e = RUN_BY_ID.get('EXP-001')!
    expect(e.result).toBeNull()
    expect(e.resultRecordedBy).toBeNull()
  })

  it('no opportunity is COMPLETED', () => {
    expect(OPPORTUNITY_BY_ID.get('OPP-01')!.status).not.toBe('COMPLETED')
  })
})

describe('four-way data classification', () => {
  const mk = (over: Partial<BaselineCaptureRecord>): BaselineCaptureRecord => ({
    experimentId: 'E', runId: 'R', kpi: 'K', dimension: 'd', value: 1, unit: 'u',
    observationTime: 't', retrievedAt: 't', source: 's', evidenceId: 'EV-100',
    methodology: 'm', limitations: [], dataStatus: 'MEASURED', reviewerStatus: 'PENDING',
    modelled: false, timestampPrecision: 'EXACT_BLOCK', ...over,
  })

  it('MEASURED / PROVISIONAL / INFERRED require a value and evidence', () => {
    for (const st of ['MEASURED', 'PROVISIONAL', 'INFERRED'] as const) {
      const mod = st === 'INFERRED'
      expect(validateCapture(mk({ dataStatus: st, value: null, modelled: mod, limitations: ['model'] })).join(' '))
        .toMatch(/cannot carry a null value/)
      expect(validateCapture(mk({ dataStatus: st, evidenceId: null, modelled: mod, limitations: ['model'] })).join(' '))
        .toMatch(/requires an evidenceId/)
    }
  })

  it('DATA_UNAVAILABLE and NOT_EXECUTABLE must carry null', () => {
    for (const st of ['DATA_UNAVAILABLE', 'NOT_EXECUTABLE'] as const) {
      expect(validateCapture(mk({ dataStatus: st, value: 5 })).join(' ')).toMatch(/never a fabricated one/)
    }
  })

  it('INFERRED must be flagged as modelled', () => {
    expect(validateCapture(mk({ dataStatus: 'INFERRED', modelled: false })).join(' '))
      .toMatch(/must be flagged as modelled/)
  })

  it('all stored captures still validate under the extended vocabulary', () => {
    for (const c of BASELINE_CAPTURES) expect(validateCapture(c), `${c.kpi}/${c.dimension}`).toEqual([])
  })
})

describe('liquidity concentration is evidenced DATA UNAVAILABLE, not guessed', () => {
  it('the capture carries null with an evidence reference', () => {
    const c = BASELINE_CAPTURES.find((x) => x.kpi === 'Liquidity concentration')!
    expect(c.value).toBeNull()
    expect(c.dataStatus).toBe('DATA_UNAVAILABLE')
    expect(c.evidenceId).toBe('EV-131')
  })

  it('the evidence records why it is not measurable', () => {
    const ev = EVIDENCE_BY_ID.get('EV-131')!
    expect(ev.value).toBeNull()
    expect(ev.notes).toMatch(/NonfungiblePositionManager/)
    expect(ev.notes).toMatch(/No figure is reported/)
  })

  it('the OPP-01 secondary KPI marks it not measurable today', () => {
    const k = OPPORTUNITY_BY_ID.get('OPP-01')!.secondaryKpis
      .find((x) => x.name.startsWith('Liquidity concentration'))!
    expect(k.measurableToday).toBe(false)
    expect(k.baseline.value).toBeNull()
  })
})

describe('experiment history enables consistent comparison', () => {
  it('records every captured run', () => {
    const exp1 = EXPERIMENT_HISTORY.filter((h) => h.experimentId === 'EXP-001')
    // grows as daily captures are added; must match the distinct runs actually captured
    const runIds = new Set(BASELINE_CAPTURES.filter((c) => c.experimentId === 'EXP-001').map((c) => c.runId))
    expect(exp1).toHaveLength(runIds.size)
    expect(exp1.map((h) => h.runId).sort()).toEqual([...runIds].sort())
    expect(EXPERIMENT_HISTORY.some((h) => h.experimentId === 'EXP-002')).toBe(true)
  })

  it('EXP-001 runs share a method fingerprint and are comparable', () => {
    const all = EXPERIMENT_HISTORY.filter((h) => h.experimentId === 'EXP-001')
    expect(all.length).toBeGreaterThanOrEqual(2)
    for (const h of all) expect(h.methodFingerprint, h.runId).toBe(METHOD_FINGERPRINT_EXP001)
    for (const h of all.slice(1)) expect(comparable(all[0]!, h), h.runId).toBe(true)
  })

  it('runs with different methods are NOT comparable', () => {
    const e1 = EXPERIMENT_HISTORY.find((h) => h.experimentId === 'EXP-001')!
    const e2 = EXPERIMENT_HISTORY.find((h) => h.experimentId === 'EXP-002')!
    expect(comparable(e1, e2)).toBe(false)
    expect(comparable(e1, { ...e1, methodFingerprint: 'changed' })).toBe(false)
  })

  it('history entries carry a block number and capture time', () => {
    for (const h of EXPERIMENT_HISTORY) {
      expect(h.capturedAt, h.runId).toBeTruthy()
      expect(h.primaryKpiSummary, h.runId).toBeTruthy()
    }
  })

  it('no history entry asserts a result', () => {
    for (const h of EXPERIMENT_HISTORY) {
      expect(h.primaryKpiSummary.toLowerCase()).not.toMatch(/success|improved|supported/)
    }
  })
})

describe('attribution scope', () => {
  it('the $100K size is still NOT EXECUTABLE in every run', () => {
    const runIds = new Set(BASELINE_CAPTURES.filter((c) => c.experimentId === 'EXP-001').map((c) => c.runId))
    const rows = BASELINE_CAPTURES.filter((c) => c.dimension.includes('$100,000'))
    expect(rows).toHaveLength(runIds.size)
    for (const c of rows) expect(c.value, c.runId).toBeNull()
  })

  it('history summaries report NOT EXECUTABLE rather than a percentage', () => {
    for (const h of EXPERIMENT_HISTORY.filter((x) => x.experimentId === 'EXP-001')) {
      expect(h.primaryKpiSummary).toContain('NOT EXECUTABLE')
      expect(h.primaryKpiSummary).not.toMatch(/12\d\.\d+%/)
    }
  })
})
