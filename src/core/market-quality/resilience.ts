/**
 * RESILIENCE TESTING — failure-scenario QA.
 *
 * The rule the whole dimension turns on: a scenario reports PASS only when a
 * real check actually ran. Scenarios split into three kinds, and the kind is
 * always visible:
 *
 *   EXECUTABLE   — run here and now against real repository functions, using an
 *                  isolated MemoryStorage and throwaway copies. Real verdict.
 *   EVIDENCE_LED — decided from a stored sync run that actually recorded the
 *                  condition (a PARTIAL run, an HTTP 429). Real verdict when the
 *                  evidence exists, NOT EXECUTED when it does not.
 *   EXTERNAL     — needs a dependency or runtime this environment does not have.
 *                  Always NOT EXECUTED, never PASS.
 *
 * Nothing here writes to the real store: every executable scenario builds its own
 * MemoryStorage and operates on structural copies.
 */
import {
  appendRun, emptyLiveLedger, loadLiveLedger, LIVE_STORE_KEY, LIVE_SCHEMA_VERSION,
  MemoryStorage, type LiveLedger, type StoragePort,
} from '../live-market-store'
import { checkRunIntegrity, SUT_CONTRACT, type LiveSyncRun } from '../live-market-sync'
import { check, dimension, emptyEvidenceRef, type QaCheck, type QaDimension, type QaStatus } from './types'

export type ScenarioKind = 'EXECUTABLE' | 'EVIDENCE_LED' | 'EXTERNAL'

export interface ScenarioResult {
  id: string
  scenario: string
  kind: ScenarioKind
  /** What the system is required to do when this happens. */
  expectedBehaviour: string
  status: QaStatus
  result: string | null
  reason: string | null
  evidence: string | null
  evaluatedAt: string | null
}

const EXTERNAL_REASON =
  'Scenario requires an external dependency or runtime environment not currently available.'

/** A storage port that always throws — models blocked or exhausted storage. */
class ThrowingStorage implements StoragePort {
  getItem(): string | null { throw new Error('storage unavailable') }
  setItem(): void { throw new Error('storage unavailable') }
  removeItem(): void { throw new Error('storage unavailable') }
}

// ───────────────────────────────────────────── executable scenarios

/** Malformed persisted payload must degrade to an empty ledger, never throw. */
function malformedPayload(nowIso: string): ScenarioResult {
  const s = new MemoryStorage()
  s.setItem(LIVE_STORE_KEY, '{ this is not valid json')
  let result: string
  let status: QaStatus
  try {
    const led = loadLiveLedger(s, SUT_CONTRACT)
    const ok = led.runs.length === 0 && led.contract === SUT_CONTRACT
    status = ok ? 'PASS' : 'FAIL'
    result = ok
      ? 'Returned an empty ledger without throwing.'
      : `Returned ${led.runs.length} run(s) from an unparseable payload.`
  } catch (e) {
    status = 'FAIL'
    result = `Threw instead of degrading: ${(e as Error).message}`
  }
  return {
    id: 'res-malformed-payload',
    scenario: 'Malformed payload',
    kind: 'EXECUTABLE',
    expectedBehaviour: 'An unparseable stored payload yields an empty ledger and no exception.',
    status,
    result,
    reason: status === 'PASS' ? null : result,
    evidence: 'loadLiveLedger() executed against an isolated MemoryStorage holding invalid JSON',
    evaluatedAt: nowIso,
  }
}

/** A duplicate sync id must be refused — evidence is immutable. */
function duplicateRun(run: LiveSyncRun | null, nowIso: string): ScenarioResult {
  const base: Omit<ScenarioResult, 'status' | 'result' | 'reason' | 'evaluatedAt'> = {
    id: 'res-duplicate-run',
    scenario: 'Duplicate transaction / duplicate sync id',
    kind: 'EXECUTABLE',
    expectedBehaviour: 'Appending a sync id that already exists is refused; the stored record is never replaced.',
    evidence: 'appendRun() executed twice with the same run against an in-memory ledger copy',
  }
  if (!run) {
    return {
      ...base,
      status: 'NOT_EXECUTED',
      result: null,
      reason: 'No stored sync run is available to attempt a duplicate append with.',
      evaluatedAt: null,
    }
  }
  const ledger: LiveLedger = { ...emptyLiveLedger(SUT_CONTRACT), runs: [run] }
  const outcome = appendRun(ledger, run)
  const ok = outcome.stored === false && outcome.problems.length > 0
  return {
    ...base,
    status: ok ? 'PASS' : 'FAIL',
    result: ok
      ? `Refused: ${outcome.problems[0]}`
      : 'The duplicate was accepted, which would overwrite immutable evidence.',
    reason: ok ? null : 'A duplicate sync id was accepted.',
    evaluatedAt: nowIso,
  }
}

