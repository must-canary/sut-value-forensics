/**
 * CURRENT — SUT MARKET STATE.
 *
 * Layer 2 of three. It observes public market data daily and derives a reading
 * of the current condition. It never writes to layer 1 (frozen research) or
 * layer 3 (EXP-001 governance): it cannot register a threshold, approve a
 * baseline, create an intervention, a comparison or a result, or move a gate.
 *
 * A field a source does not publish is DATA UNAVAILABLE with a reason, never
 * filled in. A proposal never becomes a result.
 */
import { useState } from 'react'
import { Card, Tile, Warn, formatMeasured } from './components'
import { SOURCES, SUT_CONTRACT, type DailyReport, type Observation } from '../core/daily-sync'
import {
  BROWSER_SCHEDULING_NOTICE, checkReportIntegrity, historyRows, lastSyncAt,
  latestReport, nextExpectedSync, reportById,
} from '../core/daily-store'
import {
  assessCurrentState, CURRENT_STATE_QUESTION, LAYER_LABELS, observationsFor, supplyTracking,
  type CandidateAction, type Statement, type StatementKind, type SupplyChange,
} from '../core/daily-assessment'
import {
  DailyMarketSyncService, DAILY_CRON_SCHEDULE, DAILY_CRON_DESCRIPTION,
} from '../service/daily-market-sync-service'
import { liveFetcher } from '../data/market-sources'
import { baselineImpacts, historicalAnchors, registeredTargets } from '../data/current-state'
import { PRE_REGISTRATION } from '../data/pre-registration'
import { effectiveState } from '../core/governance-store'
import { commitDailyLedger, dailyStoragePort, useDailyLedger } from './daily-state'
import { useGovernanceLedger } from './governance-state'
import { LiveMarketState } from './live-market'

function Pill({ text, color }: { text: string; color: string }) {
  return <span className="chip"><span className="dot" style={{ background: color }} />{text}</span>
}

const statusTone = (s: string) =>
  s === 'SUCCESS' || s === 'OK' || s === 'CURRENT' ? 'var(--status-good)'
    : s === 'PARTIAL' || s === 'STALE' || s === 'RATE_LIMITED' ? 'var(--status-warning)'
    : s === 'NOT_CONFIGURED' || s === 'UNKNOWN' ? 'var(--text-muted)'
    : 'var(--status-critical)'

const KIND_TONE: Record<StatementKind, string> = {
  OBSERVATION: 'var(--series-1)',
  INTERPRETATION: 'var(--status-warning)',
  PROPOSAL: 'var(--text-muted)',
  EXPECTED_EFFECT: 'var(--text-muted)',
  MEASURED_RESULT: 'var(--status-good)',
}

const ACTION_TONE: Record<string, string> = {
  PROPOSED: 'var(--text-muted)',
  APPROVED: 'var(--status-warning)',
  INTERVENTION_EXECUTED: 'var(--status-warning)',
  MEASUREMENT_PENDING: 'var(--status-warning)',
  SUPPORTED: 'var(--status-good)',
  REJECTED: 'var(--status-critical)',
  INCONCLUSIVE: 'var(--text-muted)',
}

const input = {
  padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--plane)', color: 'var(--text-primary)', font: 'inherit', fontSize: 12,
} as const

function Value({ o }: { o: Observation | undefined }) {
  if (!o) return <span className="muted">—</span>
  if (o.value === null) {
    return (
      <>
        <strong className="muted">DATA UNAVAILABLE</strong>
        <div className="small muted">Reason: {o.unavailableReason}</div>
      </>
    )
  }
  return (
    <>
      <strong>{typeof o.value === 'number' ? formatMeasured(o.value) : o.value}</strong>{' '}
      <span className="muted small">{o.unit}</span>
    </>
  )
}

