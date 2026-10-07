/**
 * LIVE MARKET SYNC — current production market state, captured as evidence.
 *
 * Layer 2 (CURRENT — SUT MARKET STATE). It never writes to layer 1 (frozen
 * research) or layer 3 (EXP-001 governance).
 *
 * Each retrieval produces independent MarketObservations: every one carries its
 * own identity, source, endpoint, both timestamps, the raw payload and a
 * SHA-256 of that payload. A value the source does not supply is
 * DATA_UNAVAILABLE with the real reason — never zero, never inferred.
 *
 * v1 depends on NO credentialed API. CoinMarketCap is deliberately out of the
 * v1 source set.
 */
import { SUT_CONTRACT, SUT_POOL, spotFromSqrtPriceX96 } from './daily-sync'

export { SUT_CONTRACT, SUT_POOL }

export const CHAIN = 'polygon'
export const ASSET = 'Super Trust'
export const TICKER = 'SUT'
/** token1 of the canonical pool — the quote asset of the on-chain spot price. */
export const QUOTE_TOKEN = 'USDT'
export const QUOTE_TOKEN_CONTRACT = '0xc2132d05d31c914a87c6611c10748aeb04b58e8f'

export const RAW_PAYLOAD_LIMIT = 20_000

export type ObservationStatus =
  | 'VALIDATED' | 'PARTIAL' | 'DATA_UNAVAILABLE' | 'ERROR' | 'IDENTITY_UNVERIFIED' | 'TICKER_ONLY'

export type IdentityStatus =
  | 'CONTRACT_VERIFIED' | 'PAIR_VERIFIED' | 'TICKER_ONLY' | 'IDENTITY_UNVERIFIED' | 'NOT_APPLICABLE'

export interface MarketObservation {
  id: string
  asset: string
  ticker: string
  contractAddress: string | null
  chain: string | null
  venue: string | null
  pair: string | null
  metric: string
  value: number | string | null
  unit: string
  /** when the fact was true, as stated by the source */
  observationTimestamp: string | null
  /** when this application asked */
  retrievalTimestamp: string
  source: string
  endpoint: string
  identityStatus: IdentityStatus
  status: ObservationStatus
  rawPayloadHash: string | null
  rawPayload: string
  methodology: string
  limitation: string | null
}

export interface SourceEvidence {
  sourceId: string
  source: string
  endpoint: string
  method: 'GET' | 'POST'
  httpStatus: number | null
  retrievalTimestamp: string
  payloadBytes: number
  payloadHash: string | null
  payload: string
  truncated: boolean
  error: string | null
  status: 'VALIDATED' | 'ERROR' | 'DATA_UNAVAILABLE'
  identityStatus: IdentityStatus
}

export type RunStatus = 'VALIDATED' | 'PARTIAL' | 'ERROR'
export type SyncTrigger = 'MANUAL' | 'SCHEDULED'

export interface SnapshotField {
  label: string
  metric: string
  value: number | string | null
  unit: string
  source: string
  observationTimestamp: string | null
  retrievalTimestamp: string | null
  identityStatus: IdentityStatus
  status: ObservationStatus
  reason: string | null
}

export interface LiveSyncRun {
  id: string
  date: string
  sequence: number
  trigger: SyncTrigger
  startedAt: string
  completedAt: string
  status: RunStatus
  observations: MarketObservation[]
  evidence: SourceEvidence[]
  snapshot: SnapshotField[]
  fingerprint: string
}

// ───────────────────────────────────────────── sources (v1: no credentials)

export interface LiveSource {
  id: string
  name: string
  endpoint: string
  method: 'GET' | 'POST'
  body?: unknown
  identityStatus: IdentityStatus
  methodology: string
  /** metrics this source is expected to supply */
  metrics: string[]
}

