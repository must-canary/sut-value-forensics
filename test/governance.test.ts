/**
 * EXP-001 governance chain — focused tests.
 */
import { describe, expect, it } from 'vitest'
import {
  approvedBaselineRunIds, assertCompletable, assertThresholdLock, calculateResult,
  commitBaselineApproval, commitFinalReview, commitIntervention, commitThreshold,
  compareKpi, currentGate, GATE_ACTION, GovernanceError, validateComparison,
  type ComparisonCapture, type GovernanceState, type InterventionRecord,
} from '../src/core/governance'
import { validateRegistration } from '../src/core/pre-registration'
import { OBSERVED_BASELINE_IMPACTS, PRE_REGISTRATION } from '../src/data/pre-registration'
import {
  BASELINE_APPROVALS, COMPARISON, FINAL_REVIEW, INTERVENTION, RESULT_CALCULATION,
  governanceGate, governanceState,
} from '../src/data/governance'
import { METHOD_FINGERPRINT_EXP001 } from '../src/data/baseline-captures'

const NOW = '2026-10-01T09:00:00Z'
const slot = (s: string) => PRE_REGISTRATION.find((e) => e.standardisedSize === s)!
const FP = METHOD_FINGERPRINT_EXP001
const GOOD = {
  standardisedSize: '$10,000 sell', threshold: 5, authorName: 'A. Human',
  rationale: 'Chosen from venue-peer depth targets, set before any comparison run.',
  independenceAttested: true,
}

describe('1. threshold registration + rationale + immutable lock', () => {
  const obs = OBSERVED_BASELINE_IMPACTS['$10,000 sell']!

  it('commits a complete proposal', () => {
    const r = commitThreshold(slot('$10,000 sell'), GOOD, obs, NOW, false)
    expect(r.committed).toBe(true)
    expect(r.entry!.successThreshold).toBe(5)
    expect(r.entry!.rationale).toBe(GOOD.rationale)
    expect(r.entry!.state).toBe('REGISTERED')
    expect(validateRegistration(r.entry!)).toEqual([])
  })

  it('refuses a missing rationale', () => {
    const r = commitThreshold(slot('$10,000 sell'), { ...GOOD, rationale: '  ' }, obs, NOW, false)
    expect(r.problems.join(' ')).toMatch(/written rationale is required/)
  })

  it.each([
    ['threshold', { threshold: null }, /numeric threshold is required/],
    ['author', { authorName: '' }, /named human author/],
    ['attestation', { independenceAttested: false }, /selected independently/],
    ['negative', { threshold: -3 }, /must not be negative/],
  ])('refuses a missing %s', (_n, patch, re) => {
    expect(commitThreshold(slot('$10,000 sell'), { ...GOOD, ...patch }, obs, NOW, false)
      .problems.join(' ')).toMatch(re)
  })

  it('refuses a value read off a baseline run', () => {
    for (const v of obs) {
      expect(commitThreshold(slot('$10,000 sell'), { ...GOOD, threshold: Math.abs(v) === v ? v : v }, obs, NOW, false)
        .problems.join(' ')).toMatch(/matches an observed baseline value/)
    }
  })

  it('refuses once comparison results exist', () => {
    expect(commitThreshold(slot('$10,000 sell'), GOOD, obs, NOW, true).problems.join(' '))
      .toMatch(/retro-fitting a criterion to an outcome/)
  })

  it('refuses the NOT REGISTERABLE size', () => {
    expect(commitThreshold(slot('$100,000 (both sides)'), GOOD, [], NOW, false).problems.join(' '))
      .toMatch(/NOT REGISTERABLE/)
  })

  it('locks threshold and rationale after registration', () => {
    const reg = commitThreshold(slot('$10,000 sell'), GOOD, obs, NOW, false).entry!
    expect(() => assertThresholdLock(reg, { ...reg, successThreshold: 2 })).toThrow()
    expect(() => assertThresholdLock(reg, { ...reg, rationale: 'different' }))
      .toThrow(GovernanceError)
    expect(() => assertThresholdLock(reg, { ...reg, experimentVersion: 'EXP-001/v2', successThreshold: 2 }))
      .not.toThrow()
  })

  it('refuses re-registering an already registered slot', () => {
    const reg = commitThreshold(slot('$10,000 sell'), GOOD, obs, NOW, false).entry!
    expect(commitThreshold(reg, GOOD, obs, NOW, false).problems.join(' ')).toMatch(/already registered/)
  })
})

