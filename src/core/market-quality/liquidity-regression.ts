/**
 * LIQUIDITY REGRESSION — frozen baseline versus current comparable observation.
 *
 * This module READS the EXP-001 baseline captures. It never writes them, never
 * recalculates them and never reinterprets them.
 *
 * The single most important rule here:
 *
 *   A FROZEN BASELINE MEASUREMENT IS NOT AN APPROVED THRESHOLD.
 *
 * EXP-001's four price-impact values are historical observations. They are not
 * acceptance criteria, and this module does not turn them into pass/fail business
 * gates. What it does is detect DIVERGENCE from the recorded baseline and label it
 * for human attention. "NO REGRESSION" here means "no divergence beyond the QA
 * detection margin was observed" — not "this value is acceptable to the business".
 * Threshold approval remains exactly where it was: with a named human, via
 * Proposed Thresholds and Pre-Registration.
 *
 * The second rule: a comparison requires METHOD-MATCHED data on both sides.
 * EXP-001's price impact is modelled Uniswap V3 single-active-range math at a
 * stated block, under a registered method fingerprint. The live market sync does
 * not compute that quantity, so the comparison is honestly DATA UNAVAILABLE
 * rather than approximated from a different methodology.
 */
import { compareRuns, type LiveSyncRun, type MetricComparison } from '../live-market-sync'
import { METHOD_FINGERPRINT_EXP001 } from '../../data/baseline-captures'
import {
  check, dimension, emptyEvidenceRef, type QaCheck, type QaDimension, type QaEvidenceRef, type QaStatus,
} from './types'

/**
 * QA detection margins. These decide only when divergence is worth a human's
 * attention. They are NOT business thresholds, are NOT registered, gate nothing,
 * and approve nothing.
 */
export const REGRESSION_MARGIN_PCT_POINTS = 1.0
export const REGRESSION_FAIL_PCT_POINTS = 5.0
export const LIQUIDITY_DECLINE_WARNING_PCT = 10
export const LIQUIDITY_DECLINE_FAIL_PCT = 30

export type RegressionVerdict = 'NO_REGRESSION' | 'REGRESSION_DETECTED' | 'DATA_UNAVAILABLE'

/** `LOWER_IS_BETTER` mirrors EXP-001: price impact is compared by absolute magnitude. */
export type Direction = 'LOWER_IS_BETTER' | 'HIGHER_IS_BETTER'

export interface RegressionRow {
  id: string
  metric: string
  /** the frozen or previous reference value */
  baseline: number | null
  baselineLabel: string
  baselineSource: string
  current: number | null
  unit: string
  direction: Direction
  /** current − baseline, in the metric's own unit; null when not computable */
  change: number | null
  /** percentage change relative to the baseline; null when not computable */
  changePct: number | null
  verdict: RegressionVerdict
  status: QaStatus
  reason: string | null
  evidence: QaEvidenceRef
}

/**
 * The deterministic core: given a reference and a current value, decide the
 * verdict. Pure, so it is unit-testable without any store or fixture.
 *
 * For `LOWER_IS_BETTER` the comparison uses ABSOLUTE MAGNITUDE, exactly as
 * EXP-001 specifies — a sell impact of −9.6% and −14.2% are magnitudes 9.6 and
 * 14.2, and the second is worse.
 */
export function evaluateRegression(args: {
  baseline: number | null
  current: number | null
  direction: Direction
  /** divergence in the metric's own units before a WARNING is raised */
  marginWarning: number
  /** divergence before a FAIL is raised */
  marginFail: number
  /** compare magnitudes rather than signed values */
  useMagnitude: boolean
}): { verdict: RegressionVerdict; status: QaStatus; change: number | null; changePct: number | null } {
  const { baseline, current, direction, marginWarning, marginFail, useMagnitude } = args
  if (baseline === null || current === null) {
    return { verdict: 'DATA_UNAVAILABLE', status: 'DATA_UNAVAILABLE', change: null, changePct: null }
  }
  const b = useMagnitude ? Math.abs(baseline) : baseline
  const c = useMagnitude ? Math.abs(current) : current
  const change = c - b
  const changePct = b === 0 ? null : (change / b) * 100
  // Deterioration is positive movement when lower is better, negative when higher is better.
  const deterioration = direction === 'LOWER_IS_BETTER' ? change : -change
  if (deterioration > marginFail) {
    return { verdict: 'REGRESSION_DETECTED', status: 'FAIL', change, changePct }
  }
  if (deterioration > marginWarning) {
    return { verdict: 'REGRESSION_DETECTED', status: 'WARNING', change, changePct }
  }
  return { verdict: 'NO_REGRESSION', status: 'PASS', change, changePct }
}

// ─────────────────────── part A: frozen EXP-001 price impact

/**
 * The four standardised sizes EXP-001 captured, plus the slot it could not fill.
 * Values are quoted from RUN-003 and are never recomputed here.
 */