export const LIVE_SOURCES: LiveSource[] = [
  {
    id: 'coingecko-token',
    name: 'CoinGecko',
    endpoint: `https://api.coingecko.com/api/v3/simple/token_price/polygon-pos?contract_addresses=${SUT_CONTRACT}`
      + '&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true',
    method: 'GET',
    identityStatus: 'CONTRACT_VERIFIED',
    methodology: 'HTTP GET, asset addressed by Polygon contract address, never by ticker.',
    metrics: ['price', 'price_change_24h_pct', 'volume_24h', 'market_cap'],
  },
  {
    id: 'coingecko-asset',
    name: 'CoinGecko',
    endpoint: `https://api.coingecko.com/api/v3/coins/polygon-pos/contract/${SUT_CONTRACT}`,
    method: 'GET',
    identityStatus: 'CONTRACT_VERIFIED',
    methodology: 'HTTP GET, asset detail resolved from the same Polygon contract address.',
    metrics: ['circulating_supply', 'total_supply', 'max_supply', 'market_rank'],
  },
  {
    id: 'dexscreener-pair',
    name: 'DexScreener',
    endpoint: `https://api.dexscreener.com/latest/dex/tokens/${SUT_CONTRACT}`,
    method: 'GET',
    identityStatus: 'PAIR_VERIFIED',
    methodology: 'HTTP GET by token contract; only the row whose pairAddress equals the canonical pool is read.',
    metrics: ['pair_price', 'pair_liquidity_usd', 'pair_volume_24h', 'pair_price_change_24h_pct'],
  },
  {
    id: 'polygon-rpc',
    name: 'Polygon RPC',
    endpoint: 'https://polygon-bor-rpc.publicnode.com',
    method: 'POST',
    body: [
      { jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] },
      { jsonrpc: '2.0', id: 2, method: 'eth_call', params: [{ to: SUT_POOL, data: '0x3850c7bd' }, 'latest'] },
      { jsonrpc: '2.0', id: 3, method: 'eth_getBlockByNumber', params: ['latest', false] },
    ],
    identityStatus: 'CONTRACT_VERIFIED',
    methodology: 'JSON-RPC batch: eth_blockNumber, slot0() on the canonical pool, eth_getBlockByNumber for the '
      + 'block timestamp. Spot = (sqrtPriceX96 / 2^96)^2 adjusted for 18/6 decimals.',
    metrics: ['block_number', 'onchain_spot_price', 'block_timestamp'],
  },
  {
    id: 'coingecko-majors',
    name: 'CoinGecko',
    endpoint: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd'
      + '&include_24hr_change=true&include_last_updated_at=true',
    method: 'GET',
    identityStatus: 'NOT_APPLICABLE',
    methodology: 'HTTP GET by CoinGecko asset id. Broader-market context only; not a SUT measurement.',
    metrics: ['btc_price', 'btc_change_24h_pct', 'eth_price', 'eth_change_24h_pct'],
  },
  {
    id: 'coingecko-global',
    name: 'CoinGecko',
    endpoint: 'https://api.coingecko.com/api/v3/global',
    method: 'GET',
    identityStatus: 'NOT_APPLICABLE',
    methodology: 'HTTP GET. Broad market indicator.',
    metrics: ['total_market_cap_usd', 'total_market_cap_change_24h_pct'],
  },
]

/** CoinMarketCap is intentionally NOT part of the v1 live sync. */
export const DEFERRED_SOURCES = [
  {
    id: 'coinmarketcap',
    name: 'CoinMarketCap',
    reason: 'Deferred for v1: it requires a credentialed API and identifies the asset by ticker only, which the '
      + 'frozen research records as collision-prone for "SUT". The v1 live sync depends on no credentialed API.',
  },
] as const

// ───────────────────────────────────────────── fetch contract

export interface LiveFetchResult {
  sourceId: string
  httpStatus: number | null
  /** verbatim response text, exactly as received */
  bodyText: string
  parsed: unknown
  error: string | null
  retrievalTimestamp: string
}

export type LiveFetchPort = (s: LiveSource) => Promise<LiveFetchResult>

// ───────────────────────────────────────────── hashing

/** SHA-256 of the raw payload. Returns null when WebCrypto is unavailable — never a weaker substitute. */
export async function sha256Hex(text: string): Promise<string | null> {
  const subtle = (globalThis as { crypto?: Crypto }).crypto?.subtle
  if (!subtle) return null
  try {
    const buf = await subtle.digest('SHA-256', new TextEncoder().encode(text))
    return `sha256:${[...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')}`
  } catch {
    return null
  }
}

