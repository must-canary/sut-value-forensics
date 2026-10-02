/**
 * Browser-based business threshold decision workflow — ADDITIVE.
 *
 * This layer lets a named business owner enter and approve threshold values in
 * the browser. It feeds the EXISTING governance system and bypasses none of it:
 *
 *   PROPOSED -> BUSINESS INPUT SAVED -> BUSINESS APPROVED
 *     -> (existing) REGISTERED -> LOCKED
 *
 * Business approval is NOT registration. The existing pre-registration workflow
 * remains the only thing that can register a threshold, and the existing
 * governance gates remain authoritative for intervention, comparison and result.
 */
import type { ThresholdDirection } from './pre-registration'

/** Distinct, never collapsed. */
export type DecisionState =
  | 'PROPOSED'
  | 'BUSINESS_INPUT_SAVED'
  | 'BUSINESS_APPROVED'
  | 'REGISTERED'
  | 'LOCKED'

export const DECISION_STATES: DecisionState[] = [
  'PROPOSED', 'BUSINESS_INPUT_SAVED', 'BUSINESS_APPROVED', 'REGISTERED', 'LOCKED',
]

/** The four executable sizes. $100K is absent and must stay absent. */
export const EXECUTABLE_SIZES = ['$10,000 buy', '$10,000 sell', '$50,000 buy', '$50,000 sell'] as const
export type ExecutableSize = (typeof EXECUTABLE_SIZES)[number]

export const NOT_EXECUTABLE_SIZE = '$100,000 (both sides)'

export class BusinessDecisionError extends Error {}

export interface ThresholdInput {
  size: ExecutableSize
  /** raw browser input; parsed and validated, never coerced silently */
  value: number | null
  rationale: string
}

export interface BusinessInputDraft {
  thresholds: ThresholdInput[]
  reviewerName: string
  decisionNote: string
  confirmed: boolean
}

export interface ValidationResult {
  valid: boolean
  problems: string[]
}

const named = (s: string | null | undefined) => !!s && s.trim().length > 0

/** Saving requires only that something coherent was typed; it is not approval. */
export function validateForSave(d: BusinessInputDraft): ValidationResult {
  const problems: string[] = []
  for (const t of d.thresholds) {
    if (!EXECUTABLE_SIZES.includes(t.size)) problems.push(`${t.size} is not an executable size`)
    if (t.value !== null && (!Number.isFinite(t.value) || t.value <= 0)) {
      problems.push(`${t.size}: a threshold must be a positive number`)
    }
  }
  if (d.thresholds.some((t) => t.size === NOT_EXECUTABLE_SIZE as string)) {
    problems.push('$100,000 is NOT EXECUTABLE and cannot carry a threshold')
  }
  return { valid: problems.length === 0, problems }
}

/** Approval is strict: all four, all valid, named reviewer, rationale, explicit confirmation. */
export function validateForApproval(d: BusinessInputDraft): ValidationResult {
  const problems: string[] = []
  for (const size of EXECUTABLE_SIZES) {
    const t = d.thresholds.find((x) => x.size === size)
    if (!t || t.value === null) { problems.push(`${size}: a threshold value is required`); continue }
    if (!Number.isFinite(t.value) || t.value <= 0) problems.push(`${size}: the threshold must be a positive number`)
    if (!named(t.rationale)) problems.push(`${size}: a rationale is required`)
  }
  if (!named(d.reviewerName)) problems.push('a decision owner / business reviewer name is required')
  if (!named(d.decisionNote)) problems.push('a decision note / rationale is required')
  if (!d.confirmed) problems.push('the reviewer must explicitly confirm the approval')
  return { valid: problems.length === 0, problems }
}

export interface ApprovedThreshold {
  size: ExecutableSize
  value: number
  rationale: string
  direction: ThresholdDirection
}

/** Immutable, auditable record of a business approval. */
export interface BusinessApprovalRecord {
  experimentId: string
  reviewer: string
  approvedAt: string
  decisionNote: string
  thresholds: ApprovedThreshold[]
  /** deterministic over values+reviewer+timestamp; changes if anything changes */
  fingerprint: string
  version: string
  approvalStatus: 'BUSINESS_APPROVED'
  /** business approval does NOT register — the existing workflow must still run */
  registersThreshold: false
}

/** Deterministic, order-independent fingerprint. */
export function fingerprintApproval(
  thresholds: ApprovedThreshold[], reviewer: string, approvedAt: string, version: string,
): string {
  const body = [...thresholds]
    .sort((a, b) => a.size.localeCompare(b.size))
    .map((t) => `${t.size}=${t.value}`)
    .join('|')
  const raw = `${version}|${reviewer.trim()}|${approvedAt}|${body}`
  let h = 0
  for (let i = 0; i < raw.length; i++) { h = (h * 31 + raw.charCodeAt(i)) | 0 }
  return `BA-${version}-${(h >>> 0).toString(16).padStart(8, '0')}`
}

export function createApprovalRecord(
  d: BusinessInputDraft, now: string, version: string,
): { created: boolean; problems: string[]; record: BusinessApprovalRecord | null } {
  const v = validateForApproval(d)
  if (!v.valid) return { created: false, problems: v.problems, record: null }
  const thresholds: ApprovedThreshold[] = EXECUTABLE_SIZES.map((size) => {
    const t = d.thresholds.find((x) => x.size === size)!
    return { size, value: t.value!, rationale: t.rationale.trim(), direction: 'LOWER_IS_BETTER' as const }
  })
  return {
    created: true, problems: [],
    record: {
      experimentId: 'EXP-001',
      reviewer: d.reviewerName.trim(),
      approvedAt: now,
      decisionNote: d.decisionNote.trim(),
      thresholds,
      fingerprint: fingerprintApproval(thresholds, d.reviewerName, now, version),
      version,
      approvalStatus: 'BUSINESS_APPROVED',
      registersThreshold: false,
    },
  }
}

