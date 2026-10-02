/**
 * Persistence for the Business Decision workflow — ADDITIVE.
 *
 * Architecture: the app is a pure client-side SPA (React + Vite, no backend, no
 * API, no database). The smallest architecture-consistent mechanism is browser
 * localStorage behind an injectable StoragePort, so core logic stays pure and
 * tests use an in-memory adapter.
 *
 * SECURITY: persisted state is NOT proof of governance approval. Every record is
 * re-validated on read and its fingerprint recomputed; a record whose content no
 * longer matches its fingerprint is marked TAMPERED and is never treated as
 * approved. Persistence can register nothing and unlock nothing.
 */
import {
  EXECUTABLE_SIZES, NOT_EXECUTABLE_SIZE, fingerprintApproval,
  type ApprovedThreshold, type ExecutableSize,
} from './business-decision'

export interface StoragePort {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export class MemoryStorage implements StoragePort {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
}

export const STORE_KEY = 'sut-value-forensics:exp-001:business-decision:v1'
export const SCHEMA_VERSION = 1

export type PersistedStatus = 'PROPOSED' | 'BUSINESS_INPUT_SAVED' | 'BUSINESS_APPROVED'
export type Integrity = 'OK' | 'TAMPERED'

export interface PersistedThreshold {
  size: ExecutableSize
  value: number | null
  rationale: string
  metric: string
  direction: 'LOWER_IS_BETTER'
}

export interface DecisionVersion {
  experimentId: 'EXP-001'
  version: string              // v1, v2, ...
  thresholds: PersistedThreshold[]
  reviewer: string | null
  decisionNote: string
  approvalConfirmed: boolean
  approvalStatus: PersistedStatus
  fingerprint: string | null
  createdAt: string
  approvedAt: string | null
  updatedAt: string
  /** set on read only; never persisted as OK blindly */
  integrity?: Integrity
}

export interface DecisionLedger {
  schemaVersion: number
  experimentId: 'EXP-001'
  versions: DecisionVersion[]
}

export class PersistenceError extends Error {}

export const METRIC = 'Modelled price impact at a standardised transaction size'

export function emptyLedger(): DecisionLedger {
  return { schemaVersion: SCHEMA_VERSION, experimentId: 'EXP-001', versions: [] }
}

export function newVersionLabel(ledger: DecisionLedger): string {
  return `v${ledger.versions.length + 1}`
}

/** Display / fingerprint reference, e.g. EXP-001/v1. */
export function versionRef(v: Pick<DecisionVersion, 'experimentId' | 'version'>): string {
  return `${v.experimentId}/${v.version}`
}

export function blankVersion(ledger: DecisionLedger, now: string): DecisionVersion {
  return {
    experimentId: 'EXP-001',
    version: newVersionLabel(ledger),
    thresholds: EXECUTABLE_SIZES.map((size) => ({
      size, value: null, rationale: '', metric: METRIC, direction: 'LOWER_IS_BETTER' as const,
    })),
    reviewer: null,
    decisionNote: '',
    approvalConfirmed: false,
    approvalStatus: 'PROPOSED',
    fingerprint: null,
    createdAt: now,
    approvedAt: null,
    updatedAt: now,
  }
}

// ───────────────────────────────────────── integrity

/** An approved record must still hash to its stored fingerprint. */
export function checkIntegrity(v: DecisionVersion): Integrity {
  if (v.approvalStatus !== 'BUSINESS_APPROVED') return 'OK'
  if (!v.fingerprint || !v.reviewer || !v.approvedAt) return 'TAMPERED'
  if (v.thresholds.some((t) => t.value === null)) return 'TAMPERED'
  if (v.thresholds.some((t) => t.size === (NOT_EXECUTABLE_SIZE as string))) return 'TAMPERED'
  const approved: ApprovedThreshold[] = v.thresholds.map((t) => ({
    size: t.size, value: t.value!, rationale: t.rationale, direction: t.direction,
  }))
  const expected = fingerprintApproval(approved, v.reviewer, v.approvedAt, versionRef(v))
  return expected === v.fingerprint ? 'OK' : 'TAMPERED'
}

/** A persisted record only counts as approved when its integrity holds. */
export function isTrustworthyApproval(v: DecisionVersion): boolean {
  return v.approvalStatus === 'BUSINESS_APPROVED' && checkIntegrity(v) === 'OK'
}

// ───────────────────────────────────────── load / save

function isLedger(x: unknown): x is DecisionLedger {
  if (!x || typeof x !== 'object') return false
  const l = x as Partial<DecisionLedger>
  return l.experimentId === 'EXP-001' && Array.isArray(l.versions)
}

/** Load and re-validate. Unreadable or foreign data yields an empty ledger. */
export function loadLedger(storage: StoragePort): DecisionLedger {
  let raw: string | null = null
  try { raw = storage.getItem(STORE_KEY) } catch { return emptyLedger() }
  if (!raw) return emptyLedger()
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return emptyLedger() }
  if (!isLedger(parsed)) return emptyLedger()
  if (parsed.schemaVersion !== SCHEMA_VERSION) return emptyLedger()
  return {
    schemaVersion: SCHEMA_VERSION,
    experimentId: 'EXP-001',
    versions: parsed.versions
      // $100K can never be persisted, whatever the stored bytes claim
      .map((v) => ({ ...v, thresholds: (v.thresholds ?? []).filter((t) => t.size !== (NOT_EXECUTABLE_SIZE as string)) }))
      .map((v) => ({ ...v, integrity: checkIntegrity(v) })),
  }
}

