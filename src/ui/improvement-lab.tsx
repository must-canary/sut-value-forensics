/**
 * SUT Value Improvement Lab — additive prototype screen.
 *
 * It reuses the existing live market sync (evidence + traceability), the frozen
 * research anchors and the existing governance state. It collects no data, owns
 * no gates, approves nothing and executes nothing.
 */
import { Card, Tile, Warn, formatMeasured } from './components'
import {
  decisionPanel, evidenceSteps, experimentView, EXECUTION_CHAIN, identifiedGaps, LAB_PURPOSE, LAB_TITLE,
  labOpportunities, TOP100_CONTEXT, WEEK2_SUMMARY, type Gap, type LabStatus,
} from '../core/improvement-lab'
import { allMetricEvidence, evidenceHeader, formatUtc } from '../core/live-market-sync'
import { latestRun } from '../core/live-market-store'
import { effectiveState } from '../core/governance-store'
import { LAYER_LABELS } from '../core/daily-assessment'
import { baselineImpacts, historicalAnchors, labAnchors } from '../data/current-state'
import { PRE_REGISTRATION } from '../data/pre-registration'
import { PROPOSED_THRESHOLDS } from '../data/proposed-thresholds'
import { BASELINE_CAPTURES, METHOD_FINGERPRINT_EXP001 } from '../data/baseline-captures'
import { useLiveLedger } from './live-state'
import { useGovernanceLedger } from './governance-state'

function Pill({ text, color }: { text: string; color: string }) {
  return <span className="chip"><span className="dot" style={{ background: color }} />{text}</span>
}

const statusTone = (s: string) =>
  s === 'SUPPORTED' || s === 'VALIDATED' || s === 'REGISTERED' || s === 'APPROVED' ? 'var(--status-good)'
    : s === 'PROPOSED' || s === 'INCONCLUSIVE' ? 'var(--status-warning)'
    : s === 'BUSINESS_REVIEW_REQUIRED' || s === 'BLOCKED_BY_BUSINESS_DECISION' ? 'var(--status-critical)'
    : 'var(--text-muted)'

const label = (s: LabStatus | string) => s.replace(/_/g, ' ')

/** The displayed-evidence subset the Lab shows from the latest live sync. */
const SECTION1_METRICS = [
  'price', 'price_change_24h_pct', 'volume_24h', 'pair_liquidity_usd', 'pair_volume_24h',
  'circulating_supply', 'total_supply', 'max_supply', 'btc_price', 'btc_change_24h_pct',
  'eth_price', 'eth_change_24h_pct', 'pair_address',
]

