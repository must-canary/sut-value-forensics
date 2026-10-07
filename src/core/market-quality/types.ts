/**
 * MARKET QUALITY (QA) — shared status model and evidence shape.
 *
 * A QA intelligence layer INSIDE SUT Value Forensics. It is not a product, not a
 * second market-data pipeline and not a decision engine. It reads the layers the
 * project already has:
 *
 *   RESEARCH → EVIDENCE → LIVE MARKET DATA → QA VALIDATION
 *          → REGRESSION / ANOMALY DETECTION → EVIDENCE → REPORT / DECISION
 *
 * Three rules hold everywhere in this module:
 *
 *  1. DATA UNAVAILABLE is never collapsed into FAIL, and NOT EXECUTED is never
 *     collapsed into PASS. Absence of evidence is reported as absence.
 *  2. A check reports PASS only when it actually ran against real data.
 *  3. No frozen record, baseline value, threshold or governance state is written,
 *     recalculated or reinterpreted here. This module is read-only over them.
 */
import { assertAssessmentLanguage } from '../live-assessment'

// ───────────────────────────────────────────── status model

/**
 * The six-value status model. Deliberately not a boolean and deliberately not a
 * score: "we could not look" and "we looked and it is wrong" are different
 * findings, and conflating them is how a QA layer starts lying.
 */
export type QaStatus =
  | 'PASS'
  | 'WARNING'
  | 'FAIL'
  | 'DATA_UNAVAILABLE'
  | 'NOT_EXECUTED'
  | 'BLOCKED'

export const QA_STATUSES: QaStatus[] = [
  'PASS', 'WARNING', 'FAIL', 'DATA_UNAVAILABLE', 'NOT_EXECUTED', 'BLOCKED',
]

/** Module-level rollup. Categorical — there is no numeric health score. */
export type QaOverall =
  | 'HEALTHY'
  | 'WARNING'
  | 'DEGRADED'
  | 'BLOCKED'
  | 'DATA_INSUFFICIENT'

export const QA_OVERALL_STATES: QaOverall[] = [
  'HEALTHY', 'WARNING', 'DEGRADED', 'BLOCKED', 'DATA_INSUFFICIENT',
]

/** Statuses that mean "a real check ran and produced a verdict". */
export const EVALUATED: QaStatus[] = ['PASS', 'WARNING', 'FAIL']

/** Statuses that mean "no verdict exists" — never rendered as success. */
export const NOT_EVALUATED: QaStatus[] = ['DATA_UNAVAILABLE', 'NOT_EXECUTED', 'BLOCKED']

export const isEvaluated = (s: QaStatus): boolean => EVALUATED.includes(s)

export const statusLabel = (s: QaStatus | QaOverall): string => s.replace(/_/g, ' ')

// ───────────────────────────────────────────── evidence reference

/**
 * Traceability for a single QA result. Every field is nullable because a real
 * evidence layer has holes, and a hole must be visible rather than filled in.
 * Nothing here is ever synthesised: a null means the underlying record did not
 * supply the field.
 */
export interface QaEvidenceRef {
  evidenceId: string | null
  source: string | null
  sourceUrl: string | null
  retrievedAt: string | null
  observedAt: string | null
  metric: string | null
  value: number | string | null
  unit: string | null
  symbol: string | null
  sourceStatus: string | null
  provenance: string | null
  /** SHA-256 of the raw payload, when the capturing layer recorded one. */
  evidenceHash: string | null
  relatedExperiment: string | null
  relatedSyncId: string | null
}

export function emptyEvidenceRef(): QaEvidenceRef {
  return {
    evidenceId: null, source: null, sourceUrl: null, retrievedAt: null, observedAt: null,
    metric: null, value: null, unit: null, symbol: null, sourceStatus: null,
    provenance: null, evidenceHash: null, relatedExperiment: null, relatedSyncId: null,
  }
}

export const hasEvidence = (e: QaEvidenceRef | null): boolean =>
  !!e && (e.evidenceId !== null || e.source !== null || e.evidenceHash !== null)

// ───────────────────────────────────────────── check

/** One QA check result. `reason` is mandatory whenever the status is not PASS. */
export interface QaCheck {
  id: string
  label: string
  status: QaStatus
  /** Why this status — required for every non-PASS result. */
  reason: string | null
  /** What was compared, when a comparison happened. */
  expected?: string | null
  actual?: string | null
  evidence: QaEvidenceRef | null
  /** When this check was evaluated, ISO-8601. Null when it never ran. */
  evaluatedAt: string | null
}

