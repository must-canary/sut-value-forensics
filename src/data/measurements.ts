/**
 * Measured datasets from the frozen research. Every figure here was produced by
 * the investigation recorded in research-baseline.md and research-change-log.md.
 *
 * NO VALUE IN THIS FILE IS INVENTED. Anything not measured is null / DATA UNAVAILABLE.
 */

export const CASE = {
  id: 'CASE-001',
  title: 'SUT May 2026 Crash',
  windowStart: '2026-05-01',
  windowEnd: '2026-05-25',
  eventStart: '2026-05-16',
  eventEnd: '2026-05-20',
  onset: '2026-05-17',
  onsetNote: 'Collapse begins 2026-05-17 intraday (open 0.6737 -> low 0.2511, -62.7%)',
} as const

export const TOKEN = {
  symbol: 'SUT',
  name: 'SuperTrust',
  contract: '0x98965474ecbec2f532f1f780ee37b0b05f77ca55',
  chain: 'polygon-pos',
  chainId: 137,
  decimals: 18,
  totalSupply: 238_403_732,
} as const

export const MAIN_POOL = {
  address: '0x092295c92bab5e734c4a60dbc0f0ffdcdfc4e165',
  dex: 'Uniswap V3',
  token0: '0x98965474ecbec2f532f1f780ee37b0b05f77ca55',
  token0Symbol: 'SUT',
  token1: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
  token1Symbol: 'USDT',
  feeBps: 10000,
  feePct: 1.0,
  note: 'token0/token1/fee read from the contract, not assumed. Predecessor research called this "SUT/USDT0"; token1 is canonical Polygon PoS USDT.',
  reserveUsdSep2026: 91680.59,
  reserveUsdMay2026: null as number | null, // NEVER MEASURED
} as const

// ---------------------------------------------------------------- price series

export interface DailyPrice {
  date: string
  open: number
  high: number
  low: number
  close: number
  volUsd: number
}

