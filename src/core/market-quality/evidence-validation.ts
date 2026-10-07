/**
 * EVIDENCE VALIDATION — is every QA result traceable, and is the evidence layer
 * itself intact?
 *
 * This dimension validates the module's own accountability. A QA layer that
 * produces verdicts without provenance is just an opinion with a status chip, so
 * the first check here is whether each evaluated result can name its evidence.
 *
 * It also reads the frozen evidence layer to confirm the project's own rule still
 * holds: a value a source does not publish is recorded as DATA UNAVAILABLE with
 * a stated reason, never as zero and never inferred.
 */
import { allMetricEvidence, type LiveSyncRun } from '../live-market-sync'
import type { Observation } from '../types'
import {
  check, dimension, emptyEvidenceRef, hasEvidence, isEvaluated,
  type QaCheck, type QaDimension, type QaEvidenceRef,
} from './types'

/** A flattened traceability row for the UI. */
export interface TraceRow {
  checkId: string
  label: string
  status: string
  evidence: QaEvidenceRef | null
  traceable: boolean
  /** Which required traceability fields are absent. */
  missing: string[]
}

/** Fields a QA result should be able to name to count as traceable. */
export const TRACE_FIELDS: Array<keyof QaEvidenceRef> = [
  'source', 'metric', 'provenance',
]

export function traceRows(checks: QaCheck[]): TraceRow[] {
  return checks.map((c) => {
    const e = c.evidence
    const missing = TRACE_FIELDS.filter((f) => !e || e[f] === null).map(String)
    return {
      checkId: c.id,
      label: c.label,
      status: c.status,
      evidence: e,
      traceable: hasEvidence(e) && missing.length === 0,
      missing,
    }
  })
}

/**
 * Coverage: of the checks that actually produced a verdict, how many can name
 * their evidence? Non-evaluated checks are excluded — there is no verdict to
 * trace, and counting them would understate real coverage.
 */
export function traceabilityCheck(allChecks: QaCheck[]): QaCheck {
  const evaluated = allChecks.filter((c) => isEvaluated(c.status))
  if (evaluated.length === 0) {
    return check({
      id: 'ev-traceability',
      label: 'QA result traceability',
      status: 'DATA_UNAVAILABLE',
      reason: 'No QA check produced a verdict, so there is no result to trace to evidence.',
    })
  }
  const rows = traceRows(evaluated)
  const untraceable = rows.filter((r) => !r.traceable)
  const expected = `${evaluated.length} of ${evaluated.length} evaluated results name their evidence`
  const actual = `${evaluated.length - untraceable.length} of ${evaluated.length}`
  if (untraceable.length === 0) {
    return check({
      id: 'ev-traceability',
      label: 'QA result traceability',
      status: 'PASS',
      expected, actual,
    })
  }
  return check({
    id: 'ev-traceability',
    label: 'QA result traceability',
    status: 'WARNING',
    reason: `${untraceable.length} evaluated result(s) cannot name a source, metric or methodology: `
      + `${untraceable.slice(0, 5).map((r) => `${r.checkId} (missing ${r.missing.join(', ')})`).join('; ')}`
      + `${untraceable.length > 5 ? ` (+${untraceable.length - 5} more)` : ''}.`,
    expected, actual,
  })
}

/** Evidence hashes on the stored live run — the integrity anchor for provenance. */
export function hashCoverageCheck(run: LiveSyncRun | null): QaCheck {
  if (!run) {
    return check({
      id: 'ev-hash-coverage',
      label: 'Evidence hash coverage',
      status: 'DATA_UNAVAILABLE',
      reason: 'No stored sync run, so no payload hash coverage can be measured.',
    })
  }
  const ev = allMetricEvidence(run).filter((m) => m.value !== null)
  if (ev.length === 0) {
    return check({
      id: 'ev-hash-coverage',
      label: 'Evidence hash coverage',
      status: 'DATA_UNAVAILABLE',
      reason: `Sync ${run.id} carries no valued observation to hash.`,
      evidence: { ...emptyEvidenceRef(), relatedSyncId: run.id },
    })
  }
  const withHash = ev.filter((m) => !!m.payloadHash)
  const expected = `${ev.length} of ${ev.length} valued observations carry a payload hash`
  const actual = `${withHash.length} of ${ev.length}`
  const ref: QaEvidenceRef = {
    ...emptyEvidenceRef(), relatedSyncId: run.id,
    provenance: 'SHA-256 of the raw source payload recorded at retrieval',
  }
  if (withHash.length === ev.length) {
    return check({
      id: 'ev-hash-coverage', label: 'Evidence hash coverage', status: 'PASS',
      expected, actual, evidence: ref, evaluatedAt: run.completedAt,
    })
  }
  return check({
    id: 'ev-hash-coverage', label: 'Evidence hash coverage', status: 'WARNING',
    reason: `${ev.length - withHash.length} valued observation(s) carry no payload hash, so their raw `
      + 'source response cannot be re-verified.',
    expected, actual, evidence: ref, evaluatedAt: run.completedAt,
  })
}

