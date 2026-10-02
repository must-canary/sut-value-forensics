/**
 * Source register. Authority: data-source-contract.md §3 (frozen 2026-09-30).
 * Each source records what it IS and IS NOT authoritative for.
 */
import type { SourceRef } from '../core/types'

export interface RegisteredSource extends SourceRef {
  authoritativeFor: string[]
  notAuthoritativeFor: string[]
  limitations: string[]
}

export const SOURCES: RegisteredSource[] = [
  {
    id: 'polygon-rpc',
    name: 'Polygon RPC (drpc / publicnode / Blockscout eth-rpc)',
    tier: 1,
    url: 'https://polygon.drpc.org',
    authoritativeFor: [
      'chain state', 'balances', 'totalSupply', 'Transfer/Swap/Mint/Burn logs',
      'block timestamps', 'contract bytecode', 'ownership state',
    ],
    notAuthoritativeFor: [
      'wallet identity', 'wallet role', 'off-chain intent', 'corporate ownership',
      'prices', 'causation',
    ],
    limitations: [
      'eth_getLogs block-range caps (chunk <=40k, back off to 2.5k)',
      'no address labels',
      'polygon-rpc.com and rpc.ankr.com require keys and are unusable',
    ],
  },
  {
    id: 'blockscout',
    name: 'Blockscout (polygon.blockscout.com/api/v2)',
    tier: 1,
    url: 'https://polygon.blockscout.com/api/v2',
    authoritativeFor: [
      'token metadata', 'holder counts by its own definition', 'address token balances',
      'paginated transfer history', 'contract verification status', 'is_contract',
    ],
    notAuthoritativeFor: ['prices', 'market cap', 'circulating supply', 'wallet roles'],
    limitations: [
      'pagination is newest-first — cannot reach far history on busy addresses',
      'returns circulating_supply = null for SUT',
    ],
  },
  {
    id: 'geckoterminal',
    name: 'GeckoTerminal (contract-keyed)',
    tier: 1,
    url: 'https://api.geckoterminal.com/api/v2',
    authoritativeFor: ['DEX pool inventory', 'pool reserves', 'pool-level OHLCV'],
    notAuthoritativeFor: ['CEX prices/volume', 'aggregate market cap', 'circulating supply'],
    limitations: [
      'returns ~11 dormant pools with stale divergent prices ($0.0894-$1.2025, $0 volume)',
      'only pool 0x092295c9...e165 is economically live — never average across pools',
    ],
  },
  {
    id: 'coingecko',
    name: 'CoinGecko',
    tier: 3,
    url: 'https://www.coingecko.com/en/coins/super-trust',
    authoritativeFor: ["CoinGecko's own price/volume series", 'FDV', 'BTC/ETH control series'],
    notAuthoritativeFor: ['circulating supply (publishes none for SUT)', 'market cap', 'venue-complete volume'],
    limitations: ['volume appears to under-capture DEX activity — treat as a lower bound of uncertain coverage'],
  },
  {
    id: 'coinmarketcap',
    name: 'CoinMarketCap',
    tier: 3,
    url: 'https://coinmarketcap.com/currencies/supertrust/',
    authoritativeFor: ["CMC's own displayed price, rank, and its circulating-supply decision"],
    notAuthoritativeFor: ['on-chain truth', 'actual circulating supply', "CertiK's score", 'news accuracy'],
    limitations: [
      'AI news pages conflated SuperTrust with Sanity United — not an event source',
      'displays a CertiK-labelled "3.7" that is NOT CertiK\'s Skynet score',
      'live and historical pages disagree on rank',
    ],
  },
  {
    id: 'coinranking',
    name: 'Coinranking',
    tier: 3,
    url: 'https://coinranking.com/coin/-qb6-VW8s%2Bsupertrust-sut',
    authoritativeFor: ['its own displayed series'],
    notAuthoritativeFor: ['anything cross-provider'],
    limitations: ['volume runs up to 4.2x CoinGecko (conflict C4)'],
  },
  {
    id: 'certik',
    name: 'CertiK Skynet',
    tier: 3,
    url: 'https://skynet.certik.com/projects/supertrust',
    authoritativeFor: [
      "CertiK's own proprietary ratings: Skynet score, grade, audit/KYC/bounty status",
      'concentration indicator', 'Major Holding Ratio', 'its own activity metrics',
    ],
    notAuthoritativeFor: [
      'contract state (owner field is stale)', 'holder count as ground truth', 'market data as ground truth',
    ],
    limitations: [
      'DYNAMIC — score moved 74.06 (09-29) to 74.23 (09-30); every datum needs retrieved_at',
      'Major Holding Ratio 54.25% is NOT our top-10 concentration (~71%) — different methodology',
      'percentage fields sum to 130%; meaning unconfirmed',
      'owner field shows 0x88f76d...9acfc6ba although ownership was renounced 2026-07-20',
    ],
  },
  {
    id: 'supertrust-notice',
    name: 'Official SuperTrust notices',
    tier: 2,
    url: 'https://supertrust.club/',
    authoritativeFor: ['that the company said X on date Y'],
    notAuthoritativeFor: [
      'whether the statement is true', 'whether an announced action occurred',
      'supply figures', 'adoption', 'asset backing',
    ],
    limitations: ['always CLAIM — a notice is evidence of a statement, never of the fact stated'],
  },
  {
    id: 'gate-tr',
    name: 'Gate TR announcement',
    tier: 2,
    url: 'https://web02.gate.com.tr/en/announcements/article/50303',
    authoritativeFor: ["Gate TR's own delisting action and its stated reason"],
    notAuthoritativeFor: ['market impact', 'any legal finding'],
    limitations: ['direct access returned no response 2026-09-30'],
  },
  {
    id: 'bitmart',
    name: 'BitMart delisting notice',
    tier: 2,
    url: 'https://bitmart.zendesk.com/hc/en-us/articles/47853762586523',
    authoritativeFor: ['— NOTHING for SuperTrust until contract identity is established'],
    notAuthoritativeFor: ['any SuperTrust event'],
    limitations: [
      'IDENTITY NOT VERIFIED — v2 established BitMart SUT was Sanity United',
      'unreachable: Cloudflare 403 (2026-09-30)',
      'carries a "withdrawal closed 2026-05-16" date at exact crash onset — either the catalyst or a trap',
    ],
  },
  {
    id: 'research-v2',
    name: 'sut-coin-research-2026-09-29.txt (v2)',
    tier: 4,
    url: 'file://SUT-Value-Forensics-Research-Handoff/sut-coin-research-2026-09-29.txt',
    internal: true,
    authoritativeFor: ['its own analysis'],
    notAuthoritativeFor: ['external facts it restates'],
    limitations: ['internal document — no identity privilege'],
  },
  {
    id: 'pdf-coin-detail',
    name: 'SUT_Coin_Detail_Research.pdf',
    tier: 4,
    url: 'file://research-inputs/SUT_Coin_Detail_Research.pdf',
    internal: true,
    formatOf: 'research-v2',
    authoritativeFor: ['— nothing independently; it is a PDF rendering of research-v2'],
    notAuthoritativeFor: ['anything (duplicate source)'],
    limitations: ['DUPLICATE of research-v2 — must not increase confidence (§2A)'],
  },
  {
    id: 'pdf-pip-thesis',
    name: 'PIP_Week_2_thesis.pdf',
    tier: 4,
    url: 'file://research-inputs/PIP_Week_2_thesis.pdf',
    internal: true,
    authoritativeFor: ['its own top-100 peer benchmark analysis'],
    notAuthoritativeFor: ['contract state', 'exchange events', 'token identity'],
    limitations: [
      'carried two retired claims (GoPlus contract-control; BitMart attribution)',
      'dated 30 Sep — NEWER than the note correcting it. Date is not claim currency.',
    ],
  },
]

