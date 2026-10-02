/**
 * Case #001 evidence report generator.
 *
 * HARD RULE: the generator may state a SUPPORTED MECHANISM and that the
 * INITIATING CATALYST REMAINS UNRESOLVED. It may never write
 * "SUT crashed because X" unless a human reviewer has recorded and approved
 * that conclusion (evidence-model.md §4).
 */
import { assertCausalClaimAllowed, findForbiddenPhrases, type CausalGate } from './rules'
import type { DataConflict, Finding, Hypothesis, Observation, TimelineEvent } from './types'
import { c14Reconciliation, combinedAggregate, marketControlComparison } from './analysis'
import { CASE, MAIN_POOL, TOKEN, TRACED_CHAIN } from '../data/measurements'

export interface RootCauseConclusion {
  statement: string
  author: string
  approvedAt: string
  gatesMet: Partial<Record<CausalGate, boolean>>
}

export interface ReportInput {
  evidence: Observation[]
  hypotheses: Hypothesis[]
  events: TimelineEvent[]
  conflicts: DataConflict[]
  /** null unless a human has explicitly recorded and approved a causal conclusion */
  rootCause?: RootCauseConclusion | null
}

export interface ReportSection { heading: string; body: string[] }

export const SUPPORTED_MECHANISM_STATEMENT =
  'Sell-side pressure interacting with structurally shallow liquidity produced an extreme price response.'
export const UNRESOLVED_CATALYST_STATEMENT =
  'The initiating catalyst remains unresolved.'

