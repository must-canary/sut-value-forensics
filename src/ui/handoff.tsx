import { useState } from 'react'
import { Card, Warn } from './components'
import {
  BLOCKING_NOTICE, NEXT_REQUIRED_ACTION, draftBaselineReview, draftRegistration,
  registrationSummary, type BaselineReviewAction, type PreRegistrationEntry,
} from '../core/pre-registration'
import {
  approvalStatusFor, createExperimentVersion, effectiveState, recordBaselineApproval,
  registerThreshold, registrationHistory,
} from '../core/governance-store'
import { CONFIGURED_REVIEWERS } from '../core/baseline-ops'
import { OBSERVED_BASELINE_IMPACTS, PRE_REGISTRATION } from '../data/pre-registration'
import { BASELINE_CAPTURES } from '../data/baseline-captures'
import { businessApprovalRef, businessApprovedThresholds } from '../data/governance-storage'
import { commitGovernanceLedger, useGovernanceLedger } from './governance-state'

const input = {
  padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--plane)', color: 'var(--text-primary)', font: 'inherit', fontSize: 12,
} as const

function Pill({ text, color }: { text: string; color: string }) {
  return <span className="chip"><span className="dot" style={{ background: color }} />{text}</span>
}

const REG_TONE: Record<string, string> = {
  REGISTERED: 'var(--status-good)',
  'AWAITING HUMAN ENTRY': 'var(--status-critical)',
  APPROVED: 'var(--status-good)',
  REJECTED: 'var(--status-critical)',
  PENDING: 'var(--status-warning)',
  TAMPERED: 'var(--status-critical)',
  OK: 'var(--text-muted)',
}

/** The exact blocking notice and next action, always visible on the handoff. */
export function NextRequiredAction() {
  const ledger = useGovernanceLedger()
  const eff = effectiveState(ledger, PRE_REGISTRATION)
  const reg = registrationSummary(eff.entries)
  const runs = new Set(BASELINE_CAPTURES.filter((c) => c.experimentId === 'EXP-001').map((c) => c.runId))
  const approved = eff.state.approvedBaselineRuns.length
  const bothOpen = reg.complete && approved > 0
  return (
    <Card title="NEXT REQUIRED ACTION">
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{NEXT_REQUIRED_ACTION}</div>
      <Warn>{BLOCKING_NOTICE}</Warn>
      <table>
        <tbody>
          <tr><td style={{ width: '46%' }}>Thresholds registered</td>
            <td><strong data-testid="nra-registered">{reg.registered} of 4</strong> {reg.registered === 0 && <span className="muted">— none</span>}</td></tr>
          <tr><td>Baseline runs approved</td>
            <td><strong data-testid="nra-approved">{approved} of {runs.size}</strong> {approved === 0 && <span className="muted">— none</span>}</td></tr>
          <tr><td>Intervention permitted</td>
            <td data-testid="nra-intervention">{bothOpen
              ? <><strong>AWAITING HUMAN RECORD</strong> <span className="muted">— both gates satisfied; a named human must record the controlled intervention</span></>
              : <><strong>NO</strong> <span className="muted">— both gates outstanding</span></>}</td></tr>
        </tbody>
      </table>
    </Card>
  )
}