/** DEX daily OHLCV, GeckoTerminal, queried BY CONTRACT (identity-safe). */
export const SUT_DEX_DAILY: DailyPrice[] = [
  { date: '2026-04-25', open: 0.6743, high: 0.6981, low: 0.6701, close: 0.6814, volUsd: 6946 },
  { date: '2026-04-26', open: 0.6814, high: 0.6814, low: 0.6199, close: 0.6199, volUsd: 11151 },
  { date: '2026-04-27', open: 0.6199, high: 0.653, low: 0.4197, close: 0.6167, volUsd: 59846 },
  { date: '2026-04-28', open: 0.6167, high: 0.6315, low: 0.4853, close: 0.6072, volUsd: 49177 },
  { date: '2026-04-29', open: 0.6072, high: 0.6129, low: 0.4737, close: 0.5909, volUsd: 32253 },
  { date: '2026-04-30', open: 0.5909, high: 0.6054, low: 0.5273, close: 0.5537, volUsd: 24666 },
  { date: '2026-05-01', open: 0.5537, high: 0.7091, low: 0.5537, close: 0.6746, volUsd: 41332 },
  { date: '2026-05-02', open: 0.6746, high: 0.6889, low: 0.5892, close: 0.6028, volUsd: 24809 },
  { date: '2026-05-03', open: 0.6028, high: 0.6245, low: 0.5997, close: 0.6034, volUsd: 4107 },
  { date: '2026-05-04', open: 0.6034, high: 0.6601, low: 0.5903, close: 0.6036, volUsd: 20973 },
  { date: '2026-05-05', open: 0.6036, high: 0.6914, low: 0.5883, close: 0.6172, volUsd: 28957 },
  { date: '2026-05-06', open: 0.6172, high: 0.6449, low: 0.5997, close: 0.6162, volUsd: 36848 },
  { date: '2026-05-07', open: 0.6162, high: 0.6302, low: 0.5655, close: 0.608, volUsd: 26803 },
  { date: '2026-05-08', open: 0.608, high: 0.6369, low: 0.5689, close: 0.6142, volUsd: 32969 },
  { date: '2026-05-09', open: 0.6142, high: 0.6333, low: 0.6003, close: 0.6099, volUsd: 18712 },
  { date: '2026-05-10', open: 0.6099, high: 0.6099, low: 0.4871, close: 0.5361, volUsd: 94201 },
  { date: '2026-05-11', open: 0.5361, high: 0.6056, low: 0.4921, close: 0.5152, volUsd: 96238 },
  { date: '2026-05-12', open: 0.5152, high: 0.654, low: 0.515, close: 0.6176, volUsd: 84172 },
  { date: '2026-05-13', open: 0.6176, high: 0.6735, low: 0.5939, close: 0.638, volUsd: 59202 },
  { date: '2026-05-14', open: 0.638, high: 0.6568, low: 0.6117, close: 0.624, volUsd: 32390 },
  { date: '2026-05-15', open: 0.624, high: 0.9012, low: 0.6213, close: 0.692, volUsd: 244781 },
  { date: '2026-05-16', open: 0.692, high: 0.718, low: 0.6511, close: 0.6737, volUsd: 39897 },
  { date: '2026-05-17', open: 0.6737, high: 0.6964, low: 0.2511, close: 0.4756, volUsd: 397989 },
  { date: '2026-05-18', open: 0.4756, high: 0.5511, low: 0.1145, close: 0.1308, volUsd: 712616 },
  { date: '2026-05-19', open: 0.1308, high: 0.1914, low: 0.1022, close: 0.1491, volUsd: 185298 },
  { date: '2026-05-20', open: 0.1491, high: 0.3138, low: 0.1368, close: 0.3124, volUsd: 274470 },
  { date: '2026-05-21', open: 0.3124, high: 0.4284, low: 0.2971, close: 0.345, volUsd: 240229 },
  { date: '2026-05-22', open: 0.345, high: 0.3514, low: 0.2543, close: 0.2896, volUsd: 170311 },
  { date: '2026-05-23', open: 0.2896, high: 0.2973, low: 0.2569, close: 0.2603, volUsd: 30126 },
  { date: '2026-05-24', open: 0.2603, high: 0.2603, low: 0.1735, close: 0.2132, volUsd: 68224 },
  { date: '2026-05-25', open: 0.2132, high: 0.249, low: 0.2008, close: 0.217, volUsd: 38926 },
]

/** Control assets, CoinGecko daily close. */
export const CONTROL_DAILY: Array<{ date: string; btc: number; eth: number }> = [
  { date: '2026-04-30', btc: 76204.93, eth: 2254.14 },
  { date: '2026-05-01', btc: 78127.08, eth: 2291.8 },
  { date: '2026-05-02', btc: 78815.1, eth: 2324.63 },
  { date: '2026-05-15', btc: 79065.68, eth: 2223.07 },
  { date: '2026-05-16', btc: 78161.07, eth: 2179.9 },
  { date: '2026-05-17', btc: 77940.06, eth: 2178.66 },
  { date: '2026-05-18', btc: 77016.44, eth: 2134.55 },
  { date: '2026-05-19', btc: 76636.54, eth: 2104.37 },
  { date: '2026-05-20', btc: 77429.4, eth: 2126.76 },
  { date: '2026-05-21', btc: 77553.31, eth: 2129.7 },
  { date: '2026-05-22', btc: 75666.94, eth: 2071.35 },
  { date: '2026-05-23', btc: 76500.57, eth: 2114.45 },
  { date: '2026-05-24', btc: 76765.55, eth: 2091.71 },
  { date: '2026-05-25', btc: 77072.74, eth: 2103.18 },
]

/** Provider-specific closes — NEVER blended (conflict C4). */
export const PROVIDER_CLOSES: Array<{
  date: string; coingecko: number | null; coinranking: number | null; dex: number
}> = [
  { date: '2026-05-15', coingecko: 0.682996, coinranking: 0.683, dex: 0.692 },
  { date: '2026-05-16', coingecko: 0.680758, coinranking: 0.679, dex: 0.6737 },
  { date: '2026-05-17', coingecko: 0.478317, coinranking: 0.482, dex: 0.4756 },
  { date: '2026-05-18', coingecko: 0.124481, coinranking: 0.131, dex: 0.1308 },
  { date: '2026-05-19', coingecko: 0.152232, coinranking: 0.15, dex: 0.1491 },
  { date: '2026-05-20', coingecko: 0.306516, coinranking: 0.307, dex: 0.3124 },
]

