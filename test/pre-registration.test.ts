/**
 * Phase 6 — pre-registration immutability, stage transitions, capture integrity.
 */
import { describe, expect, it } from 'vitest'
import {
  assertImmutable, assertNotDerivedFromBaseline, assertRegistrationAllowed,
  assertStageAllowed, assertThresholdsRegistered, blockersFor, currentStage,
  nextRequiredAction, PreRegistrationLockedError, registrationSummary,
  StageTransitionError, ThresholdDerivationError, ThresholdMissingError,
  TIMELINE_STAGES, validateRegistration, type PreRegistrationEntry, type StageContext,
} from '../src/core/pre-registration'
import { EXPERIMENT_VERSION, OBSERVED_BASELINE_IMPACTS, PRE_REGISTRATION } from '../src/data/pre-registration'
import { BASELINE_CAPTURES, EXPERIMENT_HISTORY, REVIEWS } from '../src/data/baseline-captures'
import { EVIDENCE_BY_ID } from '../src/data/evidence'
import { validateCapture } from '../src/core/baseline-ops'

const entry = (over: Partial<PreRegistrationEntry> = {}): PreRegistrationEntry => ({
  ...structuredClone(PRE_REGISTRATION[0]!), ...over,
})

const CTX: StageContext = {
  thresholdsComplete: false, baselineRuns: 3, approvedBaselineRuns: 0,
  interventionOccurred: false, comparisonRuns: 0, resultCalculated: false,
  humanReviewRecorded: false,
}

describe('pre-registration state', () => {
  it('defines a slot for each of the four registerable sizes', () => {
    const sizes = PRE_REGISTRATION.filter((e) => e.state === 'AWAITING_HUMAN_ENTRY').map((e) => e.standardisedSize)
    expect(sizes.sort()).toEqual(['$10,000 buy', '$10,000 sell', '$50,000 buy', '$50,000 sell'])
  })

  it('no threshold is registered and none is invented', () => {
    for (const e of PRE_REGISTRATION) {
      expect(e.successThreshold, e.standardisedSize).toBeNull()
      expect(e.reviewerName, e.standardisedSize).toBeNull()
      expect(e.registrationTimestamp, e.standardisedSize).toBeNull()
    }
    expect(registrationSummary(PRE_REGISTRATION).registered).toBe(0)
    expect(registrationSummary(PRE_REGISTRATION).complete).toBe(false)
  })

  it('$100K is NOT_REGISTERABLE with a stated reason', () => {
    const e = PRE_REGISTRATION.find((x) => x.standardisedSize.includes('$100,000'))!
    expect(e.state).toBe('NOT_REGISTERABLE')
    expect(e.notes).toMatch(/NOT EXECUTABLE/)
    expect(e.successThreshold).toBeNull()
  })

  it('every entry carries the required workflow fields', () => {
    for (const e of PRE_REGISTRATION) expect(validateRegistration(e), e.standardisedSize).toEqual([])
  })

  it('a REGISTERED entry without a number, human or timestamp is refused', () => {
    const e = entry({ state: 'REGISTERED' })
    const errs = validateRegistration(e).join(' ')
    expect(errs).toMatch(/numeric successThreshold/)
    expect(errs).toMatch(/named human reviewer/)
    expect(errs).toMatch(/registration timestamp/)
  })

  it('a non-registered entry may not carry a threshold value', () => {
    expect(validateRegistration(entry({ successThreshold: 5 })).join(' '))
      .toMatch(/must not carry a threshold value/)
  })
})

describe('immutability once registered', () => {
  const reg = (): PreRegistrationEntry => entry({
    state: 'REGISTERED', successThreshold: 4, reviewerName: 'A. Reviewer',
    registrationTimestamp: '2026-10-01T09:00:00Z',
  })

  it('refuses a changed threshold for the same version', () => {
    expect(() => assertImmutable(reg(), { ...reg(), successThreshold: 3 }))
      .toThrow(PreRegistrationLockedError)
  })

  it('refuses a changed direction, method or reviewer', () => {
    for (const patch of [
      { thresholdDirection: 'HIGHER_IS_BETTER' as const },
      { comparisonMethod: 'something else' },
      { reviewerName: 'Someone Else' },
    ]) {
      expect(() => assertImmutable(reg(), { ...reg(), ...patch })).toThrow(/immutable once registered/)
    }
  })

  it('allows re-registration under a NEW experiment version', () => {
    expect(() => assertImmutable(reg(), { ...reg(), experimentVersion: 'EXP-001/v2', successThreshold: 3 }))
      .not.toThrow()
  })

  it('an unregistered entry is still editable', () => {
    expect(() => assertImmutable(entry(), entry({ successThreshold: 9 }))).not.toThrow()
  })
})

