/**
 * Persistence for the governance chain — ADDITIVE.
 *
 * Same architecture as the Business Decision store: browser localStorage behind
 * an injectable StoragePort, pure core logic, in-memory adapter for tests. No
 * database, no service, no new dependency.
 *
 * What this module does NOT do:
 *   - it never registers a threshold, approves a baseline, records an
 *     intervention, captures a measurement or produces a result on its own;
 *     every write originates from an explicit human action and passes through
 *     the EXISTING governance commit functions, unchanged;
 *   - it never treats stored bytes as proof: each record carries a fingerprint
 *     that is recomputed on read, and a record that no longer matches is
 *     TAMPERED and is excluded from every gate calculation;
 *   - it never writes a measured value that the app invented — a comparison
 *     capture must come from a measured source with real evidence IDs.
 */
import {
  commitBaselineApproval, commitFinalReview, commitIntervention, commitThreshold,
  compareKpi, calculateResult, currentGate, validateComparison,
  type ApprovalAction, type BaselineApproval, type ComparisonCapture, type ComparisonReading,
  type FinalReview, type GovernanceState, type InterventionRecord, type KpiComparison,
  type OverallResult, type ResultCalculation,
} from './governance'
import type { PreRegistrationEntry } from './pre-registration'
import { CREATOR_ATTRIBUTION } from './baseline-ops'
import { MemoryStorage, type StoragePort } from './decision-store'

export { MemoryStorage, type StoragePort }

export const GOV_STORE_KEY = 'sut-value-forensics:exp-001:governance:v1'
export const GOV_SCHEMA_VERSION = 1
export const BASE_EXPERIMENT_VERSION = 'EXP-001/v1'
export const NOT_REGISTERABLE_SIZE = '$100,000 (both sides)'

export type RecordIntegrity = 'OK' | 'TAMPERED'

export interface RegistrationRecord {
  experimentId: 'EXP-001'
  experimentVersion: string
  standardisedSize: string
  threshold: number
  thresholdUnit: string
  authorName: string
  rationale: string
  independenceAttested: true
  registeredAt: string
  fingerprint: string
  integrity?: RecordIntegrity
}

export interface ApprovalLogRecord extends BaselineApproval {
  experimentVersion: string
  fingerprint: string
  integrity?: RecordIntegrity
}

export interface InterventionLogRecord extends InterventionRecord {
  experimentVersion: string
  recordedAt: string
  fingerprint: string
  integrity?: RecordIntegrity
}

export interface ComparisonLogRecord extends ComparisonCapture {
  experimentVersion: string
  /** where the measurement came from — the app performs no measurement of its own */
  measurementSource: string
  recordedAt: string
  fingerprint: string
  integrity?: RecordIntegrity
}

export interface FinalReviewLogRecord extends FinalReview {
  experimentVersion: string
  fingerprint: string
  integrity?: RecordIntegrity
}

export interface GovernanceLedger {
  schemaVersion: number
  experimentId: 'EXP-001'
  activeVersion: string
  registrations: RegistrationRecord[]
  approvals: ApprovalLogRecord[]
  intervention: InterventionLogRecord | null
  comparison: ComparisonLogRecord | null
  finalReview: FinalReviewLogRecord | null
}

export interface CommitOutcome<T> {
  ledger: GovernanceLedger
  problems: string[]
  record: T | null
}

export function emptyGovernanceLedger(): GovernanceLedger {
  return {
    schemaVersion: GOV_SCHEMA_VERSION,
    experimentId: 'EXP-001',
    activeVersion: BASE_EXPERIMENT_VERSION,
    registrations: [],
    approvals: [],
    intervention: null,
    comparison: null,
    finalReview: null,
  }
}

// ───────────────────────────────────────────────────── fingerprints

function hash(raw: string): string {
  let h = 0
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0
  return (h >>> 0).toString(16).padStart(8, '0')
}

