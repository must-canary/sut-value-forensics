/**
 * Case #001 event timeline + registered data conflicts + wallets.
 * Authority: research-baseline.md §8, §10; may-2026-investigation-plan.md §2.3.
 */
import type { DataConflict, TimelineEvent, Wallet } from '../core/types'
import { makeWallet } from '../core/rules'

export const TIMELINE: TimelineEvent[] = [
  {
    id: 'T-001', time: '2026-02-06', type: 'company',
    title: 'Project notice re CoinMarketCap circulating-supply correction',
    detail: 'Project asked CMC to correct circulating supply. NOTE: conflicts with the separately reported 46.6M self-report (conflict C3).',
    classification: 'CLAIM', identityStatus: 'CONTRACT_VERIFIED',
    evidenceIds: [], sourceIds: ['supertrust-notice'],
  },
  {
    id: 'T-002', time: '2026-02-10', type: 'data_provider',
    title: 'CMC supply basis 2.02M → 188.4M; rank #2,049 → #299',
    detail: 'Same price (~$0.60). An accounting change, NOT adoption growth. Must never be presented as organic.',
    classification: 'VERIFIED', identityStatus: 'TICKER_ONLY',
    evidenceIds: [], sourceIds: ['coinmarketcap'],
  },
  {
    id: 'T-003', time: '2026-03-19', type: 'exchange',
    title: 'Gate TR announces SUPERTRUST SUT/TRY delisting',
    detail: 'Identity-verified SuperTrust venue event.',
    classification: 'VERIFIED', identityStatus: 'PAIR_VERIFIED',
    evidenceIds: [], sourceIds: ['gate-tr'],
  },
  {
    id: 'T-004', time: '2026-03-30', type: 'company',
    title: '"Short-Term SUT Value Surge Strategy" published',
    detail: '60% lock of users\' remaining credit balance, lower weekly settlement, expected reduction in circulating quantity. An announcement — NOT verified as executed on-chain.',
    classification: 'CLAIM', identityStatus: 'CONTRACT_VERIFIED',
    evidenceIds: [], sourceIds: ['supertrust-notice'],
  },
  {
    id: 'T-005', time: '2026-04-01T03:00:00Z', type: 'exchange',
    title: 'Gate TR services cease',
    detail: '~6 weeks before the crash. Price RECOVERED into mid-May afterwards (0.5537 Apr 30 → 0.6920 May 15), so this is not the proximate trigger.',
    classification: 'VERIFIED', identityStatus: 'PAIR_VERIFIED',
    evidenceIds: [], sourceIds: ['gate-tr'],
  },
  {
    id: 'T-006', time: '2026-04-27', type: 'price',
    title: 'Precursor stress: −32% intraday excursion, recovered same day',
    detail: 'DEX open 0.6199, low 0.4197. The May 17 pattern is an amplified version of behaviour already present in late April — evidence of a chronically fragile book.',
    classification: 'VERIFIED', identityStatus: 'CONTRACT_VERIFIED',
    evidenceIds: [], sourceIds: ['geckoterminal'],
  },
  {
    id: 'T-007', time: '2026-05-01', type: 'onchain_transfer',
    title: 'Wallet-cluster pipeline running (May 1–17)',
    detail: '16,580,000 SUT SRC → DST, near-daily. Roles UNKNOWN. Terminates in a retail fan-out (34,349 transfers to 16,607 addresses).',
    classification: 'VERIFIED', identityStatus: 'CONTRACT_VERIFIED',
    evidenceIds: ['EV-020', 'EV-021'], sourceIds: ['polygon-rpc'],
  },
  {
    id: 'T-008', time: '2026-05-15', type: 'price',
    title: 'Unexplained +44% intraday spike on ~6× volume',
    detail: 'DEX high 0.9012 vs open 0.6240, closing 0.6920. Also the cluster\'s largest day (3.58M in / 2.00M out). Cause not established.',
    classification: 'UNRESOLVED', identityStatus: 'CONTRACT_VERIFIED',
    evidenceIds: [], sourceIds: ['geckoterminal'],
  },
  {
    id: 'T-009', time: '2026-05-16', type: 'exchange',
    title: '⚠ BitMart "withdrawal closed" date — IDENTITY NOT VERIFIED',
    detail: 'Sits exactly at crash onset and exactly on the day the pipeline throttled. research-v2 established BitMart SUT was Sanity United. Notice unreachable (Cloudflare 403). MUST NOT be used as a SuperTrust event until contract-level evidence resolves it — it is either the catalyst or a false root cause at precisely the right date.',
    classification: 'DATA_UNAVAILABLE', identityStatus: 'IDENTITY_NOT_VERIFIED',
    evidenceIds: ['EV-900'], sourceIds: ['bitmart'],
  },
  {
    id: 'T-010', time: '2026-05-16', type: 'onchain_transfer',
    title: 'Distribution throttles ~70%',
    detail: 'HOP3 fan-out falls from 1,967 transfers (May 15) to 651. DST forwarding stops entirely. Never recovers (52–175/day by May 22–25). Direction of causation NOT determined.',
    classification: 'VERIFIED', identityStatus: 'CONTRACT_VERIFIED',
    evidenceIds: ['EV-021'], sourceIds: ['polygon-rpc'],
  },
  {
    id: 'T-011', time: '2026-05-17', type: 'price',
    title: 'CRASH ONSET — −62.7% intraday',
    detail: 'DEX open 0.6737 → low 0.2511 → close 0.4756. Onset is May 17 INTRADAY, not May 18. Daily-close series conceal this.',
    classification: 'VERIFIED', identityStatus: 'CONTRACT_VERIFIED',
    evidenceIds: ['EV-001', 'EV-010'], sourceIds: ['geckoterminal', 'polygon-rpc'],
  },
  {
    id: 'T-012', time: '2026-05-17', type: 'volume',
    title: 'Swap activity ~18×; net sell imbalance only ~$26,981',
    detail: 'Swaps 246 → 4,341. Buy $378,676 vs sell $405,657. A ~$27K net imbalance accompanied a −62.7% move: depth exhaustion, not net imbalance.',
    classification: 'VERIFIED', identityStatus: 'CONTRACT_VERIFIED',
    evidenceIds: ['EV-010'], sourceIds: ['polygon-rpc'],
  },
  {
    id: 'T-013', time: '2026-05-17', type: 'liquidity',
    title: 'LP churn ~65× but net liquidity POSITIVE (+$15,911)',
    detail: '643 mints / 679 burns vs 26/30 the day before. Concentrated-liquidity re-ranging, NOT withdrawal. LPs did not flee.',
    classification: 'VERIFIED', identityStatus: 'CONTRACT_VERIFIED',
    evidenceIds: ['EV-012'], sourceIds: ['polygon-rpc'],
  },
  {
    id: 'T-014', time: '2026-05-18', type: 'price',
    title: 'Continuation — close −72.5%, intraday low $0.1145',
    detail: 'Net sell imbalance only $3,160. Swap count 4,392.',
    classification: 'VERIFIED', identityStatus: 'CONTRACT_VERIFIED',
    evidenceIds: ['EV-001'], sourceIds: ['geckoterminal', 'polygon-rpc'],
  },
  {
    id: 'T-015', time: '2026-05-19', type: 'price',
    title: 'Intraday low $0.1022 — below the cited ATL range',
    detail: 'Aggregators cite $0.113–$0.116 ATL. DEX pool print is lower (conflict C5: pool print vs aggregator VWAP).',
    classification: 'VERIFIED', identityStatus: 'CONTRACT_VERIFIED',
    evidenceIds: [], sourceIds: ['geckoterminal'],
  },
  {
    id: 'T-016', time: '2026-05-19', type: 'onchain_transfer',
    title: 'Single 1,000,000 SUT cluster outflow',
    detail: 'The pipeline\'s only movement after May 15, one day after the low.',
    classification: 'VERIFIED', identityStatus: 'CONTRACT_VERIFIED',
    evidenceIds: [], sourceIds: ['polygon-rpc'],
  },
  {
    id: 'T-017', time: '2026-07-20', type: 'supply',
    title: 'Contract ownership renounced',
    detail: 'POST-EVENT. During May 2026 the contract was still owned and still pausable — the "renounced" reassurance does not apply to the crash window.',
    classification: 'VERIFIED', identityStatus: 'CONTRACT_VERIFIED',
    evidenceIds: [], sourceIds: ['polygon-rpc'],
  },
  // legal / reputational context (all outside the event window)
  {
    id: 'T-100', time: '2025-04-14', type: 'legal',
    title: 'Shinhan Bank froze SuperTrust deposits',
    detail: 'Treated as an unregistered virtual-asset business.',
    classification: 'VERIFIED', identityStatus: 'TICKER_ONLY',
    evidenceIds: [], sourceIds: ['research-v2'],
  },
  {
    id: 'T-101', time: '2025-04-30', type: 'legal',
    title: 'Seoul court rejected request to lift the freeze; company appealed',
    detail: 'A proceeding, not an outcome.',
    classification: 'LEGAL_PROCEEDING', identityStatus: 'TICKER_ONLY',
    evidenceIds: [], sourceIds: ['research-v2'],
  },
  {
    id: 'T-102', time: '2025-08-21', type: 'legal',
    title: 'GOPAX terminated trading support; SuperTrust sought an injunction',
    detail: 'Stated reasons (possible legal violations; non-disclosure) are SEARCH SNIPPET ONLY — never read in full.',
    classification: 'EXCHANGE_STATED_CONCERN', identityStatus: 'PAIR_VERIFIED',
    evidenceIds: [], sourceIds: ['research-v2'],
  },
  {
    id: 'T-103', time: '2025-11-12', type: 'legal',
    title: 'Defamation case vs "MSQUARE victims\' chat room" operator sent to prosecutors',
    detail: 'The accused disputes the allegations. A proceeding, not an outcome.',
    classification: 'LEGAL_PROCEEDING', identityStatus: 'TICKER_ONLY',
    evidenceIds: [], sourceIds: ['research-v2'],
  },
  {
    id: 'T-104', time: '2025-01-01', timeApproximate: true, type: 'legal',
    title: 'REPORTED criminal complaint (fraud / illegal fund-raising) — outcome unknown',
    detail: 'Filed against MSQUARE GLOBAL and affiliates incl. SuperTrust. SEARCH SNIPPET ONLY. Unproven. No competent authority has established any finding.',
    classification: 'REPORTED', identityStatus: 'TICKER_ONLY',
    evidenceIds: [], sourceIds: ['research-v2'],
  },
  {
    id: 'T-105', time: '2026-08-08', type: 'company',
    title: 'SuperTrust statement: independent from MSQUARE GLOBAL',
    detail: 'Company response. News reports describe it as an MSQUARE affiliate; DST holds 14.7M MSQ. Evidence, not proof, either way.',
    classification: 'COMPANY_RESPONSE', identityStatus: 'CONTRACT_VERIFIED',
    evidenceIds: [], sourceIds: ['supertrust-notice'],
  },
  {
    id: 'T-106', time: '2026-05-17', type: 'legal',
    title: 'No information/legal/regulatory event identified in the window',
    detail: 'Every catalogued legal item is dated 2025 or 2026-08. The 2026-05-15..20 window was NOT systematically searched, and Korean-language sources are blocked to automation. Absence of evidence is not evidence of absence.',
    classification: 'DATA_UNAVAILABLE', identityStatus: 'CONTRACT_VERIFIED',
    evidenceIds: ['EV-905'], sourceIds: ['supertrust-notice'],
  },
]

