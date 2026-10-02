/**
 * Proposed (NOT approved) working thresholds.
 *
 * A proposal is a planning artefact. It is deliberately held in a store that is
 * structurally separate from PRE_REGISTRATION so it cannot leak into the
 * governance chain: it does not register, does not approve, does not unlock an
 * intervention, and cannot produce a result.
 */
import type { ThresholdDirection } from './pre-registration'

export type ProposalStatus = 'PROPOSED'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface ProposedThreshold {
  experimentId: string
  tradeSize: string
  /** buy / sell side of the standardised size */
  side: 'BUY' | 'SELL'
  proposedThreshold: number
  thresholdUnit: string
  metric: string
  comparisonDirection: ThresholdDirection
  status: ProposalStatus
  approvalStatus: ApprovalStatus
  authorSource: string
  rationale: string
  createdAt: string
}

export class ProposalMisuseError extends Error {}

export const PROPOSAL_RATIONALE =
  'Working threshold proposed for experiment planning based on the current observed baseline. ' +
  'This is not a business-approved target and must not be used as an experimental success ' +
  'criterion until explicitly approved.'

/** A proposal is never a registered threshold. */
export function isRegisteredThreshold(_p: ProposedThreshold): false {
  return false
}

/** Refuses any attempt to read a proposal as if it were registered. */
export function assertNotTreatedAsRegistered(p: ProposedThreshold): never {
  throw new ProposalMisuseError(
    `${p.experimentId} ${p.tradeSize}: a PROPOSED threshold (approval ${p.approvalStatus}) ` +
    'is not a registered threshold. It cannot be used as a success criterion, cannot unlock an ' +
    'intervention, and cannot produce a result until a named business owner approves it and it is ' +
    'registered through the pre-registration workflow.',
  )
}

/** Proposals contribute nothing to the registered count, by definition. */
export function registeredCountFromProposals(_proposals: ProposedThreshold[]): 0 {
  return 0
}

/** True only when a human has approved AND the value was registered elsewhere. */
export function unlocksIntervention(proposals: ProposedThreshold[]): boolean {
  void proposals
  return false
}

export function validateProposal(p: ProposedThreshold): string[] {
  const errs: string[] = []
  if (!p.experimentId) errs.push('experimentId is required')
  if (!p.tradeSize) errs.push('tradeSize is required')
  if (!p.metric) errs.push('metric is required')
  if (!p.authorSource?.trim()) errs.push('an author/source is required')
  if (!p.rationale?.trim()) errs.push('a rationale is required')
  if (!p.createdAt) errs.push('a created timestamp is required')
  if (p.status !== 'PROPOSED') errs.push('a proposal must carry status PROPOSED')
  if (p.approvalStatus !== 'PENDING') {
    errs.push('an unapproved proposal must carry approvalStatus PENDING — approval is a business act')
  }
  if (!Number.isFinite(p.proposedThreshold)) errs.push('a numeric proposed threshold is required')
  if (p.proposedThreshold < 0) errs.push('a magnitude threshold must not be negative')
  return errs
}

export interface ProposalSummary {
  total: number
  pendingApproval: number
  approved: number
  unlocksIntervention: boolean
  registeredEquivalent: 0
}

export function summariseProposals(proposals: ProposedThreshold[]): ProposalSummary {
  return {
    total: proposals.length,
    pendingApproval: proposals.filter((p) => p.approvalStatus === 'PENDING').length,
    approved: proposals.filter((p) => p.approvalStatus === 'APPROVED').length,
    unlocksIntervention: unlocksIntervention(proposals),
    registeredEquivalent: 0,
  }
}

// ───────────────────────────────────── EOD business input handoff

export interface BusinessInputRequest {
  tradeSize: string
  question: string
  proposedWorkingValue: number | null
  businessAnswer: number | null
}

export interface BusinessInputHandoff {
  experimentId: string
  createdAt: string
  baselineStatus: string
  statement: string
  requests: BusinessInputRequest[]
  proposalQuestion: string
  proposalAnswer: 'YES' | 'NO' | null
  notExecutableNote: string
  respondedBy: string | null
  respondedAt: string | null
}

export const HANDOFF_STATEMENT =
  'Baseline evidence is complete. Intervention is pending business-approved success thresholds.'

export function handoffOutstanding(h: BusinessInputHandoff): string[] {
  const out = h.requests.filter((r) => r.businessAnswer === null).map((r) => r.tradeSize)
  if (h.proposalAnswer === null) out.push('approval to use the proposed working thresholds')
  if (!h.respondedBy) out.push('a named business responder')
  return out
}

export function handoffComplete(h: BusinessInputHandoff): boolean {
  return handoffOutstanding(h).length === 0
}
