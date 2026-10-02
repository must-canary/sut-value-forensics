/**
 * Proposed (unapproved) thresholds must remain inert.
 */
import { describe, expect, it } from 'vitest'
import {
  assertNotTreatedAsRegistered, handoffComplete, handoffOutstanding, isRegisteredThreshold,
  PROPOSAL_RATIONALE, ProposalMisuseError, registeredCountFromProposals, summariseProposals,
  unlocksIntervention, validateProposal, type ProposedThreshold,
} from '../src/core/proposed-thresholds'
import {
  EOD_HANDOFF, NOT_EXECUTABLE_SIZES, OBSERVED_BASELINE_RANGES, PROPOSED_THRESHOLDS,
} from '../src/data/proposed-thresholds'
import { PRE_REGISTRATION } from '../src/data/pre-registration'
import { governanceGate, governanceState } from '../src/data/governance'
import { assertCompletable, currentGate, GovernanceError } from '../src/core/governance'
import { registrationSummary } from '../src/core/pre-registration'

describe('proposed thresholds can exist without approval', () => {
  it('four proposals exist with the stated working values', () => {
    expect(PROPOSED_THRESHOLDS).toHaveLength(4)
    const bySize = Object.fromEntries(PROPOSED_THRESHOLDS.map((p) => [p.tradeSize, p.proposedThreshold]))
    expect(bySize).toEqual({
      '$10,000 buy': 8, '$10,000 sell': 8, '$50,000 buy': 40, '$50,000 sell': 30,
    })
  })

  it('each carries every required field', () => {
    for (const p of PROPOSED_THRESHOLDS) {
      expect(validateProposal(p), p.tradeSize).toEqual([])
      expect(p.experimentId).toBe('EXP-001')
      expect(p.status).toBe('PROPOSED')
      expect(p.approvalStatus).toBe('PENDING')
      expect(p.comparisonDirection).toBe('LOWER_IS_BETTER')
      expect(p.authorSource).toBeTruthy()
      expect(p.createdAt).toBeTruthy()
      expect(p.rationale).toBe(PROPOSAL_RATIONALE)
    }
  })

  it('the rationale states it is not a business-approved target', () => {
    expect(PROPOSAL_RATIONALE).toMatch(/not a business-approved target/)
    expect(PROPOSAL_RATIONALE).toMatch(/must not be used as an experimental success criterion/)
  })

  it('a proposal claiming approval is invalid', () => {
    const bad: ProposedThreshold = { ...PROPOSED_THRESHOLDS[0]!, approvalStatus: 'APPROVED' }
    expect(validateProposal(bad).join(' ')).toMatch(/approval is a business act/)
  })
})

describe('proposals cannot be treated as registered thresholds', () => {
  it('isRegisteredThreshold is false for every proposal', () => {
    for (const p of PROPOSED_THRESHOLDS) expect(isRegisteredThreshold(p)).toBe(false)
  })

  it('reading a proposal as registered throws', () => {
    expect(() => assertNotTreatedAsRegistered(PROPOSED_THRESHOLDS[0]!)).toThrow(ProposalMisuseError)
    expect(() => assertNotTreatedAsRegistered(PROPOSED_THRESHOLDS[0]!))
      .toThrow(/is not a registered threshold/)
  })

  it('proposals contribute zero to the registered count', () => {
    expect(registeredCountFromProposals(PROPOSED_THRESHOLDS)).toBe(0)
    expect(summariseProposals(PROPOSED_THRESHOLDS).registeredEquivalent).toBe(0)
  })

  it('the pre-registration store is untouched by the proposals', () => {
    const r = registrationSummary(PRE_REGISTRATION)
    expect(r.registered).toBe(0)
    expect(r.awaiting).toBe(4)
    expect(r.complete).toBe(false)
    for (const e of PRE_REGISTRATION) {
      expect(e.successThreshold, e.standardisedSize).toBeNull()
      expect(e.rationale, e.standardisedSize).toBeNull()
    }
  })
})