export function saveLedger(storage: StoragePort, ledger: DecisionLedger): void {
  const clean: DecisionLedger = {
    schemaVersion: SCHEMA_VERSION,
    experimentId: 'EXP-001',
    versions: ledger.versions.map(({ integrity: _i, ...v }) => ({
      ...v,
      thresholds: v.thresholds.filter((t) => t.size !== (NOT_EXECUTABLE_SIZE as string)),
    })),
  }
  try { storage.setItem(STORE_KEY, JSON.stringify(clean)) } catch { /* quota / blocked: non-fatal */ }
}

// ───────────────────────────────────────── mutations

/** Update the working (latest, unapproved) version in place. */
export function saveInput(
  ledger: DecisionLedger,
  patch: { thresholds?: Array<{ size: ExecutableSize; value: number | null; rationale: string }>;
           reviewer?: string | null; decisionNote?: string; approvalConfirmed?: boolean },
  now: string,
): { ledger: DecisionLedger; problems: string[] } {
  const next = structuredClone(ledger)
  if (next.versions.length === 0) next.versions.push(blankVersion(next, now))
  const cur = next.versions[next.versions.length - 1]!
  if (cur.approvalStatus === 'BUSINESS_APPROVED') {
    return { ledger, problems: ['the latest version is approved and locked — create a new proposal to change it'] }
  }
  if (patch.thresholds) {
    for (const t of patch.thresholds) {
      if (!EXECUTABLE_SIZES.includes(t.size)) {
        return { ledger, problems: [`${t.size} is not an executable size and cannot be persisted`] }
      }
      const slot = cur.thresholds.find((x) => x.size === t.size)!
      slot.value = t.value
      slot.rationale = t.rationale
    }
  }
  if (patch.reviewer !== undefined) cur.reviewer = patch.reviewer
  if (patch.decisionNote !== undefined) cur.decisionNote = patch.decisionNote
  if (patch.approvalConfirmed !== undefined) cur.approvalConfirmed = patch.approvalConfirmed
  cur.approvalStatus = 'BUSINESS_INPUT_SAVED'
  cur.updatedAt = now
  return { ledger: next, problems: [] }
}