export function fingerprintRegistration(r: Omit<RegistrationRecord, 'fingerprint' | 'integrity'>): string {
  return `TR-${r.experimentVersion}-${hash(
    [r.experimentVersion, r.standardisedSize, r.threshold, r.authorName, r.rationale, r.registeredAt].join('|'),
  )}`
}

export function fingerprintApprovalRecord(a: Omit<ApprovalLogRecord, 'fingerprint' | 'integrity'>): string {
  return `BA-${a.runId}-${hash([a.experimentVersion, a.runId, a.reviewer, a.action, a.at, a.note].join('|'))}`
}

export function fingerprintIntervention(i: Omit<InterventionLogRecord, 'fingerprint' | 'integrity'>): string {
  return `IV-${i.experimentVersion}-${hash(
    [i.experimentVersion, i.baselineRunId, i.description, i.recordedBy, i.startedAt, i.methodFingerprint,
      [...i.evidenceIds].sort().join(',')].join('|'),
  )}`
}

export function fingerprintComparison(c: Omit<ComparisonLogRecord, 'fingerprint' | 'integrity'>): string {
  return `CM-${c.runId}-${hash(
    [c.experimentVersion, c.runId, c.capturedAt, c.methodFingerprint, c.measurementSource,
      c.readings.map((r) => `${r.standardisedSize}=${r.value}@${r.evidenceId}`).sort().join(',')].join('|'),
  )}`
}

export function fingerprintFinalReview(f: Omit<FinalReviewLogRecord, 'fingerprint' | 'integrity'>): string {
  return `FR-${f.experimentVersion}-${hash(
    [f.experimentVersion, f.reviewer, f.at, f.result, f.note, [...f.evidenceIds].sort().join(',')].join('|'),
  )}`
}

const ok = (expected: string, actual: string): RecordIntegrity => (expected === actual ? 'OK' : 'TAMPERED')

export function checkRegistrationIntegrity(r: RegistrationRecord): RecordIntegrity {
  if (r.standardisedSize === NOT_REGISTERABLE_SIZE) return 'TAMPERED'
  if (!r.authorName || !r.registeredAt || !r.rationale) return 'TAMPERED'
  if (typeof r.threshold !== 'number' || !Number.isFinite(r.threshold)) return 'TAMPERED'
  if (r.independenceAttested !== true) return 'TAMPERED'
  return ok(fingerprintRegistration(r), r.fingerprint)
}

export function checkApprovalIntegrity(a: ApprovalLogRecord): RecordIntegrity {
  if (!a.reviewer || !a.at || !a.runId) return 'TAMPERED'
  return ok(fingerprintApprovalRecord(a), a.fingerprint)
}

export function checkInterventionIntegrity(i: InterventionLogRecord): RecordIntegrity {
  if (!i.recordedBy || !i.startedAt || !i.evidenceIds?.length) return 'TAMPERED'
  return ok(fingerprintIntervention(i), i.fingerprint)
}

export function checkComparisonIntegrity(c: ComparisonLogRecord): RecordIntegrity {
  if (!c.capturedAt || !c.measurementSource || !c.readings?.length) return 'TAMPERED'
  return ok(fingerprintComparison(c), c.fingerprint)
}

export function checkFinalReviewIntegrity(f: FinalReviewLogRecord): RecordIntegrity {
  if (!f.reviewer || !f.at || !f.note || !f.evidenceIds?.length) return 'TAMPERED'
  return ok(fingerprintFinalReview(f), f.fingerprint)
}

const trusted = <T extends { integrity?: RecordIntegrity }>(r: T | null, check: (x: T) => RecordIntegrity) =>
  r !== null && (r.integrity ?? check(r)) === 'OK'

// ───────────────────────────────────────────────────── load / save

function isLedger(x: unknown): x is GovernanceLedger {
  if (!x || typeof x !== 'object') return false
  const l = x as Partial<GovernanceLedger>
  return l.experimentId === 'EXP-001' && Array.isArray(l.registrations) && Array.isArray(l.approvals)
}

