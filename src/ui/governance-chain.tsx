/**
 * Governance chain stages 3–6: intervention, comparison capture, calculated
 * result, final human review.
 *
 * Each card is gated by the stage before it. Nothing here invents a value:
 *   - the intervention is a record a NAMED HUMAN asserts, citing evidence that
 *     already exists in the catalogue;
 *   - the comparison capture has NO value-entry surface at all — the app
 *     performs no measurement, so a capture must come from a measured run;
 *   - the result is DERIVED from the registered thresholds, the approved
 *     baseline and the captured comparison. It is never typed and never editable.
 */
import { useState } from 'react'
import { Card, Warn, formatMeasured } from './components'
import { PRE_REGISTRATION } from '../data/pre-registration'
import { BASELINE_FINGERPRINT } from '../data/governance'
import { baselineImpactValues, KNOWN_EVIDENCE_IDS } from '../data/governance-storage'
import {
  effectiveState, recordFinalReview, recordIntervention,
} from '../core/governance-store'
import { GATE_ACTION } from '../core/governance'
import { CONFIGURED_REVIEWERS } from '../core/baseline-ops'
import { commitGovernanceLedger, useGovernanceLedger } from './governance-state'

const input = {
  padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--plane)', color: 'var(--text-primary)', font: 'inherit', fontSize: 12,
} as const

function Pill({ text, color }: { text: string; color: string }) {
  return <span className="chip"><span className="dot" style={{ background: color }} />{text}</span>
}

const tone = (s: string) =>
  s === 'RECORDED' || s === 'AVAILABLE' ? 'var(--status-good)'
    : s === 'AWAITING HUMAN RECORD' || s === 'AWAITING MEASUREMENT' ? 'var(--status-warning)'
    : 'var(--status-critical)'

/** The reference run a comparison is measured against. */
function referenceRunId(approved: string[], recorded: string | null): string | null {
  return recorded ?? approved[0] ?? null
}