// ------------------------------------------------- C1: decoded swaps vs liquidity

export interface SwapDay {
  date: string
  volumeUsd: number
  buyUsd: number
  sellUsd: number
  swaps: number
  buys: number
  sells: number
  sutSold: number
  sutBought: number
  distinctRecipients: number
  distinctSenders: number
  /** interpolated day boundary — see conflict C15 */
  dayBoundaryUncertain: boolean
}

export interface LiquidityDay {
  date: string
  addUsd: number
  removeUsd: number
  addSut: number
  removeSut: number
  mints: number
  burns: number
  collects: number
  /** Collect AMOUNTS were mis-decoded; only the count is valid. */
  feesUsd: null
}

/** Procedure C1 — decoded Uniswap V3 Swap events. THE ONLY volume source. */
export const SWAP_DAILY: SwapDay[] = [
  { date: '2026-05-13', volumeUsd: 59477, buyUsd: 30164, sellUsd: 29313, swaps: 422, buys: 200, sells: 222, sutSold: 46816, sutBought: 47236, distinctRecipients: 20, distinctSenders: 12, dayBoundaryUncertain: true },
  { date: '2026-05-14', volumeUsd: 76859, buyUsd: 43127, sellUsd: 33732, swaps: 329, buys: 151, sells: 178, sutSold: 50173, sutBought: 63101, distinctRecipients: 33, distinctSenders: 16, dayBoundaryUncertain: true },
  { date: '2026-05-15', volumeUsd: 200460, buyUsd: 98281, sellUsd: 102179, swaps: 926, buys: 392, sells: 534, sutSold: 140591, sutBought: 132263, distinctRecipients: 59, distinctSenders: 26, dayBoundaryUncertain: true },
  { date: '2026-05-16', volumeUsd: 36922, buyUsd: 19963, sellUsd: 16959, swaps: 246, buys: 114, sells: 132, sutSold: 25390, sutBought: 29297, distinctRecipients: 13, distinctSenders: 9, dayBoundaryUncertain: true },
  { date: '2026-05-17', volumeUsd: 784333, buyUsd: 378676, sellUsd: 405657, swaps: 4341, buys: 2166, sells: 2175, sutSold: 1045185, sutBought: 965067, distinctRecipients: 122, distinctSenders: 56, dayBoundaryUncertain: true },
  { date: '2026-05-18', volumeUsd: 362976, buyUsd: 179908, sellUsd: 183068, swaps: 4392, buys: 2133, sells: 2259, sutSold: 1041222, sutBought: 1007427, distinctRecipients: 131, distinctSenders: 58, dayBoundaryUncertain: true },
  { date: '2026-05-19', volumeUsd: 153444, buyUsd: 77355, sellUsd: 76089, swaps: 1257, buys: 654, sells: 603, sutSold: 480440, sutBought: 479460, distinctRecipients: 75, distinctSenders: 33, dayBoundaryUncertain: true },
  { date: '2026-05-20', volumeUsd: 368466, buyUsd: 197461, sellUsd: 171004, swaps: 3189, buys: 1601, sells: 1588, sutSold: 699607, sutBought: 801985, distinctRecipients: 128, distinctSenders: 51, dayBoundaryUncertain: true },
  { date: '2026-05-21', volumeUsd: 190111, buyUsd: 94370, sellUsd: 95741, swaps: 1356, buys: 705, sells: 651, sutSold: 302296, sutBought: 292197, distinctRecipients: 97, distinctSenders: 40, dayBoundaryUncertain: true },
  { date: '2026-05-22', volumeUsd: 110988, buyUsd: 53582, sellUsd: 57406, swaps: 598, buys: 282, sells: 316, sutSold: 196988, sutBought: 180729, distinctRecipients: 64, distinctSenders: 30, dayBoundaryUncertain: true },
]