function Line({ s }: { s: Statement }) {
  return (
    <li className="small" style={{ marginBottom: 6 }}>
      <Pill text={s.kind.replace(/_/g, ' ')} color={KIND_TONE[s.kind]} />{' '}
      {s.text}
      {s.evidence.length > 0 && <span className="muted mono small"> [{s.evidence.join(', ')}]</span>}
    </li>
  )
}

function find(r: DailyReport | null, field: string): Observation | undefined {
  return r?.observations.find((o) => o.field === field)
}

function ActionCard({ a }: { a: CandidateAction }) {
  return (
    <Card title="Candidate action — evidence-based improvement"
      hint="Derived from current observations, frozen evidence and the live governance state. Never executed automatically.">
      <div className="row" style={{ gap: 8, marginBottom: 8 }}>
        <span data-testid="action-status"><Pill text={a.status.replace(/_/g, ' ')} color={ACTION_TONE[a.status]!} /></span>
        <span className="small muted">{a.statusReason}</span>
      </div>
      <div>
        <table>
          <tbody>
            <tr><td style={{ width: '26%' }}>Problem observed</td>
              <td className="small" data-testid="action-problem">{a.problemObserved.text}</td></tr>
            <tr><td>Relevant historical evidence</td>
              <td className="small">
                {a.historicalEvidence.map((h) => (
                  <div key={h.id}><strong className="mono">{h.id}</strong> — {h.title}{' '}
                    <span className="muted">({h.status})</span></div>
                ))}
                <div className="muted small" style={{ marginTop: 4 }}>
                  FROZEN — these records are read only and are never modified by the daily layer.
                </div>
              </td></tr>
            <tr><td>Proposed action</td><td className="small" data-testid="action-proposal">{a.proposedAction.text}</td></tr>
            <tr><td>Expected measurable effect</td>
              <td className="small" data-testid="action-expected">{a.expectedEffect.text}</td></tr>
            <tr><td>Baseline</td>
              <td className="small">
                {a.baseline.length === 0 ? <span className="muted">DATA UNAVAILABLE</span> : (
                  a.baseline.map((b) => (
                    <div key={b.size}><span className="mono">{b.runId}</span> {b.size}:{' '}
                      {b.value === null
                        ? <span className="muted">NOT EXECUTABLE / DATA UNAVAILABLE</span>
                        : <strong>{formatMeasured(b.value)}%</strong>}{' '}
                      <span className="muted mono">{b.evidenceId ?? ''}</span></div>
                  ))
                )}
              </td></tr>
            <tr><td>Target</td>
              <td className="small" data-testid="action-target">
                {a.target.every((t) => t.threshold === null)
                  ? <span className="muted"><strong>NOT REGISTERED</strong> — no human has registered a success threshold</span>
                  : a.target.map((t) => (
                    <div key={t.size}>{t.size}:{' '}
                      {t.threshold === null ? <span className="muted">NOT REGISTERED</span> : <strong>{t.threshold}%</strong>}</div>
                  ))}
              </td></tr>
            <tr><td>Post-intervention measurement</td>
              <td className="small" data-testid="action-measurement">
                <Pill text={a.postInterventionMeasurement.kind.replace(/_/g, ' ')}
                  color={KIND_TONE[a.postInterventionMeasurement.kind]} />{' '}
                {a.postInterventionMeasurement.text}
              </td></tr>
            <tr><td>Evidence</td><td className="mono small">{a.evidence.join(', ')}</td></tr>
            <tr><td>Next required human action</td>
              <td className="small" data-testid="action-next">{a.nextRequiredHumanAction}</td></tr>
          </tbody>
        </table>
      </div>
      <Warn>
        A candidate action is a <strong>proposal</strong>. It is not approved, it is not scheduled, and this
        application will not execute it. Progress requires the existing governance chain: business decision →
        registration → baseline approval → intervention → measurement → review.
      </Warn>
    </Card>
  )
}

