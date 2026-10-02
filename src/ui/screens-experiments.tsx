import { useState } from 'react'
import { Card, formatMeasured, Provenance, Warn } from './components'
import { EXPERIMENT_RUNS } from '../data/experiment-runs'
import { EXPERIMENT_HISTORY } from '../data/baseline-captures'
import { latestMeasurement, reviewState, STAGE_ORDER, stageIndex, type ExperimentRun, type KpiReading } from '../core/experiment-runs'
import { OPPORTUNITY_BY_ID } from '../data/opportunities'
import { EVIDENCE_BY_ID } from '../data/evidence'

const STAGE_LABEL: Record<string, string> = {
  PLANNED: 'PLANNED',
  BASELINE_CAPTURE: 'BASELINE CAPTURE',
  MEASUREMENT: 'MEASUREMENT',
  REVIEW: 'REVIEW',
  RESULT: 'RESULT',
}

function Pill({ text, color }: { text: string; color: string }) {
  return <span className="chip"><span className="dot" style={{ background: color }} />{text}</span>
}

function StageTrack({ stage }: { stage: ExperimentRun['stage'] }) {
  const at = stageIndex(stage)
  return (
    <div className="row" style={{ gap: 6 }}>
      {STAGE_ORDER.map((s, i) => (
        <span key={s} className="chip"
          style={i === at
            ? { fontWeight: 700, color: 'var(--text-primary)', borderColor: 'var(--series-1)' }
            : i < at ? { opacity: 0.85 } : { opacity: 0.45 }}>
          <span className="dot" style={{ background: i <= at ? 'var(--series-1)' : 'var(--text-muted)' }} />
          {STAGE_LABEL[s]}
        </span>
      ))}
    </div>
  )
}

/** A KPI reading with its provenance; never a fabricated number. */
function ReadingRow({ r }: { r: KpiReading }) {
  const ev = r.measure.evidenceId ? EVIDENCE_BY_ID.get(r.measure.evidenceId) : undefined
  const unavailable = r.measure.value === null
  return (
    <tr>
      <td><strong className="small">{r.kpi}</strong><div className="small muted">{r.dimension}</div></td>
      <td>
        {unavailable
          ? <span className="muted"><strong>{r.notExecutable ? 'NOT EXECUTABLE' : 'DATA UNAVAILABLE'}</strong></span>
          : <strong>{typeof r.measure.value === 'number' ? formatMeasured(r.measure.value) : r.measure.value} <span className="muted">{r.measure.unit}</span></strong>}
        <div className="row" style={{ gap: 6, marginTop: 4 }}>
          {r.modelled && <Pill text="MODELLED" color="var(--status-warning)" />}
          {r.provisional && <Pill text="PROVISIONAL" color="var(--status-warning)" />}
          {r.notExecutable && <Pill text="EXCEEDS POOL INVENTORY" color="var(--status-critical)" />}
        </div>
        <div className="small muted" style={{ marginTop: 4 }}>{r.measure.note}</div>
      </td>
      <td className="small mono" style={{ whiteSpace: 'nowrap' }}>
        {r.measure.evidenceId ?? '—'}
        {r.measure.observationTime && <div className="muted">{r.measure.observationTime}</div>}
        {ev && <div className="muted">{ev.methodology}</div>}
      </td>
    </tr>
  )
}

// ═══════════════════════════════════════════ Experiment Execution (list)