/** Per-slot registration: validate a proposal, then commit it as a persisted record. */
export function RegistrationHandoff() {
  const ledger = useGovernanceLedger()
  const eff = effectiveState(ledger, PRE_REGISTRATION)
  const approvedByBusiness = businessApprovedThresholds()
  const businessRef = businessApprovalRef()

  const [author, setAuthor] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [attested, setAttested] = useState<Record<string, boolean>>({})
  const [rationale, setRationale] = useState<Record<string, string>>({})
  const [drafted, setDrafted] = useState<Record<string, ReturnType<typeof draftRegistration>>>({})
  const [problems, setProblems] = useState<Record<string, string[]>>({})
  const [notice, setNotice] = useState<string | null>(null)

  const valueFor = (size: string) => {
    const typed = values[size]
    if (typed !== undefined) return typed
    const approved = approvedByBusiness[size]
    return approved === undefined ? '' : String(approved)
  }

  const build = (slot: PreRegistrationEntry) => {
    const raw = valueFor(slot.standardisedSize)
    const res = draftRegistration(
      slot,
      {
        standardisedSize: slot.standardisedSize,
        threshold: raw === '' ? null : Number(raw),
        authorName: author,
        rationale: rationale[slot.standardisedSize] ?? '',
        independenceAttested: attested[slot.standardisedSize] ?? false,
      },
      OBSERVED_BASELINE_IMPACTS[slot.standardisedSize] ?? [],
      new Date().toISOString(),
    )
    setDrafted((d) => ({ ...d, [slot.standardisedSize]: res }))
  }

  const commit = (slot: PreRegistrationEntry) => {
    const raw = valueFor(slot.standardisedSize)
    const r = registerThreshold(
      ledger, slot,
      {
        threshold: raw === '' ? null : Number(raw),
        authorName: author,
        rationale: rationale[slot.standardisedSize] ?? '',
        independenceAttested: attested[slot.standardisedSize] ?? false,
      },
      OBSERVED_BASELINE_IMPACTS[slot.standardisedSize] ?? [],
      new Date().toISOString(),
      CONFIGURED_REVIEWERS,
    )
    setProblems((p) => ({ ...p, [slot.standardisedSize]: r.problems }))
    if (r.problems.length === 0) {
      commitGovernanceLedger(r.ledger)
      setDrafted((d) => { const { [slot.standardisedSize]: _gone, ...rest } = d; return rest })
      setNotice(`${slot.standardisedSize} REGISTERED and locked for ${ledger.activeVersion}. `
        + 'Registration is immutable for this experiment version.')
    }
  }

  const newVersion = () => {
    const sizes = PRE_REGISTRATION.filter((s) => s.state !== 'NOT_REGISTERABLE').map((s) => s.standardisedSize)
    const r = createExperimentVersion(ledger, sizes, new Date().toISOString())
    setProblems((p) => ({ ...p, __version__: r.problems }))
    if (r.problems.length === 0) {
      commitGovernanceLedger(r.ledger)
      setValues({}); setAttested({}); setRationale({}); setDrafted({})
      setNotice(`New experiment version ${r.record} opened. Every threshold must be registered again; `
        + 'the previous version is preserved in the audit history.')
    }
  }

  const registerable = eff.entries.filter((s) => s.state !== 'NOT_REGISTERABLE')
  const history = registrationHistory(ledger)

  return (
    <>
      <Card title="Threshold registration handoff"
        hint="Each slot requires a number, a named human author, a timestamp, the experiment version, and independence confirmation.">
        {notice && <Warn>{notice}</Warn>}
        {businessRef && (
          <p className="small"><strong>Business-approved input available:</strong>{' '}
            <span className="mono" data-testid="business-ref">{businessRef}</span>.{' '}
            Values are pre-filled below for convenience. A business approval is <strong>not</strong> a
            registration — a named human must still register each threshold here.</p>
        )}
        <div className="row" style={{ marginBottom: 12 }}>
          <label className="small"><strong>Human author</strong></label>
          <input style={{ ...input, width: 240 }} placeholder="full name of the registering human"
            value={author} onChange={(e) => setAuthor(e.target.value)} data-testid="author-name" />
        </div>

        {registerable.map((slot) => {
          const size = slot.standardisedSize
          const d = drafted[size]
          const locked = slot.state === 'REGISTERED'
          const probs = problems[size] ?? []
          const businessValue = approvedByBusiness[size]
          return (
            <div key={size} data-testid={`slot-${size}`}
              style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
              <div className="row">
                <strong className="small">{size}</strong>
                <Pill text={locked ? 'REGISTERED' : 'AWAITING HUMAN ENTRY'}
                  color={REG_TONE[locked ? 'REGISTERED' : 'AWAITING HUMAN ENTRY']!} />
                <span className="chip">{slot.experimentVersion}</span>
                <span className="chip">{slot.thresholdDirection.replace(/_/g, ' ').toLowerCase()}</span>
              </div>
              {businessValue !== undefined && (
                <p className="small muted" style={{ marginTop: 6 }}>
                  Business-approved threshold: <strong data-testid={`business-value-${size}`}>
                    {businessValue.toFixed(2)}%</strong>
                  {' · '}Registration threshold: <strong data-testid={`registration-value-${size}`}>
                    {locked ? `${slot.successThreshold!.toFixed(2)}%` : `${valueFor(size) === '' ? '—' : Number(valueFor(size)).toFixed(2) + '%'}`}</strong>
                </p>
              )}
              {locked ? (
                <table style={{ marginTop: 8 }}>
                  <tbody>
                    <tr><td style={{ width: '38%' }}>Threshold</td>
                      <td><strong data-testid={`registered-threshold-${size}`}>{slot.successThreshold} {slot.thresholdUnit}</strong></td></tr>
                    <tr><td>Human author</td><td data-testid={`registered-author-${size}`}>{slot.reviewerName}</td></tr>
                    <tr><td>Registered at</td><td className="mono small" data-testid={`registered-at-${size}`}>{slot.registrationTimestamp}</td></tr>
                    <tr><td>Experiment version</td><td className="mono small">{slot.experimentVersion}</td></tr>
                    <tr><td>Rationale</td><td className="small">{slot.rationale}</td></tr>
                    <tr><td>Independence confirmed</td><td>YES — by {slot.attestedBy}</td></tr>
                  </tbody>
                </table>
              ) : (
                <div className="row" style={{ marginTop: 8 }}>
                  <input type="number" step="0.01" style={{ ...input, width: 150 }}
                    placeholder="required threshold %"
                    aria-label={`threshold for ${size}`}
                    value={valueFor(size)}
                    onChange={(e) => setValues((v) => ({ ...v, [size]: e.target.value }))} />
                  <label className="small" style={{ display: 'inline-flex', gap: 6, alignItems: 'flex-start', maxWidth: 520 }}>
                    <input type="checkbox" checked={attested[size] ?? false}
                      aria-label={`independence confirmation for ${size}`}
                      onChange={(e) => setAttested((a) => ({ ...a, [size]: e.target.checked }))} />
                    <span>I confirm this number was selected <strong>independently</strong> of the observed
                      results of RUN-001, RUN-002 and RUN-003.</span>
                  </label>
                  <input style={{ ...input, width: 300 }} placeholder="written rationale (required)"
                    aria-label={`rationale for ${size}`}
                    value={rationale[size] ?? ''}
                    onChange={(e) => setRationale((r) => ({ ...r, [size]: e.target.value }))} />
                  <button className="toggle" onClick={() => build(slot)}>Validate registration</button>
                  <button className="toggle" onClick={() => commit(slot)}
                    data-testid={`register-${size}`}>Register &amp; Lock</button>
                </div>
              )}
              {d && !locked && (
                <div style={{ marginTop: 8 }}>
                  {d.admissible ? (
                    <div className="warn">
                      <strong>ADMISSIBLE — not yet committed.</strong> Nothing is registered until
                      <strong> Register &amp; Lock</strong> is pressed; the slot stays AWAITING HUMAN ENTRY until then.
                      <table style={{ marginTop: 8 }}>
                        <tbody>
                          <tr><td style={{ width: '38%' }}>Threshold</td><td><strong>{d.record!.successThreshold} {d.record!.thresholdUnit}</strong></td></tr>
                          <tr><td>Human author</td><td>{d.record!.reviewerName}</td></tr>
                          <tr><td>Registration timestamp</td><td className="mono small">{d.record!.registrationTimestamp}</td></tr>
                          <tr><td>Experiment version</td><td>{d.record!.experimentVersion}</td></tr>
                          <tr><td>Independence confirmed</td><td>YES — by {d.record!.attestedBy}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="warn" style={{ borderColor: 'var(--status-critical)' }}>
                      <strong>REFUSED</strong>
                      <ul className="tight">{d.problems.map((p) => <li key={p}>{p}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
              {probs.length > 0 && (
                <div className="warn" style={{ borderColor: 'var(--status-critical)', marginTop: 8 }}>
                  <strong>REGISTRATION REFUSED</strong>
                  <ul className="tight">{probs.map((p) => <li key={p}>{p}</li>)}</ul>
                </div>
              )}
            </div>
          )
        })}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
          <div className="row">
            <strong className="small">$100,000 (both sides)</strong>
            <Pill text="NOT REGISTERABLE" color="var(--text-muted)" />
          </div>
          <p className="small muted">
            NOT REGISTERABLE — current pool cannot execute the standardized size. No threshold may be registered
            for a transaction the venue cannot fill. This slot becomes registerable only once inventory supports it.
          </p>
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          <button className="toggle" onClick={newVersion} data-testid="new-experiment-version">
            Open new experiment version
          </button>
          <span className="small muted">
            Registered thresholds are immutable. A correction requires a new experiment version; the existing
            records are preserved as history.
          </span>
        </div>
        {(problems.__version__ ?? []).length > 0 && (
          <div className="warn" style={{ borderColor: 'var(--status-critical)', marginTop: 8 }}>
            <strong>REFUSED</strong>
            <ul className="tight">{problems.__version__!.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        )}
      </Card>

      <Card title="Registration audit history"
        hint="Every registered threshold is retained. Registered records are never overwritten.">
        {history.length === 0 ? (
          <div className="na-box"><b>NO REGISTRATION RECORDED</b>No threshold has been registered by a human yet.</div>
        ) : (
          <div className="scroll">
            <table>
              <thead><tr><th>Version</th><th>Size</th><th>Threshold</th><th>Author</th><th>Registered at</th><th>Fingerprint</th><th>Integrity</th><th>Status</th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={`${h.experimentVersion}-${h.standardisedSize}`}>
                    <td className="mono"><strong>{h.experimentVersion}</strong></td>
                    <td className="small">{h.standardisedSize}</td>
                    <td><strong>{h.threshold}%</strong></td>
                    <td className="small">{h.authorName}</td>
                    <td className="mono small">{h.registeredAt}</td>
                    <td className="mono small">{h.fingerprint}</td>
                    <td><Pill text={h.integrity} color={REG_TONE[h.integrity] ?? 'var(--text-muted)'} /></td>
                    <td className="small">{h.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted">
          Persisted in this browser (localStorage). Every record is re-validated and its fingerprint recomputed
          on load; a record that no longer matches is marked TAMPERED and is excluded from every gate.
        </p>
      </Card>
    </>
  )
}

/** Per-run review for RUN-001 / RUN-002 / RUN-003. Never auto-approves. */
export function BaselineReviewHandoff() {
  const ledger = useGovernanceLedger()
  const runIds = [...new Set(BASELINE_CAPTURES.filter((c) => c.experimentId === 'EXP-001').map((c) => c.runId))].sort()
  const [reviewer, setReviewer] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [drafts, setDrafts] = useState<Record<string, ReturnType<typeof draftBaselineReview>>>({})
  const [actions, setActions] = useState<Record<string, BaselineReviewAction>>({})
  const [problems, setProblems] = useState<Record<string, string[]>>({})

  const act = (runId: string, action: BaselineReviewAction) => {
    const res = draftBaselineReview(
      { runId, reviewerName: reviewer, action, note: notes[runId] ?? '' },
      runIds, new Date().toISOString(),
    )
    setDrafts((d) => ({ ...d, [runId]: res }))
    setActions((a) => ({ ...a, [runId]: action }))
  }

  const commit = (runId: string) => {
    const action = actions[runId]
    if (!action) {
      setProblems((p) => ({ ...p, [runId]: ['choose ACCEPT or REJECT first — a review is never implied'] }))
      return
    }
    const r = recordBaselineApproval(
      ledger,
      { runId, reviewer, action: action === 'ACCEPT' ? 'APPROVE' : 'REJECT', note: notes[runId] ?? '' },
      runIds, new Date().toISOString(), CONFIGURED_REVIEWERS,
    )
    setProblems((p) => ({ ...p, [runId]: r.problems }))
    if (r.problems.length === 0) {
      commitGovernanceLedger(r.ledger)
      setDrafts((d) => { const { [runId]: _gone, ...rest } = d; return rest })
    }
  }

  return (
    <Card title="Baseline review handoff" hint="A baseline is never approved automatically. A named human must act on each run.">
      <div className="row" style={{ marginBottom: 12 }}>
        <label className="small"><strong>Named reviewer</strong></label>
        <input style={{ ...input, width: 240 }} placeholder="full name of the reviewing human"
          value={reviewer} onChange={(e) => setReviewer(e.target.value)} data-testid="reviewer-name" />
      </div>

      {runIds.map((runId) => {
        const d = drafts[runId]
        const status = approvalStatusFor(ledger, runId)
        const committed = ledger.approvals.filter((a) => a.runId === runId).slice(-1)[0] ?? null
        const probs = problems[runId] ?? []
        return (
          <div key={runId} data-testid={`run-${runId}`}
            style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
            <div className="row">
              <strong className="small">{runId}</strong>
              <Pill text={status} color={REG_TONE[status] ?? 'var(--status-warning)'} />
            </div>
            {status === 'PENDING' ? (
              <div className="row" style={{ marginTop: 8 }}>
                <input style={{ ...input, width: 300 }} placeholder="review note (required to reject)"
                  aria-label={`review note for ${runId}`}
                  value={notes[runId] ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [runId]: e.target.value }))} />
                <button className="toggle" onClick={() => act(runId, 'ACCEPT')}>ACCEPT baseline</button>
                <button className="toggle" onClick={() => act(runId, 'REJECT')}>REJECT baseline</button>
                <button className="toggle" onClick={() => commit(runId)}
                  data-testid={`commit-review-${runId}`}>Commit review</button>
              </div>
            ) : (
              committed && (
                <table style={{ marginTop: 8 }}>
                  <tbody>
                    <tr><td style={{ width: '38%' }}>Action</td><td><strong data-testid={`review-action-${runId}`}>{committed.action}</strong></td></tr>
                    <tr><td>Reviewer</td><td data-testid={`review-reviewer-${runId}`}>{committed.reviewer}</td></tr>
                    <tr><td>Recorded at</td><td className="mono small" data-testid={`review-at-${runId}`}>{committed.at}</td></tr>
                    <tr><td>Note</td><td className="small">{committed.note || <span className="muted">—</span>}</td></tr>
                    <tr><td>Fingerprint</td><td className="mono small">{committed.fingerprint}</td></tr>
                  </tbody>
                </table>
              )
            )}
            {d && status === 'PENDING' && (
              <div style={{ marginTop: 8 }}>
                {d.admissible ? (
                  <div className="warn">
                    <strong>ADMISSIBLE — not yet committed.</strong> Record for the human to commit:{' '}
                    <span className="mono">{d.record!.action}</span> on <span className="mono">{d.record!.runId}</span>{' '}
                    by <strong>{d.record!.reviewer}</strong> at <span className="mono">{d.record!.at}</span>.
                    {d.record!.note && <> Note: “{d.record!.note}”.</>}
                    <div className="small muted" style={{ marginTop: 4 }}>
                      The run stays PENDING in this build — no approval is written automatically.
                      Press <strong>Commit review</strong> to record it.
                    </div>
                  </div>
                ) : (
                  <div className="warn" style={{ borderColor: 'var(--status-critical)' }}>
                    <strong>REFUSED</strong>
                    <ul className="tight">{d.problems.map((p) => <li key={p}>{p}</li>)}</ul>
                  </div>
                )}
              </div>
            )}
            {probs.length > 0 && (
              <div className="warn" style={{ borderColor: 'var(--status-critical)', marginTop: 8 }}>
                <strong>REVIEW REFUSED</strong>
                <ul className="tight">{probs.map((p) => <li key={p}>{p}</li>)}</ul>
              </div>
            )}
          </div>
        )
      })}
      <p className="small muted" style={{ marginTop: 12 }}>
        A committed review is persisted in this browser and is immutable for this experiment version.
      </p>
    </Card>
  )
}