// -------------------------------------------------------------- conflicts

export const CONFLICTS: DataConflict[] = [
  {
    id: 'C1', metric: 'holder_count', observationTime: '2026-09-30',
    observations: [
      { sourceId: 'certik', value: 54052, identityStatus: 'CONTRACT_VERIFIED' },
      { sourceId: 'blockscout', value: 56241, identityStatus: 'CONTRACT_VERIFIED' },
    ],
    methodologicalReason: 'Different zero-balance/dust thresholds; different snapshot times. Neither is wrong.',
    resolution: 'UNRESOLVED', canonicalForAnalysis: null, displayRule: 'Report both.',
  },
  {
    id: 'C2', metric: 'certik_score', observationTime: '2026-09-30',
    observations: [
      { sourceId: 'certik', value: 74.23, identityStatus: 'CONTRACT_VERIFIED' },
      { sourceId: 'coinmarketcap', value: 3.7, identityStatus: 'TICKER_ONLY' },
    ],
    methodologicalReason:
      'CMC\'s "3.7" is a DIFFERENT FIELD on a different scale and must never be used as CertiK\'s score. CertiK is dynamic (74.06 on 09-29).',
    resolution: 'UNRESOLVED', canonicalForAnalysis: null,
    displayRule: 'Show CertiK with retrieved_at. Never substitute CMC\'s 3.7.',
  },
  {
    id: 'C3', metric: 'circulating_supply', observationTime: '2026-02-06',
    observations: [
      { sourceId: 'coinmarketcap', value: 188403732, identityStatus: 'TICKER_ONLY' },
      { sourceId: 'supertrust-notice', value: 46588062, identityStatus: 'CONTRACT_VERIFIED' },
      { sourceId: 'research-v2', value: 2024492, identityStatus: 'TICKER_ONLY' },
    ],
    methodologicalReason:
      'Possibly different dates or definitions (distributed vs circulating vs unlocked). Unresolved — requires re-reading the primary notice.',
    resolution: 'UNRESOLVED', canonicalForAnalysis: null, displayRule: 'Show all three.',
  },
  {
    id: 'C4', metric: 'daily_volume_usd', observationTime: '2026-05-17',
    observations: [
      { sourceId: 'coingecko', value: 420380, identityStatus: 'TICKER_ONLY' },
      { sourceId: 'coinranking', value: 1780000, identityStatus: 'TICKER_ONLY' },
      { sourceId: 'geckoterminal', value: 397989, identityStatus: 'CONTRACT_VERIFIED' },
    ],
    methodologicalReason:
      'Different venue coverage, DEX inclusion rules and wash-filtering. CoinGecko\'s whole-market total barely exceeds the single main DEX pool.',
    resolution: 'UNRESOLVED', canonicalForAnalysis: null,
    displayRule: 'Show all three separately. Never blend. Never average.',
  },
  {
    id: 'C5', metric: 'all_time_low', observationTime: '2026-05-19',
    observations: [
      { sourceId: 'coinmarketcap', value: 0.113, identityStatus: 'TICKER_ONLY' },
      { sourceId: 'geckoterminal', value: 0.1022, identityStatus: 'CONTRACT_VERIFIED' },
    ],
    methodologicalReason: 'Pool print vs aggregator VWAP/filtered feed.',
    resolution: 'UNRESOLVED', canonicalForAnalysis: null, displayRule: 'Report both with method.',
  },
  {
    id: 'C6', metric: 'holder_concentration', observationTime: '2026-09-30',
    observations: [
      { sourceId: 'certik', value: '54.25% (Major Holding Ratio)', identityStatus: 'CONTRACT_VERIFIED' },
      { sourceId: 'polygon-rpc', value: '~71% (top-10 by balance)', identityStatus: 'CONTRACT_VERIFIED' },
    ],
    methodologicalReason:
      'DIFFERENT METRICS. CertiK\'s definition is unpublished; ours is top-10-by-balance including the dead address. Not the same quantity.',
    resolution: 'UNRESOLVED', canonicalForAnalysis: null,
    displayRule: 'Keep both with explicit method labels. Never present as one metric.',
  },
  {
    id: 'C14', metric: 'may17_gross_flow_vs_reported_volume', observationTime: '2026-05-17',
    observations: [
      { sourceId: 'polygon-rpc', value: 1364855, identityStatus: 'CONTRACT_VERIFIED' },
      { sourceId: 'geckoterminal', value: 397989, identityStatus: 'CONTRACT_VERIFIED' },
    ],
    methodologicalReason:
      'The gap was LP Mint/Burn churn, not aggregator undercounting: swap buy $378,676 + LP mint $986,179 = $1,364,855 exactly (difference $0); outflow reconciles to 0.24%.',
    resolution: 'RESOLVED',
    resolutionNote: 'Resolved 2026-09-30 by procedure C1. Aggregators were not wrong — the gross-flow proxy was.',
    canonicalForAnalysis: 'onchain_swap_decoded',
    displayRule: 'Use decoded Swap volume. Gross pool flow is barred from volume fields.',
  },
  {
    id: 'C15', metric: 'may17_vs_may18_volume_split', observationTime: '2026-05-17/2026-05-18',
    observations: [
      { sourceId: 'polygon-rpc', value: 'May 17 $784,333 / May 18 $362,976', identityStatus: 'CONTRACT_VERIFIED' },
      { sourceId: 'geckoterminal', value: 'May 17 $397,989 / May 18 $712,616', identityStatus: 'CONTRACT_VERIFIED' },
    ],
    methodologicalReason:
      'Day-boundary misallocation from block_ts_interpolated. The two series diverge in OPPOSITE directions while the two-day total agrees within 3.3% ($1,147,309 vs $1,110,605).',
    resolution: 'UNRESOLVED', canonicalForAnalysis: null,
    displayRule: 'Use the combined May 17–18 figure. Single-day splits are unreliable until exact block timestamps are fetched.',
  },
]