/**
 * Seal a run: the content fingerprint that `checkRunIntegrity` verifies against.
 * Exported so a caller can construct a well-formed run (for example a test
 * fixture or a QA resilience harness) without duplicating this algorithm.
 */
export function fingerprintRun(run: Omit<LiveSyncRun, 'fingerprint'>): string {
  let h = 0
  const raw = [
    run.id, run.startedAt, run.completedAt, run.trigger, run.status,
    run.observations.map((o) => `${o.id}:${o.metric}=${String(o.value)}@${o.observationTimestamp ?? '-'}#${o.status}`).join('|'),
    run.evidence.map((e) => `${e.sourceId}:${e.httpStatus}:${e.payloadHash ?? '-'}`).join('|'),
  ].join('~')
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0
  return `LMS-${(h >>> 0).toString(16).padStart(8, '0')}`
}

// ───────────────────────────────────────────── parsing helpers

const rec = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
/** A source reporting 0 for a capitalisation or a supply is publishing nothing, not measuring zero. */
const positive = (v: unknown): number | null => {
  const n = num(v)
  return n !== null && n > 0 ? n : null
}
const isoFromUnix = (v: unknown): string | null => {
  const n = num(v)
  return n === null ? null : new Date(n * 1000).toISOString()
}

export const syncId = (date: string, sequence: number) =>
  `LMS-${date}-${String(sequence).padStart(3, '0')}`

export const dateOf = (iso: string) => iso.slice(0, 10)

interface ObsSeed {
  metric: string
  value: number | string | null
  unit: string
  observationTimestamp: string | null
  asset?: string
  ticker?: string
  contractAddress?: string | null
  chain?: string | null
  venue?: string | null
  pair?: string | null
  identityStatus?: IdentityStatus
  limitation?: string | null
  statusOverride?: ObservationStatus
}

function makeObservation(
  runId: string, index: number, s: LiveSource, r: LiveFetchResult, hash: string | null, seed: ObsSeed,
): MarketObservation {
  const identityStatus = seed.identityStatus ?? s.identityStatus
  const status: ObservationStatus = seed.statusOverride
    ?? (seed.value === null
      ? (r.error !== null || (r.httpStatus !== null && r.httpStatus >= 400) ? 'ERROR' : 'DATA_UNAVAILABLE')
      : identityStatus === 'TICKER_ONLY' ? 'TICKER_ONLY'
      : identityStatus === 'IDENTITY_UNVERIFIED' ? 'IDENTITY_UNVERIFIED'
      : 'VALIDATED')
  return {
    id: `${runId}-OBS-${String(index).padStart(3, '0')}`,
    asset: seed.asset ?? ASSET,
    ticker: seed.ticker ?? TICKER,
    contractAddress: seed.contractAddress === undefined ? SUT_CONTRACT : seed.contractAddress,
    chain: seed.chain === undefined ? CHAIN : seed.chain,
    venue: seed.venue ?? null,
    pair: seed.pair ?? null,
    metric: seed.metric,
    value: seed.value,
    unit: seed.unit,
    observationTimestamp: seed.observationTimestamp,
    retrievalTimestamp: r.retrievalTimestamp,
    source: s.name,
    endpoint: s.endpoint,
    identityStatus,
    status,
    rawPayloadHash: hash,
    rawPayload: r.bodyText.slice(0, RAW_PAYLOAD_LIMIT),
    methodology: s.methodology,
    limitation: seed.limitation ?? null,
  }
}

function failureSeeds(s: LiveSource, reason: string): ObsSeed[] {
  return s.metrics.map((metric) => ({
    metric, value: null, unit: '', observationTimestamp: null, limitation: reason,
    ...(s.id === 'coingecko-majors' || s.id === 'coingecko-global'
      ? { asset: 'market context', ticker: '—', contractAddress: null, chain: null, identityStatus: 'NOT_APPLICABLE' as IdentityStatus }
      : {}),
  }))
}

// ───────────────────────────────────────────── per-source parsers