export const LIQUIDITY_DAILY: LiquidityDay[] = [
  { date: '2026-05-13', addUsd: 74784, removeUsd: 75708, addSut: 0, removeSut: 0, mints: 57, burns: 64, collects: 60, feesUsd: null },
  { date: '2026-05-14', addUsd: 39245, removeUsd: 42521, addSut: 0, removeSut: 0, mints: 44, burns: 47, collects: 45, feesUsd: null },
  { date: '2026-05-15', addUsd: 93696, removeUsd: 91799, addSut: 0, removeSut: 0, mints: 79, burns: 87, collects: 84, feesUsd: null },
  { date: '2026-05-16', addUsd: 15151, removeUsd: 15015, addSut: 0, removeSut: 0, mints: 26, burns: 30, collects: 29, feesUsd: null },
  { date: '2026-05-17', addUsd: 986179, removeUsd: 970268, addSut: 193633, removeSut: 198697, mints: 643, burns: 679, collects: 675, feesUsd: null },
  { date: '2026-05-18', addUsd: 98328, removeUsd: 94661, addSut: 181106, removeSut: 0, mints: 163, burns: 196, collects: 190, feesUsd: null },
  { date: '2026-05-19', addUsd: 7279, removeUsd: 4226, addSut: 0, removeSut: 0, mints: 65, burns: 68, collects: 66, feesUsd: null },
  { date: '2026-05-20', addUsd: 12184, removeUsd: 19153, addSut: 0, removeSut: 0, mints: 116, burns: 131, collects: 128, feesUsd: null },
  { date: '2026-05-21', addUsd: 11002, removeUsd: 8406, addSut: 0, removeSut: 0, mints: 89, burns: 104, collects: 100, feesUsd: null },
  { date: '2026-05-22', addUsd: 5121, removeUsd: 3292, addSut: 0, removeSut: 0, mints: 60, burns: 75, collects: 73, feesUsd: null },
]

/** Gross ERC-20 pool flow — BARRED from volume fields. Kept to show the C14 reconciliation. */
export const GROSS_POOL_FLOW: Array<{ date: string; inUsd: number; outUsd: number }> = [
  { date: '2026-05-15', inUsd: 191977, outUsd: 194900 },
  { date: '2026-05-16', inUsd: 35113, outUsd: 32501 },
  { date: '2026-05-17', inUsd: 1364855, outUsd: 1379239 },
  { date: '2026-05-18', inUsd: 278236, outUsd: 279969 },
  { date: '2026-05-19', inUsd: 84634, outUsd: 81161 },
  { date: '2026-05-20', inUsd: 209646, outUsd: 192054 },
]

// ---------------------------------------------------------------- wallet chain

export const TRACED_CHAIN = {
  src: '0xaaa4d5dd26eb1a2afe5fd5fb529fc24cee89cc2c',
  dst: '0x7cc2f8914b4d77b68355757286f146373f4bf7ad',
  hop3: '0xe6e7ec8dfbacc0dbfc8e838ff2a49a252ab4ff85',
  funder2: '0x0d0707963952f2fba59dd06f2b425ace40b492fe',
  srcToDstSut: 16_580_000,
  dstInSut: 19_007_099,
  dstOutSut: 16_523_928,
  dstToHop3Sut: 15_200_000,
  dstToHop3Tx: 29,
  dstBackToSrcSut: 1_271_722,
  dstBackToSrcTx: 42,
  funder2Sut: 2_303_367,
  hop3InMaySut: 15_200_471,
  hop3InMayTx: 31,
  hop3OutMaySut: 15_332_008,
  hop3OutMayTx: 34_349,
  hop3DistinctRecipientsMay: 16_607,
  hop3AvgTransferSut: 446,
  hop3LargestMayRecipientSut: 158_598,
  dstSutBalanceNow: 18_604.23,
  dstMsqBalance: 14_735_470.6,
  clusterPoolSellsSut: 0,
  clusterPoolSellsPct: 0,
} as const

