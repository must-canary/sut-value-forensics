/**
 * Daily market-data observation layer — ADDITIVE, and strictly separate from EXP-001.
 *
 * This is NOT the experiment. It records what public sources published at a
 * stated moment, with full provenance, and it may never approve a threshold,
 * approve a baseline, create an intervention, a comparison or a result.
 *
 * Rules enforced here:
 *   - every observation carries source, source URL, retrieval time, data time,
 *     value, unit, symbol, source status, freshness and provenance;
 *   - a field the source does not supply is DATA UNAVAILABLE with a stated
 *     reason — never zero, never carried over from an earlier day;
 *   - identity follows the contract, never the ticker: a CEX "SUT" row is
 *     TICKER_ONLY and is labelled as such;
 *   - a comparison between SUT and the broader market is an OBSERVATION. No
 *     causal sentence is ever generated.
 */

export const SUT_CONTRACT = '0x98965474ecbec2f532f1f780ee37b0b05f77ca55'
export const SUT_POOL = '0x092295c92bab5e734c4a60dbc0f0ffdcdfc4e165'

export const DAILY_DISCLAIMER =
  'This daily report is generated from publicly available market and other public data accessible at the '
  + 'time of retrieval. It is an observational market-data snapshot and does not by itself establish '
  + 'causality, business impact, or the root cause of SUT price movements. Values may be delayed, revised, '
  + 'unavailable, or source-dependent.'

export const INTERPRETATION_NOTE =
  'The report should be interpreted according to the retrieval timestamp and source provenance.'

export const STALE_AFTER_MINUTES = 60

export type FieldStatus = 'OK' | 'DATA_UNAVAILABLE'
export type Freshness = 'CURRENT' | 'STALE' | 'UNKNOWN'
export type SourceStatus =
  | 'OK' | 'HTTP_ERROR' | 'RATE_LIMITED' | 'NETWORK_OR_CORS_BLOCKED' | 'MALFORMED' | 'NOT_CONFIGURED'
export type IdentityLevel = 'CONTRACT_VERIFIED' | 'PAIR_VERIFIED' | 'TICKER_ONLY' | 'NOT_APPLICABLE'
export type SyncStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED'

export interface Observation {
  field: string
  symbol: string
  value: number | string | null
  unit: string
  sourceId: string
  sourceName: string
  sourceUrl: string
  /** when this application asked the source */
  retrievedAt: string
  /** the timestamp the source itself attached to the value */
  dataTimestamp: string | null
  freshness: Freshness
  status: FieldStatus
  unavailableReason: string | null
  identity: IdentityLevel
  provenance: string
}

export interface SourceDescriptor {
  id: string
  name: string
  url: string
  method: 'GET' | 'POST'
  body?: unknown
  /**
   * Request headers. Built at run time by the server-side entrypoint only, so a
   * credential never reaches the browser bundle and is never persisted.
   */
  headers?: Record<string, string>
  identity: IdentityLevel
  provides: string[]
  note: string
  /** Set when the source cannot be used without a credential. */
  credentialEnvVar?: string
}

export interface FetchResult {
  sourceId: string
  ok: boolean
  httpStatus: number | null
  body: unknown
  error: string | null
  retrievedAt: string
}

export interface RawRecord {
  sourceId: string
  httpStatus: number | null
  error: string | null
  retrievedAt: string
  /** Bounded excerpt of exactly what the source returned, kept as evidence. */
  payloadExcerpt: string
  payloadBytes: number
  payloadHash: string
}

export interface SourceOutcome {
  sourceId: string
  sourceName: string
  url: string
  status: SourceStatus
  httpStatus: number | null
  retrievedAt: string
  detail: string
  fields: string[]
}

export type FetchPort = (s: SourceDescriptor) => Promise<FetchResult>

// ───────────────────────────────────────────────── sources (real, CORS-reachable)