export function ImprovementLab() {
  const liveLedger = useLiveLedger()
  const govLedger = useGovernanceLedger()
  const gov = effectiveState(govLedger, PRE_REGISTRATION).state

  const run = latestRun(liveLedger)
  const header = run ? evidenceHeader(run) : null
  const evidence = run ? allMetricEvidence(run) : []
  const shown = evidence.filter((m) => SECTION1_METRICS.includes(m.metric))

  const baselineRunIds = [...new Set(BASELINE_CAPTURES
    .filter((c) => c.experimentId === 'EXP-001').map((c) => c.runId))].sort()
  const gaps = identifiedGaps({
    run,
    anchors: [...historicalAnchors(), ...labAnchors()],
    baselineRunIds,
  })
  const opportunities = labOpportunities(gaps, gov)
  const exp = experimentView({
    gov,
    baselineKpis: baselineImpacts(),
    proposedThresholds: PROPOSED_THRESHOLDS.map((t) => ({ size: t.tradeSize, value: t.proposedThreshold })),
  })
  const steps = evidenceSteps(gov, METHOD_FINGERPRINT_EXP001)
  const decision = decisionPanel(gov)
  const gapById = (id: Gap['id']) => gaps.find((g) => g.id === id)!

  return (
    <>
      <header>
        <h2>Value Improvement Lab</h2>
        <p className="sub">
          <strong data-testid="lab-title">{LAB_TITLE}</strong> — {LAB_PURPOSE}
        </p>
      </header>

      <Warn>
        <strong>Prototype — decision support, not a decision engine.</strong> It reads the existing live market
        sync, the frozen research and the live governance state. It approves nothing, executes nothing and
        produces no measured result. Every business decision below is marked pending.
      </Warn>

      <Card title="Execution chain" hint="How evidence becomes a business decision in this project.">
        <ol className="tight" data-testid="execution-chain">
          {EXECUTION_CHAIN.map((c) => <li key={c} className="small">{c}</li>)}
        </ol>
      </Card>

      {/* ───────────────── 1. CURRENT EVIDENCE */}
      <Card title={`1 · CURRENT EVIDENCE — ${LAYER_LABELS.current}`}
        hint="Read from the existing Live Market Sync. No separate collection mechanism exists in this lab.">
        {run && header ? (
          <>
            <div className="tiles" style={{ marginBottom: 12 }}>
              <Tile label="Sync ID" value={header.syncId} meta="existing live sync" />
              <Tile label="Captured at" value={formatUtc(header.capturedAt)} meta="as stored, UTC" />
              <Tile label="Run status" value={header.status} meta={`${header.sourcesOk}/${header.sourcesTotal} sources`} />
              <Tile label="Evidence integrity" value={header.integrity} meta="fingerprint re-checked on load" />
            </div>
            <div className="scroll">
              <table>
                <thead>
                  <tr><th>Metric</th><th>Value</th><th>Source</th><th>Identity</th><th>Contract / chain</th>
                    <th>Venue / pair</th><th>Observed at (UTC)</th><th>Retrieved at (UTC)</th><th>Evidence hash</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {shown.map((m) => (
                    <tr key={m.metric} data-testid={`lab-evidence-${m.metric}`}>
                      <td className="small"><strong>{m.label}</strong></td>
                      <td>{m.value === null ? (
                        <>
                          <strong className="muted">DATA UNAVAILABLE</strong>
                          <div className="small muted">Reason: {m.reason ?? 'no reason recorded'}</div>
                        </>
                      ) : (
                        <>
                          <strong>{typeof m.value === 'number' ? formatMeasured(m.value) : m.value}</strong>{' '}
                          <span className="muted small">{m.unit}</span>
                        </>
                      )}</td>
                      <td className="small muted">{m.source}</td>
                      <td><Pill text={label(m.identityStatus)} color={statusTone(m.identityStatus === 'CONTRACT_VERIFIED' ? 'SUPPORTED' : m.identityStatus)} /></td>
                      <td className="mono small" style={{ wordBreak: 'break-all' }}>
                        {m.contractAddress ?? 'not applicable'}{m.chain ? ` · ${m.chain}` : ''}</td>
                      <td className="small muted">{m.venue || m.pair ? `${m.venue ?? '—'} · ${m.pair ?? '—'}` : 'not applicable'}</td>
                      <td className="mono small">{formatUtc(m.observationTimestamp)}</td>
                      <td className="mono small">{formatUtc(m.retrievalTimestamp)}</td>
                      <td className="mono small" style={{ wordBreak: 'break-all' }}>
                        {m.payloadHash ?? <span className="muted">no hash</span>}</td>
                      <td><Pill text={label(m.status)} color={statusTone(m.status)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small muted">
              Methodology and endpoint for every row are preserved with the run and are shown in full on the
              Daily Market Sync screen. Timestamps are the stored values, in UTC, never regenerated.
            </p>
          </>
        ) : (
          <div className="na-box" data-testid="lab-no-evidence">
            <b>DATA UNAVAILABLE</b>
            No live market sync is stored in this browser. Run one from <strong>Daily Market Sync</strong> —
            this lab never collects or assumes market data of its own.
          </div>
        )}
      </Card>

      {/* ───────────────── 2. IDENTIFIED GAPS */}
      <Card title="2 · IDENTIFIED GAPS" hint="Derived from existing evidence only. Nothing is fabricated.">
        {gaps.map((g) => (
          <div key={g.id} data-testid={`gap-${g.id}`}
            style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10 }}>
            <div className="row">
              <strong className="small">{g.id} — {g.title}</strong>
              <Pill text={label(g.status)} color={statusTone(g.status)} />
            </div>
            <p className="small muted" style={{ marginTop: 4 }}>{g.evidenceBasis}</p>
            <div className="row" style={{ gap: 24, alignItems: 'flex-start' }}>
              <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                <p className="small"><strong>Known</strong></p>
                <ul className="tight">{g.known.map((k) => <li key={k} className="small muted">{k}</li>)}</ul>
              </div>
              <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                <p className="small"><strong>Unknown</strong></p>
                <ul className="tight">{g.unknown.map((k) => <li key={k} className="small muted">{k}</li>)}</ul>
              </div>
            </div>
            <p className="small muted">References: <span className="mono">{g.references.join(', ') || 'none'}</span></p>
          </div>
        ))}
      </Card>

      {/* ───────────────── 3. OPPORTUNITIES */}
      <Card title="3 · PRODUCT / QA OPPORTUNITIES" hint="Each opportunity states what is known, what is not, and what evidence a decision needs.">
        <div className="scroll">
          <table>
            <thead>
              <tr><th>ID</th><th>Opportunity</th><th>Related gap</th><th>Proposed investigation</th>
                <th>Evidence required</th><th>Status</th></tr>
            </thead>
            <tbody>
              {opportunities.map((o) => (
                <tr key={o.id} data-testid={`opportunity-${o.id}`}>
                  <td className="mono small"><strong>{o.id}</strong></td>
                  <td className="small"><strong>{o.title}</strong>
                    <div className="muted">Known: {o.known.length} · Unknown: {o.unknown.length}</div></td>
                  <td className="mono small">{o.relatedGapId}
                    <div className="muted small">{gapById(o.relatedGapId).title}</div></td>
                  <td className="small muted">{o.proposedInvestigation}</td>
                  <td className="small muted">
                    <ul className="tight">{o.evidenceRequired.map((e) => <li key={e}>{e}</li>)}</ul>
                  </td>
                  <td><Pill text={label(o.status)} color={statusTone(o.status)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ───────────────── 4. EXPERIMENT BUILDER */}
      <Card title="4 · PROPOSED EXPERIMENT" hint={exp.title}>
        <p className="small"><strong data-testid="baseline-label">{exp.baselineLabel}</strong></p>
        <div className="scroll">
          <table>
            <thead><tr><th>Standardised size</th><th>Observed baseline</th><th>Magnitude</th><th>Run</th><th>Evidence</th></tr></thead>
            <tbody>
              {exp.baseline.map((b) => (
                <tr key={b.size} data-testid={`lab-baseline-${b.size}`}>
                  <td className="small"><strong>{b.size}</strong></td>
                  <td>{b.value === null ? <span className="muted">DATA UNAVAILABLE</span>
                    : <strong>{formatMeasured(b.value)}%</strong>}</td>
                  <td className="small">{b.magnitudeRounded}</td>
                  <td className="mono small">{b.runId}</td>
                  <td className="mono small">{b.evidenceId ?? '—'}</td>
                </tr>
              ))}
              <tr data-testid="lab-baseline-100k">
                <td className="small"><strong>{exp.notExecutable.size}</strong></td>
                <td colSpan={4} className="small muted"><strong>{exp.notExecutable.status}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="small" style={{ marginTop: 12 }}><strong>Proposed business thresholds</strong>{' '}
          <span className="muted">— separate from the observed baseline above.</span></p>
        <div className="scroll">
          <table>
            <thead><tr><th>Standardised size</th><th>Proposed threshold</th><th>Status</th></tr></thead>
            <tbody>
              {exp.proposedThresholds.map((t) => (
                <tr key={t.size} data-testid={`lab-proposed-${t.size}`}>
                  <td className="small"><strong>{t.size}</strong></td>
                  <td><strong>≤ {t.proposed}%</strong></td>
                  <td><Pill text={t.status} color="var(--status-warning)" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Warn>
          These thresholds are <strong data-testid="proposed-threshold-status">{exp.proposedThresholdStatus}</strong>.
          This prototype does not register them, does not approve them and cannot execute the intervention.
        </Warn>

        <div className="scroll">
          <table>
            <tbody>
              <tr><td style={{ width: '38%' }}>Business approval</td>
                <td data-testid="exp-business-approval"><strong>{exp.businessApproval}</strong></td></tr>
              <tr><td>Baseline approval</td>
                <td data-testid="exp-baseline-approval"><strong>{exp.baselineApproval}</strong></td></tr>
              <tr><td>Intervention</td>
                <td data-testid="exp-intervention"><strong>{exp.intervention}</strong></td></tr>
              <tr><td>Post-intervention measurement</td>
                <td data-testid="exp-post-measurement"><strong>{exp.postInterventionMeasurement}</strong></td></tr>
              <tr><td>Measured result</td>
                <td data-testid="exp-measured-result"><strong>{exp.measuredResult}</strong></td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* ───────────────── 5. EVIDENCE REQUIRED */}
      <Card title="5 · EVIDENCE REQUIRED" hint="Derived from the existing governance chain — this lab owns no gate logic.">
        <div className="scroll">
          <table>
            <thead><tr><th>#</th><th>Required evidence</th><th>Current state</th><th>Satisfied</th></tr></thead>
            <tbody>
              {steps.map((s) => (
                <tr key={s.step} data-testid={`evidence-step-${s.step}`}>
                  <td className="mono small">{s.step}</td>
                  <td className="small"><strong>{s.item}</strong></td>
                  <td className="small muted">{s.state}</td>
                  <td><Pill text={s.satisfied ? 'SATISFIED' : 'REQUIRED'}
                    color={s.satisfied ? 'var(--status-good)' : 'var(--status-critical)'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ───────────────── 6. DECISION STATUS */}
      <Card title="6 · CURRENT DECISION STATUS" hint="The project progresses while a business decision is outstanding.">
        <div className="scroll">
          <table>
            <tbody>
              <tr><td style={{ width: '38%' }}>Business threshold</td>
                <td data-testid="decision-threshold"><strong>{decision.businessThreshold}</strong></td></tr>
              <tr><td>Experiment</td><td data-testid="decision-experiment"><strong>{decision.experiment}</strong></td></tr>
              <tr><td>Intervention</td><td data-testid="decision-intervention"><strong>{decision.intervention}</strong></td></tr>
              <tr><td>Measured improvement</td>
                <td data-testid="decision-measured"><strong>{decision.measuredImprovement}</strong></td></tr>
              <tr><td>Final result</td><td data-testid="decision-final"><strong>{decision.finalResult}</strong></td></tr>
            </tbody>
          </table>
        </div>
        <p className="small" style={{ marginTop: 10 }}><strong>QA continues while the decision is pending</strong></p>
        <ul className="tight" data-testid="qa-continues">
          {decision.qaCanContinue.map((q) => <li key={q} className="small muted">{q}</li>)}
        </ul>
      </Card>

      {/* ───────────────── 7. NEXT ACTION */}
      <Card title="7 · NEXT ACTION" hint="One per opportunity, with what QA has already prepared.">
        {opportunities.map((o) => (
          <div key={o.id} data-testid={`next-action-${o.id}`}
            style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10 }}>
            <div className="row">
              <strong className="small">{o.id} — {o.title}</strong>
              <Pill text={label(o.nextAction.status)} color={statusTone(o.nextAction.status)} />
            </div>
            <p className="small" style={{ marginTop: 4 }}><strong>Next action:</strong> {o.nextAction.text}</p>
            <p className="small"><strong>Prepared by QA</strong></p>
            <ul className="tight">
              {o.nextAction.preparedByQa.map((p) => <li key={p} className="small muted">{p}</li>)}
            </ul>
          </div>
        ))}
      </Card>

      {/* ───────────────── 8. TOP-100 CONTEXT */}
      <Card title="8 · Market ranking context" hint="What this lab deliberately does not do.">
        <p className="small" data-testid="top100-context">{TOP100_CONTEXT}</p>
      </Card>

      {/* ───────────────── 11. WEEK 2 PROOF */}
      <Card title="Week 2 execution summary" hint="What exists and is verifiable today.">
        <ol className="tight" data-testid="week2-summary">
          {WEEK2_SUMMARY.map((w) => <li key={w} className="small">{w}</li>)}
        </ol>
        <Warn>
          No business result is fabricated anywhere in this prototype. Business approval, the intervention and
          the measured result remain human decisions inside the existing governance chain.
        </Warn>
      </Card>
    </>
  )
}
