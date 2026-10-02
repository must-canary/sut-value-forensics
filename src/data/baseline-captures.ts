/**
 * Phase 5 — baseline capture records, coverage windows and review log.
 *
 * Every record here comes from a real execution. Nothing is backfilled.
 * EXP-001 RUN-001 / RUN-002 are live pool reads; EXP-002 WEEK-2026-W39 is a
 * real weekly measurement built on EXACT block timestamps.
 */
import type { BaselineCaptureRecord, ExperimentHistoryEntry, ReviewRecord } from '../core/baseline-ops'
import { buildCoverage } from '../core/baseline-ops'

const RPC = 'Polygon RPC — direct contract reads'
const M_STATE = 'contract_call (slot0/liquidity/fee/balanceOf) at a stated block'
const M_MODEL = 'derived: Uniswap V3 single-active-range math'
const MODEL_LIMIT = 'MODEL output, not an executed trade. Assumes liquidity constant across the move (no tick crossing).'

const cap = (
  runId: string, kpi: string, dimension: string,
  value: number | string | null, unit: string,
  observationTime: string, evidenceId: string | null,
  methodology: string, limitations: string[],
  dataStatus: BaselineCaptureRecord['dataStatus'], modelled: boolean,
  experimentId = 'EXP-001',
): BaselineCaptureRecord => ({
  experimentId, runId, kpi, dimension, value, unit,
  observationTime, retrievedAt: '2026-09-30', source: RPC, evidenceId,
  methodology, limitations, dataStatus, reviewerStatus: 'PENDING', modelled,
  timestampPrecision: 'EXACT_BLOCK',
})

// ───────────────────────────────── EXP-001 RUN-001 (block 94,711,694)
const T1 = '2026-09-30T12:51:21Z'
const RUN1: BaselineCaptureRecord[] = [
  cap('RUN-001', 'Spot price', 'spot', 0.416396, 'USD per SUT', T1, 'EV-100', M_STATE, ['Instantaneous state at block 94,711,694.'], 'MEASURED', false),
  cap('RUN-001', 'SUT inventory', 'reserve', 96808.58, 'SUT', T1, 'EV-102', M_STATE, ['Approximately $40,311 at spot.'], 'MEASURED', false),
  cap('RUN-001', 'USDT inventory', 'reserve', 52534.52, 'USDT', T1, 'EV-103', M_STATE, ['Approximate pool TVL $92,845.'], 'MEASURED', false),
  cap('RUN-001', 'Active liquidity', 'L (raw)', '300309217717383894', 'L', T1, 'EV-101', M_STATE, ['Active-range liquidity only; tick -285086.'], 'MEASURED', false),
  cap('RUN-001', 'Fee tier', 'venue cost', 1.0, 'percent', T1, 'EV-110', M_STATE, ['A venue cost, NOT a bid/ask spread. Never substituted for CEX spread.'], 'MEASURED', false),
  cap('RUN-001', '±2% depth', 'both sides', '+$1,928 / -$1,967', 'USD', T1, 'EV-109', M_MODEL, [MODEL_LIMIT, 'DEX pool depth, not a CEX order book.'], 'MEASURED', true),
  cap('RUN-001', 'Price impact', '$10,000 buy', 10.59, 'percent', T1, 'EV-104', M_MODEL, [MODEL_LIMIT, 'Fillable: needs 22,837 of 96,809 SUT.'], 'MEASURED', true),
  cap('RUN-001', 'Price impact', '$10,000 sell', -9.57, 'percent', T1, 'EV-105', M_MODEL, [MODEL_LIMIT, 'Fillable: needs $9,509 of $52,535 USDT.'], 'MEASURED', true),
  cap('RUN-001', 'Price impact', '$50,000 buy', 58.26, 'percent', T1, 'EV-106', M_MODEL, [MODEL_LIMIT, 'Barely fillable — consumes 98.6% of SUT inventory.'], 'MEASURED', true),
  cap('RUN-001', 'Price impact', '$50,000 sell', -36.81, 'percent', T1, 'EV-107', M_MODEL, [MODEL_LIMIT, 'Needs $39,745 of $52,535 USDT (75.7%).'], 'MEASURED', true),
  cap('RUN-001', 'Price impact', '$100,000 both sides', null, 'percent', T1, 'EV-108', M_MODEL,
    [MODEL_LIMIT, 'NOT EXECUTABLE: buy needs 158,411 SUT (96,809 available); sell needs $65,962 ($52,535 available). No percentage is reported because it would not be an executable quote.'],
    'NOT_EXECUTABLE', true),
]