function parseCoinGeckoToken(r: LiveFetchResult): ObsSeed[] {
  const body = rec(r.parsed)
  const e = body ? rec(body[SUT_CONTRACT] ?? body[SUT_CONTRACT.toLowerCase()]) : null
  if (!e) {
    return failureSeedsFor(['price', 'price_change_24h_pct', 'volume_24h', 'market_cap'],
      'the source returned no entry for this contract address')
  }
  const at = isoFromUnix(e['last_updated_at'])
  const mcap = positive(e['usd_market_cap'])
  return [
    { metric: 'price', value: num(e['usd']), unit: 'USD', observationTimestamp: at },
    { metric: 'price_change_24h_pct', value: num(e['usd_24h_change']), unit: 'percent', observationTimestamp: at },
    { metric: 'volume_24h', value: num(e['usd_24h_vol']), unit: 'USD', observationTimestamp: at },
    {
      metric: 'market_cap', value: mcap, unit: 'USD', observationTimestamp: at,
      limitation: mcap === null
        ? 'the source publishes no market capitalisation for this contract (it reports 0, which is not a measurement)'
        : null,
    },
  ]
}

const failureSeedsFor = (metrics: string[], reason: string): ObsSeed[] =>
  metrics.map((metric) => ({ metric, value: null, unit: '', observationTimestamp: null, limitation: reason }))

function parseCoinGeckoAsset(r: LiveFetchResult): ObsSeed[] {
  const body = rec(r.parsed)
  if (!body) {
    return failureSeedsFor(['circulating_supply', 'total_supply', 'max_supply', 'market_rank'],
      'the source returned no asset detail for this contract address')
  }
  const at = typeof body['last_updated'] === 'string' ? (body['last_updated'] as string) : null
  const md = rec(body['market_data'])
  const circ = positive(md?.['circulating_supply'])
  const total = positive(md?.['total_supply'])
  const max = positive(md?.['max_supply'])
  const rank = positive(body['market_cap_rank'])
  return [
    {
      metric: 'circulating_supply', value: circ, unit: 'SUT', observationTimestamp: at,
      limitation: circ === null ? 'the source publishes no circulating supply for this asset (it reports 0)' : null,
    },
    {
      metric: 'total_supply', value: total, unit: 'SUT', observationTimestamp: at,
      limitation: total === null ? 'the source publishes no total supply for this asset' : null,
    },
    {
      metric: 'max_supply', value: max, unit: 'SUT', observationTimestamp: at,
      limitation: max === null ? 'the source publishes no maximum supply for this asset' : null,
    },
    {
      metric: 'market_rank', value: rank, unit: 'rank', observationTimestamp: at,
      limitation: rank === null ? 'the source assigns no market-cap rank to this asset' : null,
    },
  ]
}

function parseDexScreener(r: LiveFetchResult): ObsSeed[] {
  const body = rec(r.parsed)
  const pairs = body && Array.isArray(body['pairs']) ? (body['pairs'] as unknown[]).map(rec) : []
  const pair = pairs.find((p) =>
    typeof p?.['pairAddress'] === 'string' && (p['pairAddress'] as string).toLowerCase() === SUT_POOL) ?? null
  const metrics = ['pair_price', 'pair_liquidity_usd', 'pair_volume_24h', 'pair_price_change_24h_pct']
  if (!pair) {
    return failureSeedsFor(metrics,
      `the source returned no row for the canonical pool ${SUT_POOL}; no other pair is substituted`)
  }
  const baseToken = rec(pair['baseToken'])
  const quoteToken = rec(pair['quoteToken'])
  const baseAddr = typeof baseToken?.['address'] === 'string' ? (baseToken['address'] as string) : null
  const identityStatus: IdentityStatus = baseAddr && baseAddr.toLowerCase() === SUT_CONTRACT.toLowerCase()
    ? 'CONTRACT_VERIFIED'
    : 'PAIR_VERIFIED'
  const venue = typeof pair['dexId'] === 'string' ? (pair['dexId'] as string) : 'unknown DEX'
  const pairLabel = `${baseToken?.['symbol'] ?? TICKER}/${quoteToken?.['symbol'] ?? QUOTE_TOKEN}`
  const common = {
    venue, pair: pairLabel, identityStatus,
    chain: typeof pair['chainId'] === 'string' ? (pair['chainId'] as string) : CHAIN,
    observationTimestamp: null as string | null,
    limitation: 'the source publishes no observation timestamp for a pair row; '
      + 'pool liquidity is a DEX reserve figure, never a CEX order book or a bid/ask spread',
  }
  const price = typeof pair['priceUsd'] === 'string' ? num(Number(pair['priceUsd'])) : num(pair['priceUsd'])
  return [
    { ...common, metric: 'pair_price', value: price, unit: 'USD' },
    { ...common, metric: 'pair_liquidity_usd', value: num(rec(pair['liquidity'])?.['usd']), unit: 'USD' },
    { ...common, metric: 'pair_volume_24h', value: num(rec(pair['volume'])?.['h24']), unit: 'USD' },
    { ...common, metric: 'pair_price_change_24h_pct', value: num(rec(pair['priceChange'])?.['h24']), unit: 'percent' },
    {
      ...common, metric: 'pair_address',
      value: typeof pair['pairAddress'] === 'string' ? (pair['pairAddress'] as string) : null,
      unit: 'address',
    },
  ]
}