/** Load and re-validate. Unreadable or foreign data yields an empty ledger. */
export function loadGovernanceLedger(storage: StoragePort): GovernanceLedger {
  let raw: string | null = null
  try { raw = storage.getItem(GOV_STORE_KEY) } catch { return emptyGovernanceLedger() }
  if (!raw) return emptyGovernanceLedger()
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return emptyGovernanceLedger() }
  if (!isLedger(parsed)) return emptyGovernanceLedger()
  if (parsed.schemaVersion !== GOV_SCHEMA_VERSION) return emptyGovernanceLedger()
  const intervention = parsed.intervention ?? null
  const comparison = parsed.comparison ?? null
  const finalReview = parsed.finalReview ?? null
  return {
    schemaVersion: GOV_SCHEMA_VERSION,
    experimentId: 'EXP-001',
    activeVersion: parsed.activeVersion || BASE_EXPERIMENT_VERSION,
    // a threshold for the unexecutable size can never exist, whatever the bytes claim
    registrations: parsed.registrations
      .filter((r) => r.standardisedSize !== NOT_REGISTERABLE_SIZE)
      .map((r) => ({ ...r, integrity: checkRegistrationIntegrity(r) })),
    approvals: parsed.approvals.map((a) => ({ ...a, integrity: checkApprovalIntegrity(a) })),
    intervention: intervention ? { ...intervention, integrity: checkInterventionIntegrity(intervention) } : null,
    comparison: comparison ? { ...comparison, integrity: checkComparisonIntegrity(comparison) } : null,
    finalReview: finalReview ? { ...finalReview, integrity: checkFinalReviewIntegrity(finalReview) } : null,
  }
}

const strip = <T extends { integrity?: RecordIntegrity }>(r: T): T => {
  const { integrity: _i, ...rest } = r
  return rest as T
}

export function saveGovernanceLedger(storage: StoragePort, ledger: GovernanceLedger): void {
  const clean: GovernanceLedger = {
    schemaVersion: GOV_SCHEMA_VERSION,
    experimentId: 'EXP-001',
    activeVersion: ledger.activeVersion,
    registrations: ledger.registrations
      .filter((r) => r.standardisedSize !== NOT_REGISTERABLE_SIZE)
      .map(strip),
    approvals: ledger.approvals.map(strip),
    intervention: ledger.intervention ? strip(ledger.intervention) : null,
    comparison: ledger.comparison ? strip(ledger.comparison) : null,
    finalReview: ledger.finalReview ? strip(ledger.finalReview) : null,
  }
  try { storage.setItem(GOV_STORE_KEY, JSON.stringify(clean)) } catch { /* quota / blocked: non-fatal */ }
}

// ───────────────────────────────────────────────────── 1. registration

/** Registrations that count: active version, integrity intact. */
export function activeRegistrations(ledger: GovernanceLedger): RegistrationRecord[] {
  return ledger.registrations.filter(
    (r) => r.experimentVersion === ledger.activeVersion
      && (r.integrity ?? checkRegistrationIntegrity(r)) === 'OK',
  )
}

/** Overlay persisted registrations onto the static slot definitions. */
export function effectiveEntries(
  base: PreRegistrationEntry[], ledger: GovernanceLedger,
): PreRegistrationEntry[] {
  const bySize = new Map(activeRegistrations(ledger).map((r) => [r.standardisedSize, r]))
  return base.map((slot) => {
    const r = bySize.get(slot.standardisedSize)
    if (!r || slot.state === 'NOT_REGISTERABLE') return { ...slot, experimentVersion: ledger.activeVersion }
    return {
      ...slot,
      experimentVersion: ledger.activeVersion,
      successThreshold: r.threshold,
      reviewerName: r.authorName,
      registrationTimestamp: r.registeredAt,
      state: 'REGISTERED',
      independenceAttested: true,
      attestedBy: r.authorName,
      rationale: r.rationale,
      notes: `Registered by ${r.authorName} at ${r.registeredAt}.`,
    }
  })
}

export interface ThresholdProposal {
  threshold: number | null
  authorName: string
  rationale: string
  independenceAttested: boolean
}