export function generateCaseReport(input: ReportInput): ReportSection[] {
  const { evidence, hypotheses, events, conflicts } = input
  const rootCause = input.rootCause ?? null

  // Gate the causal conclusion BEFORE it can reach the output.
  if (rootCause) {
    const finding: Pick<Finding, 'causal' | 'author'> = { causal: true, author: rootCause.author }
    assertCausalClaimAllowed(finding, rootCause.gatesMet)
  }

  const ctrl = marketControlComparison()
  const agg = combinedAggregate(['2026-05-17', '2026-05-18'])
  const rec = c14Reconciliation()
  const byStatus = (s: string) => hypotheses.filter((h) => h.status === s)
  const unavailableEvidence = evidence.filter((e) => e.value === null)

  const sections: ReportSection[] = [
    {
      heading: '1. Executive summary',
      body: [
        `Case ${CASE.id} — ${CASE.title}. Window ${CASE.windowStart} to ${CASE.windowEnd}; event window ${CASE.eventStart} to ${CASE.eventEnd}.`,
        `Asset: ${TOKEN.name} (${TOKEN.symbol}), ${TOKEN.chain}, contract ${TOKEN.contract}.`,
        `SUPPORTED MECHANISM: ${SUPPORTED_MECHANISM_STATEMENT}`,
        rootCause
          ? `HUMAN-APPROVED CONCLUSION (author: ${rootCause.author}, ${rootCause.approvedAt}): ${rootCause.statement}`
          : `${UNRESOLVED_CATALYST_STATEMENT} No root cause is stated: the evidence standard in evidence-model.md §4 is not met for any candidate trigger, and no AI-generated root-cause verdict may be produced.`,
      ],
    },
    {
      heading: '2. Investigation scope',
      body: [
        `Context window ${CASE.windowStart} → ${CASE.windowEnd}; primary event window ${CASE.eventStart} → ${CASE.eventEnd}.`,
        `Onset refined to ${CASE.onset} intraday. ${CASE.onsetNote}`,
        `Identity gate: only records mapped to ${TOKEN.contract} on ${TOKEN.chain} are admitted. Ticker "SUT" is never sufficient.`,
      ],
    },
    {
      heading: '3. Market evidence',
      body: [
        `SUT ${ctrl.sutPct?.toFixed(1)}% vs BTC ${ctrl.btcPct?.toFixed(1)}% and ETH ${ctrl.ethPct?.toFixed(1)}% over ${ctrl.from} → ${ctrl.to}.`,
        'There was no broad crypto-market crash on 2026-05-17/18; the move is SUT-specific.',
        'Price agrees across three independent series (CoinGecko, Coinranking, contract-keyed DEX pool) within ~1-5%.',
        'Volume does NOT agree across providers (conflict C4, up to 4.2x) — no canonical volume series exists.',
      ],
    },
    {
      heading: '4. On-chain evidence',
      body: [
        `Traced chain: ${TRACED_CHAIN.src} → ${TRACED_CHAIN.dst} → ${TRACED_CHAIN.hop3}. All are unlabelled EOAs; roles are UNKNOWN.`,
        `${TRACED_CHAIN.srcToDstSut.toLocaleString()} SUT moved SRC → DST during May (corrects an earlier incomplete figure of ~5,920,000).`,
        `The chain terminates in a retail fan-out: ${TRACED_CHAIN.hop3OutMayTx.toLocaleString()} transfers to ${TRACED_CHAIN.hop3DistinctRecipientsMay.toLocaleString()} distinct addresses, averaging ~${TRACED_CHAIN.hop3AvgTransferSut} SUT.`,
        `No cluster address sold into the main pool: ${TRACED_CHAIN.clusterPoolSellsSut} SUT (${TRACED_CHAIN.clusterPoolSellsPct}% of pool sell inflow). CAVEAT: this measures DIRECT transfers only — a sale routed via an aggregator appears as the router address.`,
        'This relationship is NOT labelled as the cause of the crash.',
      ],
    },
    {
      heading: '5. Liquidity evidence',
      body: [
        `${agg.label}: swap volume $${Math.round(agg.volumeUsd).toLocaleString()}, buy $${Math.round(agg.buyUsd).toLocaleString()}, sell $${Math.round(agg.sellUsd).toLocaleString()}, net sell $${Math.round(agg.netSellUsd).toLocaleString()} across ${agg.swaps.toLocaleString()} swaps.`,
        'A net sell imbalance of roughly $27,000 accompanied a -62.7% intraday move on 2026-05-17: depth exhaustion, not net imbalance.',
        'Liquidity was NOT withdrawn — net liquidity was positive on every crash day (+$15,911 / +$3,667 / +$3,053). LP churn rose ~65x, the signature of concentrated-liquidity re-ranging.',
        rec
          ? `Conflict C14 RESOLVED: swap buy $${Math.round(rec.swapBuyUsd).toLocaleString()} + LP mint $${Math.round(rec.lpAddUsd).toLocaleString()} = $${Math.round(rec.predictedGrossIn).toLocaleString()} vs measured gross inflow $${Math.round(rec.measuredGrossIn).toLocaleString()} (difference $${Math.round(rec.inDifference)}). ${rec.liquidityShareOfGrossIn.toFixed(0)}% of apparent "volume" was liquidity provisioning.`
          : 'C14 reconciliation unavailable.',
        `May 2026 pool TVL: DATA UNAVAILABLE — never measured. The ~$${MAIN_POOL.reserveUsdSep2026.toLocaleString()} figure is a 2026-09-30 snapshot and must not be substituted.`,
      ],
    },
    {
      heading: '6. Exchange evidence',
      body: [
        'Gate TR delisted SUPERTRUST SUT/TRY effective 2026-04-01 (identity-verified) — ~6 weeks before the crash; price recovered into mid-May afterwards.',
        'GOPAX terminated support (2025); MEXC no longer trades SUT.',
        'BitMart: IDENTITY NOT VERIFIED. research-v2 established BitMart SUT was Sanity United. Its "withdrawal closed 2026-05-16" date sits at exact crash onset and MUST NOT be used until contract-level evidence resolves it.',
        'Historical CEX order-book depth for May 2026: DATA UNAVAILABLE — no public source retains it.',
      ],
    },
    {
      heading: '7. Trust / legal timeline',
      body: [
        ...events
          .filter((e) => e.type === 'legal' || e.type === 'company')
          .map((e) => `${e.time} [${e.classification}] ${e.title}`),
        'No item constitutes a finding of fraud, Ponzi operation, manipulation or illegality. No competent authority has been shown to have established any such finding.',
      ],
    },
    {
      heading: '8. Hypothesis matrix',
      body: hypotheses.map(
        (h) => `${h.id} ${h.title}: ${h.status}${h.scopeOfResult ? ` — ${h.scopeOfResult}` : ''}`,
      ),
    },
    {
      heading: '9. Supported mechanisms',
      body: [
        SUPPORTED_MECHANISM_STATEMENT,
        ...byStatus('SUPPORTED').map((h) => `${h.id} ${h.title} — ${h.scopeOfResult}`),
        'Mechanism is not cause. This explains HOW a modest flow became an extreme move; it does not explain WHAT initiated the selling.',
      ],
    },
    {
      heading: '10. Rejected hypotheses',
      body: byStatus('REJECTED').map((h) => `${h.id} ${h.title} — ${h.scopeOfResult}`),
    },
    {
      heading: '11. Inconclusive hypotheses',
      body: byStatus('INCONCLUSIVE').map((h) => `${h.id} ${h.title} — ${h.scopeOfResult}`),
    },
    {
      heading: '12. Data unavailable',
      body: [
        ...byStatus('DATA_UNAVAILABLE').map((h) => `${h.id} ${h.title} — ${h.scopeOfResult}`),
        ...unavailableEvidence.map((e) => `${e.id} ${e.metric}: DATA UNAVAILABLE — ${e.notes ?? ''}`),
      ],
    },
    {
      heading: '13. Unresolved catalyst',
      body: [
        UNRESOLVED_CATALYST_STATEMENT,
        'Candidates closed: H1 (market-wide), H3a (concentrated dump), H6 (supply), H12 (support withdrawal), H2 LP-flight variant — all REJECTED.',
        'Candidates open: H4 (exchange access) is identity-blocked on the BitMart question; H9 (information event) was never systematically searched; H11\'s motive limb is unmeasured.',
        'Absence of evidence is not evidence of absence — the 2026-05-15..20 window search was not completed and Korean-language sources are blocked to automation.',
      ],
    },
    {
      heading: '14. Evidence appendix',
      body: evidence.map(
        (e) =>
          `${e.id} | ${e.metric} = ${e.value ?? 'DATA UNAVAILABLE'} ${e.unit} | source=${e.sourceId} | observed=${e.observationTime ?? 'n/a'} | retrieved=${e.retrievedAt} | method=${e.methodology} | confidence=${e.confidence} | identity=${e.identityStatus}`,
      ),
    },
  ]

  // Final guard: no forbidden causal phrasing may escape unless a human approved it.
  if (!rootCause) {
    for (const s of sections) {
      for (const line of s.body) {
        const bad = findForbiddenPhrases(line)
        // "caused the crash" appears in section 4 only as an explicit denial.
        const isDenial = /\bNOT labelled as the cause\b/i.test(line)
        if (bad.length > 0 && !isDenial) {
          throw new Error(
            `report generator emitted forbidden causal phrasing ${JSON.stringify(bad)} in "${s.heading}" without a human-approved conclusion`,
          )
        }
      }
    }
  }

  void conflicts
  return sections
}

export function renderReportText(sections: ReportSection[]): string {
  return sections.map((s) => `## ${s.heading}\n\n${s.body.map((b) => `- ${b}`).join('\n')}`).join('\n\n')
}
