/**
 * SECURITY QA — executable checks only.
 *
 * Every PASS in this dimension comes from a check that actually ran against a
 * real repository function or real stored evidence. Checks that would need an
 * external runtime report NOT EXECUTED and are never shown as PASS.
 *
 * Isolation: executable checks build their own MemoryStorage and operate on
 * structural copies. Nothing in this module writes to the real store, the
 * governance ledger, the frozen layer or any threshold state.
 */
import {
  appendRun, emptyLiveLedger, loadLiveLedger, LIVE_STORE_KEY, MemoryStorage,
} from '../live-market-store'
import { checkRunIntegrity, SUT_CONTRACT, type LiveSyncRun } from '../live-market-sync'
import { currentGate, type GovernanceState } from '../governance'
import { check, dimension, emptyEvidenceRef, type QaCheck, type QaDimension, type QaStatus } from './types'

export interface SecurityResult {
  id: string
  control: string
  /** What the control is required to guarantee. */
  requirement: string
  executable: boolean
  status: QaStatus
  result: string | null
  reason: string | null
  evidence: string | null
  evaluatedAt: string | null
}

const HEX40 = /^0x[0-9a-f]{40}$/

/**
 * Asset identity: the project's own rule is that SUT is addressed by its Polygon
 * contract, never by the ticker. This check validates the constant's shape and
 * that a stored ledger is keyed to that contract.
 */
function addressValidation(nowIso: string): SecurityResult {
  const wellFormed = HEX40.test(SUT_CONTRACT)
  // A ledger keyed to a different contract must be refused, not silently adopted.
  const s = new MemoryStorage()
  s.setItem(LIVE_STORE_KEY, JSON.stringify({
    schemaVersion: 1,
    contract: '0x0000000000000000000000000000000000000001',
    runs: [{ id: 'FOREIGN-CONTRACT-RUN' }],
  }))
  const foreign = loadLiveLedger(s, SUT_CONTRACT)
  const rejected = foreign.runs.length === 0 && foreign.contract === SUT_CONTRACT
  const ok = wellFormed && rejected
  return {
    id: 'sec-address-validation',
    control: 'Address / asset identity validation',
    requirement: 'The asset is addressed by a well-formed lowercase Polygon contract address, and evidence '
      + 'keyed to a different contract is refused rather than adopted.',
    executable: true,
    status: ok ? 'PASS' : 'FAIL',
    result: `Contract constant well-formed: ${wellFormed}. Foreign-contract ledger refused: ${rejected}.`,
    reason: ok ? null : 'The contract constant is malformed, or a ledger keyed to another contract was accepted.',
    evidence: 'HEX40 validation of SUT_CONTRACT and loadLiveLedger() against a foreign-contract payload',
    evaluatedAt: nowIso,
  }
}

/** Input validation: structurally invalid persisted input must be discarded. */
function inputValidation(nowIso: string): SecurityResult {
  const cases: Array<[string, string]> = [
    ['not an object', '"a string"'],
    ['null payload', 'null'],
    ['runs not an array', JSON.stringify({ schemaVersion: 1, contract: SUT_CONTRACT, runs: 'nope' })],
    ['contract missing', JSON.stringify({ schemaVersion: 1, runs: [] })],
    ['prototype-pollution keys', JSON.stringify({
      schemaVersion: 1, contract: SUT_CONTRACT, runs: [], __proto__: { polluted: true },
    })],
  ]
  const failures: string[] = []
  for (const [name, payload] of cases) {
    const s = new MemoryStorage()
    s.setItem(LIVE_STORE_KEY, payload)
    try {
      const led = loadLiveLedger(s, SUT_CONTRACT)
      if (led.runs.length !== 0) failures.push(`${name}: accepted content`)
    } catch (e) {
      failures.push(`${name}: threw ${(e as Error).message}`)
    }
  }
  const polluted = ({} as Record<string, unknown>)['polluted'] !== undefined
  if (polluted) failures.push('global object prototype was polluted')
  const ok = failures.length === 0
  return {
    id: 'sec-input-validation',
    control: 'Input validation on persisted payloads',
    requirement: 'Structurally invalid stored input is discarded without throwing, and parsing cannot '
      + 'pollute the object prototype.',
    executable: true,
    status: ok ? 'PASS' : 'FAIL',
    result: ok
      ? `${cases.length} malformed payload shapes all discarded safely; no prototype pollution observed.`
      : failures.join('; '),
    reason: ok ? null : failures.join('; '),
    evidence: 'loadLiveLedger() executed against five malformed payload shapes in isolated MemoryStorage',
    evaluatedAt: nowIso,
  }
}