export function ExperimentExecution({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <>
      <header>
        <h2>Experiment Execution</h2>
        <p className="sub">Lifecycle: PLANNED → BASELINE CAPTURE → MEASUREMENT → REVIEW → RESULT. A result requires measurement data and a named human reviewer.</p>
      </header>

      <Warn>
        <strong>No experiment has a result.</strong> EXP-001 has a real baseline measurement from live pool state,
        but no named human has reviewed it — and because no intervention has occurred, there is nothing to compare
        against yet. This measures market structure; it is not a price forecast and asserts no market outcome.
      </Warn>

      <Card title="Experiments">
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Experiment</th><th>Stage</th><th>Opportunity</th><th>Primary KPI</th>
                <th>Baseline</th><th>Latest measurement</th><th>Evidence</th><th>Human review</th>
              </tr>
            </thead>
            <tbody>
              {EXPERIMENT_RUNS.map((e) => {
                const last = latestMeasurement(e)
                const opp = OPPORTUNITY_BY_ID.get(e.opportunityId)
                return (
                  <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(e.id)}>
                    <td><strong className="small">{e.id}</strong><div className="small">{e.title}</div></td>
                    <td><Pill text={STAGE_LABEL[e.stage]!} color={e.stage === 'PLANNED' ? 'var(--text-muted)' : 'var(--series-1)'} /></td>
                    <td className="small muted">{e.opportunityId}<div>{opp?.category}</div></td>
                    <td className="small">{e.primaryKpi}</td>
                    <td className="small">{e.baseline
                      ? <>captured <span className="mono">{e.baseline.capturedAt.slice(0, 10)}</span></>
                      : <span className="muted">not captured</span>}</td>
                    <td className="small">{last
                      ? <><span className="mono">{last.runId}</span>{last.isBaselineRun && <div className="muted">baseline run</div>}</>
                      : <span className="muted">none</span>}</td>
                    <td className="small mono">{last ? `${last.evidenceIds.length} refs` : '—'}</td>
                    <td><Pill text={reviewState(e)}
                      color={e.result ? 'var(--status-good)' : last ? 'var(--status-warning)' : 'var(--text-muted)'} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Provenance
          period="baseline at Polygon block 94,711,694 · 2026-09-30T12:51:21Z"
          source="Polygon RPC — direct contract reads (slot0, liquidity, fee, balanceOf)"
          methodology="contract_call for state; derived single-active-range V3 math for impact and depth"
          retrievedAt="2026-09-30"
          limitations={[
            'impact figures are model outputs, not executed trades',
            'May 2026 pool TVL remains DATA UNAVAILABLE and is not substituted',
            'no intervention has occurred — no result can be drawn',
          ]}
        />
      </Card>
    </>
  )
}

// ═══════════════════════════════════════════ Experiment Detail

export function ExperimentDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const e = EXPERIMENT_RUNS.find((x) => x.id === id)
  const [runIdx, setRunIdx] = useState(0)
  if (!e) return <p>Unknown experiment.</p>
  const run = e.measurements[runIdx] ?? null

  return (
    <>
      <header>
        <div className="row"><button className="toggle" onClick={onBack}>← All experiments</button></div>
        <h2 style={{ marginTop: 10 }}>{e.id} — {e.title}</h2>
        <p className="sub">{e.opportunityId} · {OPPORTUNITY_BY_ID.get(e.opportunityId)?.category}</p>
      </header>

      <div style={{ marginBottom: 14 }}><StageTrack stage={e.stage} /></div>

      <Card title="Objective">
        <p className="small"><strong>{e.primaryKpi}</strong></p>
        <p className="small">
          Establish a current, reproducible baseline for this KPI that can be monitored going forward.
          This does <strong>not</strong> reconstruct May 2026 historical TVL — that figure was never measured
          and is not recoverable, and current readings are never substituted for it.
        </p>
      </Card>

      <Card title="1. Why this experiment exists">
        <p className="small">{e.whyItExists}</p>
        <p className="small"><strong>Mechanism tested:</strong> {e.mechanismTested}</p>
      </Card>

      <Card title="2. Baseline"
        hint={e.baseline ? `Captured ${e.baseline.capturedAt} · block ${e.baseline.blockNumber?.toLocaleString()}` : undefined}>
        {e.baseline ? (
          <>
            <p className="small"><strong>Observation period:</strong> {e.baseline.observationPeriod}</p>
            <p className="small"><strong>Source:</strong> {e.baseline.source}</p>
            <p className="small"><strong>Methodology:</strong> {e.baseline.methodology}</p>
            <div className="scroll">
              <table>
                <thead><tr><th>KPI</th><th>Value</th><th>Provenance</th></tr></thead>
                <tbody>{e.baseline.readings.map((rr, i) => <ReadingRow key={i} r={rr} />)}</tbody>
              </table>
            </div>
            <p className="small muted">{e.baseline.provenanceNote}</p>
          </>
        ) : (
          <div className="na-box">
            <b>NO BASELINE CAPTURED</b>
            This experiment is at stage PLANNED. No reading exists and none is invented.
          </div>
        )}
      </Card>

      <Card title="3. Procedure">
        <ol className="tight">{e.procedure.map((p) => <li key={p} style={{ fontSize: 12, margin: '3px 0' }}>{p}</li>)}</ol>
      </Card>

      <Card title="4. Measurement" hint={run ? `${e.measurements.length} run(s) recorded` : undefined}>
        {run ? (
          <>
            {e.measurements.length > 1 && (
              <div className="row" style={{ marginBottom: 8 }}>
                {e.measurements.map((mr, i) => (
                  <button key={mr.runId} className="toggle"
                    style={i === runIdx ? { fontWeight: 600, color: 'var(--text-primary)' } : undefined}
                    onClick={() => setRunIdx(i)}>{mr.runId}</button>
                ))}
              </div>
            )}
            <p className="small">
              <strong>Run:</strong> <span className="mono">{run.runId}</span> ·{' '}
              <strong>Timestamp:</strong> <span className="mono">{run.timestamp}</span> ·{' '}
              <strong>Block:</strong> <span className="mono">{run.blockNumber?.toLocaleString()}</span>
            </p>
            {run.isBaselineRun && (
              <Warn><strong>Baseline run.</strong> This establishes the reference point. No intervention has
                occurred, so this run cannot by itself support or reject the hypothesis.</Warn>
            )}
            <div className="scroll">
              <table>
                <thead><tr><th>KPI</th><th>Measured value</th><th>Provenance</th></tr></thead>
                <tbody>{run.readings.map((rr, i) => <ReadingRow key={i} r={rr} />)}</tbody>
              </table>
            </div>
            <p className="small muted">{run.note}</p>
            <p className="small"><strong>Reviewer:</strong> {run.reviewer ?? <span className="muted">none — awaiting a named human reviewer</span>}</p>
          </>
        ) : (
          <div className="na-box">
            <b>NO MEASUREMENT RECORDED</b>
            Nothing has been measured for this experiment yet.
          </div>
        )}
      </Card>

      <Card title="KPI Results" hint="Primary KPI across all captured runs. No result is implied by these values.">
        {e.measurements.length === 0 ? (
          <div className="na-box"><b>NO KPI RESULTS</b>Nothing has been measured for this experiment yet.</div>
        ) : (
          <div className="scroll">
            <table>
              <thead><tr><th>Run</th><th>Captured</th><th>Primary KPI</th><th>Method fingerprint</th></tr></thead>
              <tbody>
                {EXPERIMENT_HISTORY.filter((h) => h.experimentId === e.id).map((h) => (
                  <tr key={h.runId}>
                    <td className="mono small">{h.runId}</td>
                    <td className="mono small">{h.capturedAt}<div className="muted">block {h.blockNumber?.toLocaleString()}</div></td>
                    <td className="small"><strong>{h.primaryKpiSummary}</strong><div className="muted">{h.notes}</div></td>
                    <td className="mono small" style={{ maxWidth: 220 }}>{h.methodFingerprint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted" style={{ marginTop: 8 }}>
          Runs are comparable only when the method fingerprint matches. A changed fingerprint means the runs
          measure different things and must not be compared.
        </p>
      </Card>

      <Card title="5. Evidence">
        {run ? (
          <div className="scroll">
            <table>
              <thead><tr><th>Evidence ID</th><th>Metric</th><th>Value</th><th>Method</th><th>Observed</th></tr></thead>
              <tbody>
                {run.evidenceIds.map((eid) => {
                  const ob = EVIDENCE_BY_ID.get(eid)
                  return (
                    <tr key={eid}>
                      <td className="mono">{eid}</td>
                      <td className="small">{ob?.metric ?? '—'}</td>
                      <td className="small">{ob?.value === null
                        ? <span className="muted">DATA UNAVAILABLE</span>
                        : `${ob?.value} ${ob?.unit ?? ''}`}</td>
                      <td className="small muted">{ob?.methodology}</td>
                      <td className="small mono">{ob?.observationTime}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="small muted">No evidence linked — nothing measured yet.</p>}
      </Card>

      <Card title="6. Interpretation" hint="Criteria fixed before the run.">
        <table>
          <tbody>
            <tr><td style={{ width: '28%' }}><strong>Success criterion</strong></td>
              <td className="small">
                {e.successCriterion.includes('PRE-REGISTRATION REQUIRED') && (
                  <div style={{ marginBottom: 6 }}>
                    <span className="chip"><span className="dot" style={{ background: 'var(--status-critical)' }} />PRE-REGISTRATION REQUIRED</span>
                  </div>
                )}
                {e.successCriterion}
              </td></tr>
            <tr><td><strong>Falsification criterion</strong></td><td className="small">{e.falsificationCriterion}</td></tr>
            <tr>
              <td><strong>Result</strong></td>
              <td>{e.result === null
                ? <span className="muted"><strong>NO RESULT</strong> — a result requires measurement data AND a named human reviewer. Neither an automated process nor this application may record one.</span>
                : <strong>{e.result}</strong>}</td>
            </tr>
            <tr><td><strong>Recorded by</strong></td>
              <td className="small">{e.resultRecordedBy ?? <span className="muted">— no named reviewer</span>}</td></tr>
            <tr><td><strong>Review state</strong></td><td className="small">{reviewState(e)}</td></tr>
          </tbody>
        </table>
      </Card>

      <Card title="7. Limitations">
        <ul className="tight">{e.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
      </Card>

      <Card title="8. Next action"><p className="small">{e.nextAction}</p></Card>

      <Provenance
        period={e.baseline?.observationPeriod ?? 'not captured'}
        source={e.dataSources.join(' · ')}
        methodology={e.baseline?.methodology ?? 'not captured'}
        retrievedAt="2026-09-30"
        limitations={e.limitations}
      />
    </>
  )
}
