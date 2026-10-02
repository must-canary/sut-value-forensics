/**
 * The 17 required tests. Each maps to a frozen rule.
 */
import { describe, expect, it } from 'vitest'
import {
  assertCausalClaimAllowed, assertConflictNotBlended, assertSingleDayClaimAllowed,
  assertVolumeSource, CausalClaimError, classifyIdentity, detectStaleClaims,
  gradeSourceConfidence, independentSourceCount, isVolumeSafe, makeWallet,
  requiresCombinedAggregate, SUT_CONTRACT, TimestampPrecisionError, VolumeRuleError,
} from '../src/core/rules'
import { RETIRED_CLAIMS, SOURCES, SOURCE_BY_ID } from '../src/data/sources'
import { EVIDENCE } from '../src/data/evidence'
import { HYPOTHESIS_BY_ID, HYPOTHESES } from '../src/data/hypotheses'
import { CONFLICTS, TIMELINE, WALLETS } from '../src/data/timeline'
import { c14Reconciliation, combinedAggregate, liquiditySeries, marketControlComparison } from '../src/core/analysis'
import { generateCaseReport } from '../src/core/report'
import { LIQUIDITY_DAILY, SWAP_DAILY } from '../src/data/measurements'

// 1 ---------------------------------------------------------------------
describe('1. token identity gate', () => {
  it('accepts only the SuperTrust contract on Polygon', () => {
    expect(classifyIdentity({ symbol: 'SUT', contract: SUT_CONTRACT, chain: 'polygon-pos' }))
      .toBe('CONTRACT_VERIFIED')
  })
  it('rejects a different contract sharing the ticker (Sanity United)', () => {
    expect(classifyIdentity({ symbol: 'SUT', contract: '0xdeadbeef00000000000000000000000000000000', chain: 'ethereum' }))
      .toBe('IDENTITY_NOT_VERIFIED')
  })
  it('never admits ticker alone as identified', () => {
    expect(classifyIdentity({ symbol: 'SUT' })).toBe('TICKER_ONLY')
  })
  it('marks the BitMart record IDENTITY_NOT_VERIFIED', () => {
    const e = EVIDENCE.find((x) => x.id === 'EV-900')!
    expect(e.identityStatus).toBe('IDENTITY_NOT_VERIFIED')
  })
})

// 2 ---------------------------------------------------------------------
describe('2. duplicate-source detection', () => {
  it('does not count a PDF rendering as an independent source', () => {
    const v2 = SOURCE_BY_ID.get('research-v2')!
    const pdf = SOURCE_BY_ID.get('pdf-coin-detail')!
    expect(pdf.formatOf).toBe('research-v2')
    expect(independentSourceCount([v2, pdf])).toBe(1)
  })
  it('counts genuinely distinct sources separately', () => {
    expect(independentSourceCount([SOURCE_BY_ID.get('research-v2')!, SOURCE_BY_ID.get('pdf-pip-thesis')!])).toBe(2)
  })
})

// 3 ---------------------------------------------------------------------
describe('3. stale-claim detection', () => {
  it('flags the retired GoPlus contract-control claim wherever it is re-typed', () => {
    const text = 'GoPlus warns that the contract creator can make changes to the token contract such as disabling sells'
    const hits = detectStaleClaims(text, RETIRED_CLAIMS)
    expect(hits.map((h) => h.id)).toContain('retired-goplus-control')
  })
  it('flags the retired BitMart attribution', () => {
    const hits = detectStaleClaims('Exchange loss: the BitMart delisting (Mar 2026) removed a trading venue', RETIRED_CLAIMS)
    expect(hits.map((h) => h.id)).toContain('retired-bitmart-attribution')
  })
  it('does not flag clean text', () => {
    expect(detectStaleClaims('Gate TR delisted SUPERTRUST SUT/TRY on 2026-04-01', RETIRED_CLAIMS)).toHaveLength(0)
  })
})

