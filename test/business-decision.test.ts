/**
 * Browser business threshold decision workflow — additive, non-bypassing.
 */
import { describe, expect, it } from 'vitest'
import {
  assertApprovalImmutable, buildScenarioRows, buildStatusPanel, BusinessDecisionError,
  createApprovalRecord, DECISION_STATES, decisionState, EXECUTABLE_SIZES,
  fingerprintApproval, NOT_EXECUTABLE_SIZE, unlocksExperiment, validateForApproval,
  validateForSave, type BusinessInputDraft,
} from '../src/core/business-decision'
import { governanceState } from '../src/data/governance'
import { PRE_REGISTRATION } from '../src/data/pre-registration'
import { OBSERVED_BASELINE_RANGES, PROPOSED_THRESHOLDS } from '../src/data/proposed-thresholds'
import { registrationSummary } from '../src/core/pre-registration'
import { assertCompletable, currentGate, GovernanceError } from '../src/core/governance'

const NOW = '2026-10-01T12:00:00Z'
const V = 'EXP-001/v1'

const draft = (over: Partial<BusinessInputDraft> = {}): BusinessInputDraft => ({
  thresholds: EXECUTABLE_SIZES.map((size) => ({ size, value: 8, rationale: 'business tolerance' })),
  reviewerName: 'B. Owner', decisionNote: 'approved at EOD review', confirmed: true, ...over,
})

describe('state separation — five distinct states', () => {
  it('never collapses the five states', () => {
    expect(DECISION_STATES).toEqual(
      ['PROPOSED', 'BUSINESS_INPUT_SAVED', 'BUSINESS_APPROVED', 'REGISTERED', 'LOCKED'])
  })

  it('walks PROPOSED -> SAVED -> APPROVED -> REGISTERED -> LOCKED', () => {
    const rec = createApprovalRecord(draft(), NOW, V).record!
    expect(decisionState({ approval: null, inputSaved: false, registeredCount: 0, requiredCount: 4 })).toBe('PROPOSED')
    expect(decisionState({ approval: null, inputSaved: true, registeredCount: 0, requiredCount: 4 })).toBe('BUSINESS_INPUT_SAVED')
    expect(decisionState({ approval: rec, inputSaved: true, registeredCount: 0, requiredCount: 4 })).toBe('BUSINESS_APPROVED')
    expect(decisionState({ approval: rec, inputSaved: true, registeredCount: 2, requiredCount: 4 })).toBe('REGISTERED')
    expect(decisionState({ approval: rec, inputSaved: true, registeredCount: 4, requiredCount: 4 })).toBe('LOCKED')
  })

  it('saving is not approval', () => {
    expect(validateForSave(draft({ reviewerName: '', confirmed: false })).valid).toBe(true)
    expect(validateForApproval(draft({ reviewerName: '', confirmed: false })).valid).toBe(false)
  })
})

describe('approval requirements', () => {
  it('requires all four values', () => {
    const d = draft()
    d.thresholds[2]!.value = null
    expect(validateForApproval(d).problems.join(' ')).toMatch(/\$50,000 buy: a threshold value is required/)
  })

  it.each([
    ['zero', 0], ['negative', -5],
  ])('rejects a %s value', (_n, v) => {
    const d = draft()
    d.thresholds[0]!.value = v
    expect(validateForApproval(d).problems.join(' ')).toMatch(/must be a positive number/)
  })

  it('requires per-scenario rationale, reviewer, note and explicit confirmation', () => {
    const noRat = draft(); noRat.thresholds[1]!.rationale = ' '
    expect(validateForApproval(noRat).problems.join(' ')).toMatch(/a rationale is required/)
    expect(validateForApproval(draft({ reviewerName: ' ' })).problems.join(' ')).toMatch(/business reviewer name is required/)
    expect(validateForApproval(draft({ decisionNote: '' })).problems.join(' ')).toMatch(/decision note/)
    expect(validateForApproval(draft({ confirmed: false })).problems.join(' ')).toMatch(/explicitly confirm/)
  })

  it('incomplete input produces no approval record', () => {
    const r = createApprovalRecord(draft({ confirmed: false }), NOW, V)
    expect(r.created).toBe(false)
    expect(r.record).toBeNull()
  })

  it('creates an auditable record when complete', () => {
    const r = createApprovalRecord(draft(), NOW, V)
    expect(r.created).toBe(true)
    const rec = r.record!
    expect(rec.reviewer).toBe('B. Owner')
    expect(rec.approvedAt).toBe(NOW)
    expect(rec.decisionNote).toBe('approved at EOD review')
    expect(rec.version).toBe(V)
    expect(rec.fingerprint).toMatch(/^BA-EXP-001\/v1-[0-9a-f]{8}$/)
    expect(rec.approvalStatus).toBe('BUSINESS_APPROVED')
    expect(rec.thresholds).toHaveLength(4)
    for (const t of rec.thresholds) expect(t.direction).toBe('LOWER_IS_BETTER')
  })
})