// ───────────────────────────────── EXP-001 RUN-002 (block 94,712,797)
const T2 = '2026-09-30T13:18:56Z'
const RUN2: BaselineCaptureRecord[] = [
  cap('RUN-002', 'Spot price', 'spot', 0.409377, 'USD per SUT', T2, 'EV-120', M_STATE, ['Instantaneous state at block 94,712,797 (~27 min after RUN-001).'], 'MEASURED', false),
  cap('RUN-002', 'SUT inventory', 'reserve', 100831.12, 'SUT', T2, 'EV-121', M_STATE, ['Inventory shifted between captures.'], 'MEASURED', false),
  cap('RUN-002', 'USDT inventory', 'reserve', 50898.18, 'USDT', T2, 'EV-122', M_STATE, ['Approximate pool TVL $92,176.'], 'MEASURED', false),
  cap('RUN-002', 'Active liquidity', 'L (raw)', '300309217717383894', 'L', T2, 'EV-101', M_STATE, ['Unchanged between captures; tick moved to -285256.'], 'MEASURED', false),
  cap('RUN-002', 'Fee tier', 'venue cost', 1.0, 'percent', T2, 'EV-110', M_STATE, ['A venue cost, NOT a bid/ask spread.'], 'MEASURED', false),
  cap('RUN-002', '±2% depth', 'both sides', '+$1,912 / -$1,951', 'USD', T2, 'EV-128', M_MODEL, [MODEL_LIMIT, 'DEX pool depth, not a CEX order book.'], 'MEASURED', true),
  cap('RUN-002', 'Price impact', '$10,000 buy', 10.68, 'percent', T2, 'EV-123', M_MODEL, [MODEL_LIMIT, 'Fillable: needs 23,219 of 100,831 SUT.'], 'MEASURED', true),
  cap('RUN-002', 'Price impact', '$10,000 sell', -9.65, 'percent', T2, 'EV-124', M_MODEL, [MODEL_LIMIT, 'Fillable: needs $9,505 of $50,898 USDT.'], 'MEASURED', true),
  cap('RUN-002', 'Price impact', '$50,000 buy', 58.82, 'percent', T2, 'EV-125', M_MODEL, [MODEL_LIMIT, 'Consumes 96,917 of 100,831 SUT (96.1%).'], 'MEASURED', true),
  cap('RUN-002', 'Price impact', '$50,000 sell', -37.03, 'percent', T2, 'EV-126', M_MODEL, [MODEL_LIMIT, 'Needs $39,676 of $50,898 USDT (78.0%).'], 'MEASURED', true),
  cap('RUN-002', 'Price impact', '$100,000 both sides', null, 'percent', T2, 'EV-127', M_MODEL,
    [MODEL_LIMIT, 'NOT EXECUTABLE: buy needs 160,660 SUT (100,831 available); sell needs $65,770 ($50,898 available). Still unfillable at this capture.'],
    'NOT_EXECUTABLE', true),
  cap('RUN-002', 'Liquidity concentration', 'beneficial LP owners', null, 'percent', T2, 'EV-131', 'contract_call probe',
    ['DATA UNAVAILABLE — probed 2026-09-30. All 101 Mint events in the last ~200k blocks carry owner = the Uniswap V3 NonfungiblePositionManager (0xc36442b4…fe88), so the pool-level owner is not a beneficial owner. Resolving concentration requires enumerating NFPM position NFTs. No figure is reported.'],
    'DATA_UNAVAILABLE', false),
  cap('RUN-002', 'CEX bid/ask spread', 'CEX', null, 'percent', T2, null, 'not obtainable',
    ['DATA UNAVAILABLE — no CEX order-book feed is retained for this pair. The 1.00% DEX fee tier is NOT substituted for a spread.'],
    'DATA_UNAVAILABLE', false),
]

// ───────────────────────────────── EXP-002 WEEK-2026-W39 (exact timestamps)
export const EXP002_WEEK = {
  weekId: '2026-W39',
  startUtc: '2026-09-21T00:00:00Z',
  endUtc: '2026-09-28T00:00:00Z',
  blockStart: 94_162_485,
  blockEnd: 94_565_640,
  actualBoundaryStart: '2026-09-21T00:00:01Z',
  actualBoundaryEnd: '2026-09-28T00:00:00Z',
  boundaryDriftSeconds: { start: 1, end: 0 },
  rawTransfers: 6330,
  intraClusterExcluded: 0,
  excludedSenderTransfers: 1899,
  countedTransfers: 4431,
  activeAddresses: 1423,
  exclusions: [
    'Pool address 0x092295c9…e165',
    'Router / aggregator contracts (PolygonSettler 0x7150ea07…8e81 and three further unnamed contracts identified as top pool senders)',
    'Dead address 0x…dEaD and the zero address',
    'Operational cluster: SRC 0xaaa4d5…cc2c, DST 0x7cc2f8…f7ad, HOP3 0xe6e7ec8d…ff85, second funder 0x0d070796…92fe',
    'Intra-cluster transfers (both sides in the cluster) — 0 occurred this week',
    'Fan-out receipts: inherently excluded because only transfer INITIATORS are counted, never recipients',
  ],
} as const

