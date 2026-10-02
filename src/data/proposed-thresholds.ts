/**
 * EXP-001 proposed working thresholds and the EOD business input handoff.
 *
 * These are PROPOSALS supplied for experiment planning. They are NOT business
 * approved, NOT registered, and unlock nothing. They were stated explicitly as
 * working values — they are not derived from the observed baseline, and the
 * system must never recompute them from it.
 */
import type { BusinessInputHandoff, ProposedThreshold } from '../core/proposed-thresholds'
import { HANDOFF_STATEMENT, PROPOSAL_RATIONALE } from '../core/proposed-thresholds'

const CREATED = '2026-10-01T00:00:00Z'
const SOURCE = 'Project working proposal (experiment planning) — not a business owner'

const p = (
  tradeSize: string, side: 'BUY' | 'SELL', proposedThreshold: number,
): ProposedThreshold => ({
  experimentId: 'EXP-001',
  tradeSize,
  side,
  proposedThreshold,
  thresholdUnit: 'percent (absolute magnitude of price impact)',
  metric: 'Modelled price impact at a standardised transaction size',
  comparisonDirection: 'LOWER_IS_BETTER',
  status: 'PROPOSED',
  approvalStatus: 'PENDING',
  authorSource: SOURCE,
  rationale: PROPOSAL_RATIONALE,
  createdAt: CREATED,
})

/** Explicit working proposals. Never recomputed from RUN-001/002/003. */
export const PROPOSED_THRESHOLDS: ProposedThreshold[] = [
  p('$10,000 buy', 'BUY', 8),
  p('$10,000 sell', 'SELL', 8),
  p('$50,000 buy', 'BUY', 40),
  p('$50,000 sell', 'SELL', 30),
]

/**
 * $100,000 is deliberately absent. The venue cannot execute the size, so no
 * threshold — proposed or otherwise — may be stated for it, and no value is
 * modelled or backfilled.
 */
export const NOT_EXECUTABLE_SIZES = ['$100,000 (both sides)'] as const

/** Observed baseline ranges, held only for display alongside the proposals. */
export const OBSERVED_BASELINE_RANGES: Record<string, string> = {
  '$10,000 buy': '+10.59% to +10.68%',
  '$10,000 sell': '-9.57% to -9.65%',
  '$50,000 buy': '+58.26% to +58.82%',
  '$50,000 sell': '-36.81% to -37.03%',
  '$100,000 (both sides)': 'NOT EXECUTABLE',
}

export const EOD_HANDOFF: BusinessInputHandoff = {
  experimentId: 'EXP-001',
  createdAt: CREATED,
  baselineStatus: 'COMPLETE — RUN-001, RUN-002, RUN-003 captured from live pool state',
  statement: HANDOFF_STATEMENT,
  requests: [
    { tradeSize: '$10,000 buy', question: 'What is the acceptable maximum price impact for a $10,000 buy?', proposedWorkingValue: 8, businessAnswer: null },
    { tradeSize: '$10,000 sell', question: 'What is the acceptable maximum price impact for a $10,000 sell?', proposedWorkingValue: 8, businessAnswer: null },
    { tradeSize: '$50,000 buy', question: 'What is the acceptable maximum price impact for a $50,000 buy?', proposedWorkingValue: 40, businessAnswer: null },
    { tradeSize: '$50,000 sell', question: 'What is the acceptable maximum price impact for a $50,000 sell?', proposedWorkingValue: 30, businessAnswer: null },
  ],
  proposalQuestion:
    'May the proposed working thresholds above be used as the registered success criteria for EXP-001?',
  proposalAnswer: null,
  notExecutableNote:
    '$100,000 is excluded from this request: the pool cannot execute the size on either side, so no ' +
    'threshold is proposed and no value is modelled or backfilled for it.',
  respondedBy: null,
  respondedAt: null,
}