/** Approve the working version. Refuses anything incomplete; never mutates history. */
export function approveCurrent(
  ledger: DecisionLedger, now: string,
): { ledger: DecisionLedger; problems: string[] } {
  const next = structuredClone(ledger)
  const cur = next.versions[next.versions.length - 1]
  if (!cur) return { ledger, problems: ['no working version to approve'] }
  if (cur.approvalStatus === 'BUSINESS_APPROVED') {
    return { ledger, problems: ['this version is already approved and is immutable'] }
  }
  const problems: string[] = []
  for (const size of EXECUTABLE_SIZES) {
    const t = cur.thresholds.find((x) => x.size === size)
    if (!t || t.value === null) { problems.push(`${size}: a threshold value is required`); continue }
    if (!Number.isFinite(t.value) || t.value <= 0) problems.push(`${size}: the threshold must be a positive number`)
    if (!t.rationale.trim()) problems.push(`${size}: a rationale is required`)
  }
  if (!cur.reviewer?.trim()) problems.push('a decision owner / business reviewer name is required')
  if (!cur.decisionNote.trim()) problems.push('a decision note / rationale is required')
  if (!cur.approvalConfirmed) problems.push('the reviewer must explicitly confirm the approval')
  if (problems.length) return { ledger, problems }

  const approved: ApprovedThreshold[] = EXECUTABLE_SIZES.map((size) => {
    const t = cur.thresholds.find((x) => x.size === size)!
    return { size, value: t.value!, rationale: t.rationale.trim(), direction: 'LOWER_IS_BETTER' as const }
  })
  cur.reviewer = cur.reviewer!.trim()
  cur.decisionNote = cur.decisionNote.trim()
  cur.approvedAt = now
  cur.updatedAt = now
  cur.approvalStatus = 'BUSINESS_APPROVED'
  cur.fingerprint = fingerprintApproval(approved, cur.reviewer, now, versionRef(cur))
  return { ledger: next, problems: [] }
}

/** Append a new proposed version. The old approval is preserved untouched. */
export function createNewProposal(
  ledger: DecisionLedger, now: string,
): { ledger: DecisionLedger; problems: string[] } {
  const latest = ledger.versions[ledger.versions.length - 1]
  if (latest && latest.approvalStatus !== 'BUSINESS_APPROVED') {
    return { ledger, problems: ['the current version is not approved yet — edit it instead of creating a new one'] }
  }
  const next = structuredClone(ledger)
  next.versions.push(blankVersion(next, now))
  return { ledger: next, problems: [] }
}

// ───────────────────────────────────────── derived views

export interface LedgerView {
  current: DecisionVersion | null
  history: DecisionVersion[]
  latestTrustworthyApproval: DecisionVersion | null
  inputSaved: boolean
  approved: boolean
  locked: boolean
  tamperedVersions: string[]
}

export function viewLedger(ledger: DecisionLedger): LedgerView {
  const versions = ledger.versions.map((v) => ({ ...v, integrity: v.integrity ?? checkIntegrity(v) }))
  const current = versions.length ? versions[versions.length - 1]! : null
  const trustworthy = [...versions].reverse().find(isTrustworthyApproval) ?? null
  return {
    current,
    history: versions,
    latestTrustworthyApproval: trustworthy,
    inputSaved: current !== null && current.approvalStatus !== 'PROPOSED',
    approved: current !== null && isTrustworthyApproval(current),
    locked: current !== null && isTrustworthyApproval(current),
    tamperedVersions: versions.filter((v) => v.integrity === 'TAMPERED').map((v) => v.version),
  }
}

/** Persistence can never register a threshold. */
export function registersThreshold(_ledger: DecisionLedger): false { return false }

/** Persistence can never unlock an intervention. */
export function unlocksIntervention(_ledger: DecisionLedger): false { return false }

/** Persistence can never produce an experiment result. */
export function producesResult(_ledger: DecisionLedger): false { return false }