function parsePolygonRpc(r: LiveFetchResult): ObsSeed[] {
  const rows = Array.isArray(r.parsed) ? (r.parsed as unknown[]).map(rec) : []
  const byId = (id: number) => rows.find((x) => num(x?.['id']) === id) ?? null
  const blockHex = byId(1)?.['result']
  const slotHex = byId(2)?.['result']
  const block = rec(byId(3)?.['result'])
  const none = 'the node returned no result for this call'

  let blockTime: string | null = null
  if (typeof block?.['timestamp'] === 'string') {
    try { blockTime = new Date(Number(BigInt(block['timestamp'] as string)) * 1000).toISOString() } catch { blockTime = null }
  }
  let spot: number | null = null
  if (typeof slotHex === 'string' && slotHex.length >= 66) {
    try { spot = spotFromSqrtPriceX96(BigInt(`0x${slotHex.slice(2, 66)}`)) } catch { spot = null }
  }
  const blockNumber = typeof blockHex === 'string' ? Number(BigInt(blockHex)) : null
  const common = {
    venue: 'Uniswap V3 (Polygon)', pair: `${TICKER}/${QUOTE_TOKEN}`,
    observationTimestamp: blockTime,
  }
  return [
    {
      ...common, metric: 'onchain_spot_price', value: spot, unit: `${QUOTE_TOKEN} per ${TICKER}`,
      limitation: spot === null ? none : `slot0() on pool ${SUT_POOL}; quote token ${QUOTE_TOKEN_CONTRACT}`,
    },
    { ...common, metric: 'block_number', value: blockNumber, unit: 'block', limitation: blockNumber === null ? none : null },
    {
      ...common, metric: 'block_timestamp', value: blockTime, unit: 'ISO-8601',
      limitation: blockTime === null ? none : null,
    },
  ]
}

function parseMajors(r: LiveFetchResult): ObsSeed[] {
  const body = rec(r.parsed)
  const out: ObsSeed[] = []
  for (const [id, sym] of [['bitcoin', 'BTC'], ['ethereum', 'ETH']] as const) {
    const e = body ? rec(body[id]) : null
    const at = e ? isoFromUnix(e['last_updated_at']) : null
    const base = {
      asset: sym === 'BTC' ? 'Bitcoin' : 'Ethereum', ticker: sym,
      contractAddress: null, chain: null, identityStatus: 'NOT_APPLICABLE' as IdentityStatus,
      observationTimestamp: at,
      limitation: 'broader-market context only; not a SUT measurement and not a cause of any SUT movement',
    }
    out.push({ ...base, metric: `${sym.toLowerCase()}_price`, value: e ? num(e['usd']) : null, unit: 'USD' })
    out.push({ ...base, metric: `${sym.toLowerCase()}_change_24h_pct`, value: e ? num(e['usd_24h_change']) : null, unit: 'percent' })
  }
  return out
}

