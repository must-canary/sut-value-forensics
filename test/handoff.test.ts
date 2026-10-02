/**
 * Phase 7 — human pre-registration handoff.
 */
import { describe, expect, it } from 'vitest'
import {
  BLOCKING_NOTICE, NEXT_REQUIRED_ACTION, draftBaselineReview, draftRegistration,
  registrationSummary, validateRegistration, type PreRegistrationEntry,
} from '../src/core/pre-registration'
import { OBSERVED_BASELINE_IMPACTS, PRE_REGISTRATION, EXPERIMENT_VERSION } from '../src/data/pre-registration'
import { BASELINE_CAPTURES, REVIEWS } from '../src/data/baseline-captures'

const NOW = '2026-10-01T09:00:00Z'
const slotFor = (size: string) => PRE_REGISTRATION.find((e) => e.standardisedSize === size)!
const RUNS = ['RUN-001', 'RUN-002', 'RUN-003']

describe('the four registration slots are exposed and empty', () => {
  it('exactly four registerable slots exist, matching the required sizes', () => {
    const sizes = PRE_REGISTRATION.filter((e) => e.state === 'AWAITING_HUMAN_ENTRY').map((e) => e.standardisedSize)
    expect(sizes.sort()).toEqual(['$10,000 buy', '$10,000 sell', '$50,000 buy', '$50,000 sell'])
  })

  it('each slot exposes every field the human must supply', () => {
    for (const e of PRE_REGISTRATION.filter((x) => x.state === 'AWAITING_HUMAN_ENTRY')) {
      expect(e.successThreshold, e.standardisedSize).toBeNull()
      expect(e.reviewerName, e.standardisedSize).toBeNull()
      expect(e.registrationTimestamp, e.standardisedSize).toBeNull()
      expect(e.experimentVersion).toBe(EXPERIMENT_VERSION)
      expect(e.independenceAttested).toBe(false)
      expect(e.attestedBy).toBeNull()
    }
  })

  it('$100K remains NOT REGISTERABLE with the stated reason', () => {
    const e = slotFor('$100,000 (both sides)')
    expect(e.state).toBe('NOT_REGISTERABLE')
    expect(e.notes).toMatch(/cannot fill this size/i)
  })

  it('nothing is registered and registration is incomplete', () => {
    const r = registrationSummary(PRE_REGISTRATION)
    expect(r.registered).toBe(0)
    expect(r.awaiting).toBe(4)
    expect(r.complete).toBe(false)
  })
})

describe('independence confirmation is mandatory', () => {
  const registered = (over: Partial<PreRegistrationEntry> = {}): PreRegistrationEntry => ({
    ...slotFor('$10,000 buy'),
    state: 'REGISTERED', successThreshold: 4, reviewerName: 'A. Human',
    registrationTimestamp: NOW, independenceAttested: true, attestedBy: 'A. Human',
    rationale: 'Set from peer depth targets.', ...over,
  })

  it('a REGISTERED entry without attestation is invalid', () => {
    expect(validateRegistration(registered({ independenceAttested: false })).join(' '))
      .toMatch(/chosen independently of the observed baseline runs/)
  })

  it('a REGISTERED entry without a named attester is invalid', () => {
    expect(validateRegistration(registered({ attestedBy: null })).join(' '))
      .toMatch(/requires a named attester/)
  })

  it('attestation cannot precede a supplied threshold', () => {
    const e = { ...slotFor('$10,000 buy'), independenceAttested: true }
    expect(validateRegistration(e).join(' ')).toMatch(/cannot be attested before a threshold is supplied/)
  })

  it('a fully attested entry validates', () => {
    expect(validateRegistration(registered())).toEqual([])
  })
})