describe('proposals cannot unlock intervention or produce a result', () => {
  it('unlocksIntervention is false', () => {
    expect(unlocksIntervention(PROPOSED_THRESHOLDS)).toBe(false)
    expect(summariseProposals(PROPOSED_THRESHOLDS).unlocksIntervention).toBe(false)
  })

  it('the governance gate is still at thresholds', () => {
    expect(governanceGate().gate).toBe('THRESHOLDS_PENDING')
    expect(governanceState().thresholdsComplete).toBe(false)
    expect(governanceState().thresholdsRegistered).toBe(0)
  })

  it('no intervention, comparison, calculation or final review exists', () => {
    const s = governanceState()
    expect(s.approvedBaselineRuns).toHaveLength(0)
    expect(s.intervention).toBeNull()
    expect(s.comparison).toBeNull()
    expect(s.calculation).toBeNull()
    expect(s.finalReview).toBeNull()
  })

  it('EXP-001 cannot be completed', () => {
    expect(() => assertCompletable(governanceState())).toThrow(GovernanceError)
  })

  it('even with proposals present the gate never advances', () => {
    const s = governanceState()
    expect(currentGate(s)).toBe('THRESHOLDS_PENDING')
  })
})

describe('$100K remains NOT EXECUTABLE', () => {
  it('no proposal exists for the $100K size', () => {
    expect(PROPOSED_THRESHOLDS.some((p) => p.tradeSize.includes('$100,000'))).toBe(false)
    expect(NOT_EXECUTABLE_SIZES).toContain('$100,000 (both sides)')
  })

  it('its displayed range is NOT EXECUTABLE, not a number', () => {
    expect(OBSERVED_BASELINE_RANGES['$100,000 (both sides)']).toBe('NOT EXECUTABLE')
  })

  it('the handoff excludes it and says no value is modelled', () => {
    expect(EOD_HANDOFF.requests.some((r) => r.tradeSize.includes('$100,000'))).toBe(false)
    expect(EOD_HANDOFF.notExecutableNote).toMatch(/no value is modelled or backfilled/)
  })
})

describe('no threshold is silently derived from baseline values', () => {
  const observed = [10.59, 10.68, 10.64, 9.57, 9.65, 9.61, 58.26, 58.82, 58.56, 36.81, 37.03, 36.93]

  it('no proposed value equals any observed baseline magnitude', () => {
    for (const p of PROPOSED_THRESHOLDS) {
      expect(observed, p.tradeSize).not.toContain(p.proposedThreshold)
    }
  })

  it('proposals are round, explicitly-stated working values', () => {
    for (const p of PROPOSED_THRESHOLDS) expect(Number.isInteger(p.proposedThreshold)).toBe(true)
  })

  it('the author/source is a working proposal, not a business owner', () => {
    for (const p of PROPOSED_THRESHOLDS) {
      expect(p.authorSource).toMatch(/not a business owner/)
    }
  })

  it('observed ranges are stored for display only, separate from the proposals', () => {
    expect(OBSERVED_BASELINE_RANGES['$10,000 buy']).toMatch(/10\.59/)
    const proposal = PROPOSED_THRESHOLDS.find((p) => p.tradeSize === '$10,000 buy')!
    expect(proposal.proposedThreshold).toBe(8)
  })
})

describe('EOD business input handoff', () => {
  it('states baseline complete and intervention pending', () => {
    expect(EOD_HANDOFF.statement).toBe(
      'Baseline evidence is complete. Intervention is pending business-approved success thresholds.')
    expect(EOD_HANDOFF.baselineStatus).toMatch(/COMPLETE/)
  })

  it('asks for all four acceptable maximum price impacts', () => {
    expect(EOD_HANDOFF.requests.map((r) => r.tradeSize))
      .toEqual(['$10,000 buy', '$10,000 sell', '$50,000 buy', '$50,000 sell'])
    for (const r of EOD_HANDOFF.requests) {
      expect(r.question).toMatch(/acceptable maximum price impact/)
      expect(r.businessAnswer, r.tradeSize).toBeNull()
    }
  })

  it('asks whether the proposed working thresholds may be used', () => {
    expect(EOD_HANDOFF.proposalQuestion).toMatch(/May the proposed working thresholds/)
    expect(EOD_HANDOFF.proposalAnswer).toBeNull()
  })

  it('has no business responder and is incomplete', () => {
    expect(EOD_HANDOFF.respondedBy).toBeNull()
    expect(EOD_HANDOFF.respondedAt).toBeNull()
    expect(handoffComplete(EOD_HANDOFF)).toBe(false)
    expect(handoffOutstanding(EOD_HANDOFF)).toHaveLength(6)
  })

  it('business approval is still required before registration', () => {
    expect(handoffOutstanding(EOD_HANDOFF)).toContain('approval to use the proposed working thresholds')
    expect(handoffOutstanding(EOD_HANDOFF)).toContain('a named business responder')
    expect(registrationSummary(PRE_REGISTRATION).complete).toBe(false)
  })
})