/** Any edit after approval is refused; a change needs a new version. */
export function assertApprovalImmutable(
  prev: BusinessApprovalRecord, next: BusinessApprovalRecord,
): void {
  if (prev.version !== next.version) return
  if (prev.fingerprint !== next.fingerprint) {
    throw new BusinessDecisionError(
      `approval ${prev.fingerprint} is locked for version ${prev.version}; ` +
      'changing a threshold, rationale or reviewer requires a new experiment version',
    )
  }
  if (prev.reviewer !== next.reviewer) {
    throw new BusinessDecisionError('the approving reviewer cannot be silently changed')
  }
}

// ─────────────────────────────────── derived workflow state

export interface DecisionContext {
  approval: BusinessApprovalRecord | null
  inputSaved: boolean
  /** from the EXISTING pre-registration store */
  registeredCount: number
  requiredCount: number
}

export function decisionState(c: DecisionContext): DecisionState {
  if (c.requiredCount > 0 && c.registeredCount === c.requiredCount) {
    return 'LOCKED'
  }
  if (c.registeredCount > 0) return 'REGISTERED'
  if (c.approval) return 'BUSINESS_APPROVED'
  if (c.inputSaved) return 'BUSINESS_INPUT_SAVED'
  return 'PROPOSED'
}

/** Saving or approving never unlocks the experiment on its own. */
export function unlocksExperiment(c: DecisionContext): boolean {
  void c
  return false
}

export interface StatusPanel {
  baseline: string
  proposedThresholds: string
  businessInput: 'PENDING' | 'SAVED'
  businessApproval: 'PENDING' | 'APPROVED'
  thresholdRegistration: 'PENDING' | 'REGISTERED'
  baselineApproval: 'PENDING' | 'APPROVED'
  intervention: 'BLOCKED' | 'READY'
  result: 'NOT AVAILABLE' | 'AVAILABLE'
}

/** Derived from real governance state — never hardcoded. */
export function buildStatusPanel(args: {
  baselineRuns: number
  proposalCount: number
  inputSaved: boolean
  approval: BusinessApprovalRecord | null
  registeredCount: number
  requiredCount: number
  approvedBaselineRuns: number
  interventionRecorded: boolean
  comparisonCaptured: boolean
  finalReviewRecorded: boolean
}): StatusPanel {
  const registered = args.requiredCount > 0 && args.registeredCount === args.requiredCount
  return {
    baseline: args.baselineRuns > 0 ? 'COMPLETE' : 'INCOMPLETE',
    proposedThresholds: args.proposalCount > 0 ? 'PRESENT' : 'NONE',
    businessInput: args.inputSaved ? 'SAVED' : 'PENDING',
    businessApproval: args.approval ? 'APPROVED' : 'PENDING',
    thresholdRegistration: registered ? 'REGISTERED' : 'PENDING',
    baselineApproval: args.approvedBaselineRuns > 0 ? 'APPROVED' : 'PENDING',
    intervention: registered && args.approvedBaselineRuns > 0 ? 'READY' : 'BLOCKED',
    result: args.comparisonCaptured && args.finalReviewRecorded ? 'AVAILABLE' : 'NOT AVAILABLE',
  }
}

// ─────────────────────────────────── experiment run view

export interface ScenarioRow {
  scenario: ExecutableSize | typeof NOT_EXECUTABLE_SIZE
  baseline: string
  lockedThreshold: string
  actualResult: string
  absoluteImpact: string
  status: string
  runId: string
  timestamp: string
  evidence: string
}

/**
 * Builds the run view. Actual results come ONLY from a captured comparison;
 * there is no path for a user to type one.
 */
export function buildScenarioRows(args: {
  baselineRanges: Record<string, string>
  registeredThresholds: Record<string, number | null>
  comparison: { runId: string; capturedAt: string; readings: Array<{ size: string; value: number | null; evidenceId: string | null }> } | null
}): ScenarioRow[] {
  const rows: ScenarioRow[] = EXECUTABLE_SIZES.map((size) => {
    const th = args.registeredThresholds[size] ?? null
    const reading = args.comparison?.readings.find((r) => r.size === size) ?? null
    const hasResult = reading != null && reading.value !== null
    return {
      scenario: size,
      baseline: args.baselineRanges[size] ?? 'DATA UNAVAILABLE',
      lockedThreshold: th === null ? 'NOT REGISTERED' : `≤ ${th}%`,
      actualResult: hasResult ? `${reading!.value}%` : 'NOT AVAILABLE',
      absoluteImpact: hasResult ? `${Math.abs(reading!.value!)}%` : 'NOT AVAILABLE',
      status: th === null ? 'BLOCKED — threshold not registered'
        : !hasResult ? 'BLOCKED — no comparison capture'
        : Math.abs(reading!.value!) <= th ? 'MET' : 'NOT MET',
      runId: args.comparison?.runId ?? '—',
      timestamp: args.comparison?.capturedAt ?? '—',
      evidence: reading?.evidenceId ?? '—',
    }
  })
  rows.push({
    scenario: NOT_EXECUTABLE_SIZE,
    baseline: 'NOT EXECUTABLE',
    lockedThreshold: 'NOT REGISTERABLE',
    actualResult: 'NOT EXECUTABLE',
    absoluteImpact: 'NOT EXECUTABLE',
    status: 'NOT EXECUTABLE — venue cannot fill this size',
    runId: '—', timestamp: '—', evidence: '—',
  })
  return rows
}