export const SOURCES: SourceDescriptor[] = [
  {
    id: 'coingecko-token',
    name: 'CoinGecko — simple/token_price (by contract)',
    url: `https://api.coingecko.com/api/v3/simple/token_price/polygon-pos?contract_addresses=${SUT_CONTRACT}`
      + '&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true',
    method: 'GET',
    identity: 'CONTRACT_VERIFIED',
    provides: ['SUT price', 'SUT 24h change', 'SUT 24h volume', 'SUT market cap'],
    note: 'Addressed by the Polygon contract, not by the ticker.',
  },
  {
    id: 'coingecko-asset',
    name: 'CoinGecko — coins/polygon-pos/contract (asset detail)',
    url: `https://api.coingecko.com/api/v3/coins/polygon-pos/contract/${SUT_CONTRACT}`,
    method: 'GET',
    identity: 'CONTRACT_VERIFIED',
    provides: ['SUT circulating supply', 'SUT total supply', 'SUT max supply', 'SUT market rank', 'SUT venues'],
    note: 'Asset-level detail resolved from the same contract address.',
  },
  {
    id: 'coingecko-majors',
    name: 'CoinGecko — simple/price (BTC, ETH)',
    url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd'
      + '&include_24hr_change=true&include_last_updated_at=true',
    method: 'GET',
    identity: 'NOT_APPLICABLE',
    provides: ['BTC price', 'BTC 24h change', 'ETH price', 'ETH 24h change'],
    note: 'Broader-market context only.',
  },
  {
    id: 'coingecko-global',
    name: 'CoinGecko — global',
    url: 'https://api.coingecko.com/api/v3/global',
    method: 'GET',
    identity: 'NOT_APPLICABLE',
    provides: ['Total crypto market cap', 'Total market cap 24h change'],
    note: 'Broad market indicator.',
  },
  {
    id: 'dexscreener-pair',
    name: 'DexScreener — tokens (by contract)',
    url: `https://api.dexscreener.com/latest/dex/tokens/${SUT_CONTRACT}`,
    method: 'GET',
    identity: 'PAIR_VERIFIED',
    provides: ['Pool liquidity (USD)', 'Pool 24h volume', 'Pair price', 'Pair 24h change'],
    note: 'Pair-level liquidity for the SUT/USDT pool.',
  },
  {
    id: 'polygon-rpc',
    name: 'Polygon RPC — slot0 (direct contract read)',
    url: 'https://polygon-bor-rpc.publicnode.com',
    method: 'POST',
    body: [
      { jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] },
      { jsonrpc: '2.0', id: 2, method: 'eth_call', params: [{ to: SUT_POOL, data: '0x3850c7bd' }, 'latest'] },
      { jsonrpc: '2.0', id: 3, method: 'eth_getBlockByNumber', params: ['latest', false] },
    ],
    identity: 'CONTRACT_VERIFIED',
    provides: ['On-chain spot price', 'Block number'],
    note: 'The only source read directly from the chain; identity cannot be confused with another ticker.',
  },
  {
    id: 'coinmarketcap',
    name: 'CoinMarketCap — cryptocurrency/quotes/latest',
    url: '',
    method: 'GET',
    identity: 'TICKER_ONLY',
    provides: ['CMC price', 'CMC 24h change', 'CMC 24h volume', 'CMC market cap',
      'CMC fully diluted market cap', 'CMC circulating supply', 'CMC total supply', 'CMC max supply',
      'CMC rank', 'CMC identity check'],
    note: 'Requires an API key and blocks browser requests, so it runs only in the scheduled server-side sync. '
      + 'It is addressed by the ticker SUT, which is NOT contract-verified: a ticker may refer to a different asset.',
    credentialEnvVar: 'CMC_API_KEY',
  },
  {
    id: 'public-news',
    name: 'Public market news / events',
    url: '',
    method: 'GET',
    identity: 'NOT_APPLICABLE',
    provides: ['Market events / news'],
    note: 'No public, browser-reachable news feed is configured for this asset.',
  },
]

// ───────────────────────────────────────────────── helpers

const iso = (ms: number) => new Date(ms).toISOString()

export function freshnessOf(dataTimestamp: string | null, now: string, maxMinutes = STALE_AFTER_MINUTES): Freshness {
  if (!dataTimestamp) return 'UNKNOWN'
  const age = Date.parse(now) - Date.parse(dataTimestamp)
  if (Number.isNaN(age)) return 'UNKNOWN'
  return age <= maxMinutes * 60_000 ? 'CURRENT' : 'STALE'
}

function obs(o: Omit<Observation, 'freshness' | 'status'> & { now: string }): Observation {
  const { now, ...rest } = o
  return {
    ...rest,
    freshness: rest.value === null ? 'UNKNOWN' : freshnessOf(rest.dataTimestamp, now),
    status: rest.value === null ? 'DATA_UNAVAILABLE' : 'OK',
  }
}

