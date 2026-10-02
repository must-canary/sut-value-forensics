/**
 * EXP-001 governance state. EMPTY BY DESIGN.
 *
 * No threshold, approval, intervention, comparison, result or reviewer has been
 * supplied by a human, so every slot below is empty and the chain stays blocked.
 * Nothing here may be populated by the system.
 */
import type {
  BaselineApproval, ComparisonCapture, FinalReview, GovernanceState, InterventionRecord,
  ResultCalculation,
} from '../core/governance'
import { approvedBaselineRunIds, currentGate, GATE_ACTION } from '../core/governance'
import { PRE_REGISTRATION } from './pre-registration'
import { METHOD_FINGERPRINT_EXP001 } from './baseline-captures'

export const BASELINE_APPROVALS: BaselineApproval[] = []
export const INTERVENTION: InterventionRecord | null = null
export const COMPARISON: ComparisonCapture | null = null
export const RESULT_CALCULATION: ResultCalculation | null = null
export const FINAL_REVIEW: FinalReview | null = null

export const BASELINE_FINGERPRINT = METHOD_FINGERPRINT_EXP001

export function governanceState(): GovernanceState {
  const registerable = PRE_REGISTRATION.filter((e) => e.state !== 'NOT_REGISTERABLE')
  const registered = registerable.filter((e) => e.state === 'REGISTERED')
  return {
    thresholdsRegistered: registered.length,
    thresholdsRequired: registerable.length,
    thresholdsComplete: registered.length === registerable.length,
    approvedBaselineRuns: approvedBaselineRunIds(BASELINE_APPROVALS),
    intervention: INTERVENTION,
    comparison: COMPARISON,
    calculation: RESULT_CALCULATION,
    finalReview: FINAL_REVIEW,
  }
}

export function governanceGate() {
  const g = currentGate(governanceState())
  return { gate: g, action: GATE_ACTION[g] }
}
