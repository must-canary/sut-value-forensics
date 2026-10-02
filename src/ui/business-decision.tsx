import { useEffect, useMemo, useState } from 'react'
import { Card, Warn } from './components'
import {
  buildScenarioRows, buildStatusPanel, decisionState, EXECUTABLE_SIZES,
  NOT_EXECUTABLE_SIZE, unlocksExperiment,
  type BusinessApprovalRecord, type ExecutableSize,
} from '../core/business-decision'
import {
  approveCurrent, createNewProposal, emptyLedger, loadLedger, saveInput, saveLedger,
  versionRef, viewLedger, type DecisionLedger,
} from '../core/decision-store'
import { browserStorage } from '../data/decision-storage'
import { OBSERVED_BASELINE_RANGES, PROPOSED_THRESHOLDS } from '../data/proposed-thresholds'
import { PRE_REGISTRATION } from '../data/pre-registration'
import { effectiveState } from '../core/governance-store'
import { useGovernanceLedger } from './governance-state'
import { BASELINE_CAPTURES } from '../data/baseline-captures'

const input = {
  padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--plane)', color: 'var(--text-primary)', font: 'inherit', fontSize: 12,
} as const

function Pill({ text, color }: { text: string; color: string }) {
  return <span className="chip"><span className="dot" style={{ background: color }} />{text}</span>
}

const tone = (v: string) =>
  v === 'COMPLETE' || v === 'APPROVED' || v === 'REGISTERED' || v === 'READY' || v === 'AVAILABLE' || v === 'YES'
    ? 'var(--status-good)'
    : v === 'PRESENT' || v === 'SAVED' ? 'var(--status-warning)'
    : v === 'BLOCKED' || v === 'TAMPERED' ? 'var(--status-critical)' : 'var(--text-muted)'

