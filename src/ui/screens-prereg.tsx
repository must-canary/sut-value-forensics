import { useMemo, useState } from 'react'
import { Card, formatMeasured, Provenance, Tile, Warn } from './components'
import { PRE_REGISTRATION, OBSERVED_BASELINE_IMPACTS, EXPERIMENT_VERSION } from '../data/pre-registration'
import {
  assertNotDerivedFromBaseline, blockersFor, currentStage, nextRequiredAction,
  registrationSummary, STAGE_LABELS, TIMELINE_STAGES, type StageContext,
} from '../core/pre-registration'
import { BASELINE_CAPTURES, EXPERIMENT_HISTORY, REVIEWS, SPOT_COVERAGE } from '../data/baseline-captures'
import { CONFIGURED_REVIEWERS } from '../core/baseline-ops'
import { BaselineReviewHandoff, NextRequiredAction, RegistrationHandoff } from './handoff'
import { GovernanceChain } from './governance-chain'
import { getGovernanceLedger, useGovernanceLedger } from './governance-state'
import {
  approvalStatusFor, effectiveState, type GovernanceLedger,
} from '../core/governance-store'

function Pill({ text, color }: { text: string; color: string }) {
  return <span className="chip"><span className="dot" style={{ background: color }} />{text}</span>
}

const REG_COLOR: Record<string, string> = {
  REGISTERED: 'var(--status-good)',
  AWAITING_HUMAN_ENTRY: 'var(--status-critical)',
  NOT_REGISTERABLE: 'var(--text-muted)',
}

/** The live context: nothing here is assumed, everything is derived. */
export function exp001Context(ledger: GovernanceLedger = getGovernanceLedger()): StageContext {
  const eff = effectiveState(ledger, PRE_REGISTRATION)
  const reg = registrationSummary(eff.entries)
  const runs = new Set(BASELINE_CAPTURES.filter((c) => c.experimentId === 'EXP-001').map((c) => c.runId))
  const staticallyApproved = new Set(
    BASELINE_CAPTURES.filter((c) => c.experimentId === 'EXP-001' && c.reviewerStatus === 'ACCEPTED').map((c) => c.runId),
  )
  const approved = new Set([...staticallyApproved, ...eff.state.approvedBaselineRuns])
  return {
    thresholdsComplete: reg.complete,
    baselineRuns: runs.size,
    approvedBaselineRuns: approved.size,
    interventionOccurred: eff.state.intervention !== null,
    comparisonRuns: eff.state.comparison ? 1 : 0,
    resultCalculated: eff.state.calculation !== null,
    humanReviewRecorded: REVIEWS.length > 0 || eff.state.finalReview !== null,
  }
}

// ═══════════════════════════════════════════ Pre-Registration screen

