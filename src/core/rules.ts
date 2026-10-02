/**
 * Enforced rules from the frozen research.
 * These are the product: they make a well-evidenced conclusion possible and a
 * poorly-evidenced one structurally impossible to state.
 *
 * Authority: data-source-contract.md, evidence-model.md (frozen 2026-09-30).
 */

import type {
  Confidence,
  DataConflict,
  Finding,
  Hypothesis,
  IdentityStatus,
  Methodology,
  Observation,
  SourceRef,
  TokenIdentity,
  Wallet,
} from './types'

// ============================================================ token identity

/** The one asset under investigation. data-source-contract.md §2.1 */
export const SUT_CONTRACT = '0x98965474ecbec2f532f1f780ee37b0b05f77ca55'
export const SUT_CHAIN = 'polygon-pos'
export const SUT_CHAIN_ID = 137

/** Known ticker collisions — active contamination risk. §2.2 */
export const SUT_TICKER_COLLISIONS = [
  { name: 'Super Useless Token', chain: 'polygon-pos', note: 'MORCHI mini-game token' },
  {
    name: 'Sanity United',
    chain: 'ethereum',
    note: 'BitMart listed/delisted 2026; later swapped to "SU". Caused a real misattribution.',
  },
] as const

export class IdentityError extends Error {}

/**
 * The identity gate. A ticker NEVER identifies the asset.
 * Returns the identity status; throws when the record cannot be admitted at all.
 */
export function classifyIdentity(token: Partial<TokenIdentity>): IdentityStatus {
  const contract = token.contract?.toLowerCase()
  const chain = token.chain?.toLowerCase()

  if (contract === SUT_CONTRACT && chain === SUT_CHAIN) return 'CONTRACT_VERIFIED'
  if (contract && contract !== SUT_CONTRACT) return 'IDENTITY_NOT_VERIFIED'
  if (!contract && token.exchange && token.pair) return 'PAIR_VERIFIED'
  if (!contract && token.symbol) return 'TICKER_ONLY'
  return 'IDENTITY_NOT_VERIFIED'
}

/** Records that may flow into a finding or a causal relationship. */
export function canEnterFinding(s: IdentityStatus): boolean {
  return s === 'CONTRACT_VERIFIED' || s === 'PAIR_VERIFIED'
}

/** TICKER_ONLY may be shown as context but never enters a relationship. */
export function canEnterRelationship(s: IdentityStatus): boolean {
  return canEnterFinding(s)
}

/** Validate an observation against the mandatory-field contract (§1). */
export function validateObservation(o: Observation): string[] {
  const errs: string[] = []
  if (!o.token.contract) errs.push('token_contract is required — ticker alone is never sufficient')
  if (!o.token.chain) errs.push('chain is required')
  if (!o.sourceId) errs.push('source is required')
  if (!o.retrievedAt) errs.push('retrieved_at is required')
  if (!o.unit) errs.push('unit is required')
  if (o.observationTime && o.observationTime > o.retrievedAt) {
    errs.push('observation_time must not be after retrieved_at')
  }
  const expected = classifyIdentity(o.token)
  if (o.identityStatus !== expected) {
    errs.push(`identity_status ${o.identityStatus} does not match computed ${expected}`)
  }
  return errs
}

// ================================================ gross flow != trading volume

/**
 * evidence-model.md §6.1a — BINDING.
 * Only decoded Swap events are trading volume. Raw pool token flow is the sum of
 * swaps AND liquidity operations; on 2026-05-17 it was 72% liquidity provisioning.
 */
export const VOLUME_METHODOLOGIES: Methodology[] = ['onchain_swap_decoded', 'aggregator_reported']

export class VolumeRuleError extends Error {}

/** Guard for anything that populates a volume field or a volume chart. */
export function assertVolumeSource(methodology: Methodology, field = 'volume'): void {
  if (methodology === 'gross_pool_flow') {
    throw new VolumeRuleError(
      `gross_pool_flow must not populate "${field}" — raw pool token flow includes ` +
        `liquidity Mint/Burn and is not trading volume (evidence-model.md §6.1a)`,
    )
  }
  if (!VOLUME_METHODOLOGIES.includes(methodology)) {
    throw new VolumeRuleError(
      `methodology "${methodology}" is not a valid basis for "${field}"; ` +
        `trading volume must derive from decoded Swap events`,
    )
  }
}

export function isVolumeSafe(methodology: Methodology): boolean {
  try {
    assertVolumeSource(methodology)
    return true
  } catch {
    return false
  }
}

// ==================================================== timestamp / aggregation

/**
 * evidence-model.md §6.1b — interpolated timestamps fail under concentrated
 * activity. C1 showed May 17/18 single-day splits diverging in opposite
 * directions while the two-day total agreed within 3.3%.
 */
export function requiresCombinedAggregate(o: Pick<Observation, 'methodology' | 'aggregationCaveat'>): boolean {
  return o.methodology === 'block_ts_interpolated' || o.aggregationCaveat === 'day_boundary_uncertain'
}

export class TimestampPrecisionError extends Error {}