export class QaCheckError extends Error {}

/**
 * Construct a check with the invariants enforced rather than hoped for:
 * a non-PASS status must carry a reason, and a non-evaluated status must not
 * carry an evaluation timestamp.
 */
export function check(c: {
  id: string
  label: string
  status: QaStatus
  reason?: string | null
  expected?: string | null
  actual?: string | null
  evidence?: QaEvidenceRef | null
  evaluatedAt?: string | null
}): QaCheck {
  if (c.status !== 'PASS' && !c.reason) {
    throw new QaCheckError(`${c.id}: a ${c.status} result must state a reason`)
  }
  if (NOT_EVALUATED.includes(c.status) && c.evaluatedAt) {
    throw new QaCheckError(
      `${c.id}: ${c.status} means no verdict was produced, so it cannot carry an evaluation timestamp`,
    )
  }
  if (c.reason) assertAssessmentLanguage(c.reason)
  assertAssessmentLanguage(c.label)
  return {
    id: c.id,
    label: c.label,
    status: c.status,
    reason: c.reason ?? null,
    expected: c.expected ?? null,
    actual: c.actual ?? null,
    evidence: c.evidence ?? null,
    evaluatedAt: NOT_EVALUATED.includes(c.status) ? null : (c.evaluatedAt ?? null),
  }
}

// ───────────────────────────────────────────── dimension

export type QaDimensionId =
  | 'transaction-integrity'
  | 'market-data'
  | 'liquidity-regression'
  | 'resilience'
  | 'security'
  | 'evidence-validation'

export interface QaDimension {
  id: QaDimensionId
  title: string
  /** What this dimension validates, in one sentence. */
  purpose: string
  status: QaStatus
  /** Why the dimension carries this status. */
  reason: string | null
  checks: QaCheck[]
}

export const DIMENSION_ORDER: QaDimensionId[] = [
  'transaction-integrity', 'market-data', 'liquidity-regression',
  'resilience', 'security', 'evidence-validation',
]

/**
 * Roll a dimension's checks into one status. Deterministic and documented:
 *
 *   any FAIL                        → FAIL
 *   any BLOCKED                     → BLOCKED
 *   any WARNING                     → WARNING
 *   at least one PASS, rest absent  → PASS
 *   nothing evaluated, any NOT_EXEC  → NOT_EXECUTED
 *   nothing evaluated at all        → DATA_UNAVAILABLE
 *
 * Non-evaluated checks never raise a rollup toward PASS, and a single PASS never
 * masks a FAIL.
 */
export function rollUpDimension(checks: QaCheck[]): QaStatus {
  if (checks.length === 0) return 'DATA_UNAVAILABLE'
  if (checks.some((c) => c.status === 'FAIL')) return 'FAIL'
  if (checks.some((c) => c.status === 'BLOCKED')) return 'BLOCKED'
  if (checks.some((c) => c.status === 'WARNING')) return 'WARNING'
  if (checks.some((c) => c.status === 'PASS')) return 'PASS'
  if (checks.some((c) => c.status === 'NOT_EXECUTED')) return 'NOT_EXECUTED'
  return 'DATA_UNAVAILABLE'
}

export function dimension(d: {
  id: QaDimensionId
  title: string
  purpose: string
  checks: QaCheck[]
  reason?: string | null
}): QaDimension {
  const status = rollUpDimension(d.checks)
  assertAssessmentLanguage(d.purpose)
  const reason = d.reason ?? defaultDimensionReason(status, d.checks)
  if (reason) assertAssessmentLanguage(reason)
  return { id: d.id, title: d.title, purpose: d.purpose, status, reason, checks: d.checks }
}

function defaultDimensionReason(status: QaStatus, checks: QaCheck[]): string | null {
  const n = checks.length
  const evaluated = checks.filter((c) => isEvaluated(c.status)).length
  switch (status) {
    case 'PASS':
      return null
    case 'FAIL':
      return `${checks.filter((c) => c.status === 'FAIL').length} of ${n} checks failed.`
    case 'WARNING':
      return `${checks.filter((c) => c.status === 'WARNING').length} of ${n} checks raised a warning.`
    case 'BLOCKED':
      return `${checks.filter((c) => c.status === 'BLOCKED').length} of ${n} checks are blocked.`
    case 'NOT_EXECUTED':
      return `No check in this dimension has been executed (${n} defined, ${evaluated} evaluated).`
    default:
      return `No evaluable data is available for this dimension (${n} checks defined, ${evaluated} evaluated).`
  }
}