describe('2. baseline approval', () => {
  const runs = ['RUN-001', 'RUN-002', 'RUN-003']

  it('refuses an unnamed reviewer', () => {
    expect(commitBaselineApproval({ runId: 'RUN-001', reviewer: '', action: 'APPROVE', note: '' }, runs, NOW)
      .problems.join(' ')).toMatch(/approval is never automatic/)
  })

  it('refuses an unknown run and an unreasoned rejection', () => {
    expect(commitBaselineApproval({ runId: 'RUN-9', reviewer: 'R', action: 'APPROVE', note: '' }, runs, NOW)
      .problems.join(' ')).toMatch(/unknown run/)
    expect(commitBaselineApproval({ runId: 'RUN-001', reviewer: 'R', action: 'REJECT', note: '' }, runs, NOW)
      .problems.join(' ')).toMatch(/rejection requires a stated reason/)
  })

  it('commits a named approval and resolves approved runs', () => {
    const r = commitBaselineApproval({ runId: 'RUN-003', reviewer: 'A. Human', action: 'APPROVE', note: 'ok' }, runs, NOW)
    expect(r.committed).toBe(true)
    expect(approvedBaselineRunIds([r.record!])).toEqual(['RUN-003'])
  })

  it('a later rejection supersedes an earlier approval', () => {
    const a = { runId: 'RUN-001', reviewer: 'R', action: 'APPROVE' as const, at: NOW, note: '' }
    const b = { runId: 'RUN-001', reviewer: 'R', action: 'REJECT' as const, at: NOW, note: 'bad' }
    expect(approvedBaselineRunIds([a, b])).toEqual([])
  })
})

describe('3. intervention record', () => {
  const base = {
    description: 'Added and held disclosed depth on the main venue.',
    baselineRunId: 'RUN-003', startedAt: '2026-10-02T00:00:00Z',
    recordedBy: 'A. Human', methodFingerprint: FP, evidenceIds: ['EV-100'],
  }

  it('refuses without registered thresholds', () => {
    expect(commitIntervention(base, ['RUN-003'], false, FP).problems.join(' '))
      .toMatch(/thresholds must be registered/)
  })

  it('refuses without an approved baseline', () => {
    expect(commitIntervention(base, [], true, FP).problems.join(' '))
      .toMatch(/approved baseline run must be named/)
  })

  it('refuses a changed method fingerprint', () => {
    expect(commitIntervention({ ...base, methodFingerprint: 'other' }, ['RUN-003'], true, FP)
      .problems.join(' ')).toMatch(/method fingerprint unchanged/)
  })

  it('refuses without evidence or a named recorder', () => {
    expect(commitIntervention({ ...base, evidenceIds: [] }, ['RUN-003'], true, FP)
      .problems.join(' ')).toMatch(/at least one evidence reference/)
    expect(commitIntervention({ ...base, recordedBy: '' }, ['RUN-003'], true, FP)
      .problems.join(' ')).toMatch(/named human must record/)
  })

  it('commits a complete intervention', () => {
    const r = commitIntervention(base, ['RUN-003'], true, FP)
    expect(r.committed).toBe(true)
    expect(r.record!.baselineRunId).toBe('RUN-003')
  })
})

describe('4. post-intervention comparison', () => {
  const iv: InterventionRecord = {
    experimentId: 'EXP-001', description: 'd', baselineRunId: 'RUN-003',
    startedAt: '2026-10-02T00:00:00Z', endedAt: null, recordedBy: 'A. Human',
    methodFingerprint: FP, heldConstant: [], evidenceIds: ['EV-100'],
  }
  const cmp: ComparisonCapture = {
    runId: 'CMP-001', capturedAt: '2026-10-05T00:00:00Z', blockNumber: 1,
    methodFingerprint: FP, afterInterventionStartedAt: iv.startedAt,
    readings: [{ standardisedSize: '$10,000 sell', value: -8, notExecutable: false, evidenceId: 'EV-200' }],
  }

  it('refuses a comparison with no intervention', () => {
    expect(validateComparison(cmp, null).join(' ')).toMatch(/nothing to follow/)
  })

  it('refuses a different method fingerprint', () => {
    expect(validateComparison({ ...cmp, methodFingerprint: 'x' }, iv).join(' '))
      .toMatch(/not comparable/)
  })

  it('refuses a capture that predates the intervention', () => {
    expect(validateComparison({ ...cmp, capturedAt: '2026-10-01T00:00:00Z' }, iv).join(' '))
      .toMatch(/must postdate the intervention/)
  })

  it('refuses a value without provenance and a valued not-executable size', () => {
    expect(validateComparison({ ...cmp, readings: [{ ...cmp.readings[0]!, evidenceId: null }] }, iv).join(' '))
      .toMatch(/requires provenance/)
    expect(validateComparison({ ...cmp, readings: [{ ...cmp.readings[0]!, notExecutable: true }] }, iv).join(' '))
      .toMatch(/must not report a value/)
  })

  it('accepts a valid comparison', () => {
    expect(validateComparison(cmp, iv)).toEqual([])
  })
})