/** A single-day claim on a high-activity day needs exact block timestamps. */
export function assertSingleDayClaimAllowed(o: Observation): void {
  if (requiresCombinedAggregate(o)) {
    throw new TimestampPrecisionError(
      `single-day claim not permitted for ${o.metric} @ ${o.observationTime}: ` +
        `day boundary is unresolved (conflict C15). Use the combined two-day aggregate.`,
    )
  }
}

export const TWO_DAY_AGGREGATE_LABEL = 'Two-day aggregate — exact day boundary unresolved'

// ======================================================== source duplication

/**
 * data-source-contract.md §2A — a document is not corroboration of itself in
 * another format. Same-source copies must not raise confidence.
 */
export function independentSourceCount(sources: SourceRef[]): number {
  const roots = new Set<string>()
  for (const s of sources) roots.add(s.formatOf ?? s.id)
  return roots.size
}

export function isDuplicateOf(source: SourceRef): string | null {
  return source.formatOf ?? null
}

// ============================================================= stale claims

export interface RetiredClaim {
  id: string
  claim: string
  retiredBy: string
  retiredOn: string
  reason: string
  /** substrings that identify the claim wherever it is re-typed */
  matchers: string[]
}

/**
 * evidence-model.md §6.1 — corrections must propagate. A newer document may
 * carry an older, already-retracted claim (observed twice, 2026-09-30).
 * Document date is NOT a proxy for claim currency.
 */
export function detectStaleClaims(text: string, retired: RetiredClaim[]): RetiredClaim[] {
  const hay = text.toLowerCase()
  return retired.filter((r) => r.matchers.some((m) => hay.includes(m.toLowerCase())))
}

// ================================================== internal-document grading

/** §2.5 — internal documents carry no identity privilege. */
export function gradeSourceConfidence(source: SourceRef, proposed: Confidence): Confidence {
  if (source.internal && proposed === 'VERIFIED') return 'SECONDARY'
  if (source.tier >= 3 && proposed === 'VERIFIED') return 'SECONDARY'
  return proposed
}

// ================================================================== wallets

/** Roles default to UNKNOWN; setting one requires role evidence. */
export function makeWallet(address: string, init: Partial<Wallet> = {}): Wallet {
  const role = init.role ?? 'UNKNOWN'
  if (role !== 'UNKNOWN' && !init.roleEvidenceId) {
    throw new Error(
      `wallet ${address}: role "${role}" requires roleEvidenceId — ` +
        `no wallet may be labelled without public evidence`,
    )
  }
  return {
    address: address.toLowerCase(),
    role,
    roleEvidenceId: init.roleEvidenceId ?? null,
    label: init.label ?? null,
    isContract: init.isContract ?? null,
    ...(init.note ? { note: init.note } : {}),
  }
}

/** Terms that may never be applied to an address without role evidence. */
export const FORBIDDEN_WALLET_TERMS = [
  'treasury',
  'company wallet',
  'market maker',
  'whale',
  'insider',
  'exchange wallet',
] as const

// ============================================================== causal gate

export const CAUSAL_GATES = [
  'timing',
  'magnitude',
  'mechanism',
  'controls',
  'alternatives',
  'human_authorship',
] as const
export type CausalGate = (typeof CAUSAL_GATES)[number]

export class CausalClaimError extends Error {}

/**
 * evidence-model.md §4 — a causal finding requires all six gates, including a
 * named human author. No AI-generated root-cause verdict, ever.
 */
export function assertCausalClaimAllowed(
  finding: Pick<Finding, 'causal' | 'author'>,
  gatesMet: Partial<Record<CausalGate, boolean>>,
): void {
  if (!finding.causal) return
  if (!finding.author) {
    throw new CausalClaimError(
      'a causal finding requires a named human author (evidence-model.md §4 gate 6). ' +
        'No AI-generated root-cause verdict may be produced.',
    )
  }
  const failed = CAUSAL_GATES.filter((g) => !gatesMet[g])
  if (failed.length > 0) {
    throw new CausalClaimError(`causal gate(s) not met: ${failed.join(', ')}`)
  }
}

/** Phrases barred from generated text (evidence-model.md §4.1). */
export const FORBIDDEN_CAUSAL_PHRASES = [
  'crashed because',
  'the root cause was',
  'caused the crash',
  'dumped',
  'was manipulation',
  'is a ponzi',
  'committed fraud',
] as const

export function findForbiddenPhrases(text: string): string[] {
  const hay = text.toLowerCase()
  return FORBIDDEN_CAUSAL_PHRASES.filter((p) => hay.includes(p))
}

// =============================================================== hypotheses

/** A final status may not be asserted by the system without human review. */
export function isStatusHumanApproved(h: Hypothesis): boolean {
  return h.review !== null
}

// ================================================================ conflicts

/** Conflicts render as conflicts — never averaged, never silently picked. */
export function assertConflictNotBlended(c: DataConflict): void {
  if (c.resolution === 'UNRESOLVED' && c.canonicalForAnalysis !== null) {
    throw new Error(
      `conflict ${c.id} is UNRESOLVED but declares a canonical series — ` +
        `unresolved conflicts must report all observations separately`,
    )
  }
}

export const DATA_UNAVAILABLE = 'DATA UNAVAILABLE' as const