describe('no threshold-change after results, no derivation from baseline', () => {
  it('refuses registration once comparison results exist', () => {
    expect(() => assertRegistrationAllowed(true)).toThrow(PreRegistrationLockedError)
    expect(() => assertRegistrationAllowed(true)).toThrow(/retro-fitting a criterion to an outcome/)
    expect(() => assertRegistrationAllowed(false)).not.toThrow()
  })

  it('refuses a threshold read off an observed baseline value', () => {
    for (const [size, vals] of Object.entries(OBSERVED_BASELINE_IMPACTS)) {
      expect(() => assertNotDerivedFromBaseline(vals[0]!, vals), size).toThrow(ThresholdDerivationError)
    }
  })

  it('allows an independently chosen threshold', () => {
    expect(() => assertNotDerivedFromBaseline(4.0, OBSERVED_BASELINE_IMPACTS['$10,000 buy']!)).not.toThrow()
  })

  it('records all three runs as observed values so derivation can be detected', () => {
    expect(OBSERVED_BASELINE_IMPACTS['$10,000 buy']).toHaveLength(3)
  })
})

describe('missing-threshold rejection', () => {
  it('refuses a comparison run while any slot awaits entry', () => {
    expect(() => assertThresholdsRegistered(PRE_REGISTRATION)).toThrow(ThresholdMissingError)
    expect(() => assertThresholdsRegistered(PRE_REGISTRATION)).toThrow(/4 threshold\(s\) awaiting human entry/)
  })

  it('accepts once every slot is registered or not-registerable', () => {
    const done = PRE_REGISTRATION.map((e) => e.state === 'AWAITING_HUMAN_ENTRY'
      ? { ...e, state: 'REGISTERED' as const, successThreshold: 4, reviewerName: 'R', registrationTimestamp: 't' }
      : e)
    expect(() => assertThresholdsRegistered(done)).not.toThrow()
  })
})

describe('stage transition rules', () => {
  it('defines the nine-stage timeline', () => {
    expect(TIMELINE_STAGES).toHaveLength(9)
    expect(TIMELINE_STAGES[0]).toBe('PLANNED')
    expect(TIMELINE_STAGES[8]).toBe('COMPLETED')
  })

  it('EXP-001 is at BASELINE COLLECTION', () => {
    expect(currentStage(CTX)).toBe('BASELINE_COLLECTION')
  })

  it('refuses PRE_REGISTERED while thresholds are incomplete', () => {
    expect(() => assertStageAllowed('PRE_REGISTERED', CTX)).toThrow(StageTransitionError)
  })

  it('refuses BASELINE_REVIEWED without a human-approved run', () => {
    expect(() => assertStageAllowed('BASELINE_REVIEWED', CTX)).toThrow(/approved by a named human/)
  })

  it('refuses INTERVENTION without thresholds and an approved baseline', () => {
    expect(() => assertStageAllowed('INTERVENTION', CTX)).toThrow(/pre-registered before an intervention/)
  })

  it('refuses RESULT_CALCULATED without a comparison capture', () => {
    expect(() => assertStageAllowed('RESULT_CALCULATED', CTX)).toThrow(/no comparison capture exists/)
  })

  it('refuses COMPLETED without measurement and human review', () => {
    expect(() => assertStageAllowed('COMPLETED', CTX)).toThrow(/measured comparison is required/)
    expect(() => assertStageAllowed('COMPLETED', {
      ...CTX, comparisonRuns: 1, resultCalculated: true, humanReviewRecorded: false,
    })).toThrow(/human review is required before COMPLETED/)
  })

  it('allows COMPLETED only when everything is genuinely satisfied', () => {
    expect(() => assertStageAllowed('COMPLETED', {
      thresholdsComplete: true, baselineRuns: 3, approvedBaselineRuns: 1,
      interventionOccurred: true, comparisonRuns: 1, resultCalculated: true, humanReviewRecorded: true,
    })).not.toThrow()
  })

  it('lists the real outstanding blockers', () => {
    const b = blockersFor('BASELINE_COLLECTION', CTX).join(' ')
    expect(b).toMatch(/not pre-registered/)
    expect(b).toMatch(/No baseline run has been approved/)
    expect(b).toMatch(/No intervention has occurred/)
  })

  it('next action is threshold registration, and names no derivation source', () => {
    const n = nextRequiredAction(CTX)
    expect(n).toMatch(/register the numeric success thresholds/)
    expect(n).toMatch(/No threshold may be derived from RUN-001, RUN-002 or RUN-003/)
  })
})