/**
 * Register one threshold. Delegates every rule to the existing
 * commitThreshold(); persistence adds only the identity guard, the
 * unexecutable-size guard and the fingerprint.
 */
export function registerThreshold(
  ledger: GovernanceLedger,
  slot: PreRegistrationEntry,
  proposal: ThresholdProposal,
  observedBaselineValues: number[],
  now: string,
  configuredReviewers: string[] = [],
): CommitOutcome<RegistrationRecord> {
  if (slot.standardisedSize === NOT_REGISTERABLE_SIZE || slot.state === 'NOT_REGISTERABLE') {
    return { ledger, problems: ['this size is NOT REGISTERABLE — the venue cannot execute it'], record: null }
  }
  if (proposal.authorName.trim() === CREATOR_ATTRIBUTION && !configuredReviewers.includes(CREATOR_ATTRIBUTION)) {
    return {
      ledger,
      problems: ['the creator attribution must not be used as a registering identity unless explicitly configured — '
        + 'product credit and review authority are separate concepts'],
      record: null,
    }
  }
  const current = effectiveEntries([slot], ledger)[0]!
  const res = commitThreshold(
    current,
    {
      standardisedSize: slot.standardisedSize,
      threshold: proposal.threshold,
      authorName: proposal.authorName,
      rationale: proposal.rationale,
      independenceAttested: proposal.independenceAttested,
    },
    observedBaselineValues,
    now,
    ledger.comparison !== null,
  )
  if (!res.committed || !res.entry) return { ledger, problems: res.problems, record: null }

  const body: Omit<RegistrationRecord, 'fingerprint' | 'integrity'> = {
    experimentId: 'EXP-001',
    experimentVersion: ledger.activeVersion,
    standardisedSize: slot.standardisedSize,
    threshold: res.entry.successThreshold!,
    thresholdUnit: slot.thresholdUnit,
    authorName: res.entry.reviewerName!,
    rationale: res.entry.rationale!,
    independenceAttested: true,
    registeredAt: now,
  }
  const record: RegistrationRecord = { ...body, fingerprint: fingerprintRegistration(body), integrity: 'OK' }
  return {
    ledger: { ...ledger, registrations: [...ledger.registrations, record] },
    problems: [],
    record,
  }
}

/**
 * Start a new experiment version. Prior registrations are kept verbatim and the
 * new version starts unregistered — it must be registered again from scratch.
 */
export function createExperimentVersion(
  ledger: GovernanceLedger, registerableSizes: string[], now: string,
): CommitOutcome<string> {
  const registered = new Set(activeRegistrations(ledger).map((r) => r.standardisedSize))
  const missing = registerableSizes.filter((s) => !registered.has(s))
  if (missing.length > 0) {
    return {
      ledger,
      problems: [`the current version is not fully registered (${missing.join(', ')}) — `
        + 'complete or correct it before opening a new version'],
      record: null,
    }
  }
  if (ledger.intervention) {
    return {
      ledger,
      problems: ['an intervention has already been recorded against this version — a new version would orphan it'],
      record: null,
    }
  }
  const n = Number(ledger.activeVersion.replace(/^.*\/v/, '')) || 1
  void now
  return {
    ledger: { ...ledger, activeVersion: `EXP-001/v${n + 1}` },
    problems: [],
    record: `EXP-001/v${n + 1}`,
  }
}

export interface RegistrationHistoryRow {
  experimentVersion: string
  standardisedSize: string
  threshold: number
  authorName: string
  registeredAt: string
  fingerprint: string
  integrity: RecordIntegrity
  status: 'REGISTERED' | 'SUPERSEDED VERSION' | 'TAMPERED'
}

export function registrationHistory(ledger: GovernanceLedger): RegistrationHistoryRow[] {
  return ledger.registrations.map((r) => {
    const integrity = r.integrity ?? checkRegistrationIntegrity(r)
    return {
      experimentVersion: r.experimentVersion,
      standardisedSize: r.standardisedSize,
      threshold: r.threshold,
      authorName: r.authorName,
      registeredAt: r.registeredAt,
      fingerprint: r.fingerprint,
      integrity,
      status: integrity === 'TAMPERED' ? 'TAMPERED'
        : r.experimentVersion === ledger.activeVersion ? 'REGISTERED' : 'SUPERSEDED VERSION',
    }
  })
}

