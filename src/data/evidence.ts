/**
 * Evidence records for Case #001. Every record carries full provenance.
 * Authority: research-baseline.md, research-freeze.md (frozen 2026-09-30).
 */
import type { Observation } from '../core/types'
import { SUT_CHAIN, SUT_CONTRACT } from '../core/rules'

const sut = { symbol: 'SUT', contract: SUT_CONTRACT, chain: SUT_CHAIN }

function ev(o: Omit<Observation, 'token' | 'identityStatus'> & Partial<Pick<Observation, 'token' | 'identityStatus'>>): Observation {
  return {
    token: sut,
    identityStatus: 'CONTRACT_VERIFIED',
    ...o,
  } as Observation
}

export const EVIDENCE: Observation[] = [
  // ---------------------------------------------------------------- H1
  ev({
    id: 'EV-001', sourceId: 'geckoterminal', metric: 'sut_price_change_may16_may18', value: -80.6, unit: 'percent',
    observationTime: '2026-05-18T23:59:59Z', retrievedAt: '2026-09-30', methodology: 'onchain_swap_decoded',
    confidence: 'VERIFIED', notes: 'DEX close 0.6737 -> 0.1308. Contract-keyed pool series.',
  }),
  ev({
    id: 'EV-002', sourceId: 'coingecko', metric: 'btc_price_change_may16_may18', value: -1.5, unit: 'percent',
    observationTime: '2026-05-18T23:59:59Z', retrievedAt: '2026-09-30', methodology: 'aggregator_reported',
    confidence: 'VERIFIED', notes: '78,161.07 -> 77,016.44. Control asset.',
    token: { symbol: 'BTC', contract: 'n/a-control-asset', chain: 'bitcoin' }, identityStatus: 'PAIR_VERIFIED',
  }),
  ev({
    id: 'EV-003', sourceId: 'coingecko', metric: 'eth_price_change_may16_may18', value: -2.1, unit: 'percent',
    observationTime: '2026-05-18T23:59:59Z', retrievedAt: '2026-09-30', methodology: 'aggregator_reported',
    confidence: 'VERIFIED', notes: '2,179.90 -> 2,134.55. Control asset.',
    token: { symbol: 'ETH', contract: 'n/a-control-asset', chain: 'ethereum' }, identityStatus: 'PAIR_VERIFIED',
  }),

  // ---------------------------------------------------------------- H2 (C1)
  ev({
    id: 'EV-010', sourceId: 'polygon-rpc', metric: 'swap_net_sell_imbalance_may17', value: 26981, unit: 'USD',
    observationTime: '2026-05-17', retrievedAt: '2026-09-30', methodology: 'onchain_swap_decoded',
    confidence: 'VERIFIED', aggregationCaveat: 'day_boundary_uncertain',
    notes: 'buy $378,676 vs sell $405,657, against a -62.7% intraday move. Decoded Uniswap V3 Swap events.',
  }),
  ev({
    id: 'EV-011', sourceId: 'polygon-rpc', metric: 'swap_volume_may17_18_combined', value: 1147309, unit: 'USD',
    observationTime: '2026-05-17/2026-05-18', retrievedAt: '2026-09-30', methodology: 'onchain_swap_decoded',
    confidence: 'VERIFIED', aggregationCaveat: 'day_boundary_uncertain',
    notes: 'Two-day aggregate. Agrees with GeckoTerminal ($1,110,605) within 3.3%. Single-day splits unreliable (C15).',
  }),
  ev({
    id: 'EV-012', sourceId: 'polygon-rpc', metric: 'net_liquidity_change_may17', value: 15911, unit: 'USD',
    observationTime: '2026-05-17', retrievedAt: '2026-09-30', methodology: 'onchain_swap_decoded',
    confidence: 'VERIFIED',
    notes: 'LP add $986,179 vs remove $970,268. POSITIVE. Churn rose ~65x (26/30 -> 643/679 mints/burns) = re-ranging, not flight.',
  }),
  ev({
    id: 'EV-013', sourceId: 'geckoterminal', metric: 'main_pool_reserve_usd', value: 91680.59, unit: 'USD',
    observationTime: '2026-09-30', retrievedAt: '2026-09-30', methodology: 'aggregator_reported',
    confidence: 'VERIFIED',
    notes: 'SEPTEMBER 2026 snapshot. May 2026 pool TVL was NEVER measured — do not substitute.',
  }),
  ev({
    id: 'EV-014', sourceId: 'pdf-pip-thesis', metric: 'volume_to_marketcap_vs_peer_median', value: '0.11% vs 12.4%', unit: 'ratio',
    observationTime: '2026-09-30', retrievedAt: '2026-09-30', methodology: 'document_stated',
    confidence: 'SECONDARY',
    notes: '~110x worse than the #90-#110 peer median; the least-traded coin in that band turns over ~50x more.',
  }),

  // ---------------------------------------------------------------- H3
  ev({
    id: 'EV-020', sourceId: 'polygon-rpc', metric: 'src_to_dst_sut_may', value: 16580000, unit: 'SUT',
    observationTime: '2026-05-01/2026-05-17', retrievedAt: '2026-09-30', methodology: 'onchain_transfer',
    confidence: 'VERIFIED', notes: 'Near-daily. Corrects the handoff figure of ~5.92M (that was an incomplete subset).',
  }),
  ev({
    id: 'EV-021', sourceId: 'polygon-rpc', metric: 'hop3_fanout_transfers_may', value: 34349, unit: 'count',
    observationTime: '2026-05-01/2026-05-25', retrievedAt: '2026-09-30', methodology: 'onchain_transfer',
    confidence: 'VERIFIED',
    notes: '15,332,008 SUT to 16,607 distinct addresses, avg ~446 SUT. Largest single recipient 158,598 SUT (~1%). No venue address among top recipients.',
  }),
  ev({
    id: 'EV-022', sourceId: 'polygon-rpc', metric: 'cluster_pool_sells_may', value: 0, unit: 'SUT',
    observationTime: '2026-05-01/2026-05-25', retrievedAt: '2026-09-30', methodology: 'onchain_transfer',
    confidence: 'VERIFIED',
    notes: '0.00% of pool sell inflow. CAVEAT: measures DIRECT transfers only — a sale routed via an aggregator appears as the router address.',
  }),
  ev({
    id: 'EV-023', sourceId: 'polygon-rpc', metric: 'distinct_pool_sellers_may', value: 525, unit: 'count',
    observationTime: '2026-05-01/2026-05-25', retrievedAt: '2026-09-30', methodology: 'onchain_transfer',
    confidence: 'VERIFIED',
    notes: 'LOWER BOUND. Top senders are router/aggregator contracts (incl. PolygonSettler) bundling many users.',
  }),
  ev({
    id: 'EV-024', sourceId: 'polygon-rpc', metric: 'fanout_recipient_direct_sellthrough', value: 0.67, unit: 'percent',
    observationTime: '2026-05-01/2026-05-25', retrievedAt: '2026-09-30', methodology: 'onchain_transfer',
    confidence: 'VERIFIED',
    notes: 'FLOOR ONLY. 325 of 525 distinct pool sellers (61.9%) were fan-out recipients, but only 103,474 of 15,332,008 SUT reached the pool directly. Excludes router- and CEX-mediated sales.',
  }),

  // ---------------------------------------------------------------- H6
  ev({
    id: 'EV-030', sourceId: 'blockscout', metric: 'total_supply', value: 238403732, unit: 'SUT',
    observationTime: '2026-09-30', retrievedAt: '2026-09-30', methodology: 'contract_call',
    confidence: 'VERIFIED', notes: 'Unchanged. Minting unavailable; not a proxy. No supply was created in May 2026.',
  }),

  // ---------------------------------------------------------------- H12
  ev({
    id: 'EV-040', sourceId: 'polygon-rpc', metric: 'pool_buyside_gross_flow_may17', value: 1364855, unit: 'USD',
    observationTime: '2026-05-17', retrievedAt: '2026-09-30', methodology: 'gross_pool_flow',
    confidence: 'VERIFIED',
    notes: 'GROSS FLOW — NOT VOLUME. = swap buy $378,676 + LP mint $986,179 (exact, $0 difference). This reconciliation resolved conflict C14.',
  }),
  ev({
    id: 'EV-041', sourceId: 'polygon-rpc', metric: 'buyside_peak_day', value: '2026-05-17', unit: 'date',
    observationTime: '2026-05-17', retrievedAt: '2026-09-30', methodology: 'onchain_swap_decoded',
    confidence: 'VERIFIED',
    notes: "Buy-side PEAKED on the crash day rather than withdrawing. Buy/sell flows near-identical daily (monthly totals differ 0.04%) — no persistent supporting buyer exists.",
  }),

  // ---------------------------------------------------------------- CertiK
  ev({
    id: 'EV-050', sourceId: 'certik', metric: 'skynet_score', value: 74.23, unit: 'score',
    observationTime: '2026-09-30', retrievedAt: '2026-09-30', methodology: 'document_stated',
    confidence: 'SECONDARY',
    notes: 'DYNAMIC source. Was 74.06 on 2026-09-29 — both valid at their retrieval times. NOT CoinMarketCap\'s "3.7" (different field, different scale).',
  }),
  ev({
    id: 'EV-051', sourceId: 'certik', metric: 'major_holding_ratio', value: 54.25, unit: 'percent',
    observationTime: '2026-09-30', retrievedAt: '2026-09-30', methodology: 'document_stated',
    confidence: 'SECONDARY',
    notes: "CertiK's own methodology (unpublished). NOT the same metric as our top-10 concentration (~71%). Never present as one.",
  }),

  // ------------------------------------------- PHASE 4: OPP-01 baseline run
  // Live pool state read from the contract at block 94,711,694 (2026-09-30T12:51:21Z).
  ev({
    id: 'EV-100', sourceId: 'polygon-rpc', metric: 'pool_spot_price', value: 0.416396, unit: 'USD per SUT',
    observationTime: '2026-09-30T12:51:21Z', retrievedAt: '2026-09-30', methodology: 'contract_call',
    confidence: 'VERIFIED', notes: 'Derived from slot0().sqrtPriceX96 at block 94711694. token0=SUT(18dp), token1=USDT(6dp), fee 1.00%.',
  }),
  ev({
    id: 'EV-101', sourceId: 'polygon-rpc', metric: 'pool_active_liquidity', value: '300309217717383894', unit: 'L (raw)',
    observationTime: '2026-09-30T12:51:21Z', retrievedAt: '2026-09-30', methodology: 'contract_call',
    confidence: 'VERIFIED', notes: 'liquidity() at block 94711694; tick -285086. Active-range liquidity only.',
  }),
  ev({
    id: 'EV-102', sourceId: 'polygon-rpc', metric: 'pool_reserve_sut', value: 96808.58, unit: 'SUT',
    observationTime: '2026-09-30T12:51:21Z', retrievedAt: '2026-09-30', methodology: 'contract_call',
    confidence: 'VERIFIED', notes: 'balanceOf(pool) for SUT at block 94711694. ~$40,311 at spot.',
  }),
  ev({
    id: 'EV-103', sourceId: 'polygon-rpc', metric: 'pool_reserve_usdt', value: 52534.52, unit: 'USDT',
    observationTime: '2026-09-30T12:51:21Z', retrievedAt: '2026-09-30', methodology: 'contract_call',
    confidence: 'VERIFIED', notes: 'balanceOf(pool) for USDT at block 94711694. Approx pool TVL $92,845.',
  }),
  ev({
    id: 'EV-104', sourceId: 'polygon-rpc', metric: 'price_impact_buy_10k', value: 10.59, unit: 'percent',
    observationTime: '2026-09-30T12:51:21Z', retrievedAt: '2026-09-30', methodology: 'derived',
    confidence: 'VERIFIED',
    notes: 'MODEL output, not an observation. Uniswap V3 single-active-range math; assumes liquidity constant across the move (no tick crossing). Fillable: needs 22,837 of 96,809 SUT.',
  }),
  ev({
    id: 'EV-105', sourceId: 'polygon-rpc', metric: 'price_impact_sell_10k', value: -9.57, unit: 'percent',
    observationTime: '2026-09-30T12:51:21Z', retrievedAt: '2026-09-30', methodology: 'derived',
    confidence: 'VERIFIED',
    notes: 'MODEL output, not an observation. Single-active-range math. Fillable: needs $9,509 of $52,535 USDT.',
  }),
  ev({
    id: 'EV-106', sourceId: 'polygon-rpc', metric: 'price_impact_buy_50k', value: 58.26, unit: 'percent',
    observationTime: '2026-09-30T12:51:21Z', retrievedAt: '2026-09-30', methodology: 'derived',
    confidence: 'VERIFIED',
    notes: 'MODEL output, not an observation. Barely fillable: consumes 95,450 of 96,809 SUT (98.6% of inventory). Treat as an edge case, not a routine quote.',
  }),
  ev({
    id: 'EV-107', sourceId: 'polygon-rpc', metric: 'price_impact_sell_50k', value: -36.81, unit: 'percent',
    observationTime: '2026-09-30T12:51:21Z', retrievedAt: '2026-09-30', methodology: 'derived',
    confidence: 'VERIFIED',
    notes: 'MODEL output, not an observation. Fillable: needs $39,745 of $52,535 USDT (75.7%).',
  }),
  ev({
    id: 'EV-108', sourceId: 'polygon-rpc', metric: 'price_impact_100k', value: null, unit: 'percent',
    observationTime: '2026-09-30T12:51:21Z', retrievedAt: '2026-09-30', methodology: 'derived',
    confidence: 'VERIFIED',
    notes: 'NOT EXECUTABLE — the standardised $100K size exceeds pool inventory on BOTH sides: a buy needs 158,411 SUT (only 96,809 exist) and a sell needs $65,962 USDT (only $52,535 exists). A modelled percentage for this size would not be an executable quote and is deliberately NOT reported.',
  }),
  ev({
    id: 'EV-109', sourceId: 'polygon-rpc', metric: 'depth_within_2pct', value: '+$1,928 / -$1,967', unit: 'USD',
    observationTime: '2026-09-30T12:51:21Z', retrievedAt: '2026-09-30', methodology: 'derived',
    confidence: 'VERIFIED',
    notes: 'MODEL output from single-active-range math: notional required to move spot by 2%. This is the DEX pool, not a CEX order book.',
  }),
  ev({
    id: 'EV-110', sourceId: 'polygon-rpc', metric: 'pool_fee_tier', value: 1.0, unit: 'percent',
    observationTime: '2026-09-30T12:51:21Z', retrievedAt: '2026-09-30', methodology: 'contract_call',
    confidence: 'VERIFIED', notes: 'fee() = 10000 (1.00% per side). This is a venue cost, not a bid/ask spread.',
  }),

  // ------------------------------- PHASE 5: OPP-01 repeat capture (RUN-002)
  // Second prospective capture, block 94,712,797 (2026-09-30T13:18:56Z), ~27 min after RUN-001.
  ev({
    id: 'EV-120', sourceId: 'polygon-rpc', metric: 'pool_spot_price_run2', value: 0.409377, unit: 'USD per SUT',
    observationTime: '2026-09-30T13:18:56Z', retrievedAt: '2026-09-30', methodology: 'contract_call',
    confidence: 'VERIFIED', notes: 'slot0().sqrtPriceX96 at block 94712797; tick -285256.',
  }),
  ev({
    id: 'EV-121', sourceId: 'polygon-rpc', metric: 'pool_reserve_sut_run2', value: 100831.12, unit: 'SUT',
    observationTime: '2026-09-30T13:18:56Z', retrievedAt: '2026-09-30', methodology: 'contract_call',
    confidence: 'VERIFIED', notes: 'balanceOf(pool) at block 94712797.',
  }),
  ev({
    id: 'EV-122', sourceId: 'polygon-rpc', metric: 'pool_reserve_usdt_run2', value: 50898.18, unit: 'USDT',
    observationTime: '2026-09-30T13:18:56Z', retrievedAt: '2026-09-30', methodology: 'contract_call',
    confidence: 'VERIFIED', notes: 'balanceOf(pool) at block 94712797. Approx TVL $92,176.',
  }),
  ev({
    id: 'EV-123', sourceId: 'polygon-rpc', metric: 'price_impact_buy_10k_run2', value: 10.68, unit: 'percent',
    observationTime: '2026-09-30T13:18:56Z', retrievedAt: '2026-09-30', methodology: 'derived',
    confidence: 'VERIFIED', notes: 'MODEL output (V3 single-active-range), not an executed trade. Fillable: needs 23,219 of 100,831 SUT.',
  }),
  ev({
    id: 'EV-124', sourceId: 'polygon-rpc', metric: 'price_impact_sell_10k_run2', value: -9.65, unit: 'percent',
    observationTime: '2026-09-30T13:18:56Z', retrievedAt: '2026-09-30', methodology: 'derived',
    confidence: 'VERIFIED', notes: 'MODEL output, not an executed trade. Fillable: needs $9,505 of $50,898 USDT.',
  }),
  ev({
    id: 'EV-125', sourceId: 'polygon-rpc', metric: 'price_impact_buy_50k_run2', value: 58.82, unit: 'percent',
    observationTime: '2026-09-30T13:18:56Z', retrievedAt: '2026-09-30', methodology: 'derived',
    confidence: 'VERIFIED', notes: 'MODEL output, not an executed trade. Consumes 96,917 of 100,831 SUT (96.1%).',
  }),
  ev({
    id: 'EV-126', sourceId: 'polygon-rpc', metric: 'price_impact_sell_50k_run2', value: -37.03, unit: 'percent',
    observationTime: '2026-09-30T13:18:56Z', retrievedAt: '2026-09-30', methodology: 'derived',
    confidence: 'VERIFIED', notes: 'MODEL output, not an executed trade. Needs $39,676 of $50,898 USDT (78.0%).',
  }),
  ev({
    id: 'EV-127', sourceId: 'polygon-rpc', metric: 'price_impact_100k_run2', value: null, unit: 'percent',
    observationTime: '2026-09-30T13:18:56Z', retrievedAt: '2026-09-30', methodology: 'derived',
    confidence: 'VERIFIED',
    notes: 'NOT EXECUTABLE — still exceeds inventory on both sides at this capture: buy needs 160,660 SUT (100,831 available); sell needs $65,770 (>$50,898 available). No percentage reported.',
  }),
  ev({
    id: 'EV-128', sourceId: 'polygon-rpc', metric: 'depth_within_2pct_run2', value: '+$1,912 / -$1,951', unit: 'USD',
    observationTime: '2026-09-30T13:18:56Z', retrievedAt: '2026-09-30', methodology: 'derived',
    confidence: 'VERIFIED', notes: 'MODEL output: notional required to move spot by 2% at this capture.',
  }),

  // --------------------------- PHASE 5: EXP-002 weekly active addresses (real)
  ev({
    id: 'EV-130', sourceId: 'polygon-rpc', metric: 'weekly_active_addresses_2026W39', value: 1423, unit: 'addresses',
    observationTime: '2026-09-21T00:00:00Z/2026-09-28T00:00:00Z', retrievedAt: '2026-09-30',
    methodology: 'onchain_transfer', confidence: 'VERIFIED',
    notes: 'Distinct transfer INITIATORS, exclusions applied (pool, routers, dead/zero, operational cluster, intra-cluster). Week boundaries from EXACT block timestamps (blocks 94,162,485 -> 94,565,640; drift +1s / 0s) — NOT interpolated. 6,330 raw transfers; 1,899 excluded-sender; 0 intra-cluster; 4,431 counted. NOT comparable with CertiK 1,580 (unpublished methodology).',
  }),

  ev({
    id: 'EV-131', sourceId: 'polygon-rpc', metric: 'lp_liquidity_concentration', value: null, unit: 'percent',
    observationTime: '2026-09-30', retrievedAt: '2026-09-30', methodology: 'contract_call',
    confidence: 'VERIFIED',
    notes: 'DATA UNAVAILABLE — probed and found not measurable by this route. All 101 Mint events over the last ~200k blocks carry owner = 0xc36442b4a4522e871399cd717abdd847ab11fe88, the Uniswap V3 NonfungiblePositionManager. Positions are NFT-wrapped, so the pool-level owner field resolves to the manager, not beneficial owners. Resolving concentration would require enumerating NFPM position NFTs and their holders. No figure is reported.',
  }),

  // --------------------------- PHASE 6: OPP-01 daily capture RUN-003 (real)
  ev({
    id: 'EV-140', sourceId: 'polygon-rpc', metric: 'pool_spot_price_run3', value: 0.412615, unit: 'USD per SUT',
    observationTime: '2026-09-30T17:23:08Z', retrievedAt: '2026-09-30', methodology: 'contract_call',
    confidence: 'VERIFIED', notes: 'slot0().sqrtPriceX96 at block 94722565; tick -285177.',
  }),
  ev({
    id: 'EV-141', sourceId: 'polygon-rpc', metric: 'pool_reserve_sut_run3', value: 99064.97, unit: 'SUT',
    observationTime: '2026-09-30T17:23:08Z', retrievedAt: '2026-09-30', methodology: 'contract_call',
    confidence: 'VERIFIED', notes: 'balanceOf(pool) at block 94722565.',
  }),
  ev({
    id: 'EV-142', sourceId: 'polygon-rpc', metric: 'pool_reserve_usdt_run3', value: 51696.38, unit: 'USDT',
    observationTime: '2026-09-30T17:23:08Z', retrievedAt: '2026-09-30', methodology: 'contract_call',
    confidence: 'VERIFIED', notes: 'balanceOf(pool) at block 94722565. Approx TVL $92,572.',
  }),
  ev({
    id: 'EV-143', sourceId: 'polygon-rpc', metric: 'price_impact_buy_10k_run3', value: 10.64, unit: 'percent',
    observationTime: '2026-09-30T17:23:08Z', retrievedAt: '2026-09-30', methodology: 'derived',
    confidence: 'VERIFIED', notes: 'MODEL output, not an executed trade. Fillable: needs 23,041 of 99,065 SUT.',
  }),
  ev({
    id: 'EV-144', sourceId: 'polygon-rpc', metric: 'price_impact_sell_10k_run3', value: -9.61, unit: 'percent',
    observationTime: '2026-09-30T17:23:08Z', retrievedAt: '2026-09-30', methodology: 'derived',
    confidence: 'VERIFIED', notes: 'MODEL output, not an executed trade. Fillable: needs $9,507 of $51,696 USDT.',
  }),
  ev({
    id: 'EV-145', sourceId: 'polygon-rpc', metric: 'price_impact_buy_50k_run3', value: 58.56, unit: 'percent',
    observationTime: '2026-09-30T17:23:08Z', retrievedAt: '2026-09-30', methodology: 'derived',
    confidence: 'VERIFIED', notes: 'MODEL output, not an executed trade. Consumes 96,235 of 99,065 SUT (97.1%).',
  }),
  ev({
    id: 'EV-146', sourceId: 'polygon-rpc', metric: 'price_impact_sell_50k_run3', value: -36.93, unit: 'percent',
    observationTime: '2026-09-30T17:23:08Z', retrievedAt: '2026-09-30', methodology: 'derived',
    confidence: 'VERIFIED', notes: 'MODEL output, not an executed trade. Needs $39,708 of $51,696 USDT (76.8%).',
  }),
  ev({
    id: 'EV-147', sourceId: 'polygon-rpc', metric: 'price_impact_100k_run3', value: null, unit: 'percent',
    observationTime: '2026-09-30T17:23:08Z', retrievedAt: '2026-09-30', methodology: 'derived',
    confidence: 'VERIFIED',
    notes: 'NOT EXECUTABLE at this capture: buy needs 159,614 SUT (99,065 available); sell needs $65,859 ($51,696 available). No percentage reported.',
  }),
  ev({
    id: 'EV-148', sourceId: 'polygon-rpc', metric: 'depth_within_2pct_run3', value: '+$1,919 / -$1,958', unit: 'USD',
    observationTime: '2026-09-30T17:23:08Z', retrievedAt: '2026-09-30', methodology: 'derived',
    confidence: 'VERIFIED', notes: 'MODEL output: notional required to move spot by 2% at this capture.',
  }),

  // ---------------------------------------------------------------- DATA UNAVAILABLE
  ev({
    id: 'EV-900', sourceId: 'bitmart', metric: 'bitmart_event_identity', value: null, unit: 'n/a',
    observationTime: null, retrievedAt: '2026-09-30', methodology: 'document_stated',
    confidence: 'UNVERIFIED', identityStatus: 'IDENTITY_NOT_VERIFIED',
    token: { symbol: 'SUT', contract: 'unknown', chain: 'unknown' },
    notes: 'BLOCKED (Cloudflare 403). Carries a "withdrawal closed 2026-05-16" date at exact crash onset. v2 established BitMart SUT was Sanity United. Either the catalyst or a false root cause — MUST NOT be used until resolved.',
  }),
  ev({
    id: 'EV-901', sourceId: 'polygon-rpc', metric: 'main_pool_tvl_may2026', value: null, unit: 'USD',
    observationTime: '2026-05-17', retrievedAt: '2026-09-30', methodology: 'derived',
    confidence: 'UNVERIFIED', notes: 'NEVER MEASURED. All depth figures are Sept 2026 snapshots. Do not substitute.',
  }),
  ev({
    id: 'EV-902', sourceId: 'gate-tr', metric: 'cex_orderbook_depth_may2026', value: null, unit: 'USD',
    observationTime: '2026-05-17', retrievedAt: '2026-09-30', methodology: 'document_stated',
    confidence: 'UNVERIFIED', identityStatus: 'PAIR_VERIFIED',
    token: { symbol: 'SUT', contract: SUT_CONTRACT, chain: SUT_CHAIN, exchange: 'Gate', pair: 'SUT/USDT' },
    notes: 'UNRECOVERABLE — no public source retains historical order books for this venue/pair.',
  }),
  ev({
    id: 'EV-903', sourceId: 'polygon-rpc', metric: 'lp_fees_collected_may', value: null, unit: 'USD',
    observationTime: '2026-05-17', retrievedAt: '2026-09-30', methodology: 'onchain_swap_decoded',
    confidence: 'UNVERIFIED',
    notes: 'DECODE DEFECT identified: Collect(owner, recipient, tickLower, tickUpper, amount0, amount1) — amounts sit at data words [1],[2]; the run read [0],[1] and decoded the recipient address as an amount. Event COUNTS are valid (1,471 total; 675 on May 17); AMOUNTS are not. Correction pending.',
  }),
  ev({
    id: 'EV-904', sourceId: 'supertrust-notice', metric: 'supersave_settlement_flows', value: null, unit: 'n/a',
    observationTime: null, retrievedAt: '2026-09-30', methodology: 'document_stated',
    confidence: 'UNVERIFIED',
    notes: 'No access to SoloPay, SuperSave, production systems or settlement records. H5 untestable from outside.',
  }),
  ev({
    id: 'EV-905', sourceId: 'supertrust-notice', metric: 'catalyst_event_may15_20', value: null, unit: 'n/a',
    observationTime: null, retrievedAt: '2026-09-30', methodology: 'document_stated',
    confidence: 'UNVERIFIED',
    notes: 'No legal/regulatory/news/company event identified in 2026-05-15..20. The search was NOT exhaustive and Korean-language sources are blocked to automation. Absence of evidence is not evidence of absence.',
  }),
]

export const EVIDENCE_BY_ID = new Map(EVIDENCE.map((e) => [e.id, e]))