export const SOURCE_BY_ID = new Map(SOURCES.map((s) => [s.id, s]))

/** Retired claims that must be detected wherever they are re-typed. */
export const RETIRED_CLAIMS = [
  {
    id: 'retired-goplus-control',
    claim:
      'GoPlus warns the contract creator can disable sells, change fees, mint, or transfer tokens',
    retiredBy: 'research-v2 correction #2',
    retiredOn: '2026-09-29',
    reason:
      'Contradicted by verified on-chain evidence (Blockscout full match, Sourcify exact match, ' +
      "GoPlus's own live feed): not mintable, no fees, no blacklist, not a proxy. Generic scanner boilerplate.",
    matchers: ['disabling sells', 'changing fees, minting', 'can make changes to the token contract'],
  },
  {
    id: 'retired-bitmart-attribution',
    claim: 'The March 2026 BitMart delisting removed a SuperTrust trading venue',
    retiredBy: 'research-v2 correction #1',
    retiredOn: '2026-09-29',
    reason:
      "BitMart's SUT was Sanity United, a different Ethereum token sharing the ticker. " +
      'No contract-level evidence maps any BitMart SUT event to the SuperTrust contract.',
    matchers: ['bitmart delisting', 'bitmart (mar 2026)', 'the bitmart delisting (mar 2026)'],
  },
]