/**
 * The frozen project rule, re-checked rather than assumed: every frozen evidence
 * record with a null value must state why. A null with no reason would be an
 * unexplained hole.
 */
export function frozenEvidenceReasonCheck(frozen: Observation[], nowIso: string): QaCheck {
  if (frozen.length === 0) {
    return check({
      id: 'ev-frozen-reasons',
      label: 'Frozen evidence: unavailable values carry a reason',
      status: 'DATA_UNAVAILABLE',
      reason: 'The frozen evidence layer could not be read.',
    })
  }
  const nulls = frozen.filter((e) => e.value === null)
  const unexplained = nulls.filter((e) => !e.notes || e.notes.trim() === '')
  const expected = `${nulls.length} of ${nulls.length} unavailable frozen values state a reason`
  const actual = `${nulls.length - unexplained.length} of ${nulls.length}`
  const ref: QaEvidenceRef = {
    ...emptyEvidenceRef(),
    provenance: 'frozen evidence layer (src/data/evidence.ts), read-only',
    source: 'SUT Value Forensics frozen research',
    metric: 'frozen_evidence_null_reason_coverage',
    value: nulls.length,
    unit: 'records',
  }
  if (nulls.length === 0) {
    return check({
      id: 'ev-frozen-reasons',
      label: 'Frozen evidence: unavailable values carry a reason',
      status: 'PASS',
      expected: 'every unavailable frozen value states a reason',
      actual: `${frozen.length} frozen records, none with a null value`,
      evidence: ref, evaluatedAt: nowIso,
    })
  }
  if (unexplained.length) {
    return check({
      id: 'ev-frozen-reasons',
      label: 'Frozen evidence: unavailable values carry a reason',
      status: 'FAIL',
      reason: `${unexplained.length} frozen record(s) carry a null value with no stated reason: `
        + `${unexplained.slice(0, 5).map((u) => u.id).join(', ')}.`,
      expected, actual, evidence: ref, evaluatedAt: nowIso,
    })
  }
  return check({
    id: 'ev-frozen-reasons',
    label: 'Frozen evidence: unavailable values carry a reason',
    status: 'PASS',
    expected, actual, evidence: ref, evaluatedAt: nowIso,
  })
}

/** Experiment linkage: QA results that reference an experiment must name one that exists. */
export function experimentLinkageCheck(allChecks: QaCheck[], knownExperimentIds: string[]): QaCheck {
  const referencing = allChecks.filter((c) => c.evidence?.relatedExperiment)
  if (referencing.length === 0) {
    return check({
      id: 'ev-experiment-linkage',
      label: 'Experiment linkage',
      status: 'DATA_UNAVAILABLE',
      reason: 'No QA result references an experiment, so there is no linkage to validate.',
    })
  }
  const unknown = referencing.filter((c) => !knownExperimentIds.includes(c.evidence!.relatedExperiment!))
  const expected = `every referenced experiment id exists in the registry (${knownExperimentIds.join(', ')})`
  const actual = `${referencing.length - unknown.length} of ${referencing.length} references resolve`
  if (unknown.length) {
    return check({
      id: 'ev-experiment-linkage',
      label: 'Experiment linkage',
      status: 'FAIL',
      reason: `${unknown.length} QA result(s) reference an experiment id that is not in the registry: `
        + `${[...new Set(unknown.map((u) => u.evidence!.relatedExperiment!))].join(', ')}.`,
      expected, actual,
    })
  }
  return check({
    id: 'ev-experiment-linkage',
    label: 'Experiment linkage',
    status: 'PASS',
    expected, actual,
  })
}

export const EVIDENCE_PURPOSE =
  'Validates that every QA verdict can name its evidence, that stored observations carry re-verifiable '
  + 'payload hashes, and that the frozen rule still holds: an unavailable value states its reason.'

export function evidenceValidation(args: {
  /** every check produced by the other five dimensions */
  allChecks: QaCheck[]
  run: LiveSyncRun | null
  frozen: Observation[]
  knownExperimentIds: string[]
  nowIso: string
}): QaDimension & { rows: TraceRow[] } {
  const checks: QaCheck[] = [
    traceabilityCheck(args.allChecks),
    hashCoverageCheck(args.run),
    frozenEvidenceReasonCheck(args.frozen, args.nowIso),
    experimentLinkageCheck(args.allChecks, args.knownExperimentIds),
  ]
  return {
    ...dimension({
      id: 'evidence-validation',
      title: 'Evidence Validation',
      purpose: EVIDENCE_PURPOSE,
      checks,
    }),
    rows: traceRows(args.allChecks),
  }
}