// 4 ---------------------------------------------------------------------
describe('4. gross-flow vs trading-volume protection', () => {
  it('refuses gross_pool_flow as a volume source', () => {
    expect(() => assertVolumeSource('gross_pool_flow')).toThrow(VolumeRuleError)
    expect(isVolumeSafe('gross_pool_flow')).toBe(false)
  })
  it('accepts decoded swap events', () => {
    expect(isVolumeSafe('onchain_swap_decoded')).toBe(true)
  })
  it('refuses raw transfers as volume', () => {
    expect(isVolumeSafe('onchain_transfer')).toBe(false)
  })
  it('the stored gross-flow evidence record is tagged so it can never populate volume', () => {
    const e = EVIDENCE.find((x) => x.id === 'EV-040')!
    expect(e.methodology).toBe('gross_pool_flow')
    expect(isVolumeSafe(e.methodology)).toBe(false)
  })
})

// 5 ---------------------------------------------------------------------
describe('5. swap-only volume calculation', () => {
  it('two-day aggregate equals the sum of decoded swap volume', () => {
    const agg = combinedAggregate(['2026-05-17', '2026-05-18'])
    expect(Math.round(agg.volumeUsd)).toBe(784333 + 362976)
    expect(agg.swaps).toBe(4341 + 4392)
  })
  it('net sell imbalance on May 17 is ~$27K, not the gross flow', () => {
    const d = SWAP_DAILY.find((x) => x.date === '2026-05-17')!
    expect(Math.round(d.sellUsd - d.buyUsd)).toBe(26981)
  })
})

// 6 ---------------------------------------------------------------------
describe('6. LP Mint/Burn separation (procedure C1)', () => {
  it('reconciles gross inflow exactly: swap buy + LP mint = measured', () => {
    const r = c14Reconciliation('2026-05-17')!
    expect(r.inDifference).toBe(0)
    expect(Math.abs(r.outDifferencePct)).toBeLessThan(1)
  })
  it('shows most apparent "volume" was liquidity provisioning', () => {
    const r = c14Reconciliation('2026-05-17')!
    expect(r.liquidityShareOfGrossIn).toBeGreaterThan(70)
  })
  it('net liquidity was POSITIVE every crash day (LP flight rejected)', () => {
    const s = liquiditySeries()
    for (const d of ['2026-05-17', '2026-05-18', '2026-05-19']) {
      expect(s.find((x) => x.date === d)!.netUsd).toBeGreaterThan(0)
    }
  })
  it('fees are DATA UNAVAILABLE (Collect decode defect), not invented', () => {
    expect(LIQUIDITY_DAILY.every((l) => l.feesUsd === null)).toBe(true)
    expect(EVIDENCE.find((e) => e.id === 'EV-903')!.value).toBeNull()
  })
})

// 7 ---------------------------------------------------------------------
describe('7. timestamp-boundary warning', () => {
  it('flags interpolated records as needing a combined aggregate', () => {
    expect(requiresCombinedAggregate({ methodology: 'block_ts_interpolated' })).toBe(true)
    expect(requiresCombinedAggregate({ methodology: 'onchain_swap_decoded', aggregationCaveat: 'day_boundary_uncertain' })).toBe(true)
  })
  it('blocks a single-day claim when the boundary is unresolved', () => {
    const e = EVIDENCE.find((x) => x.id === 'EV-010')!
    expect(() => assertSingleDayClaimAllowed(e)).toThrow(TimestampPrecisionError)
  })
  it('labels the May 17-18 aggregate explicitly', () => {
    expect(combinedAggregate(['2026-05-17', '2026-05-18']).caveat)
      .toBe('Two-day aggregate — exact day boundary unresolved')
  })
})

// 8 ---------------------------------------------------------------------
describe('8. wallet role defaults to UNKNOWN', () => {
  it('defaults to UNKNOWN', () => {
    expect(makeWallet('0xABC').role).toBe('UNKNOWN')
  })
  it('refuses a role without role evidence', () => {
    expect(() => makeWallet('0xABC', { role: 'EXCHANGE_DEPOSIT' })).toThrow(/requires roleEvidenceId/)
  })
  it('allows a role WITH evidence', () => {
    expect(makeWallet('0xABC', { role: 'POOL', roleEvidenceId: 'EV-013' }).role).toBe('POOL')
  })
  it('all three traced-chain wallets remain UNKNOWN', () => {
    for (const a of [
      '0xaaa4d5dd26eb1a2afe5fd5fb529fc24cee89cc2c',
      '0x7cc2f8914b4d77b68355757286f146373f4bf7ad',
      '0xe6e7ec8dfbacc0dbfc8e838ff2a49a252ab4ff85',
    ]) {
      expect(WALLETS.find((w) => w.address === a)!.role).toBe('UNKNOWN')
    }
  })
})