describe('daily capture integrity (RUN-003)', () => {
  it('RUN-003 exists with full provenance', () => {
    const run3 = BASELINE_CAPTURES.filter((c) => c.runId === 'RUN-003')
    expect(run3.length).toBeGreaterThanOrEqual(11)
    for (const c of run3) expect(validateCapture(c), c.kpi).toEqual([])
  })

  it('RUN-003 records an exact block and observation time', () => {
    const h = EXPERIMENT_HISTORY.find((x) => x.runId === 'RUN-003')!
    expect(h.blockNumber).toBe(94_722_565)
    expect(h.capturedAt).toBe('2026-09-30T17:23:08Z')
  })

  it('three distinct baseline runs now exist', () => {
    const runs = new Set(BASELINE_CAPTURES.filter((c) => c.experimentId === 'EXP-001').map((c) => c.runId))
    expect([...runs].sort()).toEqual(['RUN-001', 'RUN-002', 'RUN-003'])
  })

  it('all three runs share a method fingerprint and are comparable', () => {
    const fps = new Set(EXPERIMENT_HISTORY.filter((h) => h.experimentId === 'EXP-001').map((h) => h.methodFingerprint))
    expect(fps.size).toBe(1)
  })

  it('$100K stays NOT EXECUTABLE across every run', () => {
    const rows = BASELINE_CAPTURES.filter((c) => c.dimension.includes('$100,000'))
    expect(rows).toHaveLength(3)
    for (const c of rows) {
      expect(c.dataStatus).toBe('NOT_EXECUTABLE')
      expect(c.value).toBeNull()
    }
    expect(EVIDENCE_BY_ID.get('EV-147')!.value).toBeNull()
  })

  it('no run is approved and no review exists', () => {
    expect(REVIEWS).toHaveLength(0)
    expect(BASELINE_CAPTURES.filter((c) => c.reviewerStatus === 'ACCEPTED')).toHaveLength(0)
  })
})

describe('no result, no historical substitution, no outcome promise', () => {
  it('no comparison run and no result exist', () => {
    const ctx = CTX
    expect(ctx.comparisonRuns).toBe(0)
    expect(ctx.resultCalculated).toBe(false)
  })

  it('May 2026 pool TVL remains unavailable after a third capture', () => {
    expect(EVIDENCE_BY_ID.get('EV-901')!.value).toBeNull()
  })

  it('CEX spread is never filled from the DEX fee tier in RUN-003', () => {
    const s = BASELINE_CAPTURES.find((c) => c.runId === 'RUN-003' && c.kpi === 'CEX bid/ask spread')!
    expect(s.value).toBeNull()
    expect(s.limitations.join(' ')).toMatch(/NOT substituted/)
  })

  it('no pre-registration text promises a price or rank outcome', () => {
    const text = PRE_REGISTRATION.map((e) => `${e.notes} ${e.comparisonMethod} ${e.baselineMethod}`).join(' ').toLowerCase()
    for (const p of ['increase the price', 'higher market rank', 'guarantee']) {
      expect(text, p).not.toContain(p)
    }
  })

  it('the experiment version is recorded so re-registration is traceable', () => {
    expect(EXPERIMENT_VERSION).toBe('EXP-001/v1')
    for (const e of PRE_REGISTRATION) expect(e.experimentVersion).toBe(EXPERIMENT_VERSION)
  })
})