export interface FrozenImpact {
  size: string
  /** signed, exactly as captured; null for the non-executable slot */
  value: number | null
  runId: string
  evidenceId: string | null
  notExecutable?: boolean
}

export const EXP001_IMPACT_BASELINE_RUN = 'RUN-003'

/**
 * Why no current value exists for these metrics. This is the honest finding, and
 * it names exactly what would be required to produce one.
 */
export const IMPACT_UNAVAILABLE_REASON =
  'No comparable current observation is available. EXP-001 price impact is modelled Uniswap V3 '
  + 'single-active-range math read at a stated block under method fingerprint '
  + `${METHOD_FINGERPRINT_EXP001.slice(0, 32)}…, and the live market sync does not compute that quantity. `
  + 'A comparison requires a new capture using the identical EXP-001 method; a value derived from a '
  + 'different methodology is not substituted here.'

export function frozenImpactRows(impacts: FrozenImpact[]): RegressionRow[] {
  return impacts.map((imp) => {
    const evidence: QaEvidenceRef = {
      ...emptyEvidenceRef(),
      evidenceId: imp.evidenceId,
      source: 'Polygon RPC — direct contract reads (EXP-001 baseline capture)',
      metric: `price_impact_${imp.size}`,
      value: imp.value,
      unit: 'percent',
      symbol: 'SUT',
      observedAt: '2026-09-30',
      provenance: 'derived: Uniswap V3 single-active-range math at a stated block',
      relatedExperiment: 'EXP-001',
      sourceStatus: imp.notExecutable ? 'NOT_EXECUTABLE' : 'MEASURED',
    }
    if (imp.notExecutable) {
      return {
        id: `lr-impact-${imp.size}`,
        metric: `${imp.size} price impact`,
        baseline: null,
        baselineLabel: 'NOT EXECUTABLE / NOT REGISTERABLE',
        baselineSource: `EXP-001 ${imp.runId}`,
        current: null,
        unit: 'percent',
        direction: 'LOWER_IS_BETTER',
        change: null,
        changePct: null,
        verdict: 'DATA_UNAVAILABLE',
        status: 'DATA_UNAVAILABLE',
        reason: 'The frozen baseline records this size as NOT EXECUTABLE / NOT REGISTERABLE because the pool '
          + 'could not fill it on either side. There is no baseline percentage to regress against, and none '
          + 'is invented.',
        evidence,
      }
    }
    return {
      id: `lr-impact-${imp.size}`,
      metric: `${imp.size} price impact`,
      baseline: imp.value,
      baselineLabel: imp.value === null ? 'DATA UNAVAILABLE' : `${Math.abs(imp.value).toFixed(1)}%`,
      baselineSource: `EXP-001 ${imp.runId}`,
      current: null,
      unit: 'percent',
      direction: 'LOWER_IS_BETTER',
      change: null,
      changePct: null,
      verdict: 'DATA_UNAVAILABLE',
      status: 'DATA_UNAVAILABLE',
      reason: IMPACT_UNAVAILABLE_REASON,
      evidence,
    }
  })
}

// ─────────────────────── part B: run-over-run market liquidity

/**
 * Liquidity-related metrics the live sync DOES capture, so a run-over-run
 * comparison is genuinely method-matched: same source, same endpoint, same
 * metric, consecutive syncs.
 */
export const RUN_OVER_RUN_METRICS: Array<{
  metric: string; label: string; direction: Direction
  warningPct: number; failPct: number
}> = [
  {
    metric: 'pair_liquidity_usd', label: 'Pool liquidity (USD)', direction: 'HIGHER_IS_BETTER',
    warningPct: LIQUIDITY_DECLINE_WARNING_PCT, failPct: LIQUIDITY_DECLINE_FAIL_PCT,
  },
  {
    metric: 'pair_volume_24h', label: 'Pair 24h volume (USD)', direction: 'HIGHER_IS_BETTER',
    warningPct: 50, failPct: 90,
  },
  {
    metric: 'volume_24h', label: 'Reported 24h volume (USD)', direction: 'HIGHER_IS_BETTER',
    warningPct: 50, failPct: 90,
  },
]