describe('draftRegistration refuses everything that should be refused', () => {
  const base = { standardisedSize: '$10,000 buy', threshold: 4, authorName: 'A. Human',
    rationale: 'Set from peer depth targets before any comparison run.', independenceAttested: true }
  const obs = OBSERVED_BASELINE_IMPACTS['$10,000 buy']!

  it('refuses a missing threshold', () => {
    const d = draftRegistration(slotFor('$10,000 buy'), { ...base, threshold: null }, obs, NOW)
    expect(d.admissible).toBe(false)
    expect(d.problems.join(' ')).toMatch(/numeric threshold is required/)
    expect(d.record).toBeNull()
  })

  it('refuses an unnamed author', () => {
    const d = draftRegistration(slotFor('$10,000 buy'), { ...base, authorName: '  ' }, obs, NOW)
    expect(d.problems.join(' ')).toMatch(/named human author is required/)
  })

  it('refuses a missing independence confirmation', () => {
    const d = draftRegistration(slotFor('$10,000 buy'), { ...base, independenceAttested: false }, obs, NOW)
    expect(d.problems.join(' ')).toMatch(/selected independently of RUN-001, RUN-002 and RUN-003/)
  })

  it('refuses a threshold read off any observed run', () => {
    for (const v of obs) {
      const d = draftRegistration(slotFor('$10,000 buy'), { ...base, threshold: v }, obs, NOW)
      expect(d.admissible, `threshold ${v}`).toBe(false)
      expect(d.problems.join(' ')).toMatch(/matches an observed baseline value/)
    }
  })

  it('refuses registration of the NOT REGISTERABLE size', () => {
    const d = draftRegistration(slotFor('$100,000 (both sides)'), { ...base, standardisedSize: '$100,000 (both sides)' }, [], NOW)
    expect(d.admissible).toBe(false)
    expect(d.problems.join(' ')).toMatch(/NOT REGISTERABLE/)
  })

  it('refuses a missing rationale', () => {
    const d = draftRegistration(slotFor('$10,000 buy'), { ...base, rationale: '  ' }, obs, NOW)
    expect(d.problems.join(' ')).toMatch(/written rationale is required/)
  })

  it('produces a complete record when everything is supplied', () => {
    const d = draftRegistration(slotFor('$10,000 buy'), base, obs, NOW)
    expect(d.admissible).toBe(true)
    expect(d.record!.successThreshold).toBe(4)
    expect(d.record!.reviewerName).toBe('A. Human')
    expect(d.record!.registrationTimestamp).toBe(NOW)
    expect(d.record!.experimentVersion).toBe(EXPERIMENT_VERSION)
    expect(d.record!.independenceAttested).toBe(true)
    expect(d.record!.attestedBy).toBe('A. Human')
    expect(validateRegistration(d.record!)).toEqual([])
  })

  it('drafting does not mutate the stored slot', () => {
    draftRegistration(slotFor('$10,000 sell'), { ...base, standardisedSize: '$10,000 sell' }, [], NOW)
    expect(slotFor('$10,000 sell').state).toBe('AWAITING_HUMAN_ENTRY')
    expect(slotFor('$10,000 sell').successThreshold).toBeNull()
  })
})

describe('baseline review requires a named human and never auto-approves', () => {
  it('all three runs are reviewable', () => {
    const runs = [...new Set(BASELINE_CAPTURES.filter((c) => c.experimentId === 'EXP-001').map((c) => c.runId))]
    expect(runs.sort()).toEqual(RUNS)
  })

  it('refuses an unnamed reviewer', () => {
    const d = draftBaselineReview({ runId: 'RUN-001', reviewerName: '', action: 'ACCEPT', note: '' }, RUNS, NOW)
    expect(d.admissible).toBe(false)
    expect(d.problems.join(' ')).toMatch(/named human reviewer is required — approval is never automatic/)
  })

  it('refuses an unknown run', () => {
    const d = draftBaselineReview({ runId: 'RUN-999', reviewerName: 'R', action: 'ACCEPT', note: '' }, RUNS, NOW)
    expect(d.problems.join(' ')).toMatch(/unknown run/)
  })

  it('refuses a rejection with no stated reason', () => {
    const d = draftBaselineReview({ runId: 'RUN-002', reviewerName: 'R', action: 'REJECT', note: '' }, RUNS, NOW)
    expect(d.problems.join(' ')).toMatch(/rejection requires a stated reason/)
  })

  it('produces an accept record for a named reviewer', () => {
    const d = draftBaselineReview({ runId: 'RUN-003', reviewerName: 'A. Human', action: 'ACCEPT', note: 'ok' }, RUNS, NOW)
    expect(d.admissible).toBe(true)
    expect(d.record).toEqual({ runId: 'RUN-003', reviewer: 'A. Human', action: 'ACCEPT', at: NOW, note: 'ok' })
  })

  it('drafting a review does not approve anything', () => {
    draftBaselineReview({ runId: 'RUN-001', reviewerName: 'A. Human', action: 'ACCEPT', note: '' }, RUNS, NOW)
    expect(REVIEWS).toHaveLength(0)
    expect(BASELINE_CAPTURES.filter((c) => c.reviewerStatus === 'ACCEPTED')).toHaveLength(0)
    for (const c of BASELINE_CAPTURES) expect(c.reviewerStatus, c.kpi).toBe('PENDING')
  })
})

describe('handoff messaging and preserved state', () => {
  it('states the exact blocking notice', () => {
    expect(BLOCKING_NOTICE).toBe(
      'No intervention or comparison run may proceed until all four thresholds are registered and approved.')
  })

  it('states the exact next required action', () => {
    expect(NEXT_REQUIRED_ACTION).toBe(
      'Register four thresholds and approve the baseline before intervention.')
  })

  it('EXP-001 is not marked successful or failed', () => {
    const notice = `${BLOCKING_NOTICE} ${NEXT_REQUIRED_ACTION}`.toLowerCase()
    expect(notice).not.toMatch(/success|failed|improved/)
  })

  it('no outcome promise appears in the handoff text', () => {
    const text = PRE_REGISTRATION.map((e) => e.notes).join(' ').toLowerCase()
    for (const p of ['increase the price', 'higher market rank', 'guarantee']) {
      expect(text, p).not.toContain(p)
    }
  })
})