/** A tampered record must be detected by its own fingerprint. */
function tamperDetection(run: LiveSyncRun | null, nowIso: string): ScenarioResult {
  const base: Omit<ScenarioResult, 'status' | 'result' | 'reason' | 'evaluatedAt'> = {
    id: 'res-tamper-detection',
    scenario: 'Tampered stored record',
    kind: 'EXECUTABLE',
    expectedBehaviour: 'A record whose content no longer matches its fingerprint is reported TAMPERED and refused.',
    evidence: 'checkRunIntegrity() and appendRun() executed against a mutated structural copy',
  }
  if (!run) {
    return {
      ...base,
      status: 'NOT_EXECUTED',
      result: null,
      reason: 'No stored sync run is available to mutate a copy of.',
      evaluatedAt: null,
    }
  }
  const mutated: LiveSyncRun = { ...run, status: run.status === 'VALIDATED' ? 'ERROR' : 'VALIDATED' }
  const detected = checkRunIntegrity(mutated) === 'TAMPERED'
  const refused = appendRun(emptyLiveLedger(SUT_CONTRACT), mutated).stored === false
  const ok = detected && refused
  return {
    ...base,
    status: ok ? 'PASS' : 'FAIL',
    result: ok
      ? 'Mutation detected as TAMPERED and the record was refused on append.'
      : `Detected: ${detected}; refused on append: ${refused}.`,
    reason: ok ? null : 'A mutated record was not both detected and refused.',
    evaluatedAt: nowIso,
  }
}

/** Unavailable storage must not break the application. */
function storageUnavailable(nowIso: string): ScenarioResult {
  let status: QaStatus
  let result: string
  try {
    const led = loadLiveLedger(new ThrowingStorage(), SUT_CONTRACT)
    const ok = led.runs.length === 0
    status = ok ? 'PASS' : 'FAIL'
    result = ok ? 'Returned an empty ledger without throwing.' : 'Returned unexpected content.'
  } catch (e) {
    status = 'FAIL'
    result = `Threw instead of degrading: ${(e as Error).message}`
  }
  return {
    id: 'res-storage-unavailable',
    scenario: 'Persistence unavailable (blocked or exhausted storage)',
    kind: 'EXECUTABLE',
    expectedBehaviour: 'A storage port that throws on every call yields an empty ledger and no exception.',
    status,
    result,
    reason: status === 'PASS' ? null : result,
    evidence: 'loadLiveLedger() executed against a storage port that throws on every operation',
    evaluatedAt: nowIso,
  }
}

/** A ledger from a different schema version must not be trusted. */
function schemaMismatch(nowIso: string): ScenarioResult {
  const s = new MemoryStorage()
  s.setItem(LIVE_STORE_KEY, JSON.stringify({
    schemaVersion: LIVE_SCHEMA_VERSION + 99, contract: SUT_CONTRACT,
    runs: [{ id: 'FOREIGN-SCHEMA-RUN' }],
  }))
  const led = loadLiveLedger(s, SUT_CONTRACT)
  const ok = led.runs.length === 0
  return {
    id: 'res-schema-mismatch',
    scenario: 'Stored payload from an incompatible schema version',
    kind: 'EXECUTABLE',
    expectedBehaviour: 'A payload whose schema version does not match is discarded rather than mis-read.',
    status: ok ? 'PASS' : 'FAIL',
    result: ok ? 'Discarded and returned an empty ledger.' : `Accepted ${led.runs.length} foreign run(s).`,
    reason: ok ? null : 'A payload from an incompatible schema version was accepted.',
    evidence: 'loadLiveLedger() executed against a payload carrying a foreign schemaVersion',
    evaluatedAt: nowIso,
  }
}

// ───────────────────────────────────────────── evidence-led scenarios

/** Partial source response: decided from a stored run that actually recorded one. */
function partialResponse(runs: LiveSyncRun[], nowIso: string): ScenarioResult {
  const base: Omit<ScenarioResult, 'status' | 'result' | 'reason' | 'evaluatedAt' | 'evidence'> = {
    id: 'res-partial-response',
    scenario: 'Partial response / unavailable source',
    kind: 'EVIDENCE_LED',
    expectedBehaviour: 'A run in which some sources fail completes with status PARTIAL, and each unavailable '
      + 'value carries the source\'s own reason rather than a substituted number.',
  }
  const partial = runs.find((r) => r.status === 'PARTIAL')
  if (!partial) {
    return {
      ...base,
      status: 'NOT_EXECUTED',
      result: null,
      reason: 'No stored sync run recorded a partial outcome, so this behaviour has not been exercised here.',
      evidence: null,
      evaluatedAt: null,
    }
  }
  const failed = partial.evidence.filter((e) => e.status !== 'VALIDATED')
  const nulls = partial.observations.filter((o) => o.value === null)
  const withReason = nulls.filter((o) => o.limitation !== null)
  const ok = nulls.length === 0 || withReason.length === nulls.length
  return {
    ...base,
    status: ok ? 'PASS' : 'FAIL',
    result: `Sync ${partial.id} completed PARTIAL with ${failed.length} source(s) unavailable; `
      + `${withReason.length} of ${nulls.length} unavailable values carry an explicit reason.`,
    reason: ok ? null : `${nulls.length - withReason.length} unavailable value(s) carry no stated reason.`,
    evidence: `stored sync ${partial.id}`,
    evaluatedAt: nowIso,
  }
}