// 9 ---------------------------------------------------------------------
describe('9. evidence provenance', () => {
  it('every evidence record carries full provenance', () => {
    for (const e of EVIDENCE) {
      expect(e.id, 'id').toBeTruthy()
      expect(e.sourceId, `${e.id} source`).toBeTruthy()
      expect(SOURCE_BY_ID.has(e.sourceId), `${e.id} source registered`).toBe(true)
      expect(e.retrievedAt, `${e.id} retrievedAt`).toBeTruthy()
      expect(e.unit, `${e.id} unit`).toBeTruthy()
      expect(e.methodology, `${e.id} methodology`).toBeTruthy()
      expect(e.confidence, `${e.id} confidence`).toBeTruthy()
      expect(e.token.contract, `${e.id} contract`).toBeTruthy()
      expect(e.token.chain, `${e.id} chain`).toBeTruthy()
    }
  })
  it('observation_time never postdates retrieval', () => {
    for (const e of EVIDENCE) {
      if (e.observationTime && /^\d{4}-\d{2}-\d{2}$/.test(e.observationTime)) {
        expect(e.observationTime <= e.retrievedAt, e.id).toBe(true)
      }
    }
  })
  it('internal documents cannot be graded VERIFIED', () => {
    expect(gradeSourceConfidence(SOURCE_BY_ID.get('pdf-pip-thesis')!, 'VERIFIED')).toBe('SECONDARY')
  })
  it('every source declares what it is NOT authoritative for', () => {
    for (const s of SOURCES) expect(s.notAuthoritativeFor.length, s.id).toBeGreaterThan(0)
  })
})

// 10 --------------------------------------------------------------------
describe('10. DATA UNAVAILABLE rendering', () => {
  it('unavailable items are null, never invented', () => {
    const ids = ['EV-900', 'EV-901', 'EV-902', 'EV-903', 'EV-904', 'EV-905']
    for (const id of ids) expect(EVIDENCE.find((e) => e.id === id)!.value, id).toBeNull()
  })
  it('the report renders a DATA UNAVAILABLE section', () => {
    const r = generateCaseReport({ evidence: EVIDENCE, hypotheses: HYPOTHESES, events: TIMELINE, conflicts: CONFLICTS })
    const s = r.find((x) => x.heading.includes('Data unavailable'))!
    expect(s.body.join(' ')).toContain('DATA UNAVAILABLE')
  })
  it('May 2026 pool TVL is unavailable and not substituted with the Sept figure', () => {
    expect(EVIDENCE.find((e) => e.id === 'EV-901')!.value).toBeNull()
  })
})

// 11 --------------------------------------------------------------------
describe('11. conflict rendering', () => {
  it('unresolved conflicts declare no canonical series', () => {
    for (const c of CONFLICTS.filter((x) => x.resolution === 'UNRESOLVED')) {
      expect(c.canonicalForAnalysis, c.id).toBeNull()
      expect(() => assertConflictNotBlended(c)).not.toThrow()
    }
  })
  it('a blended unresolved conflict is refused', () => {
    expect(() =>
      assertConflictNotBlended({ ...CONFLICTS[0]!, canonicalForAnalysis: 'coingecko' }),
    ).toThrow(/must report all observations separately/)
  })
  it('C14 is RESOLVED with a recorded reason', () => {
    const c14 = CONFLICTS.find((c) => c.id === 'C14')!
    expect(c14.resolution).toBe('RESOLVED')
    expect(c14.resolutionNote).toContain('C1')
  })
  it('C15 is registered and unresolved', () => {
    expect(CONFLICTS.find((c) => c.id === 'C15')!.resolution).toBe('UNRESOLVED')
  })
  it('the volume conflict keeps all three provider values', () => {
    expect(CONFLICTS.find((c) => c.id === 'C4')!.observations).toHaveLength(3)
  })
})