function ReportView({ r, previous }: { r: DailyReport; previous: DailyReport | null }) {
  const govLedger = useGovernanceLedger()
  const gov = effectiveState(govLedger, PRE_REGISTRATION).state
  const integrity = checkReportIntegrity(r)
  const assessment = assessCurrentState({
    report: r,
    previous,
    gov,
    anchors: historicalAnchors(),
    baselineImpacts: baselineImpacts(),
    registeredTargets: registeredTargets(govLedger),
  })

  return (
    <>
      <Card title={`Daily SUT Market Report — ${r.id}`}
        hint={`Report date ${r.reportDate} · generated ${r.generatedAt}`}>
        <div className="row" style={{ gap: 8, marginBottom: 10 }}>
          <Pill text={r.status} color={statusTone(r.status)} />
          <Pill text={integrity} color={statusTone(integrity === 'OK' ? 'OK' : 'TAMPERED')} />
          <Pill text={`TRIGGER ${r.trigger}`} color="var(--text-muted)" />
          <span className="small muted">Retrieval started {r.retrievalStartedAt}</span>
        </div>
        <p className="small"><strong>Question answered:</strong> {CURRENT_STATE_QUESTION}</p>
        <p className="small"><strong>Report date</strong> <span className="mono">{r.reportDate}</span>{' · '}
          <strong>Generated</strong> <span className="mono">{r.generatedAt}</span>{' · '}
          <strong>Data retrieved</strong> <span className="mono">{r.retrievalStartedAt}</span></p>

        {assessment.sections.map((sec) => (
          <div key={sec.n} style={{ marginTop: 14 }}>
            <p className="small"><strong>{sec.n} · {sec.title}</strong></p>
            {sec.fields.length > 0 && (
              <div className="scroll">
                <table>
                  <thead><tr><th>Field</th><th>Value</th><th>Data timestamp</th><th>Freshness</th><th>Source</th><th>Identity</th></tr></thead>
                  <tbody>
                    {observationsFor(r, sec.fields).map((o) => (
                      <tr key={`${o.sourceId}-${o.field}`}>
                        <td className="small"><strong>{o.field}</strong></td>
                        <td><Value o={o} /></td>
                        <td className="mono small">{o.dataTimestamp ?? '—'}</td>
                        <td><Pill text={o.freshness} color={statusTone(o.freshness)} /></td>
                        <td className="small muted">{o.sourceName}</td>
                        <td className="small muted">{o.identity.replace(/_/g, ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <ul className="tight" style={{ marginTop: 6 }}>
              {sec.statements.map((s, i) => <Line key={`${sec.n}-${i}`} s={s} />)}
            </ul>
            {sec.n === 2 && (
              <div className="scroll" style={{ marginTop: 6 }} data-testid="supply-tracking">
                <table>
                  <thead><tr><th>Supply field</th><th>Current</th><th>Previous</th><th>Change</th><th>Change %</th><th>Source</th><th>Identity</th><th>Status</th></tr></thead>
                  <tbody>
                    {supplyTracking(r, previous).map((x: SupplyChange) => (
                      <tr key={x.field}>
                        <td className="small"><strong>{x.field}</strong></td>
                        <td>{x.current === null ? <span className="muted">DATA UNAVAILABLE</span> : formatMeasured(x.current)}</td>
                        <td>{x.previous === null ? <span className="muted">—</span> : formatMeasured(x.previous)}</td>
                        <td>{x.absoluteChange === null ? <span className="muted">—</span>
                          : <strong>{x.absoluteChange >= 0 ? '+' : ''}{formatMeasured(x.absoluteChange)}</strong>}</td>
                        <td>{x.percentChange === null ? <span className="muted">—</span>
                          : `${x.percentChange >= 0 ? '+' : ''}${x.percentChange.toFixed(4)}%`}</td>
                        <td className="small muted">{x.source}</td>
                        <td className="small muted">{x.identity}</td>
                        <td className="small">{x.status.replace(/_/g, ' ')}
                          {x.reason && <div className="muted small">{x.reason}</div>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {sec.n === 4 && (
              <p className="small muted">
                CoinMarketCap is queried by the <strong>ticker</strong> SUT. Its rows stay in CMC-prefixed fields
                and are only treated as contract-verified when the listing itself publishes the Polygon contract
                address — otherwise they are labelled <strong>TICKER ONLY / IDENTITY NOT VERIFIED</strong> and are
                never merged into the contract-verified SUT values.
              </p>
            )}
            {sec.n === 3 && (
              <p className="small muted">
                Modelled price impact at the standardised trade sizes is an <strong>EXP-001 measurement</strong>,
                not a daily observation. It is never computed here.
              </p>
            )}
          </div>
        ))}

        <p className="small" style={{ marginTop: 14 }}><strong>SUT vs broader market</strong></p>
        <Warn><span data-testid="comparison-text">{r.comparison.text}</span></Warn>

        <p className="small"><strong>Sources and provenance</strong></p>
        <div className="scroll">
          <table>
            <thead><tr><th>Source</th><th>Field</th><th>Retrieved</th><th>Data timestamp</th><th>Status</th><th>Provenance</th></tr></thead>
            <tbody>
              {r.observations.map((o) => (
                <tr key={`prov-${o.sourceId}-${o.field}`}>
                  <td className="small">{o.sourceName}</td>
                  <td className="small">{o.field}</td>
                  <td className="mono small">{o.retrievedAt}</td>
                  <td className="mono small">{o.dataTimestamp ?? '—'}</td>
                  <td><Pill text={o.status === 'OK' ? 'OK' : 'DATA UNAVAILABLE'}
                    color={statusTone(o.status === 'OK' ? 'OK' : 'FAILED')} /></td>
                  <td className="small muted">{o.provenance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="small" style={{ marginTop: 12 }}><strong>Source status</strong></p>
        <div className="scroll">
          <table>
            <thead><tr><th>Source</th><th>URL</th><th>HTTP</th><th>Status</th><th>Detail</th></tr></thead>
            <tbody>
              {r.sources.map((s) => (
                <tr key={s.sourceId}>
                  <td className="small">{s.sourceName}</td>
                  <td className="mono small" style={{ wordBreak: 'break-all' }}>{s.url || '—'}</td>
                  <td className="mono small">{s.httpStatus ?? '—'}</td>
                  <td><Pill text={s.status} color={statusTone(s.status)} /></td>
                  <td className="small muted">{s.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Warn>
          <strong>Disclaimer.</strong> <span data-testid="daily-disclaimer">{r.disclaimer}</span>{' '}
          <span data-testid="daily-interpretation">{r.interpretationNote}</span>
        </Warn>
        <p className="small muted">Report fingerprint <span className="mono">{r.fingerprint}</span> — this
          retrieval is immutable. A later retrieval is stored as a new report; this one is never rewritten.</p>
      </Card>

      <ActionCard a={assessment.action} />
    </>
  )
}

export function DailyMarketSync() {
  const ledger = useDailyLedger()
  const latest = latestReport(ledger)
  const [running, setRunning] = useState(false)
  const [problems, setProblems] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [showLatest, setShowLatest] = useState(false)

  const now = new Date().toISOString()
  const opened = openId ? reportById(ledger, openId) : null
  const shown = opened ?? (showLatest ? latest : null)
  const trustworthy = ledger.reports.filter((x) => checkReportIntegrity(x) === 'OK')
  const previousOf = (r: DailyReport | null) => {
    if (!r) return null
    const i = trustworthy.findIndex((x) => x.id === r.id)
    return i > 0 ? trustworthy[i - 1]! : null
  }

  // the SAME service the cron entrypoint uses; only the port and trigger differ
  const run = async () => {
    setRunning(true)
    setProblems([])
    setNotice(null)
    try {
      const service = new DailyMarketSyncService({
        storage: dailyStoragePort, fetcher: liveFetcher, requestGapMs: 400,
      })
      const result = await service.run('MANUAL')
      if (result.problems.length) setProblems(result.problems)
      if (result.stored) {
        commitDailyLedger(result.ledger)
        setOpenId(result.report.id)
        setShowLatest(true)
        setNotice(`Stored ${result.report.id} — status ${result.status}.`)
      } else if (result.duplicateOf && result.problems.length === 0) {
        setNotice(`This retrieval is identical to ${result.duplicateOf}. Nothing was written: `
          + 'repeating a sync never duplicates an observation, and never rewrites history.')
      }
    } catch (e) {
      setProblems([`the retrieval could not be completed: ${e instanceof Error ? e.message : String(e)}`])
    } finally {
      setRunning(false)
    }
  }

  const setSchedule = (patch: Partial<typeof ledger.schedule>) =>
    commitDailyLedger({ ...ledger, schedule: { ...ledger.schedule, ...patch } })

  const rows = historyRows(ledger)
  const last = lastSyncAt(ledger)
  const next = nextExpectedSync(ledger, now)

  return (
    <>
      <header>
        <h2>Daily Market Sync</h2>
        <p className="sub">
          <strong data-testid="current-layer-label">{LAYER_LABELS.current}</strong> — the operational market view,
          updated daily. Separate from the frozen research and from EXP-001 governance.
        </p>
      </header>

      <Warn>
        <strong>Layer 2 of 3 — current market state.</strong> Layer 1 is the{' '}
        <strong>{LAYER_LABELS.historical}</strong>, which never changes. Layer 3 is{' '}
        <strong>{LAYER_LABELS.governance}</strong>, which only a named human advances. This screen records what
        public sources published at the stated moment: it is <strong>not</strong> the EXP-001 intervention or
        measurement, it is never causal proof, and it cannot register a threshold, approve a baseline, create an
        intervention or comparison, produce a result, or change governance state.
      </Warn>

      <LiveMarketState />

      <Card title="Daily market report (observational layer)"
        hint="The dated public-data report. Separate from the live production sync above.">
        <p className="small muted">
          The live sync above captures the current production market state with full raw evidence. The daily
          report below is the dated observational record and its twelve-section assessment.
        </p>
      </Card>

      <div className="tiles">
        <Tile label="Sync status" value={latest?.status ?? 'NEVER RUN'} meta="latest retrieval" />
        <Tile label="Last sync" value={last ? last.slice(0, 19).replace('T', ' ') : 'none'} meta="UTC" />
        <Tile label="Next expected sync"
          value={next ? next.slice(0, 19).replace('T', ' ') : 'not scheduled'}
          meta={ledger.schedule.enabled ? 'while the app is open' : 'schedule disabled'} />
        <Tile label="Reports stored" value={ledger.reports.length} meta="immutable retrievals" />
      </div>

      <Card title="Latest available snapshot"
        hint={`SUT daily snapshot · contract ${SUT_CONTRACT} on Polygon — identity is the contract, never the ticker.`}>
        {latest ? (
          <div className="scroll">
            <table>
              <tbody>
                <tr><td style={{ width: '28%' }}>Price</td><td data-testid="snap-price"><Value o={find(latest, 'SUT price')} /></td></tr>
                <tr><td>24h change</td><td data-testid="snap-change"><Value o={find(latest, 'SUT 24h change')} /></td></tr>
                <tr><td>24h volume</td><td data-testid="snap-volume"><Value o={find(latest, 'SUT 24h volume')} /></td></tr>
                <tr><td>Market cap</td><td data-testid="snap-mcap"><Value o={find(latest, 'SUT market cap')} /></td></tr>
                <tr><td>Circulating supply</td><td><Value o={find(latest, 'SUT circulating supply')} /></td></tr>
                <tr><td>Total supply</td><td data-testid="snap-total-supply"><Value o={find(latest, 'SUT total supply')} /></td></tr>
                <tr><td>Max supply</td><td data-testid="snap-max-supply"><Value o={find(latest, 'SUT max supply')} /></td></tr>
                <tr><td>Rank</td><td data-testid="snap-rank"><Value o={find(latest, 'SUT market rank')} /></td></tr>
                <tr><td>CMC rank</td><td data-testid="snap-cmc-rank"><Value o={find(latest, 'CMC rank')} /></td></tr>
                <tr><td>CMC circulating supply</td><td data-testid="snap-cmc-supply">
                  <Value o={find(latest, 'CMC circulating supply')} /></td></tr>
                <tr><td>CMC identity</td><td data-testid="snap-cmc-identity">
                  <Value o={find(latest, 'CMC identity check')} /></td></tr>
                <tr><td>Pool liquidity</td><td data-testid="snap-liquidity"><Value o={find(latest, 'Pool liquidity (USD)')} /></td></tr>
                <tr><td>On-chain spot price</td><td><Value o={find(latest, 'On-chain spot price')} /></td></tr>
                <tr><td>Venues</td><td><Value o={find(latest, 'SUT venues')} /></td></tr>
                <tr><td>Market events / news</td><td><Value o={find(latest, 'Market events / news')} /></td></tr>
                <tr><td>BTC</td><td data-testid="snap-btc"><Value o={find(latest, 'BTC price')} />{' · '}
                  <Value o={find(latest, 'BTC 24h change')} /></td></tr>
                <tr><td>ETH</td><td data-testid="snap-eth"><Value o={find(latest, 'ETH price')} />{' · '}
                  <Value o={find(latest, 'ETH 24h change')} /></td></tr>
                <tr><td>Data timestamp</td><td className="mono small" data-testid="snap-data-ts">
                  {find(latest, 'SUT price')?.dataTimestamp ?? 'DATA UNAVAILABLE'}</td></tr>
                <tr><td>Retrieved</td><td className="mono small" data-testid="snap-retrieved">
                  {find(latest, 'SUT price')?.retrievedAt ?? latest.retrievalStartedAt}</td></tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="na-box">
            <b>NO SNAPSHOT YET</b>
            No retrieval has been run in this browser. Nothing is shown until real data is retrieved — no
            placeholder values are displayed, and no date is backfilled.
          </div>
        )}

        <div className="row" style={{ marginTop: 12 }}>
          <button className="toggle" onClick={run} disabled={running} data-testid="run-daily-sync">
            {running ? 'Running…' : 'Run Daily Sync'}
          </button>
          {latest && (
            <button className="toggle" onClick={() => { setOpenId(null); setShowLatest(true) }}
              data-testid="open-latest-report">Open Latest Report</button>
          )}
          <span className="small muted">
            Retrieval runs only when you press the button. The application performs no background network calls.
          </span>
        </div>
        {notice && <Warn><span data-testid="sync-notice">{notice}</span></Warn>}
        {problems.length > 0 && (
          <div className="warn" style={{ borderColor: 'var(--status-critical)', marginTop: 8 }}>
            <strong>SYNC PROBLEM</strong>
            <ul className="tight">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        )}
      </Card>

      <Card title="Schedule" hint="Status and configuration only — no unattended execution is claimed.">
        <div className="row">
          <label className="small" style={{ display: 'inline-flex', gap: 6 }}>
            <input type="checkbox" aria-label="enable daily schedule" checked={ledger.schedule.enabled}
              onChange={(e) => setSchedule({ enabled: e.target.checked })} />
            <span>Show a daily reminder at</span>
          </label>
          <input type="number" min="0" max="23" style={{ ...input, width: 80 }} aria-label="schedule hour utc"
            value={ledger.schedule.hourUtc}
            onChange={(e) => setSchedule({ hourUtc: Math.max(0, Math.min(23, Number(e.target.value) || 0)) })} />
          <span className="small muted">:00 UTC</span>
        </div>
        <Warn><strong data-testid="scheduling-notice">{BROWSER_SCHEDULING_NOTICE}</strong></Warn>
        <p className="small muted">
          The schedule above records an intended time and shows when the next run is due. It does not run the
          sync by itself: pressing <strong>Run Daily Sync</strong> is always an explicit human action.
        </p>
        <p className="small">
          <strong>Unattended daily execution</strong> runs outside the browser, through the same service:{' '}
          <span className="mono">npm run daily-sync</span> — scheduled with cron{' '}
          <span className="mono" data-testid="cron-schedule">{DAILY_CRON_SCHEDULE}</span> ({DAILY_CRON_DESCRIPTION}).
          Credentialed sources are supplied there through environment variables; no key exists in this page.
        </p>
      </Card>

      <Card title="Daily report history"
        hint="Every retrieval is kept as an evidence record. A report is never overwritten and no date is backfilled.">
        {rows.length === 0 ? (
          <div className="na-box"><b>NO REPORTS</b>No daily retrieval has been stored in this browser.</div>
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Status</th><th>SUT price</th><th>24h change</th><th>24h volume</th>
                  <th>Market cap</th><th>BTC 24h</th><th>ETH 24h</th><th>Generated at</th><th>Source status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => { setOpenId(r.id); setShowLatest(false) }}
                    data-testid={`history-row-${r.id}`}>
                    <td className="mono small"><strong>{r.date}</strong>
                      <div className="muted">{r.id}</div></td>
                    <td><Pill text={r.status} color={statusTone(r.status)} /></td>
                    <td>{r.sutPrice === null ? <span className="muted">DATA UNAVAILABLE</span> : formatMeasured(r.sutPrice)}</td>
                    <td>{r.change24h === null ? <span className="muted">—</span> : `${r.change24h >= 0 ? '+' : ''}${r.change24h.toFixed(2)}%`}</td>
                    <td>{r.volume24h === null ? <span className="muted">—</span> : formatMeasured(r.volume24h)}</td>
                    <td>{r.marketCap === null ? <span className="muted">DATA UNAVAILABLE</span> : formatMeasured(r.marketCap)}</td>
                    <td>{r.btcChange === null ? <span className="muted">—</span> : `${r.btcChange >= 0 ? '+' : ''}${r.btcChange.toFixed(2)}%`}</td>
                    <td>{r.ethChange === null ? <span className="muted">—</span> : `${r.ethChange >= 0 ? '+' : ''}${r.ethChange.toFixed(2)}%`}</td>
                    <td className="mono small">{r.generatedAt}</td>
                    <td className="small">{r.sourceStatus}{r.integrity === 'TAMPERED' && <strong> · TAMPERED</strong>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted">
          Select a row to open that report. Every row is a separate dated observation: today's values never
          replace an earlier day, and a missing day is never filled in with today's data.
        </p>
      </Card>

      {shown && <ReportView r={shown} previous={previousOf(shown)} />}

      <Card title="Data sources" hint="Every source is public and addressed by contract where the asset allows it.">
        <div className="scroll">
          <table>
            <thead><tr><th>Source</th><th>Fields</th><th>Identity</th><th>Latest status</th><th>Reference</th></tr></thead>
            <tbody>
              {SOURCES.map((s) => {
                const outcome = latest?.sources.find((o) => o.sourceId === s.id) ?? null
                return (
                  <tr key={s.id}>
                    <td className="small"><strong>{s.name}</strong>
                      <div className="muted">{s.note}</div></td>
                    <td className="small muted">{s.provides.join(' · ')}</td>
                    <td className="small">{s.identity.replace(/_/g, ' ')}</td>
                    <td>{outcome
                      ? <Pill text={outcome.status} color={statusTone(outcome.status)} />
                      : <span className="muted small">not yet called</span>}</td>
                    <td className="mono small" style={{ wordBreak: 'break-all' }}>{s.url || 'none configured'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="small muted">
          Where an API cannot be called from the browser, or returns nothing for a field, the report records
          DATA UNAVAILABLE with the reason and keeps the provenance. No integration is simulated.
        </p>
      </Card>
    </>
  )
}