function parseGlobal(r: LiveFetchResult): ObsSeed[] {
  const data = rec(rec(r.parsed)?.['data'])
  const at = data ? isoFromUnix(data['updated_at']) : null
  const base = {
    asset: 'total crypto market', ticker: '—', contractAddress: null, chain: null,
    identityStatus: 'NOT_APPLICABLE' as IdentityStatus, observationTimestamp: at,
    limitation: 'broad market indicator; not a SUT measurement',
  }
  return [
    { ...base, metric: 'total_market_cap_usd', value: num(rec(data?.['total_market_cap'])?.['usd']), unit: 'USD' },
    {
      ...base, metric: 'total_market_cap_change_24h_pct',
      value: data ? num(data['market_cap_change_percentage_24h_usd']) : null, unit: 'percent',
    },
  ]
}

const PARSERS: Record<string, (r: LiveFetchResult) => ObsSeed[]> = {
  'coingecko-token': parseCoinGeckoToken,
  'coingecko-asset': parseCoinGeckoAsset,
  'dexscreener-pair': parseDexScreener,
  'polygon-rpc': parsePolygonRpc,
  'coingecko-majors': parseMajors,
  'coingecko-global': parseGlobal,
}

// ───────────────────────────────────────────── snapshot (valid observations only)

const SNAPSHOT_FIELDS: Array<[string, string]> = [
  ['SUT price', 'price'],
  ['24h change', 'price_change_24h_pct'],
  ['24h volume', 'volume_24h'],
  ['Market cap', 'market_cap'],
  ['Circulating supply', 'circulating_supply'],
  ['Total supply', 'total_supply'],
  ['Max supply', 'max_supply'],
  ['Market rank', 'market_rank'],
  ['Pool liquidity', 'pair_liquidity_usd'],
  ['Pool volume (24h)', 'pair_volume_24h'],
  ['DEX / pair', 'pair_address'],
  ['On-chain spot', 'onchain_spot_price'],
  ['Block number', 'block_number'],
  ['BTC price', 'btc_price'],
  ['BTC 24h change', 'btc_change_24h_pct'],
  ['ETH price', 'eth_price'],
  ['ETH 24h change', 'eth_change_24h_pct'],
  ['Total crypto market cap', 'total_market_cap_usd'],
  ['Total market cap 24h change', 'total_market_cap_change_24h_pct'],
]

/** The displayed snapshot. Only VALIDATED/PAIR-verified observations carry a value. */
export function buildSnapshot(observations: MarketObservation[]): SnapshotField[] {
  return SNAPSHOT_FIELDS.map(([label, metric]) => {
    const o = observations.find((x) => x.metric === metric)
    if (!o) {
      return {
        label, metric, value: null, unit: '', source: 'not captured',
        observationTimestamp: null, retrievalTimestamp: null,
        identityStatus: 'NOT_APPLICABLE' as IdentityStatus, status: 'DATA_UNAVAILABLE' as ObservationStatus,
        reason: 'no source in this run supplies this metric',
      }
    }
    const usable = o.status === 'VALIDATED' || o.status === 'PARTIAL'
    return {
      label,
      metric,
      value: usable ? o.value : null,
      unit: o.unit,
      source: `${o.source}${o.venue ? ` · ${o.venue}` : ''}`,
      observationTimestamp: o.observationTimestamp,
      retrievalTimestamp: o.retrievalTimestamp,
      identityStatus: o.identityStatus,
      status: o.status,
      reason: usable ? null : (o.limitation ?? 'the source did not supply this value'),
    }
  })
}

// ───────────────────────────────────────────── per-metric evidence (read-only views)

/**
 * Everything needed to trace ONE displayed metric back to the response it came
 * from. Purely derived from the stored run: no timestamp is generated, no value
 * is recomputed, nothing is estimated.
 */
export interface MetricEvidence {
  metric: string
  label: string
  value: number | string | null
  unit: string
  status: ObservationStatus
  reason: string | null
  // source
  source: string
  endpoint: string
  methodology: string
  // timestamps, exactly as stored
  observationTimestamp: string | null
  retrievalTimestamp: string
  syncId: string
  // identity
  asset: string
  ticker: string
  identityStatus: IdentityStatus
  contractAddress: string | null
  chain: string | null
  venue: string | null
  pair: string | null
  // transport + raw evidence
  httpStatus: number | null
  sourceStatus: SourceEvidence['status']
  payloadHash: string | null
  payloadBytes: number
  payload: string
  truncated: boolean
  error: string | null
}