describe('5. before/after calculation — LOWER_IS_BETTER by absolute magnitude', () => {
  const r = (v: number | null, ne = false) =>
    ({ standardisedSize: '$10,000 sell', value: v, notExecutable: ne, evidenceId: 'EV-200' })

  it('a smaller magnitude on a negative impact is an improvement', () => {
    const k = compareKpi('$10,000 sell', 'LOWER_IS_BETTER', 9, -9.61, r(-8))
    expect(k.baselineMagnitude).toBe(9.61)
    expect(k.comparisonMagnitude).toBe(8)
    expect(k.improved).toBe(true)
    expect(k.outcome).toBe('MET')
  })

  it('a larger magnitude on a negative impact is worse', () => {
    const k = compareKpi('$10,000 sell', 'LOWER_IS_BETTER', 9, -9.61, r(-11))
    expect(k.improved).toBe(false)
    expect(k.outcome).toBe('NOT_MET')
    expect(k.deltaMagnitude).toBeCloseTo(1.39, 5)
  })

  it('sign alone never decides the outcome', () => {
    // -8 and +8 have identical magnitude, so identical outcome
    expect(compareKpi('s', 'LOWER_IS_BETTER', 9, -9.61, r(-8)).outcome)
      .toBe(compareKpi('s', 'LOWER_IS_BETTER', 9, -9.61, r(8)).outcome)
  })

  it('an unregistered threshold cannot be judged', () => {
    expect(compareKpi('s', 'LOWER_IS_BETTER', null, -9.61, r(-8)).outcome).toBe('DATA_UNAVAILABLE')
  })

  it('a not-executable size is reported as such, never judged', () => {
    const k = compareKpi('$100,000', 'LOWER_IS_BETTER', 9, null, r(null, true))
    expect(k.outcome).toBe('NOT_EXECUTABLE')
  })

  it('rolls up to SUPPORTED / REJECTED / INCONCLUSIVE', () => {
    const met = compareKpi('a', 'LOWER_IS_BETTER', 9, -9.61, r(-8))
    const not = compareKpi('b', 'LOWER_IS_BETTER', 9, -9.61, r(-11))
    expect(calculateResult([met]).provisionalResult).toBe('SUPPORTED')
    expect(calculateResult([not]).provisionalResult).toBe('REJECTED')
    expect(calculateResult([met, not]).provisionalResult).toBe('INCONCLUSIVE')
    expect(calculateResult([]).provisionalResult).toBe('DATA_UNAVAILABLE')
  })

  it('the calculation is explicitly provisional, not a finding', () => {
    const c = calculateResult([compareKpi('a', 'LOWER_IS_BETTER', 9, -9.61, r(-8))])
    expect(c.rationale).toMatch(/Provisional only — not a finding/)
  })
})

describe('6. final human review', () => {
  const calc = calculateResult([compareKpi('a', 'LOWER_IS_BETTER', 9, -9.61,
    { standardisedSize: 'a', value: -8, notExecutable: false, evidenceId: 'EV-200' })])

  it('refuses without a calculation', () => {
    expect(commitFinalReview({ reviewer: 'R', at: NOW, result: 'SUPPORTED', note: 'n', evidenceIds: ['EV-200'] }, null)
      .problems.join(' ')).toMatch(/nothing to review/)
  })

  it.each([
    ['reviewer', { reviewer: '' }, /named human reviewer/],
    ['note', { note: '' }, /review note is required/],
    ['evidence', { evidenceIds: [] }, /must link to evidence/],
  ])('refuses a missing %s', (_n, patch, re) => {
    expect(commitFinalReview(
      { reviewer: 'R', at: NOW, result: 'SUPPORTED', note: 'n', evidenceIds: ['EV-200'], ...patch }, calc,
    ).problems.join(' ')).toMatch(re)
  })

  it('commits a complete review', () => {
    const r = commitFinalReview(
      { reviewer: 'A. Human', at: NOW, result: 'SUPPORTED', note: 'reviewed', evidenceIds: ['EV-200'] }, calc)
    expect(r.committed).toBe(true)
    expect(r.record!.reviewer).toBe('A. Human')
  })
})

describe('7. live state stays blocked — nothing invented', () => {
  it('every governance slot is empty', () => {
    expect(BASELINE_APPROVALS).toHaveLength(0)
    expect(INTERVENTION).toBeNull()
    expect(COMPARISON).toBeNull()
    expect(RESULT_CALCULATION).toBeNull()
    expect(FINAL_REVIEW).toBeNull()
  })

  it('no threshold is registered', () => {
    const s = governanceState()
    expect(s.thresholdsRegistered).toBe(0)
    expect(s.thresholdsRequired).toBe(4)
    expect(s.thresholdsComplete).toBe(false)
  })

  it('the chain is gated at thresholds', () => {
    expect(governanceGate().gate).toBe('THRESHOLDS_PENDING')
    expect(governanceGate().action).toMatch(/register the four numeric thresholds/)
  })

  it('gates advance only as each prerequisite is genuinely met', () => {
    const s: GovernanceState = {
      thresholdsRegistered: 4, thresholdsRequired: 4, thresholdsComplete: true,
      approvedBaselineRuns: [], intervention: null, comparison: null,
      calculation: null, finalReview: null,
    }
    expect(currentGate(s)).toBe('BASELINE_APPROVAL_PENDING')
    expect(currentGate({ ...s, approvedBaselineRuns: ['RUN-003'] })).toBe('INTERVENTION_PENDING')
  })

  it('EXP-001 cannot be completed in the current state', () => {
    expect(() => assertCompletable(governanceState())).toThrow(GovernanceError)
    expect(() => assertCompletable(governanceState())).toThrow(/cannot be COMPLETED/)
  })

  it('every gate names a required human action', () => {
    for (const a of Object.values(GATE_ACTION)) expect(a.length).toBeGreaterThan(10)
  })
})