/** A value the source did not supply. Never zero-filled, never carried over. */
function unavailable(
  field: string, symbol: string, unit: string, s: SourceDescriptor, retrievedAt: string, reason: string, now: string,
): Observation {
  return obs({
    field, symbol, value: null, unit, sourceId: s.id, sourceName: s.name, sourceUrl: s.url,
    retrievedAt, dataTimestamp: null, unavailableReason: reason, identity: s.identity,
    provenance: `${s.name} — ${s.note}`, now,
  })
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

/** CoinGecko reports an absent market cap / supply as 0 — that is not a measurement. */
const positive = (v: unknown): number | null => {
  const n = num(v)
  return n !== null && n > 0 ? n : null
}

const rec = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null

export function sourceStatusOf(r: FetchResult): SourceStatus {
  if (r.error) return 'NETWORK_OR_CORS_BLOCKED'
  if (r.httpStatus === 429) return 'RATE_LIMITED'
  if (r.httpStatus !== null && r.httpStatus >= 400) return 'HTTP_ERROR'
  if (r.body === null || r.body === undefined) return 'MALFORMED'
  return 'OK'
}

// ───────────────────────────────────────────────── per-source mapping

function mapCoinGeckoToken(s: SourceDescriptor, r: FetchResult, now: string): Observation[] {
  const body = rec(r.body)
  const entry = body ? rec(body[SUT_CONTRACT] ?? body[SUT_CONTRACT.toLowerCase()]) : null
  const noEntry = 'the source returned no entry for this contract address'
  if (!entry) {
    return [
      unavailable('SUT price', 'SUT', 'USD', s, r.retrievedAt, noEntry, now),
      unavailable('SUT 24h change', 'SUT', 'percent', s, r.retrievedAt, noEntry, now),
      unavailable('SUT 24h volume', 'SUT', 'USD', s, r.retrievedAt, noEntry, now),
      unavailable('SUT market cap', 'SUT', 'USD', s, r.retrievedAt, noEntry, now),
    ]
  }
  const ts = num(entry['last_updated_at'])
  const dataTimestamp = ts === null ? null : iso(ts * 1000)
  const base = {
    symbol: 'SUT', sourceId: s.id, sourceName: s.name, sourceUrl: s.url, retrievedAt: r.retrievedAt,
    dataTimestamp, identity: s.identity, provenance: `${s.name} — contract ${SUT_CONTRACT}`, now,
  }
  const mcap = positive(entry['usd_market_cap'])
  return [
    obs({ ...base, field: 'SUT price', value: num(entry['usd']), unit: 'USD', unavailableReason: num(entry['usd']) === null ? noEntry : null }),
    obs({ ...base, field: 'SUT 24h change', value: num(entry['usd_24h_change']), unit: 'percent', unavailableReason: num(entry['usd_24h_change']) === null ? noEntry : null }),
    obs({ ...base, field: 'SUT 24h volume', value: num(entry['usd_24h_vol']), unit: 'USD', unavailableReason: num(entry['usd_24h_vol']) === null ? noEntry : null }),
    obs({
      ...base, field: 'SUT market cap', value: mcap, unit: 'USD',
      unavailableReason: mcap === null ? 'the source publishes no market capitalisation for this contract (it reports 0, which is not a measurement)' : null,
    }),
  ]
}

function mapCoinGeckoAsset(s: SourceDescriptor, r: FetchResult, now: string): Observation[] {
  const body = rec(r.body)
  const md = body ? rec(body['market_data']) : null
  const none = 'the source publishes no value for this field'
  if (!body) {
    return [
      unavailable('SUT circulating supply', 'SUT', 'SUT', s, r.retrievedAt, none, now),
      unavailable('SUT total supply', 'SUT', 'SUT', s, r.retrievedAt, none, now),
      unavailable('SUT market rank', 'SUT', 'rank', s, r.retrievedAt, none, now),
      unavailable('SUT venues', 'SUT', 'venues', s, r.retrievedAt, none, now),
    ]
  }
  const lastUpdated = typeof body['last_updated'] === 'string' ? (body['last_updated'] as string) : null
  const base = {
    symbol: 'SUT', sourceId: s.id, sourceName: s.name, sourceUrl: s.url, retrievedAt: r.retrievedAt,
    dataTimestamp: lastUpdated, identity: s.identity, provenance: `${s.name} — contract ${SUT_CONTRACT}`, now,
  }
  const circ = positive(md?.['circulating_supply'])
  const total = positive(md?.['total_supply'])
  const max = positive(md?.['max_supply'])
  const rank = positive(body['market_cap_rank'])

  const tickers = Array.isArray(body['tickers']) ? (body['tickers'] as unknown[]) : []
  const venues = tickers.map((t) => {
    const tr = rec(t)
    const market = tr ? rec(tr['market']) : null
    const name = market && typeof market['name'] === 'string' ? market['name'] : 'unknown venue'
    const onChain = typeof tr?.['base'] === 'string' && (tr['base'] as string).toLowerCase().startsWith('0x')
    return `${name} (${onChain ? 'contract-addressed' : 'ticker-identified'})`
  })

  return [
    obs({
      ...base, field: 'SUT circulating supply', value: circ, unit: 'SUT',
      unavailableReason: circ === null ? 'the source publishes no circulating supply for this asset (it reports 0)' : null,
    }),
    obs({
      ...base, field: 'SUT total supply', value: total, unit: 'SUT',
      unavailableReason: total === null ? none : null,
    }),
    obs({
      ...base, field: 'SUT max supply', value: max, unit: 'SUT',
      unavailableReason: max === null ? 'the source publishes no maximum supply for this asset' : null,
    }),
    obs({
      ...base, field: 'SUT market rank', value: rank, unit: 'rank',
      unavailableReason: rank === null ? 'the source assigns no market-cap rank to this asset' : null,
    }),
    obs({
      ...base, field: 'SUT venues', value: venues.length ? venues.join(' · ') : null, unit: 'venues',
      unavailableReason: venues.length ? null : none,
      provenance: `${s.name} — venue rows are listed as published; a CEX row is ticker-identified and is NOT contract-verified`,
      identity: 'TICKER_ONLY',
    }),
  ]
}

function mapMajors(s: SourceDescriptor, r: FetchResult, now: string): Observation[] {
  const body = rec(r.body)
  const out: Observation[] = []
  const none = 'the source returned no entry for this asset'
  for (const [id, sym] of [['bitcoin', 'BTC'], ['ethereum', 'ETH']] as const) {
    const e = body ? rec(body[id]) : null
    const ts = e ? num(e['last_updated_at']) : null
    const base = {
      symbol: sym, sourceId: s.id, sourceName: s.name, sourceUrl: s.url, retrievedAt: r.retrievedAt,
      dataTimestamp: ts === null ? null : iso(ts * 1000), identity: s.identity,
      provenance: `${s.name} — broader-market context, not a SUT measurement`, now,
    }
    const price = e ? num(e['usd']) : null
    const chg = e ? num(e['usd_24h_change']) : null
    out.push(obs({ ...base, field: `${sym} price`, value: price, unit: 'USD', unavailableReason: price === null ? none : null }))
    out.push(obs({ ...base, field: `${sym} 24h change`, value: chg, unit: 'percent', unavailableReason: chg === null ? none : null }))
  }
  return out
}

function mapGlobal(s: SourceDescriptor, r: FetchResult, now: string): Observation[] {
  const body = rec(r.body)
  const data = body ? rec(body['data']) : null
  const mcap = data ? rec(data['total_market_cap']) : null
  const none = 'the source returned no global market data for this retrieval'
  const ts = data ? num(data['updated_at']) : null
  const base = {
    symbol: 'MARKET', sourceId: s.id, sourceName: s.name, sourceUrl: s.url, retrievedAt: r.retrievedAt,
    dataTimestamp: ts === null ? null : iso(ts * 1000), identity: s.identity,
    provenance: `${s.name} — broad market indicator`, now,
  }
  const total = mcap ? num(mcap['usd']) : null
  const chg = data ? num(data['market_cap_change_percentage_24h_usd']) : null
  return [
    obs({ ...base, field: 'Total crypto market cap', value: total, unit: 'USD', unavailableReason: total === null ? none : null }),
    obs({ ...base, field: 'Total market cap 24h change', value: chg, unit: 'percent', unavailableReason: chg === null ? none : null }),
  ]
}

function mapDexScreener(s: SourceDescriptor, r: FetchResult, now: string): Observation[] {
  const body = rec(r.body)
  const pairs = body && Array.isArray(body['pairs']) ? (body['pairs'] as unknown[]) : []
  const pair = pairs.map(rec).find((p) =>
    typeof p?.['pairAddress'] === 'string' && (p['pairAddress'] as string).toLowerCase() === SUT_POOL) ?? null
  const none = `the source returned no pair row for pool ${SUT_POOL}`
  const base = {
    symbol: 'SUT', sourceId: s.id, sourceName: s.name, sourceUrl: s.url, retrievedAt: r.retrievedAt,
    dataTimestamp: null as string | null, identity: s.identity,
    provenance: `${s.name} — pool ${SUT_POOL}; pool liquidity is NOT a CEX order book and is not a bid/ask spread`, now,
  }
  if (!pair) {
    return [
      unavailable('Pool liquidity (USD)', 'SUT', 'USD', s, r.retrievedAt, none, now),
      unavailable('Pool 24h volume', 'SUT', 'USD', s, r.retrievedAt, none, now),
      unavailable('Pair price', 'SUT', 'USD', s, r.retrievedAt, none, now),
      unavailable('Pair 24h change', 'SUT', 'percent', s, r.retrievedAt, none, now),
    ]
  }
  const liq = num(rec(pair['liquidity'])?.['usd'])
  const vol = num(rec(pair['volume'])?.['h24'])
  const chg = num(rec(pair['priceChange'])?.['h24'])
  const price = typeof pair['priceUsd'] === 'string' ? num(Number(pair['priceUsd'])) : num(pair['priceUsd'])
  return [
    obs({ ...base, field: 'Pool liquidity (USD)', value: liq, unit: 'USD', unavailableReason: liq === null ? none : null }),
    obs({ ...base, field: 'Pool 24h volume', value: vol, unit: 'USD', unavailableReason: vol === null ? none : null }),
    obs({ ...base, field: 'Pair price', value: price, unit: 'USD', unavailableReason: price === null ? none : null }),
    obs({ ...base, field: 'Pair 24h change', value: chg, unit: 'percent', unavailableReason: chg === null ? none : null }),
  ]
}

/** sqrtPriceX96 -> USDT per SUT (token0 = SUT 18dp, token1 = USDT 6dp). */
export function spotFromSqrtPriceX96(sqrtPriceX96: bigint): number {
  const q96 = 2 ** 96
  const r = Number(sqrtPriceX96) / q96
  return r * r * 10 ** 12
}

function mapRpc(s: SourceDescriptor, r: FetchResult, now: string): Observation[] {
  const rows = Array.isArray(r.body) ? (r.body as unknown[]).map(rec) : []
  const byId = (id: number) => rows.find((x) => num(x?.['id']) === id) ?? null
  const blockHex = byId(1)?.['result']
  const slotHex = byId(2)?.['result']
  const block = rec(byId(3)?.['result'])
  const none = 'the node returned no result for this call'
  // the data timestamp of a chain read is the BLOCK timestamp, never the local clock
  let blockTime: string | null = null
  if (typeof block?.['timestamp'] === 'string') {
    try { blockTime = iso(Number(BigInt(block['timestamp'] as string)) * 1000) } catch { blockTime = null }
  }
  const base = {
    symbol: 'SUT', sourceId: s.id, sourceName: s.name, sourceUrl: s.url, retrievedAt: r.retrievedAt,
    dataTimestamp: blockTime, identity: s.identity,
    provenance: `${s.name} — slot0() on pool ${SUT_POOL} at block ${
      typeof blockHex === 'string' ? Number(BigInt(blockHex)) : 'unknown'}; a direct contract read, not a ticker lookup`,
    now,
  }
  let spot: number | null = null
  if (typeof slotHex === 'string' && slotHex.length >= 66) {
    try { spot = spotFromSqrtPriceX96(BigInt(`0x${slotHex.slice(2, 66)}`)) } catch { spot = null }
  }
  const blockNumber = typeof blockHex === 'string' ? Number(BigInt(blockHex)) : null
  return [
    obs({ ...base, field: 'On-chain spot price', value: spot, unit: 'USDT per SUT', unavailableReason: spot === null ? none : null }),
    obs({ ...base, field: 'Block number', value: blockNumber, unit: 'block', unavailableReason: blockNumber === null ? none : null }),
  ]
}

/** Build the CoinMarketCap descriptor. Server-side only: the key stays in the header. */
export function coinMarketCapSource(apiKey: string): SourceDescriptor {
  const base = SOURCES.find((x) => x.id === 'coinmarketcap')!
  return {
    ...base,
    url: 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=SUT&convert=USD',
    headers: { 'X-CMC_PRO_API_KEY': apiKey, accept: 'application/json' },
  }
}

/**
 * CoinMarketCap quotes/latest, addressed by TICKER.
 *
 * The frozen research recorded a ticker collision for "SUT", so identity is
 * PROVED, never assumed: a CMC listing is treated as contract-verified ONLY if
 * the listing's own platform token address equals the Polygon contract. Any
 * other outcome stays TICKER_ONLY / IDENTITY NOT VERIFIED and is kept in its
 * own CMC-prefixed fields, never merged into the contract-verified rows.
 */
export const CMC_IDENTITY_UNVERIFIED = 'TICKER ONLY / IDENTITY NOT VERIFIED'
export const CMC_IDENTITY_VERIFIED = 'CONTRACT VERIFIED'

export interface CmcIdentityCheck {
  identity: IdentityLevel
  label: string
  reason: string
  listings: number
  tokenAddress: string | null
}

/** Decide, from the listing itself, whether CMC proves the Polygon contract. */
export function checkCmcIdentity(entries: Array<Record<string, unknown>>): CmcIdentityCheck {
  const addressOf = (e: Record<string, unknown>): string | null => {
    const p = rec(e['platform'])
    const addr = p?.['token_address']
    return typeof addr === 'string' && addr.length > 0 ? addr : null
  }
  const matching = entries.find((e) => addressOf(e)?.toLowerCase() === SUT_CONTRACT.toLowerCase()) ?? null
  if (matching) {
    return {
      identity: 'CONTRACT_VERIFIED',
      label: CMC_IDENTITY_VERIFIED,
      reason: `the CMC listing publishes platform token address ${SUT_CONTRACT}, which matches the contract under investigation`,
      listings: entries.length,
      tokenAddress: addressOf(matching),
    }
  }
  const published = entries.map(addressOf).filter((x): x is string => x !== null)
  return {
    identity: 'TICKER_ONLY',
    label: CMC_IDENTITY_UNVERIFIED,
    reason: published.length === 0
      ? 'the CMC listing publishes no platform token address, so it cannot be shown to be the Polygon contract '
        + `${SUT_CONTRACT}. The ticker "SUT" is known to collide with other assets.`
      : `the CMC listing publishes platform token address(es) ${published.join(', ')}, none of which is `
        + `${SUT_CONTRACT}. This is a different asset trading under the same ticker.`,
    listings: entries.length,
    tokenAddress: published[0] ?? null,
  }
}

function mapCoinMarketCap(s: SourceDescriptor, r: FetchResult, now: string): Observation[] {
  const body = rec(r.body)
  const data = body ? rec(body['data']) : null
  const raw = data?.['SUT']
  const entries: Array<Record<string, unknown>> = Array.isArray(raw)
    ? (raw as unknown[]).map(rec).filter((x): x is Record<string, unknown> => x !== null)
    : rec(raw) ? [rec(raw)!] : []
  const none = 'the source returned no quote for this ticker'

  if (entries.length === 0) {
    return s.provides.map((f) => unavailable(f, 'SUT', '', s, r.retrievedAt, none, now))
  }

  const id = checkCmcIdentity(entries)
  // when identity is proved, read the matching listing; otherwise the first one, clearly labelled
  const entry = entries.find((e) => {
    const p = rec(e['platform'])
    const addr = p?.['token_address']
    return typeof addr === 'string' && addr.toLowerCase() === SUT_CONTRACT.toLowerCase()
  }) ?? entries[0]!
  const quote = rec(rec(entry['quote'])?.['USD'])

  const provenance = `${s.name} — queried by ticker SUT; identity ${id.label}: ${id.reason}`
  const base = {
    symbol: 'SUT', sourceId: s.id, sourceName: s.name, sourceUrl: s.url, retrievedAt: r.retrievedAt,
    dataTimestamp: typeof quote?.['last_updated'] === 'string' ? (quote['last_updated'] as string) : null,
    identity: id.identity, provenance, now,
  }
  const mk = (field: string, value: number | null, unit: string, reason = none) =>
    obs({ ...base, field, value, unit, unavailableReason: value === null ? reason : null })

  const supplyReason = 'the source returned no circulating supply for this listing'
  return [
    mk('CMC price', num(quote?.['price']), 'USD'),
    mk('CMC 24h change', num(quote?.['percent_change_24h']), 'percent'),
    mk('CMC 24h volume', num(quote?.['volume_24h']), 'USD'),
    mk('CMC market cap', positive(quote?.['market_cap']), 'USD'),
    mk('CMC fully diluted market cap', positive(quote?.['fully_diluted_market_cap']), 'USD'),
    mk('CMC circulating supply', positive(entry['circulating_supply']), 'SUT', supplyReason),
    mk('CMC total supply', positive(entry['total_supply']), 'SUT'),
    mk('CMC max supply', positive(entry['max_supply']), 'SUT',
      'the source publishes no maximum supply for this listing'),
    mk('CMC rank', positive(entry['cmc_rank']), 'rank', 'the source assigns no rank to this listing'),
    obs({
      ...base,
      field: 'CMC identity check',
      value: `${id.label} — ${id.listings} listing(s) returned for ticker SUT`,
      unit: 'identity',
      unavailableReason: null,
    }),
  ]
}

function mapNews(s: SourceDescriptor, r: FetchResult, now: string): Observation[] {
  return [unavailable('Market events / news', 'SUT', 'events', s, r.retrievedAt,
    'no public, browser-reachable news or events feed is configured for this asset; '
    + 'nothing is substituted and no event is inferred', now)]
}

const MAPPERS: Record<string, (s: SourceDescriptor, r: FetchResult, now: string) => Observation[]> = {
  'coingecko-token': mapCoinGeckoToken,
  'coingecko-asset': mapCoinGeckoAsset,
  'coingecko-majors': mapMajors,
  'coingecko-global': mapGlobal,
  'dexscreener-pair': mapDexScreener,
  'polygon-rpc': mapRpc,
  'coinmarketcap': mapCoinMarketCap,
  'public-news': mapNews,
}

const STATUS_DETAIL: Record<SourceStatus, string> = {
  OK: 'responded',
  HTTP_ERROR: 'the source returned an error status',
  RATE_LIMITED: 'the source rate-limited this retrieval',
  NETWORK_OR_CORS_BLOCKED: 'the request could not be completed (network error, DNS failure, timeout, or — in the browser — a CORS restriction)',
  MALFORMED: 'the source returned no readable payload',
  NOT_CONFIGURED: 'no public, browser-reachable source is configured for this field',
}

/** Map one raw source response to observations and a source outcome. */
export function mapSource(s: SourceDescriptor, r: FetchResult, now: string): {
  observations: Observation[]; outcome: SourceOutcome
} {
  const unconfigured = s.url === ''
  const status: SourceStatus = unconfigured ? 'NOT_CONFIGURED' : sourceStatusOf(r)
  const mapper = MAPPERS[s.id]
  const observations = status === 'OK'
    ? (mapper ? mapper(s, r, now) : [])
    : unconfigured && s.id === 'public-news'
      ? mapNews(s, r, now)
      : s.provides.map((f) => unavailable(
        f,
        f.startsWith('BTC') ? 'BTC' : f.startsWith('ETH') ? 'ETH' : s.id === 'coingecko-global' ? 'MARKET' : 'SUT',
        '', s, r.retrievedAt,
        unconfigured
          ? `${STATUS_DETAIL.NOT_CONFIGURED}${s.credentialEnvVar ? ` (set ${s.credentialEnvVar} and run the scheduled server-side sync)` : ''}`
          : `${STATUS_DETAIL[status]}${r.httpStatus ? ` (HTTP ${r.httpStatus})` : ''}${r.error ? `: ${r.error}` : ''}`,
        now))
  return {
    observations,
    outcome: {
      sourceId: s.id, sourceName: s.name, url: s.url, status, httpStatus: r.httpStatus,
      retrievedAt: r.retrievedAt, detail: STATUS_DETAIL[status], fields: s.provides,
    },
  }
}

// ───────────────────────────────────────────────── report

export interface MarketComparison {
  sutChange: number | null
  btcChange: number | null
  ethChange: number | null
  /** An observation. Never a cause. */
  text: string
}

export type SyncTrigger = 'MANUAL' | 'SCHEDULED'

export interface DailyReport {
  id: string
  reportDate: string
  generatedAt: string
  retrievalStartedAt: string
  trigger: SyncTrigger
  observations: Observation[]
  sources: SourceOutcome[]
  /** Bounded evidence of exactly what each source returned. */
  raw: RawRecord[]
  status: SyncStatus
  comparison: MarketComparison
  significantChanges: string[]
  limitations: string[]
  disclaimer: string
  interpretationNote: string
  /** Identifies the DATA. Two retrievals with identical data share it. */
  contentFingerprint: string
  /** Identifies the RECORD, retrieval times included. */
  fingerprint: string
}

export function syncStatusOf(outcomes: SourceOutcome[]): SyncStatus {
  const live = outcomes.filter((o) => o.status !== 'NOT_CONFIGURED')
  const ok = live.filter((o) => o.status === 'OK').length
  if (ok === 0) return 'FAILED'
  return ok === live.length ? 'SUCCESS' : 'PARTIAL'
}

export function valueOf(obsList: Observation[], field: string): number | null {
  const o = obsList.find((x) => x.field === field)
  return o && typeof o.value === 'number' ? o.value : null
}

const pct = (v: number | null) => (v === null ? 'DATA UNAVAILABLE' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`)

/** Side-by-side movement. Stated as an observation, with causality explicitly disclaimed. */
export function buildComparison(obsList: Observation[]): MarketComparison {
  const sut = valueOf(obsList, 'SUT 24h change')
  const btc = valueOf(obsList, 'BTC 24h change')
  const eth = valueOf(obsList, 'ETH 24h change')
  const parts = [`SUT ${pct(sut)}`, `BTC ${pct(btc)}`, `ETH ${pct(eth)}`]
  return {
    sutChange: sut, btcChange: btc, ethChange: eth,
    text: `Observed 24h movement — ${parts.join(' · ')}. This is a side-by-side observation only; `
      + 'no causal relationship between the broader market and SUT is claimed or implied by this report.',
  }
}

/** Differences against the previous retrieval. Observational, never causal. */
export function significantChanges(current: DailyReport | Omit<DailyReport, 'fingerprint' | 'id'>, previous: DailyReport | null): string[] {
  if (!previous) return ['No earlier retrieval is stored, so no day-over-day change can be stated.']
  const out: string[] = []
  const fields: Array<[string, string, number]> = [
    ['SUT price', 'USD', 4], ['SUT 24h volume', 'USD', 0], ['Pool liquidity (USD)', 'USD', 0],
    ['On-chain spot price', 'USDT per SUT', 6],
    ['SUT circulating supply', 'SUT', 2], ['SUT total supply', 'SUT', 2], ['SUT max supply', 'SUT', 2],
    ['CMC circulating supply', 'SUT', 2], ['CMC total supply', 'SUT', 2],
  ]
  for (const [field, unit, dp] of fields) {
    const now = valueOf(current.observations, field)
    const before = valueOf(previous.observations, field)
    if (now === null || before === null) {
      out.push(`${field}: not comparable — a value is DATA UNAVAILABLE in one of the two retrievals.`)
      continue
    }
    const delta = now - before
    const relative = before === 0 ? null : (delta / before) * 100
    out.push(`${field}: ${before.toFixed(dp)} → ${now.toFixed(dp)} ${unit} `
      + `(${delta >= 0 ? '+' : ''}${delta.toFixed(dp)}${relative === null ? '' : `, ${relative >= 0 ? '+' : ''}${relative.toFixed(2)}%`}) `
      + `since ${previous.generatedAt}.`)
  }
  for (const s of current.sources) {
    const was = previous.sources.find((p) => p.sourceId === s.sourceId)
    if (was && was.status !== s.status) out.push(`${s.sourceName}: source status ${was.status} → ${s.status}.`)
  }
  return out
}

export function limitationsFor(obsList: Observation[], outcomes: SourceOutcome[]): string[] {
  const out = [
    'Observational market data only. This report does not establish causality, business impact or a root cause.',
    'Values are as published by third-party sources and may be delayed, revised or withdrawn.',
    'Pool liquidity is a DEX reserve figure. It is not a CEX order book and is never a bid/ask spread.',
    'A venue row identified only by the ticker "SUT" is not contract-verified and may refer to a different asset.',
    'This report is not part of the EXP-001 governance chain and changes no experiment state.',
  ]
  const missing = obsList.filter((o) => o.status === 'DATA_UNAVAILABLE').map((o) => o.field)
  if (missing.length) out.push(`DATA UNAVAILABLE this retrieval: ${missing.join(', ')}. No value was substituted.`)
  const stale = obsList.filter((o) => o.freshness === 'STALE').map((o) => o.field)
  if (stale.length) out.push(`Older than ${STALE_AFTER_MINUTES} minutes at retrieval: ${stale.join(', ')}.`)
  const bad = outcomes.filter((o) => o.status !== 'OK' && o.status !== 'NOT_CONFIGURED')
  if (bad.length) out.push(`Sources that did not respond normally: ${bad.map((b) => `${b.sourceName} (${b.status})`).join('; ')}.`)
  return out
}

function hash(raw: string): string {
  let h = 0
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0
  return (h >>> 0).toString(16).padStart(8, '0')
}

export const RAW_EXCERPT_LIMIT = 2000

/** Bounded, verbatim evidence of a source response. Never edited after storage. */
export function rawRecordOf(r: FetchResult): RawRecord {
  let text: string
  try { text = r.body === null || r.body === undefined ? '' : JSON.stringify(r.body) } catch { text = '' }
  return {
    sourceId: r.sourceId,
    httpStatus: r.httpStatus,
    error: r.error,
    retrievedAt: r.retrievedAt,
    payloadExcerpt: text.slice(0, RAW_EXCERPT_LIMIT),
    payloadBytes: text.length,
    payloadHash: hash(text),
  }
}

/** Hashes the DATA only — retrieval timestamps excluded, so an unchanged re-run matches. */
export function fingerprintContent(
  observations: Observation[], sources: SourceOutcome[],
): string {
  return `DMC-${hash([
    observations.map((o) => `${o.sourceId}/${o.field}=${String(o.value)}@${o.dataTimestamp ?? '-'}#${o.status}`).join('|'),
    sources.map((s) => `${s.sourceId}:${s.status}`).join('|'),
  ].join('~'))}`
}

export function fingerprintReport(r: Omit<DailyReport, 'fingerprint'>): string {
  return `DMR-${hash([
    r.id, r.generatedAt, r.retrievalStartedAt, r.trigger, r.status, r.contentFingerprint,
    r.observations.map((o) => `${o.field}=${String(o.value)}@${o.dataTimestamp ?? '-'}/${o.sourceId}`).join('|'),
    r.raw.map((x) => `${x.sourceId}:${x.payloadHash}:${x.payloadBytes}`).join('|'),
  ].join('~'))}`
}

export const reportDateOf = (iso8601: string) => iso8601.slice(0, 10)

/** Build the immutable daily report from raw source responses. Pure. */
export function buildReport(
  args: {
    results: FetchResult[]
    sources?: SourceDescriptor[]
    now: string
    retrievalStartedAt: string
    sequence: number
    previous: DailyReport | null
    trigger?: SyncTrigger
  },
): DailyReport {
  const sources = args.sources ?? SOURCES
  const observations: Observation[] = []
  const outcomes: SourceOutcome[] = []
  for (const s of sources) {
    const r = args.results.find((x) => x.sourceId === s.id)
      ?? { sourceId: s.id, ok: false, httpStatus: null, body: null, error: 'no response recorded', retrievedAt: args.now }
    const m = mapSource(s, r, args.now)
    observations.push(...m.observations)
    outcomes.push(m.outcome)
  }
  const draft = {
    id: `DMR-${reportDateOf(args.now)}-${args.sequence}`,
    reportDate: reportDateOf(args.now),
    generatedAt: args.now,
    retrievalStartedAt: args.retrievalStartedAt,
    trigger: args.trigger ?? 'MANUAL' as SyncTrigger,
    observations,
    sources: outcomes,
    raw: args.results.map(rawRecordOf),
    contentFingerprint: fingerprintContent(observations, outcomes),
    status: syncStatusOf(outcomes),
    comparison: buildComparison(observations),
    significantChanges: [] as string[],
    limitations: limitationsFor(observations, outcomes),
    disclaimer: DAILY_DISCLAIMER,
    interpretationNote: INTERPRETATION_NOTE,
  }
  const withChanges = { ...draft, significantChanges: significantChanges(draft, args.previous) }
  return { ...withChanges, fingerprint: fingerprintReport(withChanges) }
}

// ───────────────────────────────────────────────── separation from EXP-001

/** Daily market data never registers a threshold. */
export function dailySyncRegistersThreshold(): false { return false }
/** Daily market data never approves a baseline. */
export function dailySyncApprovesBaseline(): false { return false }
/** Daily market data never creates an intervention, comparison or result. */
export function dailySyncCreatesExperimentRecord(): false { return false }
/** Daily market data never changes governance state. */
export function dailySyncMutatesGovernance(): false { return false }