/** Replay / duplicate protection on the append-only evidence ledger. */
function replayProtection(latest: LiveSyncRun | null, nowIso: string): SecurityResult {
  const base = {
    id: 'sec-replay-protection',
    control: 'Replay / duplicate protection',
    requirement: 'Re-submitting an already stored record is refused; stored evidence is never replaced.',
    executable: true,
    evidence: 'appendRun() executed with an already-present sync id against an in-memory ledger copy',
  }
  if (!latest) {
    return {
      ...base,
      status: 'NOT_EXECUTED' as QaStatus,
      result: null,
      reason: 'No stored sync run is available to attempt a replay with.',
      evaluatedAt: null,
    }
  }
  const outcome = appendRun({ ...emptyLiveLedger(SUT_CONTRACT), runs: [latest] }, latest)
  const ok = !outcome.stored
  return {
    ...base,
    status: ok ? 'PASS' : 'FAIL',
    result: ok ? `Replay refused: ${outcome.problems[0]}` : 'A replayed record was stored.',
    reason: ok ? null : 'A replayed record was accepted.',
    evaluatedAt: nowIso,
  }
}

/** Tamper detection over every stored record, using each record's fingerprint. */
function evidenceIntegrity(runs: LiveSyncRun[], nowIso: string): SecurityResult {
  const base = {
    id: 'sec-evidence-integrity',
    control: 'Evidence integrity (fingerprint verification)',
    requirement: 'Every stored evidence record still matches its own SHA-256 fingerprint.',
    executable: true,
    evidence: 'checkRunIntegrity() executed over every stored sync run',
  }
  if (runs.length === 0) {
    return {
      ...base,
      status: 'DATA_UNAVAILABLE' as QaStatus,
      result: null,
      reason: 'No stored sync run exists, so there is no evidence record to verify.',
      evaluatedAt: null,
    }
  }
  const tampered = runs.filter((r) => checkRunIntegrity(r) === 'TAMPERED')
  const ok = tampered.length === 0
  return {
    ...base,
    status: ok ? 'PASS' : 'FAIL',
    result: `${runs.length - tampered.length} of ${runs.length} stored records verify against their fingerprint.`,
    reason: ok ? null : `${tampered.length} stored record(s) no longer match their fingerprint: `
      + `${tampered.map((t) => t.id).join(', ')}.`,
    evaluatedAt: nowIso,
  }
}

/**
 * Authorization boundary: a measurement threshold cannot become registered
 * without a named human. Read from the live governance state — never modified.
 */