export function runOverRunRows(
  current: LiveSyncRun | null,
  previous: LiveSyncRun | null,
): RegressionRow[] {
  return RUN_OVER_RUN_METRICS.map((spec) => {
    const base: RegressionRow = {
      id: `lr-ror-${spec.metric}`,
      metric: spec.label,
      baseline: null,
      baselineLabel: 'DATA UNAVAILABLE',
      baselineSource: previous ? `sync ${previous.id}` : 'no earlier sync stored',
      current: null,
      unit: 'USD',
      direction: spec.direction,
      change: null,
      changePct: null,
      verdict: 'DATA_UNAVAILABLE',
      status: 'DATA_UNAVAILABLE',
      reason: null,
      evidence: { ...emptyEvidenceRef(), metric: spec.metric, symbol: 'SUT' },
    }
    if (!current) {
      return { ...base, reason: 'No current sync run is stored, so no comparison exists.' }
    }
    const comparisons: MetricComparison[] = compareRuns(current, previous)
    const cmp = comparisons.find((c) => c.metric === spec.metric) ?? null
    const evidence: QaEvidenceRef = {
      ...emptyEvidenceRef(),
      metric: spec.metric,
      source: cmp?.source ?? null,
      unit: cmp?.unit ?? 'USD',
      symbol: 'SUT',
      observedAt: cmp?.currentTimestamp ?? null,
      retrievedAt: current.completedAt,
      value: cmp?.currentValue ?? null,
      relatedSyncId: current.id,
      provenance: 'run-over-run comparison of the same metric from the same source across consecutive syncs',
      sourceStatus: cmp?.status ?? null,
    }
    if (!cmp) {
      return {
        ...base, evidence,
        reason: `Sync ${current.id} carries no "${spec.metric}" field to compare.`,
      }
    }
    if (cmp.status === 'COMPARISON_UNAVAILABLE') {
      return {
        ...base,
        current: typeof cmp.currentValue === 'number' ? cmp.currentValue : null,
        baseline: typeof cmp.previousValue === 'number' ? cmp.previousValue : null,
        unit: cmp.unit,
        evidence,
        reason: `No comparable current observation is available: ${cmp.reason ?? 'the comparison could not be made'}.`,
      }
    }
    const prev = typeof cmp.previousValue === 'number' ? cmp.previousValue : null
    const cur = typeof cmp.currentValue === 'number' ? cmp.currentValue : null
    // Percentage-based bands: express the margin in the metric's own units.
    const marginWarning = prev === null ? 0 : Math.abs(prev) * (spec.warningPct / 100)
    const marginFail = prev === null ? 0 : Math.abs(prev) * (spec.failPct / 100)
    const r = evaluateRegression({
      baseline: prev, current: cur, direction: spec.direction,
      marginWarning, marginFail, useMagnitude: false,
    })
    const pctText = r.changePct === null ? 'n/a' : `${r.changePct > 0 ? '+' : ''}${r.changePct.toFixed(1)}%`
    return {
      id: base.id,
      metric: spec.label,
      baseline: prev,
      baselineLabel: prev === null ? 'DATA UNAVAILABLE' : prev.toLocaleString(),
      baselineSource: previous ? `sync ${previous.id}` : 'no earlier sync stored',
      current: cur,
      unit: cmp.unit,
      direction: spec.direction,
      change: r.change,
      changePct: r.changePct,
      verdict: r.verdict,
      status: r.status,
      reason: r.verdict === 'REGRESSION_DETECTED'
        ? `${spec.label} moved ${pctText} against sync ${previous?.id ?? 'the previous run'}, a decline beyond `
          + `the ${spec.warningPct}% QA detection margin. This is a divergence flagged for review, not a `
          + 'business acceptance decision.'
        : r.verdict === 'NO_REGRESSION' ? null : 'No comparable current observation is available.',
      evidence,
    }
  })
}

// ───────────────────────────────────────────── dimension

export const LIQUIDITY_PURPOSE =
  'Compares current comparable observations against the frozen EXP-001 baseline and against the previous '
  + 'stored sync, and flags divergence for human review. Baseline values are historical measurements, not '
  + 'approved thresholds, and nothing here approves or registers anything.'

export const BASELINE_NOT_A_THRESHOLD =
  'Observed baseline — not a target. EXP-001 thresholds remain PROPOSED and 0 of 4 REGISTERED. This QA '
  + 'dimension detects divergence from a recorded measurement; it does not decide what is acceptable.'

export function liquidityRegression(args: {
  impacts: FrozenImpact[]
  current: LiveSyncRun | null
  previous: LiveSyncRun | null
}): QaDimension & { rows: RegressionRow[] } {
  const rows = [...frozenImpactRows(args.impacts), ...runOverRunRows(args.current, args.previous)]
  const checks: QaCheck[] = rows.map((r) => check({
    id: r.id,
    label: r.metric,
    status: r.status,
    reason: r.reason,
    expected: `${r.baselineLabel} (${r.baselineSource})`,
    actual: r.current === null
      ? 'DATA UNAVAILABLE'
      : `${r.current.toLocaleString()} ${r.unit}`,
    evidence: r.evidence,
    evaluatedAt: r.status === 'DATA_UNAVAILABLE' ? null : (args.current?.completedAt ?? null),
  }))
  const dim = dimension({
    id: 'liquidity-regression',
    title: 'Liquidity Regression',
    purpose: LIQUIDITY_PURPOSE,
    checks,
  })
  return { ...dim, rows }
}