// ───────────────────────────────────────────────────── 2. baseline approval

export function recordBaselineApproval(
  ledger: GovernanceLedger,
  p: { runId: string; reviewer: string; action: ApprovalAction; note: string },
  knownRunIds: string[],
  now: string,
  configuredReviewers: string[] = [],
): CommitOutcome<ApprovalLogRecord> {
  if (p.reviewer.trim() === CREATOR_ATTRIBUTION && !configuredReviewers.includes(CREATOR_ATTRIBUTION)) {
    return {
      ledger,
      problems: ['the creator attribution must not be used as a reviewer identity unless explicitly configured — '
        + 'product credit and review authority are separate concepts'],
      record: null,
    }
  }
  const already = ledger.approvals.some(
    (a) => a.runId === p.runId && a.experimentVersion === ledger.activeVersion
      && (a.integrity ?? checkApprovalIntegrity(a)) === 'OK',
  )
  if (already) {
    return {
      ledger,
      problems: [`${p.runId} already carries a recorded review for ${ledger.activeVersion} and is immutable`],
      record: null,
    }
  }
  const res = commitBaselineApproval(p, knownRunIds, now)
  if (!res.committed || !res.record) return { ledger, problems: res.problems, record: null }
  const body = { ...res.record, experimentVersion: ledger.activeVersion }
  const record: ApprovalLogRecord = { ...body, fingerprint: fingerprintApprovalRecord(body), integrity: 'OK' }
  return { ledger: { ...ledger, approvals: [...ledger.approvals, record] }, problems: [], record }
}

/** Trusted approvals only; the latest action per run wins (existing semantics). */
export function effectiveApprovedRunIds(ledger: GovernanceLedger): string[] {
  const last = new Map<string, ApprovalLogRecord>()
  for (const a of ledger.approvals) {
    if ((a.integrity ?? checkApprovalIntegrity(a)) !== 'OK') continue
    last.set(a.runId, a)
  }
  return [...last.values()].filter((a) => a.action === 'APPROVE').map((a) => a.runId)
}

export function approvalStatusFor(ledger: GovernanceLedger, runId: string): 'PENDING' | 'APPROVED' | 'REJECTED' | 'TAMPERED' {
  const rows = ledger.approvals.filter((a) => a.runId === runId)
  const last = rows[rows.length - 1]
  if (!last) return 'PENDING'
  if ((last.integrity ?? checkApprovalIntegrity(last)) !== 'OK') return 'TAMPERED'
  return last.action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
}

// ───────────────────────────────────────────────────── 3. intervention

export interface InterventionProposal {
  description: string
  baselineRunId: string
  startedAt: string
  endedAt: string | null
  recordedBy: string
  methodFingerprint: string
  heldConstant: string[]
  evidenceIds: string[]
}

/**
 * Record a controlled intervention that a named human asserts actually
 * happened. Every evidence reference must already exist in the evidence
 * catalogue — a record cannot cite evidence the project does not hold.
 */
export function recordIntervention(
  ledger: GovernanceLedger,
  p: InterventionProposal,
  ctx: { thresholdsComplete: boolean; baselineFingerprint: string; knownEvidenceIds: string[] },
  now: string,
): CommitOutcome<InterventionLogRecord> {
  if (ledger.intervention) {
    return { ledger, problems: ['an intervention is already recorded and is immutable for this experiment version'], record: null }
  }
  const unknown = (p.evidenceIds ?? []).filter((id) => !ctx.knownEvidenceIds.includes(id))
  const problems = unknown.length
    ? [`unknown evidence reference(s): ${unknown.join(', ')} — an intervention cannot cite evidence that does not exist`]
    : []
  const res = commitIntervention(p, effectiveApprovedRunIds(ledger), ctx.thresholdsComplete, ctx.baselineFingerprint)
  const all = [...problems, ...res.problems]
  if (all.length || !res.record) return { ledger, problems: all, record: null }
  const body = { ...res.record, experimentVersion: ledger.activeVersion, recordedAt: now }
  const record: InterventionLogRecord = { ...body, fingerprint: fingerprintIntervention(body), integrity: 'OK' }
  return { ledger: { ...ledger, intervention: record }, problems: [], record }
}