// ───────────────────────────────────────────── summary

export interface QaSummary {
  overall: QaOverall
  /** Why the overall state is what it is. */
  reason: string
  dimensions: QaDimension[]
  counts: Record<QaStatus, number>
  /** Checks actually evaluated vs defined — the module's own coverage. */
  evaluated: number
  defined: number
  generatedAt: string
}

/**
 * Roll dimensions into one overall state. Deterministic and documented:
 *
 *   any dimension FAIL                      → DEGRADED
 *   any dimension BLOCKED                   → BLOCKED
 *   any dimension WARNING                   → WARNING
 *   any dimension produced NO verdict       → DATA_INSUFFICIENT
 *   every dimension evaluated and passing   → HEALTHY
 *
 * The fourth rule matters most. HEALTHY is unreachable while any dimension could
 * not be evaluated at all: announcing "healthy" on partial coverage is precisely
 * the misleading output this module exists to prevent. Severity still outranks
 * coverage, so a real WARNING or FAIL is never hidden behind a coverage caveat —
 * the per-dimension statuses show both at once.
 *
 * HEALTHY describes the QA checks that ran. It is deliberately NOT a statement
 * about the SUT market, the token, adoption or price, and the UI labels it as
 * such.
 */
export function rollUpOverall(dimensions: QaDimension[]): { overall: QaOverall; reason: string } {
  const defined = dimensions.flatMap((d) => d.checks)
  const evaluated = defined.filter((c) => isEvaluated(c.status))
  if (dimensions.length === 0 || evaluated.length === 0) {
    return {
      overall: 'DATA_INSUFFICIENT',
      reason: 'No QA check could be evaluated against real data, so no quality statement is made.',
    }
  }
  const failing = dimensions.filter((d) => d.status === 'FAIL')
  if (failing.length) {
    return {
      overall: 'DEGRADED',
      reason: `${failing.length} QA dimension(s) report a failure: ${failing.map((d) => d.title).join(', ')}.`,
    }
  }
  const blocked = dimensions.filter((d) => d.status === 'BLOCKED')
  if (blocked.length) {
    return {
      overall: 'BLOCKED',
      reason: `${blocked.length} QA dimension(s) are blocked: ${blocked.map((d) => d.title).join(', ')}.`,
    }
  }
  const warning = dimensions.filter((d) => d.status === 'WARNING')
  if (warning.length) {
    return {
      overall: 'WARNING',
      reason: `${warning.length} QA dimension(s) raised a warning: ${warning.map((d) => d.title).join(', ')}.`,
    }
  }
  // Coverage gate: HEALTHY requires that every dimension actually produced a
  // verdict. A dimension with no evaluable data is a gap, not a pass.
  const unevaluated = dimensions.filter((d) => NOT_EVALUATED.includes(d.status))
  if (unevaluated.length) {
    return {
      overall: 'DATA_INSUFFICIENT',
      reason: `${unevaluated.length} of ${dimensions.length} QA dimension(s) could not be evaluated `
        + `(${unevaluated.map((d) => `${d.title}: ${statusLabel(d.status)}`).join('; ')}). No overall `
        + 'quality statement is made while coverage is incomplete.',
    }
  }
  return {
    overall: 'HEALTHY',
    reason: `${evaluated.length} of ${defined.length} defined checks were evaluated and none failed. `
      + 'This describes the QA checks that ran, not the SUT market.',
  }
}

export function summarise(dimensions: QaDimension[], generatedAt: string): QaSummary {
  const all = dimensions.flatMap((d) => d.checks)
  const counts = QA_STATUSES.reduce<Record<QaStatus, number>>((acc, s) => {
    acc[s] = all.filter((c) => c.status === s).length
    return acc
  }, {} as Record<QaStatus, number>)
  const { overall, reason } = rollUpOverall(dimensions)
  return {
    overall,
    reason,
    dimensions,
    counts,
    evaluated: all.filter((c) => isEvaluated(c.status)).length,
    defined: all.length,
    generatedAt,
  }
}

// ───────────────────────────────────────────── shared helpers

/** Minutes between two ISO timestamps, or null when either is unusable. */
export function minutesBetween(laterIso: string | null, earlierIso: string | null): number | null {
  if (!laterIso || !earlierIso) return null
  const a = Date.parse(laterIso), b = Date.parse(earlierIso)
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return (a - b) / 60_000
}

export const pct = (v: number, digits = 2): string => `${v.toFixed(digits)}%`
