/**
 * MARKET QUALITY (QA) — module assembler.
 *
 * Runs the six dimensions over the layers the project already has and rolls them
 * into one categorical summary. Pure: it is handed its inputs, so the whole
 * module is deterministic under test and owns no retrieval, no storage write and
 * no governance authority.
 *
 * The workflow it implements, end to end:
 *
 *   SYNC DATA → RUN QA CHECKS → DETECT ISSUES → SHOW RESULTS → TRACK TRENDS
 *
 * Sync data is produced by the EXISTING Live Market / Daily Sync layer. This
 * module consumes it.
 */
import type { LiveSyncRun } from '../live-market-sync'
import type { GovernanceState } from '../governance'
import type { Observation } from '../types'
import { marketDataQa } from './market-data-qa'
import { liquidityRegression, type FrozenImpact, type RegressionRow } from './liquidity-regression'
import { transactionIntegrity, type TransactionCase, type TxFieldResult } from './transaction-integrity'
import { resilience, type ScenarioResult } from './resilience'
import { security, type SecurityResult } from './security'
import { evidenceValidation, type TraceRow } from './evidence-validation'
import { summarise, type QaDimension, type QaSummary } from './types'

export * from './types'
export * from './market-data-qa'
export * from './liquidity-regression'
export * from './transaction-integrity'
export * from './resilience'
export * from './security'
export * from './evidence-validation'

export const QA_TITLE = 'Market Quality (QA)'

export const QA_PURPOSE =
  'A QA intelligence layer inside SUT Value Forensics. It consumes the existing research, evidence and '
  + 'live market layers, validates them, and detects measurable quality degradation. It collects no market '
  + 'data of its own, approves nothing and decides nothing.'

/**
 * What this layer is for, stated so it cannot be overread. The QA layer does not
 * improve SUT market value and makes no claim about price, adoption or ranking.
 */
export const QA_SCOPE_STATEMENT =
  'The QA layer identifies measurable quality degradation and provides evidence that can support controlled '
  + 'interventions and future experiments. It is not a market, price, adoption or ranking statement.'

export const QA_WORKFLOW: Array<{ step: string; detail: string }> = [
  { step: 'Sync data', detail: 'The existing Live Market / Daily Sync layer captures observations as evidence.' },
  { step: 'Run QA checks', detail: 'Six dimensions validate availability, shape, provenance and divergence.' },
  { step: 'Detect issues', detail: 'Regression and anomaly detection compare against frozen and previous observations.' },
  { step: 'Show results', detail: 'Each result carries a status, a reason and its evidence reference.' },
  { step: 'Track trends', detail: 'Repeated runs build a history; a trend is shown only where enough real runs exist.' },
]

export interface MarketQualityInput {
  /** every stored sync run, oldest first */
  runs: LiveSyncRun[]
  /** the most recent integrity-verified run, or null */
  latest: LiveSyncRun | null
  /** the run before `latest`, or null */
  previous: LiveSyncRun | null
  /** frozen EXP-001 price-impact baseline, read not recomputed */
  impacts: FrozenImpact[]
  /** effective governance state, read-only */
  gov: GovernanceState | null
  /** frozen evidence records, read-only */
  frozen: Observation[]
  /** experiment ids that exist in the registry */
  knownExperimentIds: string[]
  /** expected/actual transaction pairs; empty when no product telemetry is connected */
  transactionCases: TransactionCase[]
  /** injected clock so the whole module is deterministic under test */
  nowIso: string
}

export interface MarketQualityReport {
  summary: QaSummary
  transaction: QaDimension & { cases: Array<{ c: TransactionCase; fields: TxFieldResult[] }> }
  marketData: QaDimension
  liquidity: QaDimension & { rows: RegressionRow[] }
  resilience: QaDimension & { scenarios: ScenarioResult[] }
  security: QaDimension & { results: SecurityResult[] }
  evidence: QaDimension & { rows: TraceRow[] }
}

export function buildMarketQuality(input: MarketQualityInput): MarketQualityReport {
  const transaction = transactionIntegrity(input.transactionCases)
  const marketData = marketDataQa(input.latest, input.nowIso)
  const liquidity = liquidityRegression({
    impacts: input.impacts,
    current: input.latest,
    previous: input.previous,
  })
  const res = resilience({ runs: input.runs, latest: input.latest, nowIso: input.nowIso })
  const sec = security({
    runs: input.runs, latest: input.latest, gov: input.gov, nowIso: input.nowIso,
  })

  // Evidence Validation inspects the other five dimensions, so it runs last and
  // is excluded from its own traceability denominator.
  const upstream = [
    ...transaction.checks, ...marketData.checks, ...liquidity.checks,
    ...res.checks, ...sec.checks,
  ]
  const evidence = evidenceValidation({
    allChecks: upstream,
    run: input.latest,
    frozen: input.frozen,
    knownExperimentIds: input.knownExperimentIds,
    nowIso: input.nowIso,
  })

  // DIMENSION_ORDER is the display and rollup order.
  const dimensions: QaDimension[] = [
    transaction, marketData, liquidity, res, sec, evidence,
  ]
  return {
    summary: summarise(dimensions, input.nowIso),
    transaction,
    marketData,
    liquidity,
    resilience: res,
    security: sec,
    evidence,
  }
}

// ───────────────────────────────────────────── trends

export interface TrendPoint {
  syncId: string
  date: string
  /** metrics valued out of metrics expected */
  completeness: number | null
  /** sources validated out of sources attempted */
  sourceHealth: number | null
  /** observations with no value */
  unavailable: number
}

export const MIN_TREND_POINTS = 2

export const INSUFFICIENT_TREND =
  'INSUFFICIENT DATA FOR TREND — at least two stored sync runs are required before a trend is shown.'

/**
 * Build a trend series from stored runs. Returns an empty array when fewer than
 * `MIN_TREND_POINTS` runs exist: a single point is not a trend, and the UI says
 * so rather than drawing one.
 */
export function qaTrend(runs: LiveSyncRun[]): TrendPoint[] {
  if (runs.length < MIN_TREND_POINTS) return []
  return runs.map((r) => {
    const valued = r.snapshot.filter((f) => f.value !== null).length
    const total = r.snapshot.length
    const sourcesOk = r.evidence.filter((e) => e.status === 'VALIDATED').length
    return {
      syncId: r.id,
      date: r.date,
      completeness: total === 0 ? null : (valued / total) * 100,
      sourceHealth: r.evidence.length === 0 ? null : (sourcesOk / r.evidence.length) * 100,
      unavailable: r.observations.filter((o) => o.value === null).length,
    }
  })
}