/** Join one snapshot field with its observation and its source evidence. */
export function metricEvidence(run: LiveSyncRun, metric: string): MetricEvidence | null {
  const field = run.snapshot.find((f) => f.metric === metric) ?? null
  const observation = run.observations.find((o) => o.metric === metric) ?? null
  if (!observation) return null
  const evidence = run.evidence.find((e) => e.source === observation.source
    && e.endpoint === observation.endpoint) ?? null
  return {
    metric,
    label: field?.label ?? metric,
    value: field ? field.value : observation.value,
    unit: observation.unit,
    status: observation.status,
    reason: field?.reason ?? observation.limitation,
    source: observation.source,
    endpoint: observation.endpoint,
    methodology: observation.methodology,
    observationTimestamp: observation.observationTimestamp,
    retrievalTimestamp: observation.retrievalTimestamp,
    syncId: run.id,
    asset: observation.asset,
    ticker: observation.ticker,
    identityStatus: observation.identityStatus,
    contractAddress: observation.contractAddress,
    chain: observation.chain,
    venue: observation.venue,
    pair: observation.pair,
    httpStatus: evidence?.httpStatus ?? null,
    sourceStatus: evidence?.status ?? 'DATA_UNAVAILABLE',
    payloadHash: observation.rawPayloadHash,
    payloadBytes: evidence?.payloadBytes ?? observation.rawPayload.length,
    payload: evidence?.payload ?? observation.rawPayload,
    truncated: evidence?.truncated ?? false,
    error: evidence?.error ?? null,
  }
}

/** Evidence for every displayed snapshot field, in display order. */
export function allMetricEvidence(run: LiveSyncRun): MetricEvidence[] {
  return run.snapshot
    .map((f) => metricEvidence(run, f.metric))
    .filter((x): x is MetricEvidence => x !== null)
}

export interface EvidenceHeader {
  syncId: string
  capturedAt: string
  status: RunStatus
  sourcesOk: number
  sourcesTotal: number
  observationsWithValue: number
  observationsTotal: number
  integrity: 'OK' | 'TAMPERED'
}

export function evidenceHeader(run: LiveSyncRun): EvidenceHeader {
  return {
    syncId: run.id,
    capturedAt: run.completedAt,
    status: run.status,
    sourcesOk: run.evidence.filter((e) => e.status === 'VALIDATED').length,
    sourcesTotal: run.evidence.length,
    observationsWithValue: run.observations.filter((o) => o.status === 'VALIDATED').length,
    observationsTotal: run.observations.length,
    integrity: checkRunIntegrity(run),
  }
}

/**
 * Render a STORED ISO-8601 timestamp for display without converting it.
 * The stored value is UTC; this only reformats the text and labels the zone, so
 * no local-time conversion and no clock reading can occur.
 */
export function formatUtc(iso: string | null): string {
  if (!iso) return 'DATA UNAVAILABLE'
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/.exec(iso)
  return m ? `${m[1]} ${m[2]} UTC` : iso
}

export function runStatusOf(evidence: SourceEvidence[]): RunStatus {
  const ok = evidence.filter((e) => e.status === 'VALIDATED').length
  if (ok === 0) return 'ERROR'
  return ok === evidence.length ? 'VALIDATED' : 'PARTIAL'
}

// ───────────────────────────────────────────── run assembly