// ---------------------------------------------------------------- wallets

export const WALLETS: Wallet[] = [
  makeWallet('0xaaa4d5dd26eb1a2afe5fd5fb529fc24cee89cc2c', {
    isContract: false, note: 'SOURCE of the traced May chain. Top-10 holder #4 (13.1M, 5.51%). Unlabelled EOA.',
  }),
  makeWallet('0x7cc2f8914b4d77b68355757286f146373f4bf7ad', {
    isContract: false, note: 'Conduit/pass-through. IN 19,007,099 / OUT 16,523,928 SUT in May; holds ~18,604 SUT today. Also holds 14,735,470 MSQ (evidence bearing on affiliation, NOT proof).',
  }),
  makeWallet('0xe6e7ec8dfbacc0dbfc8e838ff2a49a252ab4ff85', {
    isContract: false, note: 'Fan-out distribution address. 15.2M SUT in (31 tx) → 15.33M out across 34,349 transfers to 16,607 addresses.',
  }),
  makeWallet('0x0d0707963952f2fba59dd06f2b425ace40b492fe', {
    isContract: false, note: 'Second upstream funder: 2,303,367 SUT to DST in the window.',
  }),
  makeWallet('0x092295c92bab5e734c4a60dbc0f0ffdcdfc4e165', {
    role: 'POOL', roleEvidenceId: 'EV-013', isContract: true, label: 'Uniswap V3 SUT/USDT 1%',
    note: 'token0/token1/fee read from the contract.',
  }),
  makeWallet('0x7150ea07d00d8e5a46bcc809f1c9fdf5cb5f8e81', {
    role: 'ROUTER_OR_AGGREGATOR', roleEvidenceId: 'EV-023', isContract: true, label: 'PolygonSettler',
    note: 'Named contract; bundles many end users. Per-address volume must not be read as one seller.',
  }),
]

export const WALLET_BY_ADDRESS = new Map(WALLETS.map((w) => [w.address, w]))