export function BusinessDecisionWorkflow() {
  const storage = useMemo(() => browserStorage(), [])
  const [ledger, setLedger] = useState<DecisionLedger>(emptyLedger())
  const [problems, setProblems] = useState<string[]>([])
  const [banner, setBanner] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // restore on mount — survives refresh
  useEffect(() => {
    setLedger(loadLedger(storage))
    setLoaded(true)
  }, [storage])

  const persist = (next: DecisionLedger) => { saveLedger(storage, next); setLedger(next) }
  const view = viewLedger(ledger)
  const cur = view.current
  const locked = view.locked

  const [values, setValues] = useState<Record<string, string>>({})
  const [rationales, setRationales] = useState<Record<string, string>>({})
  const [reviewer, setReviewer] = useState('')
  const [note, setNote] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  // hydrate the form from the restored working version
  useEffect(() => {
    if (!loaded || !cur) return
    setValues(Object.fromEntries(cur.thresholds.map((t) => [t.size, t.value === null ? '' : String(t.value)])))
    setRationales(Object.fromEntries(cur.thresholds.map((t) => [t.size, t.rationale])))
    setReviewer(cur.reviewer ?? '')
    setNote(cur.decisionNote)
    setConfirmed(cur.approvalConfirmed)
  }, [loaded, cur?.version, cur?.approvalStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  const govLedger = useGovernanceLedger()
  const gov = effectiveState(govLedger, PRE_REGISTRATION).state
  const registerable = PRE_REGISTRATION.filter((e) => e.state !== 'NOT_REGISTERABLE')

  const approvalRecord: BusinessApprovalRecord | null =
    view.approved && cur && cur.fingerprint && cur.reviewer && cur.approvedAt
      ? {
          experimentId: 'EXP-001', reviewer: cur.reviewer, approvedAt: cur.approvedAt,
          decisionNote: cur.decisionNote,
          thresholds: cur.thresholds.map((t) => ({
            size: t.size, value: t.value as number, rationale: t.rationale, direction: t.direction,
          })),
          fingerprint: cur.fingerprint, version: versionRef(cur),
          approvalStatus: 'BUSINESS_APPROVED', registersThreshold: false,
        }
      : null

  const state = decisionState({
    approval: approvalRecord,
    inputSaved: view.inputSaved,
    registeredCount: gov.thresholdsRegistered,
    requiredCount: registerable.length,
  })

  const panel = buildStatusPanel({
    baselineRuns: new Set(BASELINE_CAPTURES.filter((c) => c.experimentId === 'EXP-001').map((c) => c.runId)).size,
    proposalCount: PROPOSED_THRESHOLDS.length,
    inputSaved: view.inputSaved,
    approval: approvalRecord,
    registeredCount: gov.thresholdsRegistered,
    requiredCount: registerable.length,
    approvedBaselineRuns: gov.approvedBaselineRuns.length,
    interventionRecorded: gov.intervention !== null,
    comparisonCaptured: gov.comparison !== null,
    finalReviewRecorded: gov.finalReview !== null,
  })

  const collect = () => ({
    thresholds: EXECUTABLE_SIZES.map((size) => ({
      size,
      value: values[size] === undefined || values[size] === '' ? null : Number(values[size]),
      rationale: rationales[size] ?? '',
    })),
    reviewer, decisionNote: note, approvalConfirmed: confirmed,
  })

  const onSave = () => {
    const r = saveInput(ledger, collect(), new Date().toISOString())
    setProblems(r.problems)
    if (r.problems.length === 0) {
      persist(r.ledger)
      setBanner('BUSINESS INPUT SAVED — persisted locally. This is not approval and unlocks nothing.')
    }
  }

  const onApprove = () => {
    const saved = saveInput(ledger, collect(), new Date().toISOString())
    if (saved.problems.length) { setProblems(saved.problems); return }
    const r = approveCurrent(saved.ledger, new Date().toISOString())
    setProblems(r.problems)
    if (r.problems.length === 0) {
      persist(r.ledger)
      setBanner('BUSINESS APPROVED & LOCKED — persisted. Approval does NOT register the threshold; '
        + 'the existing pre-registration workflow must still run.')
    }
  }

  const onNewProposal = () => {
    const r = createNewProposal(ledger, new Date().toISOString())
    setProblems(r.problems)
    if (r.problems.length === 0) {
      persist(r.ledger)
      setValues({}); setRationales({}); setReviewer(''); setNote(''); setConfirmed(false)
      setBanner(`New proposal ${r.ledger.versions[r.ledger.versions.length - 1]!.version} created. `
        + 'The previous approval is preserved and still requires its own registration.')
    }
  }

  const rows = buildScenarioRows({
    baselineRanges: OBSERVED_BASELINE_RANGES,
    registeredThresholds: Object.fromEntries(registerable.map((e) => [e.standardisedSize, e.successThreshold])),
    comparison: gov.comparison
      ? { runId: gov.comparison.runId, capturedAt: gov.comparison.capturedAt,
          readings: gov.comparison.readings.map((r) => ({ size: r.standardisedSize, value: r.value, evidenceId: r.evidenceId })) }
      : null,
  })

  return (
    <>
      <Card title="EXP-001 — governance status" hint="Derived from live governance state and persisted decision data.">
        <div className="scroll">
          <table><tbody>
            <tr><td style={{ width: '42%' }}>Baseline</td><td><Pill text={panel.baseline} color={tone(panel.baseline)} /></td></tr>
            <tr><td>Proposed Thresholds</td><td><Pill text={panel.proposedThresholds} color={tone(panel.proposedThresholds)} /></td></tr>
            <tr><td>Business Input</td><td><Pill text={panel.businessInput} color={tone(panel.businessInput)} /></td></tr>
            <tr><td>Business Approval</td><td><Pill text={panel.businessApproval} color={tone(panel.businessApproval)} /></td></tr>
            <tr><td>Threshold Registration</td><td><Pill text={panel.thresholdRegistration} color={tone(panel.thresholdRegistration)} /></td></tr>
            <tr><td>Baseline Approval</td><td><Pill text={panel.baselineApproval} color={tone(panel.baselineApproval)} /></td></tr>
            <tr><td>Intervention</td><td><Pill text={panel.intervention} color={tone(panel.intervention)} /></td></tr>
            <tr><td>Result</td><td><Pill text={panel.result} color={tone(panel.result)} /></td></tr>
          </tbody></table>
        </div>
        <p className="small"><strong>Decision state:</strong> <span className="mono">{state}</span>{' '}
          <span className="muted">(PROPOSED → BUSINESS_INPUT_SAVED → BUSINESS_APPROVED → REGISTERED → LOCKED)</span></p>
        {view.tamperedVersions.length > 0 && (
          <Warn><strong>INTEGRITY FAILURE.</strong> Version(s) {view.tamperedVersions.join(', ')} no longer match
            their stored fingerprint and are <strong>not</strong> treated as approved. Persisted state is never
            accepted as proof of governance approval.</Warn>
        )}
      </Card>

      <Card title="Persisted decision record"
        hint="Restored from this browser on load. Decision data only — never proof of governance approval.">
        <div className="scroll">
          <table><tbody>
            <tr><td style={{ width: '42%' }}>Version</td><td className="mono" data-testid="bd-version">{cur ? versionRef(cur) : 'none'}</td></tr>
            <tr><td>Reviewer</td><td data-testid="bd-reviewer-value">{cur?.reviewer ?? <span className="muted">none</span>}</td></tr>
            <tr><td>Approved At</td><td className="mono small" data-testid="bd-approved-at">{cur?.approvedAt ?? '—'}</td></tr>
            <tr><td>Locked</td><td data-testid="bd-locked"><Pill text={locked ? 'YES' : 'NO'} color={tone(locked ? 'YES' : 'NO')} /></td></tr>
          </tbody></table>
        </div>
      </Card>

      <Card title="Business Decision Input"
        hint="Entered by a named business owner. Saved locally and restored on refresh. Saving is not approval; approval is not registration.">
        {banner && <Warn>{banner}</Warn>}
        {locked && (
          <Warn><strong>LOCKED.</strong> Values, rationales and the approving reviewer cannot be edited.
            Any change requires a new experiment version: use <strong>Create New Proposal</strong>. The existing
            approval is kept as history and the new version requires approval again.</Warn>
        )}

        <div className="scroll">
          <table>
            <thead><tr><th>Scenario</th><th>Observed baseline</th><th>Threshold %</th><th>Rationale</th></tr></thead>
            <tbody>
              {EXECUTABLE_SIZES.map((size: ExecutableSize) => (
                <tr key={size}>
                  <td><strong className="small">{size}</strong></td>
                  <td className="small muted">{OBSERVED_BASELINE_RANGES[size]}</td>
                  <td>
                    <input type="number" step="0.01" min="0" style={{ ...input, width: 120 }}
                      aria-label={`business threshold for ${size}`} disabled={locked}
                      placeholder="threshold %" value={values[size] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [size]: e.target.value }))} />
                  </td>
                  <td>
                    <input style={{ ...input, width: 260 }} disabled={locked}
                      aria-label={`business rationale for ${size}`} placeholder="rationale"
                      value={rationales[size] ?? ''}
                      onChange={(e) => setRationales((r) => ({ ...r, [size]: e.target.value }))} />
                  </td>
                </tr>
              ))}
              <tr>
                <td><strong className="small">{NOT_EXECUTABLE_SIZE}</strong></td>
                <td className="small muted">NOT EXECUTABLE</td>
                <td colSpan={2} className="small muted">
                  <strong>NOT EXECUTABLE</strong> — no threshold input is offered, and none is ever persisted.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <label className="small"><strong>Decision Owner / Business Reviewer Name</strong></label>
          <input style={{ ...input, width: 240 }} disabled={locked} data-testid="bd-reviewer"
            placeholder="full name" value={reviewer} onChange={(e) => setReviewer(e.target.value)} />
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <label className="small"><strong>Decision Note / Rationale</strong></label>
          <input style={{ ...input, width: 360 }} disabled={locked} data-testid="bd-note"
            placeholder="why these values" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <label className="small" style={{ display: 'inline-flex', gap: 6 }}>
            <input type="checkbox" disabled={locked} checked={confirmed}
              aria-label="confirm approval" onChange={(e) => setConfirmed(e.target.checked)} />
            <span>I explicitly approve these thresholds as the business decision owner.</span>
          </label>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <button className="toggle" onClick={onSave} disabled={locked}>Save Business Proposal</button>
          <button className="toggle" onClick={onApprove} disabled={locked}>Approve &amp; Lock Thresholds</button>
          <button className="toggle" onClick={onNewProposal} disabled={!locked}>Create New Proposal</button>
        </div>

        {problems.length > 0 && (
          <div className="warn" style={{ borderColor: 'var(--status-critical)' }}>
            <strong>REFUSED</strong>
            <ul className="tight">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        )}

        {view.approved && cur && (
          <div style={{ marginTop: 12 }}>
            <p className="small"><strong>Approval record (auditable)</strong></p>
            <div className="scroll">
              <table><tbody>
                <tr><td style={{ width: '32%' }}>Reviewer</td><td>{cur.reviewer}</td></tr>
                <tr><td>Approved at</td><td className="mono small">{cur.approvedAt}</td></tr>
                <tr><td>Decision note</td><td className="small">{cur.decisionNote}</td></tr>
                <tr><td>Version</td><td className="mono small">{versionRef(cur)}</td></tr>
                <tr><td>Fingerprint</td><td className="mono small">{cur.fingerprint}</td></tr>
                <tr><td>Approval status</td><td><Pill text="BUSINESS_APPROVED" color="var(--status-good)" /></td></tr>
                <tr><td>Registers threshold?</td><td><strong>NO</strong> <span className="muted">— the existing pre-registration workflow must still run</span></td></tr>
              </tbody></table>
            </div>
          </div>
        )}
      </Card>

      <Card title="Decision audit history" hint="Every version is retained. Approvals are never overwritten.">
        {view.history.length === 0 ? (
          <div className="na-box"><b>NO DECISION VERSIONS</b>No business input has been saved yet.</div>
        ) : (
          <div className="scroll">
            <table>
              <thead><tr><th>Version</th><th>Status</th><th>Reviewer</th><th>Created</th><th>Approved</th><th>Fingerprint</th><th>Integrity</th></tr></thead>
              <tbody>
                {view.history.map((v) => (
                  <tr key={v.version}>
                    <td className="mono"><strong>{v.version}</strong></td>
                    <td><Pill text={v.approvalStatus} color={v.approvalStatus === 'BUSINESS_APPROVED' ? 'var(--status-good)' : 'var(--status-warning)'} /></td>
                    <td className="small">{v.reviewer ?? <span className="muted">—</span>}</td>
                    <td className="mono small">{v.createdAt}</td>
                    <td className="mono small">{v.approvedAt ?? '—'}</td>
                    <td className="mono small">{v.fingerprint ?? '—'}</td>
                    <td><Pill text={v.integrity ?? 'OK'} color={tone(v.integrity ?? 'OK')} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted">
          Persisted in this browser only (localStorage). It is decision data, never proof of governance
          approval: every record is re-validated and its fingerprint recomputed on load.
        </p>
      </Card>

      <Card title="Run Experiment" hint="Gated by the existing governance chain. Actual results come only from a captured comparison.">
        {panel.intervention === 'BLOCKED' && (
          <Warn><strong>BLOCKED.</strong> The existing governance gates are not satisfied:
            threshold registration is {panel.thresholdRegistration}, baseline approval is {panel.baselineApproval}.
            Business approval alone does not unlock the experiment
            {unlocksExperiment({ approval: null, inputSaved: view.inputSaved, registeredCount: gov.thresholdsRegistered, requiredCount: registerable.length }) ? '' : '.'}
            {' '}Persisted or restored state cannot change this.</Warn>
        )}
        <div className="scroll">
          <table>
            <thead><tr>
              <th>Scenario</th><th>Baseline</th><th>Locked threshold</th><th>Actual result</th>
              <th>Absolute impact</th><th>Status</th><th>Run ID</th><th>Timestamp</th><th>Evidence</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.scenario}>
                  <td><strong className="small">{r.scenario}</strong></td>
                  <td className="small muted">{r.baseline}</td>
                  <td className="small">{r.lockedThreshold}</td>
                  <td className="small">{r.actualResult === 'NOT AVAILABLE' || r.actualResult === 'NOT EXECUTABLE'
                    ? <span className="muted"><strong>{r.actualResult}</strong></span> : <strong>{r.actualResult}</strong>}</td>
                  <td className="small">{r.absoluteImpact}</td>
                  <td className="small">{r.status}</td>
                  <td className="mono small">{r.runId}</td>
                  <td className="mono small">{r.timestamp}</td>
                  <td className="mono small">{r.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">
          There is no field for entering an actual result. Comparison values are produced only by the existing
          capture mechanism and compared using the existing LOWER_IS_BETTER absolute-magnitude semantics.
        </p>
      </Card>
    </>
  )
}