const EXP002_CAPTURES: BaselineCaptureRecord[] = [
  {
    experimentId: 'EXP-002', runId: 'WEEK-2026-W39',
    kpi: 'Weekly active addresses', dimension: 'ISO week 2026-W39 (UTC)',
    value: 1423, unit: 'addresses',
    observationTime: '2026-09-21T00:00:00Z/2026-09-28T00:00:00Z',
    retrievedAt: '2026-09-30', source: RPC, evidenceId: 'EV-130',
    methodology:
      'Distinct transfer INITIATORS from decoded Transfer logs on the SUT contract. Week boundaries resolved by binary search on EXACT block timestamps (eth_getBlockByNumber) — never interpolated. Boundary drift: +1s start, 0s end.',
    limitations: [
      'Not comparable with CertiK\'s 1,580 active-users figure — that methodology is unpublished and not reproducible.',
      'Exchange-custodied activity is invisible on-chain.',
      'Merchant addresses are undisclosed, so payment-side usage cannot be separated.',
      'Router exclusion uses a documented list; an unlisted aggregator would be counted as an initiator.',
    ],
    dataStatus: 'MEASURED', reviewerStatus: 'PENDING', modelled: false,
    timestampPrecision: 'EXACT_BLOCK',
  },
  {
    experimentId: 'EXP-002', runId: 'WEEK-2026-W39',
    kpi: 'Payment-associated transfers', dimension: 'ISO week 2026-W39 (UTC)',
    value: null, unit: 'count',
    observationTime: '2026-09-21T00:00:00Z/2026-09-28T00:00:00Z',
    retrievedAt: '2026-09-30', source: 'company disclosure (not available)', evidenceId: null,
    methodology: 'requires a published merchant address registry',
    limitations: ['DATA UNAVAILABLE — merchant addresses are undisclosed (OPP-03 is BLOCKED).'],
    dataStatus: 'DATA_UNAVAILABLE', reviewerStatus: 'PENDING', modelled: false,
    timestampPrecision: 'EXACT_BLOCK',
  },
]


// ───────────────────────────────── EXP-001 RUN-003 (block 94,722,565) — daily capture
const T3 = '2026-09-30T17:23:08Z'
const RUN3: BaselineCaptureRecord[] = [
  cap('RUN-003', 'Spot price', 'spot', 0.412615, 'USD per SUT', T3, 'EV-140', M_STATE, ['Daily capture at block 94,722,565.'], 'MEASURED', false),
  cap('RUN-003', 'SUT inventory', 'reserve', 99064.97, 'SUT', T3, 'EV-141', M_STATE, ['balanceOf(pool).'], 'MEASURED', false),
  cap('RUN-003', 'USDT inventory', 'reserve', 51696.38, 'USDT', T3, 'EV-142', M_STATE, ['Approximate pool TVL $92,572.'], 'MEASURED', false),
  cap('RUN-003', 'Active liquidity', 'L (raw)', '300309217717383894', 'L', T3, 'EV-101', M_STATE, ['Unchanged across all three captures; tick -285177.'], 'MEASURED', false),
  cap('RUN-003', 'Fee tier', 'venue cost', 1.0, 'percent', T3, 'EV-110', M_STATE, ['A venue cost, NOT a bid/ask spread.'], 'MEASURED', false),
  cap('RUN-003', '±2% depth', 'both sides', '+$1,919 / -$1,958', 'USD', T3, 'EV-148', M_MODEL, [MODEL_LIMIT, 'DEX pool depth, not a CEX order book.'], 'MEASURED', true),
  cap('RUN-003', 'Price impact', '$10,000 buy', 10.64, 'percent', T3, 'EV-143', M_MODEL, [MODEL_LIMIT, 'Fillable: needs 23,041 of 99,065 SUT.'], 'MEASURED', true),
  cap('RUN-003', 'Price impact', '$10,000 sell', -9.61, 'percent', T3, 'EV-144', M_MODEL, [MODEL_LIMIT, 'Fillable: needs $9,507 of $51,696 USDT.'], 'MEASURED', true),
  cap('RUN-003', 'Price impact', '$50,000 buy', 58.56, 'percent', T3, 'EV-145', M_MODEL, [MODEL_LIMIT, 'Consumes 96,235 of 99,065 SUT (97.1%).'], 'MEASURED', true),
  cap('RUN-003', 'Price impact', '$50,000 sell', -36.93, 'percent', T3, 'EV-146', M_MODEL, [MODEL_LIMIT, 'Needs $39,708 of $51,696 USDT (76.8%).'], 'MEASURED', true),
  cap('RUN-003', 'Price impact', '$100,000 both sides', null, 'percent', T3, 'EV-147', M_MODEL,
    [MODEL_LIMIT, 'NOT EXECUTABLE: buy needs 159,614 SUT (99,065 available); sell needs $65,859 ($51,696 available).'],
    'NOT_EXECUTABLE', true),
  cap('RUN-003', 'CEX bid/ask spread', 'CEX', null, 'percent', T3, null, 'not obtainable',
    ['DATA UNAVAILABLE — no CEX order-book feed is retained for this pair. The DEX fee tier is NOT substituted.'],
    'DATA_UNAVAILABLE', false),
]

