/**
 * Core evidence model types.
 * Authority: evidence-model.md, data-source-contract.md (frozen 2026-09-30).
 *
 * The chain is:
 *   RAW SOURCE -> OBSERVATION -> NORMALIZED METRIC -> EVENT
 *              -> HYPOTHESIS -> TEST -> EVIDENCE -> HUMAN REVIEW -> STATUS
 */

// ---------------------------------------------------------------- identity

/** data-source-contract.md §2.3 — the identity ladder. */
export type IdentityStatus =
  | 'CONTRACT_VERIFIED'
  | 'PAIR_VERIFIED'
  | 'TICKER_ONLY'
  | 'IDENTITY_NOT_VERIFIED'

export interface TokenIdentity {
  symbol: string
  /** lowercased hex; REQUIRED — ticker alone never identifies an asset */
  contract: string
  chain: string
  exchange?: string | null
  pair?: string | null
}

// ------------------------------------------------------------- confidence

export type Confidence =
  | 'VERIFIED'
  | 'SECONDARY'
  | 'CLAIM'
  | 'SNIPPET_ONLY'
  | 'UNVERIFIED'
  | 'OPINION'

/** data-source-contract.md §3 tiers. */
export type SourceTier = 1 | 2 | 3 | 4

export interface SourceRef {
  id: string
  name: string
  tier: SourceTier
  url: string
  /** Set when this document is a re-rendering of another source (§2A). */
  formatOf?: string
  /** Internally authored documents carry no identity privilege (§2.5). */
  internal?: boolean
}

// ------------------------------------------------------------ raw + method

export type AccessStatus = 'OK' | 'BLOCKED' | 'RATE_LIMITED' | 'NOT_FOUND' | 'PARTIAL'

export interface RawSource {
  id: string
  sourceId: string
  request: string
  retrievedAt: string
  accessStatus: AccessStatus
  blocker?: string
}

/**
 * Methodology tag. `gross_pool_flow` is deliberately callable out because
 * evidence-model.md §6.1a bars it from populating any volume field.
 */
export type Methodology =
  | 'onchain_swap_decoded'
  | 'onchain_transfer'
  | 'gross_pool_flow'
  | 'block_ts_interpolated'
  | 'aggregator_reported'
  | 'contract_call'
  | 'document_stated'
  | 'derived'

// ------------------------------------------------------------- observation

export interface Observation {
  id: string
  sourceId: string
  rawSourceId?: string
  token: TokenIdentity
  identityStatus: IdentityStatus
  metric: string
  value: number | string | null
  unit: string
  /** when the fact was true */
  observationTime: string | null
  /** when we fetched it */
  retrievedAt: string
  methodology: Methodology
  confidence: Confidence
  /** Set when day-boundary allocation is uncertain (evidence-model.md §6.1b). */
  aggregationCaveat?: 'day_boundary_uncertain'
  notes?: string
}

// ----------------------------------------------------------------- events

export type EventClassification =
  | 'VERIFIED'
  | 'REPORTED'
  | 'CLAIM'
  | 'OPINION'
  | 'UNRESOLVED'
  | 'DATA_UNAVAILABLE'
  | 'EXCHANGE_STATED_CONCERN'
  | 'LEGAL_PROCEEDING'
  | 'COMPANY_RESPONSE'

export type EventType =
  | 'price'
  | 'volume'
  | 'onchain_transfer'
  | 'liquidity'
  | 'exchange'
  | 'company'
  | 'legal'
  | 'supply'
  | 'data_provider'

export interface TimelineEvent {
  id: string
  time: string
  /** true when the exact time is not established (e.g. month-only) */
  timeApproximate?: boolean
  type: EventType
  title: string
  detail: string
  classification: EventClassification
  identityStatus: IdentityStatus
  evidenceIds: string[]
  sourceIds: string[]
}

// ------------------------------------------------------------- hypotheses

export type HypothesisStatus =
  | 'SUPPORTED'
  | 'REJECTED'
  | 'INCONCLUSIVE'
  | 'DATA_UNAVAILABLE'

export interface HumanReview {
  /** REQUIRED for any causal claim — evidence-model.md §4 gate 6 */
  author: string
  reviewedAt: string
  note: string
}

export interface Hypothesis {
  id: string
  title: string
  statement: string
  mechanism: string
  status: HypothesisStatus
  /** e.g. "rejected as a *sufficient* cause" */
  scopeOfResult: string
  testMethod: string
  falsificationCriterion: string
  supportingEvidenceIds: string[]
  contradictingEvidenceIds: string[]
  missingEvidence: string[]
  limitations: string[]
  graphs: string[]
  /** null until a human signs off; AI may never set the final status */
  review: HumanReview | null
}

// -------------------------------------------------------------- conflicts

export interface DataConflict {
  id: string
  metric: string
  observationTime: string | null
  observations: Array<{
    sourceId: string
    value: number | string
    identityStatus: IdentityStatus
  }>
  methodologicalReason: string
  resolution: 'UNRESOLVED' | 'RESOLVED'
  resolutionNote?: string
  /** null is valid and honest — it means no canonical series exists */
  canonicalForAnalysis: string | null
  displayRule: string
}

// ---------------------------------------------------------------- wallets

/** Roles default to UNKNOWN and may only change with role evidence. */
export type WalletRole =
  | 'UNKNOWN'
  | 'POOL'
  | 'ROUTER_OR_AGGREGATOR'
  | 'BURN_ADDRESS'
  | 'EXCHANGE_DEPOSIT'

export interface Wallet {
  address: string
  role: WalletRole
  /** Required to set any role other than UNKNOWN. */
  roleEvidenceId: string | null
  label: string | null
  isContract: boolean | null
  note?: string
}

// ---------------------------------------------------------------- findings

export interface Finding {
  id: string
  statement: string
  evidenceIds: string[]
  confidence: Confidence
  limitations: string[]
  contradictions: string[]
  /** Required when the statement is causal. */
  author: string | null
  causal: boolean
  supersedes?: string
}
