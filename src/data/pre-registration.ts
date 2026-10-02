/**
 * EXP-001 pre-registration slots.
 *
 * Every threshold slot is AWAITING_HUMAN_ENTRY. No number is supplied here, and
 * none may be derived from RUN-001, RUN-002 or RUN-003 — a threshold read off a
 * captured baseline is not a threshold. The $100K size is NOT_REGISTERABLE
 * because the pool cannot execute it at all.
 */
import type { PreRegistrationEntry } from '../core/pre-registration'

export const EXPERIMENT_VERSION = 'EXP-001/v1'

const BASELINE_METHOD =
  'Uniswap V3 single-active-range math on pool 0x092295c92bab5e734c4a60dbc0f0ffdcdfc4e165 ' +
  '(token0 = SUT, token1 = USDT, fee 1.00%), read directly from slot0/liquidity/balanceOf at a stated block, ' +
  'with a one-sided inventory feasibility check applied before any percentage is reported.'

const COMPARISON_METHOD =
  'Compare a post-intervention capture against the approved baseline using the identical method ' +
  'fingerprint. Control: BTC/ETH over the same window plus the pool’s own preceding baseline. ' +
  'Any change to the method invalidates the comparison.'

const WINDOW = '30-day baseline → intervention → 60-day measurement'

const slot = (
  standardisedSize: string,
  direction: PreRegistrationEntry['thresholdDirection'],
): PreRegistrationEntry => ({
  experimentId: 'EXP-001',
  experimentVersion: EXPERIMENT_VERSION,
  metric: 'Modelled price impact at a standardised transaction size',
  standardisedSize,
  baselineMethod: BASELINE_METHOD,
  successThreshold: null,
  thresholdUnit: 'percent',
  thresholdDirection: direction,
  measurementWindow: WINDOW,
  comparisonMethod: COMPARISON_METHOD,
  reviewerName: null,
  registrationTimestamp: null,
  state: 'AWAITING_HUMAN_ENTRY',
  independenceAttested: false,
  attestedBy: null,
  rationale: null,
  notes:
    'Awaiting human entry. The threshold must be set independently of RUN-001, RUN-002 and RUN-003 — ' +
    'it may not be read off, rounded from, or anchored to any captured baseline value.',
})

export const PRE_REGISTRATION: PreRegistrationEntry[] = [
  // magnitude of impact should fall, so a smaller absolute impact is better
  slot('$10,000 buy', 'LOWER_IS_BETTER'),
  slot('$10,000 sell', 'LOWER_IS_BETTER'),
  slot('$50,000 buy', 'LOWER_IS_BETTER'),
  slot('$50,000 sell', 'LOWER_IS_BETTER'),
  {
    experimentId: 'EXP-001',
    experimentVersion: EXPERIMENT_VERSION,
    metric: 'Modelled price impact at a standardised transaction size',
    standardisedSize: '$100,000 (both sides)',
    baselineMethod: BASELINE_METHOD,
    successThreshold: null,
    thresholdUnit: 'percent',
    thresholdDirection: 'LOWER_IS_BETTER',
    measurementWindow: WINDOW,
    comparisonMethod: COMPARISON_METHOD,
    reviewerName: null,
    registrationTimestamp: null,
    state: 'NOT_REGISTERABLE',
    independenceAttested: false,
    attestedBy: null,
    rationale: null,
    notes:
      'NOT EXECUTABLE — the pool cannot fill this size on either side. At the latest capture a buy needs ' +
      '159,614 SUT against 99,065 available, and a sell needs $65,859 against $51,696 available. ' +
      'A threshold cannot be registered for a transaction the venue cannot execute. This slot becomes ' +
      'registerable only once inventory actually supports the standardised size.',
  },
]

/**
 * Observed baseline values, held ONLY so a proposed threshold can be checked
 * against them and refused if it was read off a run. They are never a source
 * for a threshold.
 */
export const OBSERVED_BASELINE_IMPACTS: Record<string, number[]> = {
  '$10,000 buy': [10.59, 10.68, 10.64],
  '$10,000 sell': [-9.57, -9.65, -9.61],
  '$50,000 buy': [58.26, 58.82, 58.56],
  '$50,000 sell': [-36.81, -37.03, -36.93],
}