describe('approval does not register and does not unlock', () => {
  const rec = createApprovalRecord(draft(), NOW, V).record!

  it('the record states it does not register', () => {
    expect(rec.registersThreshold).toBe(false)
  })

  it('unlocksExperiment is false even when approved', () => {
    expect(unlocksExperiment({ approval: rec, inputSaved: true, registeredCount: 0, requiredCount: 4 })).toBe(false)
  })

  it('the existing pre-registration store is untouched', () => {
    const s = registrationSummary(PRE_REGISTRATION)
    expect(s.registered).toBe(0)
    expect(s.complete).toBe(false)
    for (const e of PRE_REGISTRATION) expect(e.successThreshold, e.standardisedSize).toBeNull()
  })

  it('the existing governance gate is unchanged', () => {
    expect(currentGate(governanceState())).toBe('THRESHOLDS_PENDING')
    expect(() => assertCompletable(governanceState())).toThrow(GovernanceError)
  })

  it('status shows APPROVED but registration PENDING and intervention BLOCKED', () => {
    const p = buildStatusPanel({
      baselineRuns: 3, proposalCount: 4, inputSaved: true, approval: rec,
      registeredCount: 0, requiredCount: 4, approvedBaselineRuns: 0,
      interventionRecorded: false, comparisonCaptured: false, finalReviewRecorded: false,
    })
    expect(p.businessApproval).toBe('APPROVED')
    expect(p.thresholdRegistration).toBe('PENDING')
    expect(p.intervention).toBe('BLOCKED')
    expect(p.result).toBe('NOT AVAILABLE')
  })

  it('intervention is READY only when registration AND baseline approval are both done', () => {
    const base = {
      baselineRuns: 3, proposalCount: 4, inputSaved: true, approval: rec,
      requiredCount: 4, interventionRecorded: false, comparisonCaptured: false, finalReviewRecorded: false,
    }
    expect(buildStatusPanel({ ...base, registeredCount: 4, approvedBaselineRuns: 0 }).intervention).toBe('BLOCKED')
    expect(buildStatusPanel({ ...base, registeredCount: 0, approvedBaselineRuns: 1 }).intervention).toBe('BLOCKED')
    expect(buildStatusPanel({ ...base, registeredCount: 4, approvedBaselineRuns: 1 }).intervention).toBe('READY')
  })
})

describe('locking — approved values cannot be silently changed', () => {
  const rec = createApprovalRecord(draft(), NOW, V).record!

  it('a changed threshold is refused for the same version', () => {
    const changed = { ...rec, thresholds: rec.thresholds.map((t, i) => i === 0 ? { ...t, value: 99 } : t) }
    changed.fingerprint = fingerprintApproval(changed.thresholds, changed.reviewer, changed.approvedAt, V)
    expect(() => assertApprovalImmutable(rec, changed)).toThrow(BusinessDecisionError)
    expect(() => assertApprovalImmutable(rec, changed)).toThrow(/locked for version/)
  })

  it('a silently changed reviewer is refused', () => {
    expect(() => assertApprovalImmutable(rec, { ...rec, reviewer: 'Someone Else' }))
      .toThrow(/cannot be silently changed/)
  })

  it('a new version may re-approve', () => {
    expect(() => assertApprovalImmutable(rec, { ...rec, version: 'EXP-001/v2', fingerprint: 'BA-x' })).not.toThrow()
  })

  it('the fingerprint changes when any value changes', () => {
    const a = fingerprintApproval(rec.thresholds, rec.reviewer, NOW, V)
    const b = fingerprintApproval(
      rec.thresholds.map((t, i) => i === 0 ? { ...t, value: 7 } : t), rec.reviewer, NOW, V)
    expect(a).not.toBe(b)
  })

  it('the fingerprint is order-independent', () => {
    expect(fingerprintApproval([...rec.thresholds].reverse(), rec.reviewer, NOW, V))
      .toBe(fingerprintApproval(rec.thresholds, rec.reviewer, NOW, V))
  })
})