export const BASELINE_CAPTURES: BaselineCaptureRecord[] = [...RUN1, ...RUN2, ...RUN3, ...EXP002_CAPTURES]

/** 30-day prospective window for the EXP-001 primary series. Only real days appear. */
export const SPOT_COVERAGE = buildCoverage(
  'EXP-001', 'Spot price', 'USD per SUT', '2026-09-30', 30,
  // latest capture of the day; earlier same-day runs are kept in BASELINE_CAPTURES
  [{ date: '2026-09-30', value: 0.412615, evidenceId: 'EV-140' }],
)

export const IMPACT_10K_COVERAGE = buildCoverage(
  'EXP-001', 'Price impact — $10,000 sell', 'percent', '2026-09-30', 30,
  [{ date: '2026-09-30', value: -9.61, evidenceId: 'EV-144' }],
)

/** No review has been recorded. Reviewer identity is separate from the creator credit. */
export const REVIEWS: ReviewRecord[] = []


/**
 * Experiment history — immutable entries so future runs are compared on
 * identical terms. Two entries may only be compared when the method
 * fingerprint matches.
 */
export const METHOD_FINGERPRINT_EXP001 =
  'v3-single-active-range|sizes:10k,50k,100k|venue:0x092295c9…e165|inventory-feasibility-check'

export const EXPERIMENT_HISTORY: ExperimentHistoryEntry[] = [
  {
    experimentId: 'EXP-001', runId: 'RUN-001',
    capturedAt: '2026-09-30T12:51:21Z', blockNumber: 94_711_694,
    stageAtCapture: 'REVIEW', methodFingerprint: METHOD_FINGERPRINT_EXP001,
    primaryKpiSummary: '$10K +10.59%/-9.57% · $50K +58.26%/-36.81% · $100K NOT EXECUTABLE',
    notes: 'First baseline capture. No intervention. Spot $0.416396.',
  },
  {
    experimentId: 'EXP-001', runId: 'RUN-002',
    capturedAt: '2026-09-30T13:18:56Z', blockNumber: 94_712_797,
    stageAtCapture: 'REVIEW', methodFingerprint: METHOD_FINGERPRINT_EXP001,
    primaryKpiSummary: '$10K +10.68%/-9.65% · $50K +58.82%/-37.03% · $100K NOT EXECUTABLE',
    notes: 'Repeat capture ~27 min later. No intervention. Spot $0.409377.',
  },
  {
    experimentId: 'EXP-001', runId: 'RUN-003',
    capturedAt: '2026-09-30T17:23:08Z', blockNumber: 94_722_565,
    stageAtCapture: 'BASELINE_COLLECTION', methodFingerprint: METHOD_FINGERPRINT_EXP001,
    primaryKpiSummary: '$10K +10.64%/-9.61% · $50K +58.56%/-36.93% · $100K NOT EXECUTABLE',
    notes: 'Daily capture. No intervention. Spot $0.412615.',
  },
  {
    experimentId: 'EXP-002', runId: 'WEEK-2026-W39',
    capturedAt: '2026-09-30', blockNumber: 94_565_640,
    stageAtCapture: 'PLANNED',
    methodFingerprint: 'initiator-count|exact-block-boundaries|exclusions:pool,routers,dead,cluster,intra',
    primaryKpiSummary: '1,423 weekly active addresses (ISO 2026-W39)',
    notes: 'Exact-timestamp weekly measurement. Not comparable with CertiK 1,580.',
  },
]