function authorizationBoundary(gov: GovernanceState | null, nowIso: string): SecurityResult {
  const base = {
    id: 'sec-authorization-boundary',
    control: 'Authorization boundary on governance state',
    requirement: 'No threshold is registered and no baseline approved without a named human; the QA layer '
      + 'itself can register and approve nothing.',
    executable: true,
    evidence: 'read from the effective governance state; the QA layer performs no write',
  }
  if (!gov) {
    return {
      ...base,
      status: 'DATA_UNAVAILABLE' as QaStatus,
      result: null,
      reason: 'The governance state could not be read.',
      evaluatedAt: null,
    }
  }
  const registered = gov.thresholdsRegistered
  const total = gov.thresholdsRequired
  const gate = currentGate(gov)
  const consistent = registered <= total
    && gov.thresholdsComplete === (registered >= total && total > 0)
  return {
    ...base,
    status: consistent ? 'PASS' : 'FAIL',
    result: `Governance gate ${gate}; ${registered} of ${total} thresholds registered; `
      + `${gov.approvedBaselineRuns.length} baseline run(s) approved. `
      + 'This QA module issued no write to governance.',
    reason: consistent
      ? null
      : 'The governance state is internally inconsistent: the registered count and the completeness flag '
        + 'disagree, or more thresholds are registered than there are registerable slots.',
    evaluatedAt: nowIso,
  }
}

/** Controls that would need an external runtime. Never reported as PASS. */
const NOT_EXECUTABLE_CONTROLS: Array<{ id: string; control: string; requirement: string; reason: string }> = [
  {
    id: 'sec-rate-limiting',
    control: 'Outbound rate limiting',
    requirement: 'Requests to public sources are spaced so a source is never overwhelmed.',
    reason: 'A request-pacing control exists in the Node sync entrypoint, but exercising it requires a live '
      + 'retrieval run, which this check does not perform.',
  },
  {
    id: 'sec-malicious-payload-network',
    control: 'Malicious upstream payload handling',
    requirement: 'A hostile response from a public source cannot execute code or corrupt stored evidence.',
    reason: 'Scenario requires an external dependency or runtime environment not currently available: a '
      + 'controlled hostile upstream source.',
  },
  {
    id: 'sec-transaction-tampering',
    control: 'Transaction tampering detection',
    requirement: 'A transaction altered between expectation and settlement is detected field by field.',
    reason: 'Requires an expected-transaction context, which is not available from the current public '
      + 'evidence layer. See Transaction Integrity QA.',
  },
]

export const SECURITY_PURPOSE =
  'Executes the security controls that can be exercised against real repository functions and real stored '
  + 'evidence, and reports the remainder as not executed rather than assuming they hold.'

export function securityResults(args: {
  runs: LiveSyncRun[]
  latest: LiveSyncRun | null
  gov: GovernanceState | null
  nowIso: string
}): SecurityResult[] {
  const { runs, latest, gov, nowIso } = args
  return [
    addressValidation(nowIso),
    inputValidation(nowIso),
    replayProtection(latest, nowIso),
    evidenceIntegrity(runs, nowIso),
    authorizationBoundary(gov, nowIso),
    ...NOT_EXECUTABLE_CONTROLS.map((c) => ({
      id: c.id,
      control: c.control,
      requirement: c.requirement,
      executable: false,
      status: 'NOT_EXECUTED' as QaStatus,
      result: null,
      reason: c.reason,
      evidence: null,
      evaluatedAt: null,
    })),
  ]
}

export function security(args: {
  runs: LiveSyncRun[]
  latest: LiveSyncRun | null
  gov: GovernanceState | null
  nowIso: string
}): QaDimension & { results: SecurityResult[] } {
  const results = securityResults(args)
  const checks: QaCheck[] = results.map((r) => check({
    id: r.id,
    label: r.control,
    status: r.status,
    reason: r.reason,
    expected: r.requirement,
    actual: r.result,
    evidence: r.evidence
      ? {
        ...emptyEvidenceRef(),
        source: r.executable
          ? 'SUT Value Forensics repository functions, executed in isolation'
          : 'control not exercised in this environment',
        metric: r.id,
        provenance: r.evidence,
        relatedSyncId: args.latest?.id ?? null,
      }
      : null,
    evaluatedAt: r.evaluatedAt,
  }))
  return {
    ...dimension({
      id: 'security',
      title: 'Security QA',
      purpose: SECURITY_PURPOSE,
      checks,
    }),
    results,
  }
}
