import { Card, formatMeasured, Provenance, Tile, Warn } from './components'
import { BASELINE_CAPTURES, EXP002_WEEK, IMPACT_10K_COVERAGE, REVIEWS, SPOT_COVERAGE } from '../data/baseline-captures'
import { CONFIGURED_REVIEWERS, CREATOR_ATTRIBUTION, type CoverageWindow } from '../core/baseline-ops'
import { EXPERIMENT_RUNS } from '../data/experiment-runs'

function Pill({ text, color }: { text: string; color: string }) {
  return <span className="chip"><span className="dot" style={{ background: color }} />{text}</span>
}

const STATUS_COLOR: Record<string, string> = {
  MEASURED: 'var(--status-good)',
  DATA_UNAVAILABLE: 'var(--text-muted)',
  NOT_EXECUTABLE: 'var(--status-critical)',
  PENDING: 'var(--status-warning)',
  ACCEPTED: 'var(--status-good)',
  REJECTED: 'var(--status-critical)',
  RE_MEASUREMENT_REQUESTED: 'var(--status-warning)',
}

function CoverageBlock({ w }: { w: CoverageWindow }) {
  return (
    <Card title={`30-day coverage — ${w.kpi}`} hint={`${w.startDate} → ${w.endDate} · prospective window`}>
      <div className="tiles" style={{ marginBottom: 12 }}>
        <Tile label="Days captured" value={w.daysCaptured} meta={`of ${w.plannedDays} planned`} />
        <Tile label="Days missing" value={w.daysMissing} meta="not backfilled" />
        <Tile label="Coverage" value={`${w.coveragePct.toFixed(1)}%`} meta="captured / planned" />
        <Tile label="Latest" value={w.latest ? `${formatMeasured(w.latest.value)} ${w.unit}` : null}
          meta={w.latest ? w.latest.date : 'no capture yet'} />
        <Tile label="Average" value={w.average === null ? null : formatMeasured(w.average)} meta="captured days only" />
        <Tile label="Median" value={w.median === null ? null : formatMeasured(w.median)} meta="captured days only" />
        <Tile label="Min" value={w.min === null ? null : formatMeasured(w.min)} meta="captured days only" />
        <Tile label="Max" value={w.max === null ? null : formatMeasured(w.max)} meta="captured days only" />
      </div>
      <Warn>
        Statistics are computed over <strong>captured days only</strong>. Missing days render as
        DATA UNAVAILABLE and are never backfilled with an invented value.
      </Warn>
      <div className="scroll">
        <table>
          <thead><tr><th>Date</th><th>Value</th><th>Evidence</th><th>Note</th></tr></thead>
          <tbody>
            {w.days.map((d) => (
              <tr key={d.date}>
                <td className="mono">{d.date}</td>
                <td>{d.value === null
                  ? <span className="muted"><strong>DATA UNAVAILABLE</strong></span>
                  : <strong>{formatMeasured(d.value)} <span className="muted">{w.unit}</span></strong>}</td>
                <td className="mono small">{d.evidenceId ?? '—'}</td>
                <td className="small muted">{d.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export function BaselineOperations() {
  const experiments = EXPERIMENT_RUNS
  const measured = BASELINE_CAPTURES.filter((c) => c.dataStatus === 'MEASURED')
  const unavailable = BASELINE_CAPTURES.filter((c) => c.dataStatus !== 'MEASURED')
  const runs = new Set(BASELINE_CAPTURES.map((c) => `${c.experimentId}/${c.runId}`))
  const pendingReview = BASELINE_CAPTURES.filter((c) => c.reviewerStatus === 'PENDING').length
  const blocked = experiments.filter((e) => e.baseline === null).length
  // "ready for intervention" requires an accepted baseline — none is accepted yet
  const readyForIntervention = experiments.filter(
    (e) => e.baseline !== null && BASELINE_CAPTURES.some((c) => c.experimentId === e.id && c.reviewerStatus === 'ACCEPTED'),
  ).length

  return (
    <>
      <header>
        <h2>Baseline Operations</h2>
        <p className="sub">Repeated baseline capture, coverage and review status across active experiments.</p>
      </header>

      <Warn>
        <strong>No baseline has been accepted yet.</strong> Every capture is PENDING review. An experiment cannot
        move to intervention until a named human reviewer accepts its baseline — and no result exists for any
        experiment. This tracks measurement readiness, not market outcomes.
      </Warn>

      <div className="tiles">
        <Tile label="Active experiments" value={experiments.length} meta="EXP-001, EXP-002" />
        <Tile label="Baseline runs captured" value={runs.size} meta="distinct experiment/run pairs" />
        <Tile label="Capture records" value={BASELINE_CAPTURES.length} meta={`${measured.length} measured`} />
        <Tile label="Missing / unavailable" value={unavailable.length} meta="never fabricated" />
        <Tile label="Review required" value={pendingReview} meta="captures awaiting a named reviewer" />
        <Tile label="Experiments blocked" value={blocked} meta="no baseline captured" />
        <Tile label="Ready for intervention" value={readyForIntervention} meta="requires an accepted baseline" />
        <Tile label="30-day coverage" value={`${SPOT_COVERAGE.coveragePct.toFixed(1)}%`} meta="spot-price series" />
      </div>

      <Card title="Baseline capture log" hint="Every record carries provenance. A capture without provenance is rejected at ingest.">
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Experiment</th><th>Run</th><th>KPI</th><th>Value</th><th>Data status</th>
                <th>Review</th><th>Timestamp precision</th><th>Evidence</th><th>Observed</th>
              </tr>
            </thead>
            <tbody>
              {BASELINE_CAPTURES.map((c, i) => (
                <tr key={i}>
                  <td className="mono small">{c.experimentId}</td>
                  <td className="mono small">{c.runId}</td>
                  <td><strong className="small">{c.kpi}</strong><div className="small muted">{c.dimension}</div></td>
                  <td>
                    {c.value === null
                      ? <span className="muted"><strong>{c.dataStatus === 'NOT_EXECUTABLE' ? 'NOT EXECUTABLE' : 'DATA UNAVAILABLE'}</strong></span>
                      : <strong>{typeof c.value === 'number' ? formatMeasured(c.value) : c.value} <span className="muted">{c.unit}</span></strong>}
                    {c.modelled && <div style={{ marginTop: 4 }}><Pill text="MODELLED" color="var(--status-warning)" /></div>}
                    {c.value === null && c.limitations.length > 0 && (
                      <div className="small muted" style={{ marginTop: 4 }}>{c.limitations[0]}</div>
                    )}
                  </td>
                  <td><Pill text={c.dataStatus.replace(/_/g, ' ')} color={STATUS_COLOR[c.dataStatus]!} /></td>
                  <td><Pill text={c.reviewerStatus.replace(/_/g, ' ')} color={STATUS_COLOR[c.reviewerStatus]!} /></td>
                  <td className="small">{c.timestampPrecision.replace(/_/g, ' ')}</td>
                  <td className="mono small">{c.evidenceId ?? '—'}</td>
                  <td className="mono small">{c.observationTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Provenance
          period="2026-09-30 captures; EXP-002 covers ISO week 2026-W39"
          source="Polygon RPC — direct contract reads and decoded Transfer logs"
          methodology="contract_call for state; derived V3 math for impact; exact block timestamps for week boundaries"
          retrievedAt="2026-09-30"
          limitations={[
            'modelled impact is not an executed trade',
            'unfillable sizes report NOT EXECUTABLE, never a percentage',
            'May 2026 pool TVL remains DATA UNAVAILABLE and is not substituted',
          ]}
        />
      </Card>

      <CoverageBlock w={SPOT_COVERAGE} />
      <CoverageBlock w={IMPACT_10K_COVERAGE} />

      <Card title="EXP-002 — weekly active addresses (exact-timestamp pipeline)"
        hint={`ISO week ${EXP002_WEEK.weekId} · ${EXP002_WEEK.startUtc} → ${EXP002_WEEK.endUtc}`}>
        <div className="scroll">
          <table>
            <thead><tr><th>Week</th><th>Active addresses</th><th>Timestamp precision</th><th>Evidence</th></tr></thead>
            <tbody>
              <tr>
                <td className="mono">{EXP002_WEEK.weekId}</td>
                <td><strong>{EXP002_WEEK.activeAddresses.toLocaleString()}</strong> <span className="muted">addresses</span></td>
                <td className="small"><strong>EXACT BLOCK</strong>
                  <div className="muted">blocks {EXP002_WEEK.blockStart.toLocaleString()} → {EXP002_WEEK.blockEnd.toLocaleString()}</div>
                  <div className="muted">drift +{EXP002_WEEK.boundaryDriftSeconds.start}s / {EXP002_WEEK.boundaryDriftSeconds.end}s — interpolation not used</div></td>
                <td className="mono small">EV-130</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="small" style={{ marginTop: 10 }}><strong>Methodology:</strong> distinct transfer INITIATORS from decoded
          Transfer logs; week boundaries resolved by binary search on exact block timestamps, never interpolated.</p>
        <p className="small"><strong>Counts:</strong> {EXP002_WEEK.rawTransfers.toLocaleString()} raw transfers ·{' '}
          {EXP002_WEEK.excludedSenderTransfers.toLocaleString()} excluded-sender ·{' '}
          {EXP002_WEEK.intraClusterExcluded} intra-cluster ·{' '}
          <strong>{EXP002_WEEK.countedTransfers.toLocaleString()} counted</strong></p>
        <p className="small"><strong>Exclusions applied</strong></p>
        <ul className="tight">{EXP002_WEEK.exclusions.map((x) => <li key={x}>{x}</li>)}</ul>
        <Warn>
          Not comparable with CertiK’s 1,580 active-users figure — that methodology is unpublished and not
          reproducible. Wallet roles remain <strong>UNKNOWN</strong>; exclusion by documented address list is not
          an ownership claim.
        </Warn>
      </Card>

      <Card title="Human review" hint="Reviewer identity and creator attribution are separate concepts.">
        {REVIEWS.length === 0 ? (
          <div className="na-box">
            <b>NO REVIEW RECORDED</b>
            No named human reviewer has accepted, rejected or requested re-measurement of any baseline.
          </div>
        ) : (
          <table>
            <thead><tr><th>Reviewer</th><th>Run</th><th>Action</th><th>At</th><th>Notes</th></tr></thead>
            <tbody>{REVIEWS.map((rv, i) => (
              <tr key={i}><td>{rv.reviewer}</td><td className="mono">{rv.runId}</td>
                <td>{rv.action.replace(/_/g, ' ')}</td><td className="mono small">{rv.at}</td>
                <td className="small">{rv.notes}</td></tr>
            ))}</tbody>
          </table>
        )}
        <p className="small" style={{ marginTop: 10 }}><strong>Available review actions:</strong> accept baseline ·
          reject baseline · request re-measurement · add review notes.</p>
        <p className="small"><strong>Configured reviewers:</strong>{' '}
          {CONFIGURED_REVIEWERS.length === 0
            ? <span className="muted">none configured — a reviewer must be named explicitly before any review can be recorded</span>
            : CONFIGURED_REVIEWERS.join(', ')}</p>
        <Warn>
          <strong>{CREATOR_ATTRIBUTION}</strong> is the product creator attribution, not a review identity.
          The system refuses to record the creator as a reviewer unless explicitly configured as one.
        </Warn>
      </Card>
    </>
  )
}