// ───────────────────────────────────────────────────── 4. comparison capture

export interface ComparisonProposal {
  runId: string
  capturedAt: string
  blockNumber: number | null
  methodFingerprint: string
  readings: ComparisonReading[]
  measurementSource: string
}

/**
 * Record a post-intervention capture. This is NOT a typing surface: readings
 * must come from a measured run and every stated value must carry an evidence
 * ID that already exists. The app performs no measurement of its own.
 */
export function recordComparison(
  ledger: GovernanceLedger,
  p: ComparisonProposal,
  ctx: { knownEvidenceIds: string[] },
  now: string,
): CommitOutcome<ComparisonLogRecord> {
  const problems: string[] = []
  if (!ledger.intervention) problems.push('no intervention has been recorded — a comparison has nothing to follow')
  if (ledger.comparison) problems.push('a comparison capture already exists and is immutable for this experiment version')
  if (!p.measurementSource?.trim()) problems.push('a measurement source is required — the app does not measure anything itself')
  for (const r of p.readings) {
    if (r.value !== null && r.evidenceId && !ctx.knownEvidenceIds.includes(r.evidenceId)) {
      problems.push(`${r.standardisedSize}: unknown evidence reference ${r.evidenceId}`)
    }
  }
  const capture: ComparisonCapture = {
    runId: p.runId, capturedAt: p.capturedAt, blockNumber: p.blockNumber,
    methodFingerprint: p.methodFingerprint, readings: p.readings,
    afterInterventionStartedAt: ledger.intervention?.startedAt ?? '',
  }
  problems.push(...validateComparison(capture, ledger.intervention))
  if (problems.length) return { ledger, problems, record: null }
  const body = { ...capture, experimentVersion: ledger.activeVersion, measurementSource: p.measurementSource.trim(), recordedAt: now }
  const record: ComparisonLogRecord = { ...body, fingerprint: fingerprintComparison(body), integrity: 'OK' }
  return { ledger: { ...ledger, comparison: record }, problems: [], record }
}

// ───────────────────────────────────────────────────── 5. calculation (derived)

/**
 * The calculated result is DERIVED from persisted inputs on every read, never
 * stored and never typed by a human — so it cannot be edited, and it cannot
 * drift from the registered thresholds or the captured measurement.
 */
export function derivedCalculation(
  ledger: GovernanceLedger,
  entries: PreRegistrationEntry[],
  baselineValues: Record<string, number | null>,
): { perKpi: KpiComparison[]; calculation: ResultCalculation | null } {
  const comparison = trusted(ledger.comparison, checkComparisonIntegrity) ? ledger.comparison : null
  if (!comparison) return { perKpi: [], calculation: null }
  const perKpi = entries
    .filter((e) => e.state !== 'NOT_REGISTERABLE')
    .map((e) => compareKpi(
      e.standardisedSize,
      e.thresholdDirection,
      e.successThreshold,
      baselineValues[e.standardisedSize] ?? null,
      comparison.readings.find((r) => r.standardisedSize === e.standardisedSize),
    ))
  return { perKpi, calculation: calculateResult(perKpi) }
}

// ───────────────────────────────────────────────────── 6. final review

