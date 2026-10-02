/**
 * Phase 4 — experiment execution records.
 *
 * EXP-001 carries a REAL baseline measurement taken from live pool state at
 * Polygon block 94,711,694 (2026-09-30T12:51:21Z). Nothing here is invented.
 *
 * EXP-001 sits at stage REVIEW: measurement data exists, but no named human has
 * reviewed it, so `result` is null. It is also a BASELINE run — no intervention
 * has occurred, so there is nothing yet to compare against.
 */
import type { Measure } from '../core/experiments'
import type { ExperimentRun, KpiReading } from '../core/experiment-runs'

const OBS = '2026-09-30T12:51:21Z'
const BLOCK = 94_711_694

const meas = (value: number | string | null, unit: string, evidenceId: string, note: string): Measure => ({
  value, unit, evidenceId: value === null ? evidenceId : evidenceId, observationTime: OBS, note,
})

const r = (
  kpi: string, dimension: string, value: number | string | null, unit: string,
  evidenceId: string, note: string, modelled = false, notExecutable = false,
): KpiReading => ({
  kpi, dimension, measure: meas(value, unit, evidenceId, note), modelled,
  ...(notExecutable ? { notExecutable: true } : {}),
})

const BASELINE_READINGS: KpiReading[] = [
  r('Price impact', '$10,000 buy', 10.59, 'percent', 'EV-104',
    'MODEL output (Uniswap V3 single-active-range), not a direct observation. Fillable: needs 22,837 of 96,809 SUT.', true),
  r('Price impact', '$10,000 sell', -9.57, 'percent', 'EV-105',
    'MODEL output, not a direct observation. Fillable: needs $9,509 of $52,535 USDT.', true),
  r('Price impact', '$50,000 buy', 58.26, 'percent', 'EV-106',
    'MODEL output, not a direct observation. Barely fillable — consumes 98.6% of SUT inventory.', true),
  r('Price impact', '$50,000 sell', -36.81, 'percent', 'EV-107',
    'MODEL output, not a direct observation. Needs $39,745 of $52,535 USDT (75.7%).', true),
  r('Price impact', '$100,000 (both sides)', null, 'percent', 'EV-108',
    'NOT EXECUTABLE — exceeds pool inventory on both sides (buy needs 158,411 SUT vs 96,809 available; sell needs $65,962 vs $52,535). No percentage is reported because it would not be an executable quote. MODEL would have produced a number; it is deliberately withheld.',
    true, true),
  r('Pool spot price', 'spot', 0.416396, 'USD per SUT', 'EV-100',
    'Derived from slot0().sqrtPriceX96 at block 94711694. Direct contract read.'),
  r('Pool liquidity (SUT side)', 'reserve', 96808.58, 'SUT', 'EV-102',
    'balanceOf(pool). Approximately $40,311 at spot.'),
  r('Pool liquidity (USDT side)', 'reserve', 52534.52, 'USDT', 'EV-103',
    'balanceOf(pool). Approximate total pool TVL $92,845.'),
  r('Available depth', 'within ±2% of spot', '+$1,928 / -$1,967', 'USD', 'EV-109',
    'MODEL output from single-active-range math: notional required to move spot by 2%.', true),
  r('Venue cost', 'fee tier', 1.0, 'percent', 'EV-110',
    'fee() = 10000 (1.00% per side). A venue cost, NOT a bid/ask spread.'),
  r('Bid/ask spread', 'CEX', null, 'percent', 'EV-902',
    'DATA UNAVAILABLE — no CEX order-book feed is retained for this pair. A DEX fee tier is not a spread and is not substituted for one.'),
  r('Volume / depth relationship', 'May 2026 event window', null, 'ratio', 'EV-901',
    'DATA UNAVAILABLE — May 2026 pool TVL was never measured, so the event-window denominator does not exist. The September figure is NOT a substitute.'),
]

const RUN2_READINGS: KpiReading[] = [
  r('Price impact', '$10,000 buy', 10.68, 'percent', 'EV-123',
    'MODEL output (Uniswap V3 single-active-range), not a direct observation. Fillable: needs 23,219 of 100,831 SUT.', true),
  r('Price impact', '$10,000 sell', -9.65, 'percent', 'EV-124',
    'MODEL output, not a direct observation. Fillable: needs $9,505 of $50,898 USDT.', true),
  r('Price impact', '$50,000 buy', 58.82, 'percent', 'EV-125',
    'MODEL output, not a direct observation. Consumes 96,917 of 100,831 SUT (96.1%).', true),
  r('Price impact', '$50,000 sell', -37.03, 'percent', 'EV-126',
    'MODEL output, not a direct observation. Needs $39,676 of $50,898 USDT (78.0%).', true),
  r('Price impact', '$100,000 (both sides)', null, 'percent', 'EV-127',
    'NOT EXECUTABLE — still exceeds inventory on both sides at this capture (buy needs 160,660 SUT vs 100,831; sell needs $65,770 vs $50,898). No percentage is reported. MODEL would have produced a number; it is deliberately withheld.',
    true, true),
  r('Pool spot price', 'spot', 0.409377, 'USD per SUT', 'EV-120',
    'Derived from slot0().sqrtPriceX96 at block 94712797. Direct contract read.'),
  r('Pool liquidity (SUT side)', 'reserve', 100831.12, 'SUT', 'EV-121', 'balanceOf(pool) at block 94712797.'),
  r('Pool liquidity (USDT side)', 'reserve', 50898.18, 'USDT', 'EV-122', 'balanceOf(pool). Approximate pool TVL $92,176.'),
  r('Available depth', 'within ±2% of spot', '+$1,912 / -$1,951', 'USD', 'EV-128',
    'MODEL output from single-active-range math at this capture.', true),
]