// 12-16 -----------------------------------------------------------------
describe('12-16. frozen hypothesis statuses', () => {
  it('12. H1 REJECTED', () => {
    const h = HYPOTHESIS_BY_ID.get('H1')!
    expect(h.status).toBe('REJECTED')
    const c = marketControlComparison()
    expect(c.sutPct!).toBeLessThan(-70)
    expect(Math.abs(c.btcPct!)).toBeLessThan(5)
  })
  it('13. H2 SUPPORTED as amplifier, LP-flight variant rejected', () => {
    const h = HYPOTHESIS_BY_ID.get('H2')!
    expect(h.status).toBe('SUPPORTED')
    expect(h.scopeOfResult).toMatch(/amplification|depth exhaustion/i)
    expect(h.scopeOfResult).toMatch(/LP flight.*REJECTED/i)
  })
  it('14. H3a REJECTED', () => {
    expect(HYPOTHESIS_BY_ID.get('H3a')!.status).toBe('REJECTED')
  })
  it('15. H6 REJECTED', () => {
    const h = HYPOTHESIS_BY_ID.get('H6')!
    expect(h.status).toBe('REJECTED')
    expect(h.scopeOfResult).toMatch(/TOKEN SUPPLY/i)
  })
  it('16. H12 REJECTED for the DEX limb', () => {
    const h = HYPOTHESIS_BY_ID.get('H12')!
    expect(h.status).toBe('REJECTED')
    expect(h.scopeOfResult).toMatch(/DEX limb/i)
  })
  it('every hypothesis status carries a human review', () => {
    for (const h of HYPOTHESES) expect(h.review, h.id).not.toBeNull()
  })
})

// 17 --------------------------------------------------------------------
describe('17. human-author requirement for a root-cause conclusion', () => {
  const allGates = { timing: true, magnitude: true, mechanism: true, controls: true, alternatives: true, human_authorship: true }

  it('refuses a causal claim with no author — no AI root-cause verdict', () => {
    expect(() => assertCausalClaimAllowed({ causal: true, author: null }, allGates)).toThrow(CausalClaimError)
  })
  it('refuses a causal claim when gates are unmet even with an author', () => {
    expect(() => assertCausalClaimAllowed({ causal: true, author: 'Analyst' }, { ...allGates, timing: false }))
      .toThrow(/causal gate\(s\) not met: timing/)
  })
  it('allows a fully gated, human-authored claim', () => {
    expect(() => assertCausalClaimAllowed({ causal: true, author: 'Analyst', }, allGates)).not.toThrow()
  })
  it('the default report states mechanism + unresolved catalyst, never a root cause', () => {
    const r = generateCaseReport({ evidence: EVIDENCE, hypotheses: HYPOTHESES, events: TIMELINE, conflicts: CONFLICTS })
    const text = r.map((s) => s.body.join(' ')).join(' ')
    expect(text).toContain('The initiating catalyst remains unresolved.')
    expect(text).toContain('Sell-side pressure interacting with structurally shallow liquidity')
    expect(text.toLowerCase()).not.toContain('crashed because')
    expect(text.toLowerCase()).not.toContain('the root cause was')
  })
  it('the report refuses to emit an unauthored human conclusion', () => {
    expect(() =>
      generateCaseReport({
        evidence: EVIDENCE, hypotheses: HYPOTHESES, events: TIMELINE, conflicts: CONFLICTS,
        rootCause: { statement: 'x', author: '', approvedAt: '2026-09-30', gatesMet: allGates },
      }),
    ).toThrow(CausalClaimError)
  })
  it('accepts a human-approved conclusion when fully gated', () => {
    const r = generateCaseReport({
      evidence: EVIDENCE, hypotheses: HYPOTHESES, events: TIMELINE, conflicts: CONFLICTS,
      rootCause: { statement: 'Reviewed conclusion.', author: 'Lead Investigator', approvedAt: '2026-09-30', gatesMet: allGates },
    })
    expect(r[0]!.body.join(' ')).toContain('HUMAN-APPROVED CONCLUSION')
  })
})