describe('actual results come only from a captured comparison', () => {
  const registered = Object.fromEntries(EXECUTABLE_SIZES.map((s) => [s, 8]))

  it('with no comparison every actual result is NOT AVAILABLE', () => {
    const rows = buildScenarioRows({
      baselineRanges: OBSERVED_BASELINE_RANGES, registeredThresholds: registered, comparison: null,
    })
    for (const r of rows.filter((x) => x.scenario !== NOT_EXECUTABLE_SIZE)) {
      expect(r.actualResult).toBe('NOT AVAILABLE')
      expect(r.status).toMatch(/BLOCKED — no comparison capture/)
      expect(r.runId).toBe('—')
    }
  })

  it('an unregistered threshold blocks the row regardless of a capture', () => {
    const rows = buildScenarioRows({
      baselineRanges: OBSERVED_BASELINE_RANGES,
      registeredThresholds: Object.fromEntries(EXECUTABLE_SIZES.map((s) => [s, null])),
      comparison: { runId: 'CMP-1', capturedAt: NOW, readings: [{ size: '$10,000 sell', value: -8, evidenceId: 'EV-200' }] },
    })
    expect(rows[1]!.status).toMatch(/threshold not registered/)
  })

  it('uses LOWER_IS_BETTER absolute magnitude for sells', () => {
    const mk = (v: number) => buildScenarioRows({
      baselineRanges: OBSERVED_BASELINE_RANGES, registeredThresholds: { ...registered, '$10,000 sell': 9 },
      comparison: { runId: 'CMP-1', capturedAt: NOW, readings: [{ size: '$10,000 sell', value: v, evidenceId: 'EV-200' }] },
    }).find((r) => r.scenario === '$10,000 sell')!
    // -9.61 -> -8.00 improves (|8| <= 9); -9.61 -> -11.00 worsens (|11| > 9)
    expect(mk(-8).status).toBe('MET')
    expect(mk(-8).absoluteImpact).toBe('8%')
    expect(mk(-11).status).toBe('NOT MET')
    expect(mk(-11).absoluteImpact).toBe('11%')
  })

  it('sign alone does not change the outcome', () => {
    const run = (v: number) => buildScenarioRows({
      baselineRanges: OBSERVED_BASELINE_RANGES, registeredThresholds: { ...registered, '$10,000 sell': 9 },
      comparison: { runId: 'C', capturedAt: NOW, readings: [{ size: '$10,000 sell', value: v, evidenceId: 'EV' }] },
    }).find((r) => r.scenario === '$10,000 sell')!.status
    expect(run(-8)).toBe(run(8))
  })

  it('a captured value carries its run id, timestamp and evidence', () => {
    const r = buildScenarioRows({
      baselineRanges: OBSERVED_BASELINE_RANGES, registeredThresholds: registered,
      comparison: { runId: 'CMP-1', capturedAt: NOW, readings: [{ size: '$10,000 buy', value: 7, evidenceId: 'EV-200' }] },
    }).find((x) => x.scenario === '$10,000 buy')!
    expect(r.runId).toBe('CMP-1')
    expect(r.timestamp).toBe(NOW)
    expect(r.evidence).toBe('EV-200')
  })
})

describe('$100K remains NOT EXECUTABLE', () => {
  it('is not an executable size and has no input slot', () => {
    expect(EXECUTABLE_SIZES).toHaveLength(4)
    expect((EXECUTABLE_SIZES as readonly string[])).not.toContain(NOT_EXECUTABLE_SIZE)
  })

  it('a draft containing $100K is refused on save', () => {
    const d = draft()
    ;(d.thresholds as Array<{ size: string; value: number | null; rationale: string }>)
      .push({ size: NOT_EXECUTABLE_SIZE, value: 50, rationale: 'x' })
    expect(validateForSave(d as BusinessInputDraft).problems.join(' ')).toMatch(/NOT EXECUTABLE/)
  })

  it('the run view keeps it NOT EXECUTABLE on every column', () => {
    const row = buildScenarioRows({
      baselineRanges: OBSERVED_BASELINE_RANGES,
      registeredThresholds: Object.fromEntries(EXECUTABLE_SIZES.map((s) => [s, 8])),
      comparison: null,
    }).find((r) => r.scenario === NOT_EXECUTABLE_SIZE)!
    expect(row.lockedThreshold).toBe('NOT REGISTERABLE')
    expect(row.actualResult).toBe('NOT EXECUTABLE')
    expect(row.status).toMatch(/venue cannot fill/)
  })
})

describe('existing implementation preserved', () => {
  it('the four proposals are unchanged', () => {
    expect(PROPOSED_THRESHOLDS.map((p) => p.proposedThreshold)).toEqual([8, 8, 40, 30])
    for (const p of PROPOSED_THRESHOLDS) expect(p.approvalStatus).toBe('PENDING')
  })

  it('governance state is untouched by this layer', () => {
    const s = governanceState()
    expect(s.thresholdsRegistered).toBe(0)
    expect(s.approvedBaselineRuns).toHaveLength(0)
    expect(s.intervention).toBeNull()
    expect(s.comparison).toBeNull()
    expect(s.finalReview).toBeNull()
  })
})