export function PreRegistration() {
  const [proposed, setProposed] = useState<Record<string, string>>({})
  const ledger = useGovernanceLedger()
  const entries = effectiveState(ledger, PRE_REGISTRATION).entries
  const reg = registrationSummary(entries)
  const ctx = exp001Context(ledger)

  const derivationWarnings = useMemo(() => {
    const out: Record<string, string> = {}
    for (const [size, raw] of Object.entries(proposed)) {
      const n = Number(raw)
      if (raw === '' || Number.isNaN(n)) continue
      try {
        assertNotDerivedFromBaseline(n, OBSERVED_BASELINE_IMPACTS[size] ?? [])
      } catch (e) {
        out[size] = (e as Error).message
      }
    }
    return out
  }, [proposed])

  return (
    <>
      <header>
        <h2>Pre-Registration</h2>
        <p className="sub">{EXPERIMENT_VERSION} — success thresholds must be registered by a named human before any comparison run.</p>
      </header>

      <NextRequiredAction />

      <Warn>
        <strong>{reg.registered === 0 ? 'No threshold is registered.' : `${reg.registered} threshold(s) registered.`}</strong>{' '}
        {reg.awaiting} of {reg.total} slots are awaiting human entry.
        A threshold may <strong>not</strong> be derived from RUN-001, RUN-002 or RUN-003 — a criterion read off a
        captured baseline is a rationalisation, not a criterion. Until every slot is registered or explicitly
        not-registerable, the system refuses to accept a comparison run or calculate a result.
      </Warn>

      <div className="tiles">
        <Tile label="Threshold slots" value={reg.total} meta={ledger.activeVersion} />
        <Tile label="Registered" value={reg.registered} meta="immutable once set" />
        <Tile label="Awaiting human entry" value={reg.awaiting} meta="blocks comparison runs" />
        <Tile label="Not registerable" value={reg.notRegisterable} meta="size not executable" />
        <Tile label="Registration complete" value={reg.complete ? 'YES' : 'NO'} meta="required before intervention" />
      </div>

      <Card title="Threshold registration" hint="Every field below is required. Entry and approval are human actions.">
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Size</th><th>State</th><th>Threshold</th><th>Direction</th>
                <th>Reviewer</th><th>Registered at</th><th>Proposed value (requires human approval)</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.standardisedSize}>
                  <td><strong className="small">{e.standardisedSize}</strong>
                    <div className="small muted">{e.metric}</div></td>
                  <td><Pill text={e.state.replace(/_/g, ' ')} color={REG_COLOR[e.state]!} /></td>
                  <td>{e.successThreshold === null
                    ? <span className="muted"><strong>NOT REGISTERED</strong></span>
                    : <strong>{formatMeasured(e.successThreshold)} {e.thresholdUnit}</strong>}</td>
                  <td className="small">{e.thresholdDirection.replace(/_/g, ' ').toLowerCase()}</td>
                  <td className="small">{e.reviewerName ?? <span className="muted">— none</span>}</td>
                  <td className="mono small">{e.registrationTimestamp ?? '—'}</td>
                  <td>
                    {e.state === 'NOT_REGISTERABLE' ? (
                      <span className="small muted">Cannot be registered — size not executable.</span>
                    ) : (
                      <>
                        <input
                          type="number" step="0.01" placeholder="enter threshold %"
                          value={proposed[e.standardisedSize] ?? ''}
                          onChange={(ev) => setProposed((p) => ({ ...p, [e.standardisedSize]: ev.target.value }))}
                          style={{
                            width: 140, padding: '6px 8px', borderRadius: 6,
                            border: '1px solid var(--border)', background: 'var(--plane)',
                            color: 'var(--text-primary)', font: 'inherit', fontSize: 12,
                          }} />
                        <div className="small muted" style={{ marginTop: 4 }}>
                          Requires a named human to approve. This form does not register anything.
                        </div>
                        {derivationWarnings[e.standardisedSize] && (
                          <div className="small" style={{ color: 'var(--status-critical)', marginTop: 4 }}>
                            ⚠ {derivationWarnings[e.standardisedSize]}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small" style={{ marginTop: 10 }}><strong>Configured reviewers:</strong>{' '}
          {CONFIGURED_REVIEWERS.length === 0
            ? <span className="muted">none — a reviewer must be configured before any threshold can be registered</span>
            : CONFIGURED_REVIEWERS.join(', ')}</p>
      </Card>

      <RegistrationHandoff />

      <Card title="Registration record fields" hint="All ten are required by the workflow.">
        <div className="scroll">
          <table>
            <tbody>
              <tr><td style={{ width: '26%' }}>Experiment ID / version</td><td className="small">EXP-001 · {EXPERIMENT_VERSION}</td></tr>
              <tr><td>Metric</td><td className="small">{PRE_REGISTRATION[0]!.metric}</td></tr>
              <tr><td>Standardised sizes</td><td className="small">{PRE_REGISTRATION.map((e) => e.standardisedSize).join(' · ')}</td></tr>
              <tr><td>Baseline method</td><td className="small">{PRE_REGISTRATION[0]!.baselineMethod}</td></tr>
              <tr><td>Success threshold</td><td className="small"><strong data-testid="record-threshold">{
                reg.registered === 0 ? 'NOT REGISTERED — human entry required'
                  : entries.filter((e) => e.state === 'REGISTERED')
                    .map((e) => `${e.standardisedSize}: ${e.successThreshold}%`).join(' · ')
              }</strong></td></tr>
              <tr><td>Threshold direction</td><td className="small">lower is better (smaller absolute impact)</td></tr>
              <tr><td>Measurement window</td><td className="small">{PRE_REGISTRATION[0]!.measurementWindow}</td></tr>
              <tr><td>Comparison method</td><td className="small">{PRE_REGISTRATION[0]!.comparisonMethod}</td></tr>
              <tr><td>Reviewer name</td><td className="small" data-testid="record-reviewer">{
                entries.find((e) => e.state === 'REGISTERED')?.reviewerName
                  ?? <span className="muted">none recorded</span>}</td></tr>
              <tr><td>Registration timestamp</td><td className="small mono" data-testid="record-registered-at">{
                entries.find((e) => e.state === 'REGISTERED')?.registrationTimestamp
                  ?? <span className="muted">none recorded</span>}</td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      <ExperimentTimeline ctx={ctx} />

      <GovernanceChain />
    </>
  )
}

// ═══════════════════════════════════════════ Timeline

export function ExperimentTimeline({ ctx }: { ctx: StageContext }) {
  const stage = currentStage(ctx)
  const at = TIMELINE_STAGES.indexOf(stage)
  const blockers = blockersFor(stage, ctx)
  return (
    <Card title="Experiment timeline" hint={`Current stage: ${STAGE_LABELS[stage]}`}>
      <div className="row" style={{ gap: 6, marginBottom: 12 }}>
        {TIMELINE_STAGES.map((s, i) => (
          <span key={s} className="chip"
            style={i === at
              ? { fontWeight: 700, color: 'var(--text-primary)', borderColor: 'var(--series-1)' }
              : i < at ? { opacity: 0.85 } : { opacity: 0.4 }}>
            <span className="dot" style={{ background: i <= at ? 'var(--series-1)' : 'var(--text-muted)' }} />
            {STAGE_LABELS[s]}
          </span>
        ))}
      </div>
      <Warn>
        <strong>Next required action:</strong> {nextRequiredAction(ctx)}
      </Warn>
      <p className="small"><strong>Outstanding blockers</strong></p>
      <ul className="tight">{blockers.map((b) => <li key={b}>{b}</li>)}</ul>
      <p className="small muted">
        Note: baseline collection began before pre-registration was completed. That ordering is recorded
        rather than hidden — the experiment cannot progress to intervention until thresholds are registered.
      </p>
    </Card>
  )
}

// ═══════════════════════════════════════════ Baseline History screen

export function BaselineHistory() {
  const ledger = useGovernanceLedger()
  const approvedRuns = effectiveState(ledger, PRE_REGISTRATION).state.approvedBaselineRuns
  const runs = useMemo(() => {
    const byRun = new Map<string, typeof BASELINE_CAPTURES>()
    for (const c of BASELINE_CAPTURES.filter((x) => x.experimentId === 'EXP-001')) {
      const list = byRun.get(c.runId) ?? []
      list.push(c); byRun.set(c.runId, list)
    }
    return [...byRun.entries()].sort((a, b) =>
      (a[1][0]?.observationTime ?? '').localeCompare(b[1][0]?.observationTime ?? ''))
  }, [])

  const val = (list: typeof BASELINE_CAPTURES, kpi: string, dim?: string) =>
    list.find((c) => c.kpi === kpi && (dim === undefined || c.dimension === dim))

  const cell = (c: ReturnType<typeof val>) => {
    if (!c) return <span className="muted">—</span>
    if (c.value === null) {
      return (
        <>
          <span className="muted"><strong>{c.dataStatus === 'NOT_EXECUTABLE' ? 'NOT EXECUTABLE' : 'DATA UNAVAILABLE'}</strong></span>
          <div className="small muted">{c.limitations[0]}</div>
        </>
      )
    }
    return (
      <>
        <strong>{typeof c.value === 'number' ? formatMeasured(c.value) : c.value}</strong>{' '}
        <span className="muted">{c.unit}</span>
        {c.modelled && <div style={{ marginTop: 3 }}><Pill text="MODELLED" color="var(--status-warning)" /></div>}
      </>
    )
  }

  return (
    <>
      <header>
        <h2>Baseline History</h2>
        <p className="sub">Every EXP-001 capture in chronological order. Missing days are never backfilled.</p>
      </header>

      <Warn>
        Captures record market structure only. No capture implies a result, and none has been approved by a
        named human reviewer. Data states are distinguished as MEASURED · PROVISIONAL · DATA UNAVAILABLE · NOT EXECUTABLE.
      </Warn>

      <div className="tiles">
        <Tile label="Captures" value={runs.length} meta="EXP-001 baseline runs" />
        <Tile label="Approved" value={approvedRuns.length} meta="named human review required" />
        <Tile label="Pending review" value={runs.length - approvedRuns.length} meta="awaiting a named human" />
        <Tile label="30-day coverage" value={`${SPOT_COVERAGE.coveragePct.toFixed(1)}%`} meta={`${SPOT_COVERAGE.daysMissing} days missing`} />
      </div>

      <Card title="Capture history" hint="Chronological. Each row is one baseline run.">
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Run</th><th>Observed / block</th><th>Spot</th><th>SUT inv.</th><th>USDT inv.</th>
                <th>±2% depth</th><th>$10K buy</th><th>$10K sell</th><th>$50K buy</th><th>$50K sell</th>
                <th>$100K</th><th>Review</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(([runId, list]) => {
                const hist = EXPERIMENT_HISTORY.find((h) => h.runId === runId)
                return (
                  <tr key={runId}>
                    <td className="mono small"><strong>{runId}</strong></td>
                    <td className="mono small">{list[0]?.observationTime}
                      <div className="muted">block {hist?.blockNumber?.toLocaleString() ?? '—'}</div></td>
                    <td>{cell(val(list, 'Spot price'))}</td>
                    <td>{cell(val(list, 'SUT inventory'))}</td>
                    <td>{cell(val(list, 'USDT inventory'))}</td>
                    <td>{cell(val(list, '±2% depth'))}</td>
                    <td>{cell(val(list, 'Price impact', '$10,000 buy'))}</td>
                    <td>{cell(val(list, 'Price impact', '$10,000 sell'))}</td>
                    <td>{cell(val(list, 'Price impact', '$50,000 buy'))}</td>
                    <td>{cell(val(list, 'Price impact', '$50,000 sell'))}</td>
                    <td>{cell(val(list, 'Price impact', '$100,000 both sides'))}</td>
                    <td><Pill text={approvalStatusFor(ledger, runId)}
                      color={approvalStatusFor(ledger, runId) === 'APPROVED' ? 'var(--status-good)'
                        : approvalStatusFor(ledger, runId) === 'PENDING' ? 'var(--status-warning)'
                        : 'var(--status-critical)'} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Provenance
          period="2026-09-30 captures at blocks 94,711,694 · 94,712,797 · 94,722,565"
          source="Polygon RPC — direct contract reads (slot0, liquidity, fee, balanceOf)"
          methodology="contract_call for state; derived V3 single-active-range math for impact and depth"
          retrievedAt="2026-09-30"
          limitations={[
            'impact values are model outputs, not executed trades',
            '$100K exceeds pool inventory on both sides at every capture',
            'May 2026 pool TVL remains DATA UNAVAILABLE and is never substituted',
          ]}
        />
      </Card>

      <BaselineReviewHandoff />

      <Card title="Human review" hint="A run becomes an approved baseline only after named human review.">
        {REVIEWS.length === 0 && ledger.approvals.length === 0 ? (
          <div className="na-box">
            <b>NO REVIEW RECORDED</b>
            No named human has accepted or rejected any baseline run. Available actions: ACCEPT · REJECT ·
            add review note · record review timestamp.
          </div>
        ) : (
          <table>
            <thead><tr><th>Reviewer</th><th>Run</th><th>Action</th><th>At</th><th>Note</th></tr></thead>
            <tbody>
              {REVIEWS.map((r, i) => (
                <tr key={`static-${i}`}><td>{r.reviewer}</td><td className="mono">{r.runId}</td>
                  <td>{r.action.replace(/_/g, ' ')}</td><td className="mono small">{r.at}</td>
                  <td className="small">{r.notes}</td></tr>))}
              {ledger.approvals.map((a) => (
                <tr key={a.fingerprint}><td>{a.reviewer}</td><td className="mono">{a.runId}</td>
                  <td>{a.action}{a.integrity === 'TAMPERED' && <strong> — TAMPERED</strong>}</td>
                  <td className="mono small">{a.at}</td>
                  <td className="small">{a.note}</td></tr>))}
            </tbody>
          </table>
        )}
      </Card>

      <NextRequiredAction />
      <ExperimentTimeline ctx={exp001Context(ledger)} />
    </>
  )
}