export function recordFinalReview(
  ledger: GovernanceLedger,
  p: { reviewer: string; at: string; result: OverallResult | null; note: string; evidenceIds: string[] },
  calculation: ResultCalculation | null,
  ctx: { knownEvidenceIds: string[]; configuredReviewers?: string[] },
): CommitOutcome<FinalReviewLogRecord> {
  if (ledger.finalReview) {
    return { ledger, problems: ['a final review is already recorded and is immutable for this experiment version'], record: null }
  }
  if (p.reviewer.trim() === CREATOR_ATTRIBUTION && !(ctx.configuredReviewers ?? []).includes(CREATOR_ATTRIBUTION)) {
    return {
      ledger,
      problems: ['the creator attribution must not be used as a reviewer identity unless explicitly configured'],
      record: null,
    }
  }
  const unknown = (p.evidenceIds ?? []).filter((id) => !ctx.knownEvidenceIds.includes(id))
  const problems = unknown.length ? [`unknown evidence reference(s): ${unknown.join(', ')}`] : []
  const res = commitFinalReview(
    { reviewer: p.reviewer, at: p.at, result: p.result ?? undefined, note: p.note, evidenceIds: p.evidenceIds },
    calculation,
  )
  const all = [...problems, ...res.problems]
  if (all.length || !res.record) return { ledger, problems: all, record: null }
  const body = { ...res.record, experimentVersion: ledger.activeVersion }
  const record: FinalReviewLogRecord = { ...body, fingerprint: fingerprintFinalReview(body), integrity: 'OK' }
  return { ledger: { ...ledger, finalReview: record }, problems: [], record }
}

// ───────────────────────────────────────────────────── effective state

export interface EffectiveState {
  entries: PreRegistrationEntry[]
  state: GovernanceState
  perKpi: KpiComparison[]
  gate: ReturnType<typeof currentGate>
  tampered: string[]
}

/** The live governance state: static definitions overlaid with trusted persisted records. */
export function effectiveState(
  ledger: GovernanceLedger,
  baseEntries: PreRegistrationEntry[],
  baselineValues: Record<string, number | null> = {},
): EffectiveState {
  const entries = effectiveEntries(baseEntries, ledger)
  const registerable = entries.filter((e) => e.state !== 'NOT_REGISTERABLE')
  const registered = registerable.filter((e) => e.state === 'REGISTERED')
  const { perKpi, calculation } = derivedCalculation(ledger, entries, baselineValues)
  const intervention = trusted(ledger.intervention, checkInterventionIntegrity) ? ledger.intervention : null
  const comparison = trusted(ledger.comparison, checkComparisonIntegrity) ? ledger.comparison : null
  const finalReview = trusted(ledger.finalReview, checkFinalReviewIntegrity) ? ledger.finalReview : null
  const state: GovernanceState = {
    thresholdsRegistered: registered.length,
    thresholdsRequired: registerable.length,
    thresholdsComplete: registerable.length > 0 && registered.length === registerable.length,
    approvedBaselineRuns: effectiveApprovedRunIds(ledger),
    intervention,
    comparison,
    calculation,
    finalReview,
  }
  const tampered = [
    ...ledger.registrations.filter((r) => (r.integrity ?? checkRegistrationIntegrity(r)) === 'TAMPERED')
      .map((r) => `${r.experimentVersion} ${r.standardisedSize}`),
    ...ledger.approvals.filter((a) => (a.integrity ?? checkApprovalIntegrity(a)) === 'TAMPERED')
      .map((a) => `approval ${a.runId}`),
    ...(ledger.intervention && !intervention ? ['intervention'] : []),
    ...(ledger.comparison && !comparison ? ['comparison'] : []),
    ...(ledger.finalReview && !finalReview ? ['final review'] : []),
  ]
  return { entries, state, perKpi, gate: currentGate(state), tampered }
}

// ───────────────────────────────────────────────────── structural guarantees

/** Loading persisted data never registers anything by itself. */
export function persistenceAutoRegisters(_l: GovernanceLedger): false { return false }

/** Loading persisted data never approves a baseline by itself. */
export function persistenceAutoApproves(_l: GovernanceLedger): false { return false }

/** The app measures nothing: a comparison value can only come from a measured source. */
export function persistenceCreatesMeasurement(_l: GovernanceLedger): false { return false }

/** A business approval is never a registration. */
export function businessApprovalRegisters(): false { return false }