export const EXPERIMENT_RUNS: ExperimentRun[] = [
  // ══════════════════════════════════════════════════════════ EXP-001
  {
    id: 'EXP-001',
    opportunityId: 'OPP-01',
    title: 'Liquidity sensitivity — price impact at standardised transaction sizes',
    whyItExists:
      'The frozen research established that a net sell imbalance of roughly $27,000 accompanied a −62.7% intraday move on 2026-05-17, while net liquidity stayed positive. That points to depth exhaustion as the amplification mechanism. This experiment measures how sensitive the price is to standardised order sizes under CURRENT observable conditions, so the market-structure property can be tracked over time. It is a measurement of market structure, not a forecast of any future price.',
    mechanismTested:
      'H2 — whether the observable venue can absorb standardised order flow without an outsized price response. The measurement is of market structure only; no causal claim about the May event is drawn from it.',
    stage: 'REVIEW',
    procedure: [
      'Read pool state directly from the contract: slot0() for sqrtPriceX96 and tick, liquidity() for active-range L, fee() for the tier.',
      'Read token balances with balanceOf(pool) for both sides to establish inventory.',
      'Confirm token0/token1 ordering from the contract rather than assuming it.',
      'Compute price impact for each standardised size using Uniswap V3 single-active-range math.',
      'Check each standardised size against one-sided inventory; where the size cannot be filled, record NOT EXECUTABLE rather than a percentage.',
      'Record every reading with its evidence ID, observation time and methodology.',
    ],
    primaryKpi: 'Price impact for standardised transaction sizes ($10K / $50K / $100K)',
    secondaryKpis: [
      'Available depth within ±2% of spot',
      'Pool liquidity (both sides) and approximate TVL',
      'Venue fee tier',
      'Bid/ask spread (CEX) — DATA UNAVAILABLE',
      'Volume / depth relationship for the May window — DATA UNAVAILABLE',
    ],
    successCriterion:
      'PRE-REGISTRATION REQUIRED — no numeric improvement threshold has been registered. The comparison ' +
      'method is fixed (same venue, same standardised sizes, identical reserve-reconstruction method, ' +
      'compared against the immediately preceding baseline), but the required magnitude has NOT been agreed ' +
      'and must be registered before any comparison run. It must never be chosen after a result is seen.',
    falsificationCriterion:
      'If a later run shows impact unchanged or higher at the same sizes with the same method, or the improvement disappears once the intervention stops, the intervention is rejected as ineffective for market structure.',
    dataSources: [
      'Polygon RPC — direct contract reads (slot0, liquidity, fee, balanceOf) at block 94,711,694',
      'Uniswap V3 pool 0x092295c92bab5e734c4a60dbc0f0ffdcdfc4e165 (token0 = SUT, token1 = USDT, fee 1.00%)',
    ],
    limitations: [
      'Impact figures are MODEL outputs from single-active-range math, not executed trades. They assume liquidity stays constant across the move and do not account for tick crossing.',
      'Where adjacent ranges hold liquidity, real impact would be lower than modelled; where liquidity is concentrated only in the active range, real impact could be worse.',
      'The $100K size is not executable on this venue at all, so no percentage is reported for it.',
      'This measures ONE DEX pool. CEX depth is not included and no historical CEX order book exists.',
      'May 2026 pool TVL remains DATA UNAVAILABLE — this baseline is a 2026-09-30 reading and is NOT a substitute for the missing May figure.',
      'This is a BASELINE run. No intervention has occurred, so there is nothing to compare against yet and no result can be drawn.',
    ],
    nextAction:
      'A named human reviewer records whether this baseline is accepted as the reference for OPP-01. Until then the experiment stays at REVIEW and no result exists. A comparison run is only meaningful after a disclosed depth intervention.',
    baseline: {
      capturedAt: '2026-09-30T12:51:21Z',
      observationPeriod: 'Instantaneous pool state at Polygon block 94,711,694',
      blockNumber: BLOCK,
      source: 'Polygon RPC — direct contract reads',
      methodology:
        'contract_call for state; derived single-active-range V3 math for impact and depth. token0/token1/fee read from the contract, not assumed.',
      readings: BASELINE_READINGS,
      provenanceNote:
        'Every reading links to an evidence record (EV-100..EV-110). Unmeasurable items link to the existing DATA UNAVAILABLE records (EV-901, EV-902) rather than being filled with a current figure.',
    },
    measurements: [
      {
        runId: 'RUN-001',
        timestamp: '2026-09-30T12:51:21Z',
        blockNumber: BLOCK,
        readings: BASELINE_READINGS,
        evidenceIds: ['EV-100', 'EV-101', 'EV-102', 'EV-103', 'EV-104', 'EV-105', 'EV-106', 'EV-107', 'EV-108', 'EV-109', 'EV-110'],
        reviewer: null,
        note:
          'Baseline measurement run. Captures current market structure only. No intervention has occurred, so this run establishes the reference point and cannot by itself support or reject anything.',
        isBaselineRun: true,
      },
      {
        runId: 'RUN-002',
        timestamp: '2026-09-30T13:18:56Z',
        blockNumber: 94_712_797,
        readings: RUN2_READINGS,
        evidenceIds: ['EV-120', 'EV-121', 'EV-122', 'EV-123', 'EV-124', 'EV-125', 'EV-126', 'EV-127', 'EV-128'],
        reviewer: null,
        note:
          'Second prospective baseline capture, ~27 minutes after RUN-001. Demonstrates repeated capture: spot moved 0.416396 -> 0.409377 and inventory shifted, while the $100K size remained NOT EXECUTABLE. Still a baseline run — no intervention has occurred.',
        isBaselineRun: true,
      },
    ],
    result: null,
    resultRecordedBy: null,
    resultRecordedAt: null,
    resultEvidenceIds: [],
  },

  // ══════════════════════════════════════════════════════════ EXP-002
  {
    id: 'EXP-002',
    opportunityId: 'OPP-02',
    title: 'Reproducible weekly active addresses',
    whyItExists:
      'Activity is thin relative to the holder base, and the only available figure (CertiK: 1,580 active users / 7d) uses an unpublished methodology that cannot be reproduced or audited. A reproducible, on-chain-verifiable definition makes usage independently checkable instead of claimed.',
    mechanismTested:
      'H7 / H8 — whether measurable organic usage exists and changes, separated from distribution receipts. Usage is a chronic condition, so this measures level and trend, not the timing of any past event.',
    stage: 'PLANNED',
    procedure: [
      'Define an active address as one that INITIATES at least one SUT transfer in the observation week (as tx sender), measured from decoded Transfer logs on the SUT contract.',
      'EXCLUDE addresses whose only activity is receiving a fan-out distribution — a receipt is supply reaching a holder, not usage.',
      'EXCLUDE the pool, known router/aggregator contracts, and the dead address.',
      'EXCLUDE transfers where both sides belong to the identified operational cluster (SRC / DST / HOP3 / second funder), since intra-cluster movement is not user activity.',
      'Observation period: ISO weeks, UTC, computed from exact block timestamps — NOT interpolated, because weekly boundaries on high-activity days are unreliable (conflict C15).',
      'Publish the definition before the first reading so the baseline cannot be redefined after the fact.',
    ],
    primaryKpi: 'Weekly active addresses initiating a SUT transfer (own reproducible definition)',
    secondaryKpis: [
      'Weekly active addresses as a percentage of holders',
      'Weekly SUT transfer count (excluding intra-cluster)',
      'Distinct counterparties per active address',
      'Payment-associated transfers — DATA UNAVAILABLE until merchant addresses are published',
    ],
    successCriterion:
      'Pre-registered: reproducibly-measured weekly active addresses grow by the pre-registered amount across the measurement window versus the preceding baseline window, with the growth NOT attributable to distribution receipts.',
    falsificationCriterion:
      'If weekly active addresses are unchanged, or any growth is explained entirely by fan-out receipts once those are excluded, the usage hypothesis is rejected for this window.',
    dataSources: [
      'Polygon RPC — decoded Transfer logs on the SUT contract',
      'Exact block timestamps (required; interpolation is not adequate for weekly boundaries)',
      'Holder snapshots from Blockscout',
    ],
    limitations: [
      'Temporal control only — no external comparator exists, so a general market effect cannot be separated from any intervention.',
      'CertiK’s 1,580 figure is NOT a valid baseline for this KPI: its methodology is unpublished and not reproducible, so the two numbers are not comparable.',
      'Exchange-custodied users are invisible on-chain; activity inside a CEX never appears.',
      'Merchant addresses are undisclosed, so payment-side usage cannot be separated from ordinary transfers.',
      'Exact block timestamps must be fetched first — the interpolated timestamps used elsewhere are not adequate for weekly bucketing.',
    ],
    nextAction:
      'Publish the active-address definition above, then fetch exact block timestamps for the baseline window and compute the first reading. No baseline has been captured yet, so no reading exists.',
    baseline: null,
    measurements: [],
    result: null,
    resultRecordedBy: null,
    resultRecordedAt: null,
    resultEvidenceIds: [],
  },
]

export const RUN_BY_ID = new Map(EXPERIMENT_RUNS.map((e) => [e.id, e]))