export async function buildRun(args: {
  results: LiveFetchResult[]
  sources?: LiveSource[]
  startedAt: string
  completedAt: string
  sequence: number
  trigger: SyncTrigger
}): Promise<LiveSyncRun> {
  const sources = args.sources ?? LIVE_SOURCES
  const date = dateOf(args.completedAt)
  const id = syncId(date, args.sequence)

  const observations: MarketObservation[] = []
  const evidence: SourceEvidence[] = []
  let index = 0

  for (const s of sources) {
    const r = args.results.find((x) => x.sourceId === s.id)
      ?? {
        sourceId: s.id, httpStatus: null, bodyText: '', parsed: null,
        error: 'no response was recorded for this source', retrievalTimestamp: args.completedAt,
      }
    const hash = r.bodyText ? await sha256Hex(r.bodyText) : null
    const failed = r.error !== null || r.httpStatus === null || r.httpStatus >= 400

    evidence.push({
      sourceId: s.id,
      source: s.name,
      endpoint: s.endpoint,
      method: s.method,
      httpStatus: r.httpStatus,
      retrievalTimestamp: r.retrievalTimestamp,
      payloadBytes: r.bodyText.length,
      payloadHash: hash,
      payload: r.bodyText.slice(0, RAW_PAYLOAD_LIMIT),
      truncated: r.bodyText.length > RAW_PAYLOAD_LIMIT,
      error: r.error,
      status: failed ? 'ERROR' : 'VALIDATED',
      identityStatus: s.identityStatus,
    })

    const reason = r.error !== null
      ? `the request could not be completed: ${r.error}`
      : r.httpStatus === 429 ? `the source rate-limited this retrieval (HTTP 429)`
      : r.httpStatus !== null && r.httpStatus >= 400 ? `the source returned an error status (HTTP ${r.httpStatus})`
      : 'the source returned no readable payload'

    const seeds = failed ? failureSeeds(s, reason) : (PARSERS[s.id]?.(r) ?? failureSeeds(s, reason))
    for (const seed of seeds) {
      observations.push(makeObservation(id, ++index, s, r, hash, seed))
    }
  }

  const draft = {
    id, date, sequence: args.sequence, trigger: args.trigger,
    startedAt: args.startedAt, completedAt: args.completedAt,
    status: runStatusOf(evidence),
    observations, evidence,
    snapshot: buildSnapshot(observations),
  }
  return { ...draft, fingerprint: fingerprintRun(draft) }
}

export function checkRunIntegrity(run: LiveSyncRun): 'OK' | 'TAMPERED' {
  const { fingerprint: _f, ...rest } = run
  return fingerprintRun(rest) === run.fingerprint ? 'OK' : 'TAMPERED'
}

// ───────────────────────────────────────────── comparison

export interface MetricComparison {
  label: string
  metric: string
  previousValue: number | string | null
  currentValue: number | string | null
  absoluteChange: number | null
  percentChange: number | null
  unit: string
  source: string
  previousTimestamp: string | null
  currentTimestamp: string | null
  status: 'COMPARED' | 'COMPARISON_UNAVAILABLE'
  reason: string | null
}

/**
 * Compare two runs metric by metric. A change is produced only when BOTH values
 * are real numbers; a percentage only when the previous value is non-zero.
 * A missing historical value is never inferred.
 */
export function compareRuns(current: LiveSyncRun, previous: LiveSyncRun | null): MetricComparison[] {
  return current.snapshot.map((cur) => {
    const prev = previous?.snapshot.find((p) => p.metric === cur.metric) ?? null
    const base: MetricComparison = {
      label: cur.label,
      metric: cur.metric,
      previousValue: prev?.value ?? null,
      currentValue: cur.value,
      absoluteChange: null,
      percentChange: null,
      unit: cur.unit,
      source: cur.source,
      previousTimestamp: prev?.observationTimestamp ?? previous?.completedAt ?? null,
      currentTimestamp: cur.observationTimestamp ?? current.completedAt,
      status: 'COMPARISON_UNAVAILABLE',
      reason: null,
    }
    if (!previous) return { ...base, reason: 'no earlier sync is stored' }
    if (typeof cur.value !== 'number' || typeof prev?.value !== 'number') {
      return {
        ...base,
        reason: cur.value === null || typeof cur.value !== 'number'
          ? 'the current value is not a comparable number'
          : 'the previous sync has no comparable value for this metric',
      }
    }
    const absoluteChange = cur.value - prev.value
    return {
      ...base,
      absoluteChange,
      percentChange: prev.value === 0 ? null : (absoluteChange / prev.value) * 100,
      status: 'COMPARED',
      reason: prev.value === 0 ? 'a percentage change is undefined against a previous value of 0' : null,
    }
  })
}

// ───────────────────────────────────────────── structural guarantees

/** The live sync writes market observations only. */
export function liveSyncMutatesGovernance(): false { return false }
/** The live sync never rewrites the frozen research. */
export function liveSyncMutatesResearch(): false { return false }
/** A proposal produced after a sync is never a measured result. */
export function liveSyncProducesResult(): false { return false }