/** Rate limiting: decided from a stored run that actually hit HTTP 429. */
function rateLimiting(runs: LiveSyncRun[], nowIso: string): ScenarioResult {
  const base: Omit<ScenarioResult, 'status' | 'result' | 'reason' | 'evaluatedAt' | 'evidence'> = {
    id: 'res-rate-limiting',
    scenario: 'Upstream rate limiting (HTTP 429)',
    kind: 'EVIDENCE_LED',
    expectedBehaviour: 'A throttled source is recorded as unavailable with its HTTP status, and the run '
      + 'continues rather than failing as a whole.',
  }
  const hit = runs.flatMap((r) => r.evidence.map((e) => ({ r, e })))
    .find(({ e }) => e.httpStatus === 429)
  if (!hit) {
    return {
      ...base,
      status: 'NOT_EXECUTED',
      result: null,
      reason: 'No stored sync run recorded an HTTP 429 response, so throttling handling has not been '
        + 'exercised here.',
      evidence: null,
      evaluatedAt: null,
    }
  }
  const ok = hit.e.status !== 'VALIDATED' && hit.r.status !== 'ERROR'
  return {
    ...base,
    status: ok ? 'PASS' : 'FAIL',
    result: `${hit.e.source} returned HTTP 429 in sync ${hit.r.id}; the source was recorded as `
      + `${hit.e.status} and the run completed with status ${hit.r.status}.`,
    reason: ok ? null : 'A throttled source was recorded as validated, or the whole run was failed.',
    evidence: `stored sync ${hit.r.id}, source ${hit.e.source}`,
    evaluatedAt: nowIso,
  }
}

// ───────────────────────────────────────────── external scenarios

const EXTERNAL_SCENARIOS: Array<{ id: string; scenario: string; expectedBehaviour: string }> = [
  {
    id: 'res-api-timeout',
    scenario: 'API timeout',
    expectedBehaviour: 'A source that does not respond within the request budget is recorded as unavailable '
      + 'with that reason, and the run continues.',
  },
  {
    id: 'res-rpc-unavailable',
    scenario: 'RPC unavailable',
    expectedBehaviour: 'When the Polygon RPC cannot be reached, on-chain metrics are recorded as '
      + 'DATA UNAVAILABLE rather than omitted or estimated.',
  },
  {
    id: 'res-delayed-confirmation',
    scenario: 'Delayed confirmation',
    expectedBehaviour: 'A transaction awaiting confirmation is never reported as settled.',
  },
  {
    id: 'res-missing-webhook',
    scenario: 'Missing webhook / event',
    expectedBehaviour: 'A missing inbound event leaves the record incomplete and visible, never auto-completed.',
  },
]

// ───────────────────────────────────────────── dimension

export const RESILIENCE_PURPOSE =
  'Exercises failure scenarios against the real persistence and evidence functions, and reports which '
  + 'scenarios could not be exercised in this environment rather than assuming they would hold.'

export function resilienceScenarios(args: {
  runs: LiveSyncRun[]
  latest: LiveSyncRun | null
  nowIso: string
}): ScenarioResult[] {
  const { runs, latest, nowIso } = args
  return [
    malformedPayload(nowIso),
    storageUnavailable(nowIso),
    schemaMismatch(nowIso),
    duplicateRun(latest, nowIso),
    tamperDetection(latest, nowIso),
    partialResponse(runs, nowIso),
    rateLimiting(runs, nowIso),
    ...EXTERNAL_SCENARIOS.map((s) => ({
      ...s,
      kind: 'EXTERNAL' as ScenarioKind,
      status: 'NOT_EXECUTED' as QaStatus,
      result: null,
      reason: EXTERNAL_REASON,
      evidence: null,
      evaluatedAt: null,
    })),
  ]
}

export function resilience(args: {
  runs: LiveSyncRun[]
  latest: LiveSyncRun | null
  nowIso: string
}): QaDimension & { scenarios: ScenarioResult[] } {
  const scenarios = resilienceScenarios(args)
  const checks: QaCheck[] = scenarios.map((s) => check({
    id: s.id,
    label: s.scenario,
    status: s.status,
    reason: s.reason,
    expected: s.expectedBehaviour,
    actual: s.result,
    // An executable scenario IS traceable: its source is the repository function
    // that ran, its metric is the scenario id, and its provenance is the harness.
    evidence: s.evidence
      ? {
        ...emptyEvidenceRef(),
        source: s.kind === 'EXECUTABLE'
          ? 'SUT Value Forensics repository functions, executed in isolation'
          : `stored Live Market Sync evidence (${s.kind})`,
        metric: s.id,
        provenance: s.evidence,
        relatedSyncId: args.latest?.id ?? null,
      }
      : null,
    evaluatedAt: s.evaluatedAt,
  }))
  return {
    ...dimension({
      id: 'resilience',
      title: 'Resilience Testing',
      purpose: RESILIENCE_PURPOSE,
      checks,
    }),
    scenarios,
  }
}