export function GovernanceChain() {
  const ledger = useGovernanceLedger()
  const approvedFirst = effectiveState(ledger, PRE_REGISTRATION)
  const refRun = referenceRunId(approvedFirst.state.approvedBaselineRuns, ledger.intervention?.baselineRunId ?? null)
  const baselineValues = refRun ? baselineImpactValues(refRun) : {}
  const eff = effectiveState(ledger, PRE_REGISTRATION, baselineValues)
  const { state, gate } = eff

  const [desc, setDesc] = useState('')
  const [runId, setRunId] = useState('')
  const [startedAt, setStartedAt] = useState('')
  const [recordedBy, setRecordedBy] = useState('')
  const [evidence, setEvidence] = useState('')
  const [methodUnchanged, setMethodUnchanged] = useState(false)
  const [ivProblems, setIvProblems] = useState<string[]>([])

  const [reviewer, setReviewer] = useState('')
  const [note, setNote] = useState('')
  const [reviewEvidence, setReviewEvidence] = useState('')
  const [frProblems, setFrProblems] = useState<string[]>([])

  const interventionOpen = state.thresholdsComplete && state.approvedBaselineRuns.length > 0
  const ivStatus = state.intervention ? 'RECORDED' : interventionOpen ? 'AWAITING HUMAN RECORD' : 'BLOCKED'
  const cmpStatus = state.comparison ? 'RECORDED' : state.intervention ? 'AWAITING MEASUREMENT' : 'BLOCKED'
  const resStatus = state.calculation ? 'AVAILABLE' : 'NOT AVAILABLE'
  const frStatus = state.finalReview ? 'RECORDED' : state.calculation ? 'AWAITING HUMAN RECORD' : 'BLOCKED'

  const submitIntervention = () => {
    const r = recordIntervention(
      ledger,
      {
        description: desc,
        baselineRunId: runId || (state.approvedBaselineRuns[0] ?? ''),
        startedAt,
        endedAt: null,
        recordedBy,
        methodFingerprint: methodUnchanged ? BASELINE_FINGERPRINT : '',
        heldConstant: ['measurement method', 'standardised sizes', 'pool and token contract'],
        evidenceIds: evidence.split(',').map((e) => e.trim()).filter(Boolean),
      },
      {
        thresholdsComplete: state.thresholdsComplete,
        baselineFingerprint: BASELINE_FINGERPRINT,
        knownEvidenceIds: KNOWN_EVIDENCE_IDS,
      },
      new Date().toISOString(),
    )
    setIvProblems(r.problems)
    if (r.problems.length === 0) commitGovernanceLedger(r.ledger)
  }

  const submitReview = () => {
    const r = recordFinalReview(
      ledger,
      {
        reviewer,
        at: new Date().toISOString(),
        result: state.calculation?.provisionalResult ?? null,
        note,
        evidenceIds: reviewEvidence.split(',').map((e) => e.trim()).filter(Boolean),
      },
      state.calculation,
      { knownEvidenceIds: KNOWN_EVIDENCE_IDS, configuredReviewers: CONFIGURED_REVIEWERS },
    )
    setFrProblems(r.problems)
    if (r.problems.length === 0) commitGovernanceLedger(r.ledger)
  }

  return (
    <>
      <Card title="Governance chain — current gate"
        hint="Derived from the persisted governance records. Restored on load; never assumed.">
        <div className="row" style={{ gap: 8 }}>
          <Pill text={gate.replace(/_/g, ' ')} color="var(--status-warning)" />
          <span className="small" data-testid="gate-action">{GATE_ACTION[gate]}</span>
        </div>
        {eff.tampered.length > 0 && (
          <Warn><strong>INTEGRITY FAILURE.</strong> {eff.tampered.join(', ')} no longer match their stored
            fingerprint and are excluded from every gate. Persisted state is never accepted as proof of governance.</Warn>
        )}
      </Card>

      <Card title="Controlled intervention"
        hint="A record of something a named human asserts actually happened. The app never records one by itself.">
        <div className="row" style={{ marginBottom: 8 }}>
          <span data-testid="intervention-status"><Pill text={ivStatus} color={tone(ivStatus)} /></span>
        </div>
        {!interventionOpen && (
          <Warn><strong>BLOCKED.</strong> {state.thresholdsComplete
            ? 'An approved baseline run is required before an intervention.'
            : 'All four thresholds must be registered by a named human before an intervention.'}{' '}
            Restored or locally edited state cannot change this.</Warn>
        )}
        {state.intervention ? (
          <div className="scroll">
            <table><tbody>
              <tr><td style={{ width: '32%' }}>Description</td><td className="small">{state.intervention.description}</td></tr>
              <tr><td>Baseline reference</td><td className="mono small">{state.intervention.baselineRunId}</td></tr>
              <tr><td>Started at</td><td className="mono small">{state.intervention.startedAt}</td></tr>
              <tr><td>Recorded by</td><td>{state.intervention.recordedBy}</td></tr>
              <tr><td>Method fingerprint</td><td className="mono small">{state.intervention.methodFingerprint}</td></tr>
              <tr><td>Evidence</td><td className="mono small">{state.intervention.evidenceIds.join(', ')}</td></tr>
            </tbody></table>
          </div>
        ) : interventionOpen && (
          <>
            <div className="row" style={{ marginTop: 8 }}>
              <input style={{ ...input, width: 300 }} placeholder="what was actually done"
                aria-label="intervention description" value={desc} onChange={(e) => setDesc(e.target.value)} />
              <select style={{ ...input, width: 150 }} aria-label="baseline reference run"
                value={runId} onChange={(e) => setRunId(e.target.value)}>
                <option value="">baseline run…</option>
                {state.approvedBaselineRuns.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input style={{ ...input, width: 200 }} placeholder="started at (ISO 8601)"
                aria-label="intervention start" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <input style={{ ...input, width: 200 }} placeholder="recorded by (full name)"
                aria-label="intervention recorded by" value={recordedBy} onChange={(e) => setRecordedBy(e.target.value)} />
              <input style={{ ...input, width: 220 }} placeholder="evidence IDs, comma separated"
                aria-label="intervention evidence" value={evidence} onChange={(e) => setEvidence(e.target.value)} />
              <label className="small" style={{ display: 'inline-flex', gap: 6 }}>
                <input type="checkbox" aria-label="method unchanged" checked={methodUnchanged}
                  onChange={(e) => setMethodUnchanged(e.target.checked)} />
                <span>I confirm the measurement method is unchanged from the baseline.</span>
              </label>
              <button className="toggle" onClick={submitIntervention} data-testid="record-intervention">
                Record intervention
              </button>
            </div>
            <p className="small muted" style={{ marginTop: 6 }}>
              Recording asserts that a real, controlled intervention took place. Evidence references must already
              exist in the evidence catalogue.
            </p>
          </>
        )}
        {ivProblems.length > 0 && (
          <div className="warn" style={{ borderColor: 'var(--status-critical)', marginTop: 8 }}>
            <strong>REFUSED</strong>
            <ul className="tight">{ivProblems.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        )}
      </Card>

      <Card title="Comparison capture"
        hint="A post-intervention measurement using the identical method fingerprint.">
        <div className="row" style={{ marginBottom: 8 }}>
          <span data-testid="comparison-status"><Pill text={cmpStatus} color={tone(cmpStatus)} /></span>
        </div>
        {state.comparison ? (
          <div className="scroll">
            <table>
              <thead><tr><th>Size</th><th>Measured impact</th><th>Evidence</th></tr></thead>
              <tbody>
                {state.comparison.readings.map((r) => (
                  <tr key={r.standardisedSize}>
                    <td className="small">{r.standardisedSize}</td>
                    <td>{r.value === null
                      ? <span className="muted"><strong>{r.notExecutable ? 'NOT EXECUTABLE' : 'DATA UNAVAILABLE'}</strong></span>
                      : <strong>{formatMeasured(r.value)}%</strong>}</td>
                    <td className="mono small">{r.evidenceId ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="na-box">
            <b>NO COMPARISON CAPTURE</b>
            {state.intervention
              ? 'An intervention is recorded, but no post-intervention measurement exists yet.'
              : 'No intervention has been recorded, so there is nothing to compare against.'}
          </div>
        )}
        <Warn>
          <strong>No measurement can be typed here.</strong> This application performs no live measurement:
          a comparison capture is only accepted from a measured run whose every stated value carries an
          existing evidence ID. There is no field for entering an actual result.
        </Warn>
      </Card>

      <Card title="Calculated result"
        hint="Derived from the registered thresholds, the approved baseline and the captured comparison.">
        <div className="row" style={{ marginBottom: 8 }}>
          <span data-testid="result-status"><Pill text={resStatus} color={resStatus === 'AVAILABLE' ? 'var(--status-good)' : 'var(--text-muted)'} /></span>
        </div>
        {state.calculation ? (
          <>
            <div className="scroll">
              <table>
                <thead><tr><th>Size</th><th>Threshold</th><th>Baseline</th><th>Comparison</th><th>Δ magnitude</th><th>Outcome</th></tr></thead>
                <tbody>
                  {eff.perKpi.map((k) => (
                    <tr key={k.standardisedSize}>
                      <td className="small">{k.standardisedSize}</td>
                      <td>{k.threshold === null ? <span className="muted">—</span> : <strong>{k.threshold}%</strong>}</td>
                      <td>{k.baselineValue === null ? <span className="muted">—</span> : formatMeasured(k.baselineValue)}</td>
                      <td>{k.comparisonValue === null ? <span className="muted">—</span> : formatMeasured(k.comparisonValue)}</td>
                      <td>{k.deltaMagnitude === null ? <span className="muted">—</span> : formatMeasured(k.deltaMagnitude)}</td>
                      <td><strong>{k.outcome.replace(/_/g, ' ')}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small"><strong>Provisional result:</strong>{' '}
              <span className="mono" data-testid="provisional-result">{state.calculation.provisionalResult}</span>{' '}
              <span className="muted">— provisional only. Not a finding until a named human records the final review.</span></p>
          </>
        ) : (
          <div className="na-box">
            <b>NOT AVAILABLE</b>
            A result requires a pre-registered threshold, an approved baseline and a captured comparison.
            No result is produced from any other source, and none can be entered by hand.
          </div>
        )}
      </Card>

      <Card title="Final human review" hint="A calculated result becomes a finding only when a named human records it.">
        <div className="row" style={{ marginBottom: 8 }}>
          <span data-testid="final-review-status"><Pill text={frStatus} color={tone(frStatus)} /></span>
        </div>
        {state.finalReview ? (
          <div className="scroll">
            <table><tbody>
              <tr><td style={{ width: '32%' }}>Reviewer</td><td>{state.finalReview.reviewer}</td></tr>
              <tr><td>Reviewed at</td><td className="mono small">{state.finalReview.at}</td></tr>
              <tr><td>Recorded result</td><td><strong>{state.finalReview.result}</strong></td></tr>
              <tr><td>Note</td><td className="small">{state.finalReview.note}</td></tr>
              <tr><td>Evidence</td><td className="mono small">{state.finalReview.evidenceIds.join(', ')}</td></tr>
            </tbody></table>
          </div>
        ) : !state.calculation ? (
          <Warn><strong>BLOCKED.</strong> There is no calculated result to review.</Warn>
        ) : (
          <>
            <div className="row" style={{ marginTop: 8 }}>
              <input style={{ ...input, width: 200 }} placeholder="reviewer (full name)"
                aria-label="final reviewer" value={reviewer} onChange={(e) => setReviewer(e.target.value)} />
              <input style={{ ...input, width: 300 }} placeholder="review note"
                aria-label="final review note" value={note} onChange={(e) => setNote(e.target.value)} />
              <input style={{ ...input, width: 200 }} placeholder="evidence IDs, comma separated"
                aria-label="final review evidence" value={reviewEvidence}
                onChange={(e) => setReviewEvidence(e.target.value)} />
              <button className="toggle" onClick={submitReview} data-testid="record-final-review">
                Record final review
              </button>
            </div>
            <p className="small muted" style={{ marginTop: 6 }}>
              The reviewer records the calculated result; the result itself is derived and cannot be edited.
            </p>
          </>
        )}
        {frProblems.length > 0 && (
          <div className="warn" style={{ borderColor: 'var(--status-critical)', marginTop: 8 }}>
            <strong>REFUSED</strong>
            <ul className="tight">{frProblems.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        )}
      </Card>
    </>
  )
}