export const DST_DAILY_FLOW: Array<{ date: string; inSut: number; outSut: number }> = [
  { date: '2026-05-01', inSut: 1223056, outSut: 1267500 },
  { date: '2026-05-02', inSut: 300000, outSut: 102500 },
  { date: '2026-05-03', inSut: 392085, outSut: 283750 },
  { date: '2026-05-04', inSut: 1350000, outSut: 1821250 },
  { date: '2026-05-05', inSut: 1300000, outSut: 1212500 },
  { date: '2026-05-06', inSut: 1430000, outSut: 1072000 },
  { date: '2026-05-07', inSut: 1300000, outSut: 1412222 },
  { date: '2026-05-08', inSut: 0, outSut: 817037 },
  { date: '2026-05-09', inSut: 2140000, outSut: 500000 },
  { date: '2026-05-10', inSut: 450000, outSut: 500000 },
  { date: '2026-05-11', inSut: 2000000, outSut: 1030000 },
  { date: '2026-05-12', inSut: 830000, outSut: 1000000 },
  { date: '2026-05-13', inSut: 925872, outSut: 1500000 },
  { date: '2026-05-14', inSut: 1090000, outSut: 1005036 },
  { date: '2026-05-15', inSut: 3582223, outSut: 2000132 },
  { date: '2026-05-16', inSut: 440000, outSut: 0 },
  { date: '2026-05-17', inSut: 253863, outSut: 0 },
  { date: '2026-05-18', inSut: 0, outSut: 0 },
  { date: '2026-05-19', inSut: 0, outSut: 1000000 },
]

/** HOP3 fan-out distribution — the retail terminus. */
export const HOP3_FANOUT_DAILY: Array<{ date: string; sut: number; transfers: number }> = [
  { date: '2026-05-13', sut: 1134184, transfers: 2317 },
  { date: '2026-05-14', sut: 1158991, transfers: 2677 },
  { date: '2026-05-15', sut: 930073, transfers: 1967 },
  { date: '2026-05-16', sut: 270574, transfers: 651 },
  { date: '2026-05-17', sut: 261258, transfers: 587 },
  { date: '2026-05-18', sut: 275777, transfers: 405 },
  { date: '2026-05-19', sut: 158406, transfers: 323 },
  { date: '2026-05-20', sut: 290369, transfers: 946 },
  { date: '2026-05-21', sut: 184916, transfers: 272 },
  { date: '2026-05-22', sut: 48158, transfers: 175 },
]

// ------------------------------------------------------------ holders / market

export const TOP_HOLDERS = [
  { rank: 1, address: '0xbc0e5c...6144', amount: 50_000_000, pct: 20.97, note: 'Unlabelled. Received 49,999,999 on 2025-10-21. May be the announced 2045 lock-up — UNCONFIRMED.' },
  { rank: 2, address: '0x...dEaD', amount: 50_000_000, pct: 20.97, note: 'Dead address ("burn"). totalSupply unchanged.' },
  { rank: 3, address: '0xd6eac4...7e81', amount: 18_000_000, pct: 7.55, note: 'Unlabelled.' },
  { rank: 4, address: '0xaaa4d5...cc2c', amount: 13_100_000, pct: 5.51, note: 'SOURCE wallet of the traced May chain.' },
  { rank: 5, address: '0xf46e16...7bc8', amount: 10_300_000, pct: 4.31, note: 'Appears as an inbound sender to HOP3.' },
  { rank: 6, address: '0x29da84...f841', amount: 10_000_000, pct: 4.19, note: 'Unlabelled.' },
  { rank: 7, address: '0x8b2fdf...bb72', amount: 10_000_000, pct: 4.19, note: 'Unlabelled.' },
]

export const MARKET_SNAPSHOT = {
  retrievedAt: '2026-09-30',
  priceUsd: 0.402565,
  priceSource: 'blockscout',
  marketCapUsd: 75_000_000,
  marketCapNote: 'CMC basis: 188.4M circulating. CoinGecko publishes no market cap.',
  fdvUsd: 94_800_000,
  volume24hUsd: 95_485.62,
  volume24hSource: 'blockscout',
  holdersBlockscout: 56_241,
  holdersCertik: 54_052,
  totalSupply: 238_403_732,
  circulatingCmc: 188_403_732,
  circulatingProjectReported: 46_588_062,
  circulatingStale: 2_024_492,
} as const

export const CERTIK = {
  retrievedAt: '2026-09-30',
  previousRetrievedAt: '2026-09-29',
  score: 74.23,
  previousScore: 74.06,
  grade: 'BBB',
  certikAudit: false,
  thirdPartyAudit: false,
  kyc: false,
  bugBounty: false,
  concentrationIndicator: 'High',
  majorHoldingRatioPct: 54.25,
  totalHolders24h: 54_052,
  activeUsers7d: 1_580,
  transactions7d: 5_799,
  tokensTransferred7dUsd: 1_610_000,
  ownerAddressShown: '0x88f76d...9acfc6ba',
  ownerStale: true,
  ownerStaleNote: 'Ownership was renounced to 0x000...000 on 2026-07-20. CertiK field is stale; on-chain wins.',
} as const

export const TOP100_BENCHMARK = {
  observationTime: '2026-09-30',
  sourceId: 'pdf-pip-thesis',
  confidence: 'SECONDARY' as const,
  rows: [
    { metric: 'Market cap to enter top 100', peer: '$413M (#100, BSV)', sut: '$75M', gap: '~5.5x' },
    { metric: 'Implied price required', peer: '~$2.19', sut: '$0.398', gap: '~5.5x' },
    { metric: 'Daily volume (median)', peer: '$46M', sut: '~$0.08M', gap: '~600x' },
    { metric: 'Volume / market cap (median)', peer: '12.4%', sut: '0.11%', gap: '~110x' },
    { metric: 'Lowest daily volume in band', peer: '$4.1M (meme, #93)', sut: '~$0.08M', gap: '~50x' },
    { metric: 'Security audit / verified team', peer: 'common', sut: 'none', gap: 'qualitative' },
    { metric: 'Tier-1 exchange listings', peer: 'most', sut: 'Gate, KuCoin, BingX, Uniswap', gap: 'qualitative' },
  ],
  caveat:
    'SUT has never held a top-100-scale market cap on any counted basis. When price exceeded $2.19 in 2025, only 2.02M was counted circulating (~$4-30M cap).',
} as const

// --------------------------------------------------------------- venues

export const VENUES = [
  { exchange: 'Gate', pair: 'SUT/USDT', volume24hUsd: 42_600, sharePct: 58, depthPlus2Pct: 4_400, depthMinus2Pct: 12_000, liquidityUsd: null, identityStatus: 'PAIR_VERIFIED' as const, retrievedAt: '2026-09-29' },
  { exchange: 'Uniswap V3 (Polygon)', pair: 'SUT/USDT', volume24hUsd: 22_000, sharePct: null, depthPlus2Pct: null, depthMinus2Pct: null, liquidityUsd: 91_680, identityStatus: 'CONTRACT_VERIFIED' as const, retrievedAt: '2026-09-30' },
  { exchange: 'BingX', pair: 'SUT/USDT', volume24hUsd: 5_300, sharePct: null, depthPlus2Pct: null, depthMinus2Pct: null, liquidityUsd: null, identityStatus: 'PAIR_VERIFIED' as const, retrievedAt: '2026-09-29' },
  { exchange: 'KuCoin', pair: 'SUT/USDT', volume24hUsd: 3_700, sharePct: null, depthPlus2Pct: null, depthMinus2Pct: null, liquidityUsd: null, identityStatus: 'PAIR_VERIFIED' as const, retrievedAt: '2026-09-29' },
  { exchange: 'GOPAX', pair: 'SUT/KRW', volume24hUsd: null, sharePct: null, depthPlus2Pct: null, depthMinus2Pct: null, liquidityUsd: null, identityStatus: 'PAIR_VERIFIED' as const, retrievedAt: '2026-09-29' },
  { exchange: 'MEXC', pair: 'SUT/USDT', volume24hUsd: null, sharePct: null, depthPlus2Pct: null, depthMinus2Pct: null, liquidityUsd: null, identityStatus: 'PAIR_VERIFIED' as const, retrievedAt: '2026-09-29' },
]

/** Historical CEX depth for May 2026 — no public source retains it. */
export const HISTORICAL_CEX_DEPTH_MAY2026 = null
