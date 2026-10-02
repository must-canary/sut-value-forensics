/**
 * CURRENT — SUT MARKET STATE: the manual live production sync.
 *
 * One button retrieves every public source, records each observation with its
 * own identity, timestamps and raw evidence, and appends an immutable run.
 * Nothing here writes to the frozen research or to EXP-001 governance.
 */
import { useState } from 'react'
import { Card, Tile, Warn, formatMeasured } from './components'
import {
  allMetricEvidence, compareRuns, DEFERRED_SOURCES, evidenceHeader, formatUtc, LIVE_SOURCES,
  SUT_CONTRACT,
} from '../core/live-market-sync'
import {
  exportLedger, exportRun, latestRun, previousRunOf, runById, runRows,
} from '../core/live-market-store'
import { assessLiveRun } from '../core/live-assessment'
import { LiveMarketSyncService } from '../service/live-market-sync-service'
import { liveMarketFetcher } from '../data/market-sources'
import { baselineImpacts, historicalAnchors } from '../data/current-state'
import { PROPOSED_THRESHOLDS } from '../data/proposed-thresholds'
import { METHOD_FINGERPRINT_EXP001 } from '../data/baseline-captures'
import { PRE_REGISTRATION } from '../data/pre-registration'
import { effectiveState } from '../core/governance-store'
import { LAYER_LABELS, type Statement, type StatementKind } from '../core/daily-assessment'
import { commitLiveLedger, liveStoragePort, useLiveLedger } from './live-state'
import { useGovernanceLedger } from './governance-state'

function Pill({ text, color }: { text: string; color: string }) {
  return <span className="chip"><span className="dot" style={{ background: color }} />{text}</span>
}

const tone = (s: string) =>
  s === 'VALIDATED' || s === 'OK' || s === 'COMPARED' ? 'var(--status-good)'
    : s === 'PARTIAL' || s === 'TICKER_ONLY' || s === 'PAIR_VERIFIED' ? 'var(--status-warning)'
    : s === 'CONTRACT_VERIFIED' ? 'var(--status-good)'
    : s === 'NOT_APPLICABLE' ? 'var(--text-muted)'
    : 'var(--status-critical)'

const KIND_TONE: Record<StatementKind, string> = {
  OBSERVATION: 'var(--series-1)',
  INTERPRETATION: 'var(--status-warning)',
  PROPOSAL: 'var(--text-muted)',
  EXPECTED_EFFECT: 'var(--text-muted)',
  MEASURED_RESULT: 'var(--status-good)',
}

function Line({ s }: { s: Statement }) {
  return (
    <li className="small" style={{ marginBottom: 6 }}>
      <Pill text={s.kind.replace(/_/g, ' ')} color={KIND_TONE[s.kind]} /> {s.text}
      {s.evidence.length > 0 && <span className="muted mono small"> [{s.evidence.join(', ')}]</span>}
    </li>
  )
}

/** One labelled provenance line inside a metric's Evidence panel. */
function EvRow({ label, value, mono, wrap }: {
  label: string; value: string; mono?: boolean; wrap?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
      <dt className="muted" style={{ minWidth: 130, flex: '0 0 130px', fontWeight: 700 }}>{label}</dt>
      <dd className={mono ? 'mono' : undefined}
        style={{ margin: 0, ...(wrap ? { wordBreak: 'break-all' } : {}) }}>{value}</dd>
    </div>
  )
}


function download(name: string, text: string) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  } catch { /* download blocked: the JSON stays visible in the panel below */ }
}

export function LiveMarketState() {
  const ledger = useLiveLedger()
  const govLedger = useGovernanceLedger()
  const gov = effectiveState(govLedger, PRE_REGISTRATION).state

  const [running, setRunning] = useState(false)
  const [problems, setProblems] = useState<string[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [showExport, setShowExport] = useState(false)
  const [rawMetric, setRawMetric] = useState<string | null>(null)

  const latest = latestRun(ledger)
  const shown = (openId ? runById(ledger, openId) : null) ?? latest
  const previous = previousRunOf(ledger, shown)
  const rows = runRows(ledger)
  const header = shown ? evidenceHeader(shown) : null

  const run = async () => {
    setRunning(true)
    setProblems([])
    try {
      // the SAME service the scheduled entrypoint uses
      const service = new LiveMarketSyncService({
        storage: liveStoragePort, fetcher: liveMarketFetcher, requestGapMs: 400,
      })
      const outcome = await service.run('MANUAL')
      setProblems(outcome.problems)
      if (outcome.stored) {
        commitLiveLedger(outcome.ledger)
        setOpenId(outcome.run.id)
      }
    } catch (e) {
      setProblems([`the sync could not be completed: ${e instanceof Error ? e.message : String(e)}`])
    } finally {
      setRunning(false)
    }
  }

  const assessment = shown
    ? assessLiveRun({
      run: shown,
      previous,
      gov,
      anchors: historicalAnchors(),
      baselineKpis: baselineImpacts(),
      proposedTargets: PROPOSED_THRESHOLDS.map((t) => ({
        size: t.tradeSize, value: t.proposedThreshold, status: 'PROPOSED' as const,
      })),
      methodFingerprint: METHOD_FINGERPRINT_EXP001,
    })
    : null

  return (
    <>
      <Card title="CURRENT — SUT MARKET STATE"
        hint={`Live production market data for contract ${SUT_CONTRACT} on Polygon. Identity is the contract, never the ticker.`}>
        <p className="small" style={{ margin: '0 0 8px' }}>
          <strong data-testid="evidence-header-title">LIVE MARKET EVIDENCE</strong>
        </p>
        <div className="tiles" style={{ marginBottom: 12 }}>
          <Tile label="Sync ID" value={header?.syncId ?? 'NEVER RUN'} meta="append-only evidence record" />
          <Tile label="Captured at" value={header ? formatUtc(header.capturedAt) : '—'} meta="as stored, UTC" />
          <Tile label="Status" value={header?.status ?? '—'} meta="run status" />
          <Tile label="Sources" value={header ? `${header.sourcesOk}/${header.sourcesTotal}` : '—'} meta="responded" />
          <Tile label="Observations" value={header ? `${header.observationsWithValue}/${header.observationsTotal}` : '—'} meta="carry a value" />
          <Tile label="Evidence integrity" value={header?.integrity ?? '—'} meta="fingerprint re-checked on load" />
          <Tile label="Runs stored" value={ledger.runs.length} meta="never overwritten" />
        </div>

        <div className="row" style={{ marginBottom: 12 }}>
          <button className="toggle" onClick={run} disabled={running} data-testid="run-live-sync">
            {running ? 'Running…' : 'Run Live Market Sync'}
          </button>
          {shown && (
            <>
              <button className="toggle" data-testid="export-run"
                onClick={() => { download(`${shown.id}.json`, exportRun(shown)); setShowExport(true) }}>
                Export JSON (this run)
              </button>
              <button className="toggle" data-testid="export-history"
                onClick={() => { download('live-market-history.json', exportLedger(ledger)); setShowExport(true) }}>
                Export JSON (full history)
              </button>
            </>
          )}
          <span className="small muted">
            Retrieval happens only on this click. No value is ever inferred or carried over.
          </span>
        </div>

        {problems.length > 0 && (
          <div className="warn" style={{ borderColor: 'var(--status-critical)' }}>
            <strong>SYNC PROBLEM</strong>
            <ul className="tight">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        )}

        {shown ? (
          <>
            <div className="scroll">
              <table>
                <thead>
                  <tr><th>Metric</th><th>Value</th><th>Source</th><th>Identity</th><th>Observed at (UTC)</th><th>Retrieved at (UTC)</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {allMetricEvidence(shown).map((m) => (
                    <tr key={m.metric} data-testid={`snapshot-${m.metric}`}>
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
                      <td className="small muted">{m.source}{m.venue ? ` · ${m.venue}` : ''}</td>
                      <td><Pill text={m.identityStatus.replace(/_/g, ' ')} color={tone(m.identityStatus)} /></td>
                      <td className="mono small">{formatUtc(m.observationTimestamp)}</td>
                      <td className="mono small">{formatUtc(m.retrievalTimestamp)}</td>
                      <td><Pill text={m.status.replace(/_/g, ' ')} color={tone(m.status)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small muted">
              Every timestamp above is the value stored with the observation, shown in UTC exactly as recorded.
              No timestamp is generated, estimated or converted to local time.
            </p>

            <p className="small" style={{ marginTop: 14 }}><strong>Evidence per metric</strong>{' '}
              <span className="muted">— open a metric to trace it back to the response it came from.</span></p>
            {allMetricEvidence(shown).map((m) => (
              <details key={m.metric} data-testid={`evidence-detail-${m.metric}`}
                style={{ borderTop: '1px solid var(--border)', padding: '6px 0' }}>
                <summary className="small">
                  <strong>{m.label}</strong>{' '}
                  <span className="muted">
                    {m.value === null
                      ? 'DATA UNAVAILABLE'
                      : `${typeof m.value === 'number' ? formatMeasured(m.value) : m.value} ${m.unit}`}
                    {' · '}{m.source}{' · '}{m.identityStatus.replace(/_/g, ' ')}
                  </span>
                </summary>
                <dl className="small" style={{ margin: '8px 0 0', lineHeight: 1.5 }}>
                  <EvRow label="SOURCE" value={m.source} />
                  <EvRow label="ENDPOINT" value={m.endpoint} mono wrap />
                  <EvRow label="OBSERVED AT" value={formatUtc(m.observationTimestamp)} mono />
                  <EvRow label="RETRIEVED AT" value={formatUtc(m.retrievalTimestamp)} mono />
                  <EvRow label="SYNC ID" value={m.syncId} mono />
                  <EvRow label="ASSET" value={`${m.asset} (${m.ticker})`} />
                  <EvRow label="IDENTITY" value={m.identityStatus.replace(/_/g, ' ')} />
                  <EvRow label="CONTRACT" value={m.contractAddress ?? 'not applicable'} mono wrap />
                  <EvRow label="CHAIN" value={m.chain ?? 'not applicable'} />
                  <EvRow label="VENUE / PAIR"
                    value={m.venue || m.pair ? `${m.venue ?? '—'} · ${m.pair ?? '—'}` : 'not applicable'} />
                  <EvRow label="STATUS"
                    value={`${m.httpStatus === null ? 'no HTTP status' : `HTTP ${m.httpStatus}`} / ${m.status.replace(/_/g, ' ')}`} />
                  <EvRow label="EVIDENCE HASH" value={m.payloadHash ?? 'DATA UNAVAILABLE (no WebCrypto)'} mono wrap />
                  <EvRow label="METHODOLOGY" value={m.methodology} />
                  {m.value === null && <EvRow label="DATA UNAVAILABLE" value={`Reason: ${m.reason ?? 'no reason recorded'}`} />}
                  {m.value !== null && m.reason && <EvRow label="LIMITATION" value={m.reason} />}
                  {m.error && <EvRow label="ERROR" value={m.error} />}
                </dl>
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="toggle" data-testid={`view-raw-${m.metric}`}
                    onClick={() => setRawMetric(rawMetric === m.metric ? null : m.metric)}>
                    {rawMetric === m.metric ? 'Hide Raw Evidence' : 'View Raw Evidence'}
                  </button>
                  <span className="small muted">{m.payloadBytes} bytes{m.truncated ? ' (excerpt)' : ''} preserved with the run</span>
                </div>
                {rawMetric === m.metric && (
                  <div data-testid={`raw-panel-${m.metric}`} style={{ marginTop: 8 }}>
                    <p className="small muted" style={{ wordBreak: 'break-all' }}>
                      {m.payloadBytes} bytes{m.truncated ? ' (excerpt)' : ''} ·{' '}
                      <span className="mono">{m.payloadHash ?? 'no hash'}</span>
                    </p>
                    <pre className="mono small" style={{
                      whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 220, overflow: 'auto',
                      background: 'var(--plane)', padding: 8, borderRadius: 6,
                    }}>{m.payload || '(empty response)'}</pre>
                  </div>
                )}
              </details>
            ))}
          </>
        ) : (
          <div className="na-box">
            <b>NO LIVE SYNC YET</b>
            Nothing is shown until a real retrieval has run in this browser. No placeholder value is displayed
            and no missing field is filled with zero.
          </div>
        )}
      </Card>

      {shown && (
        <Card title="Compare with previous sync"
          hint="Differences between two retrievals of public data. A missing historical value is never inferred.">
          <div className="scroll">
            <table>
              <thead>
                <tr><th>Metric</th><th>Previous</th><th>Current</th><th>Change</th><th>Change %</th><th>Source</th><th>Previous at</th><th>Current at</th><th>Status</th></tr>
              </thead>
              <tbody>
                {compareRuns(shown, previous).map((c) => (
                  <tr key={c.metric} data-testid={`compare-${c.metric}`}>
                    <td className="small"><strong>{c.label}</strong></td>
                    <td>{typeof c.previousValue === 'number' ? formatMeasured(c.previousValue) : <span className="muted">—</span>}</td>
                    <td>{typeof c.currentValue === 'number' ? formatMeasured(c.currentValue)
                      : c.currentValue === null ? <span className="muted">DATA UNAVAILABLE</span> : String(c.currentValue)}</td>
                    <td>{c.absoluteChange === null ? <span className="muted">—</span>
                      : <strong>{c.absoluteChange >= 0 ? '+' : ''}{formatMeasured(c.absoluteChange)}</strong>}</td>
                    <td>{c.percentChange === null ? <span className="muted">—</span>
                      : `${c.percentChange >= 0 ? '+' : ''}${c.percentChange.toFixed(4)}%`}</td>
                    <td className="small muted">{c.source}</td>
                    <td className="mono small">{c.previousTimestamp ?? '—'}</td>
                    <td className="mono small">{c.currentTimestamp ?? '—'}</td>
                    <td className="small">{c.status === 'COMPARED'
                      ? <Pill text="COMPARED" color={tone('COMPARED')} />
                      : <><strong className="muted">COMPARISON UNAVAILABLE</strong>
                        {c.reason && <div className="muted small">{c.reason}</div>}</>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="Sync history" hint="Append-only. Every manual or scheduled sync creates a new record.">
        {rows.length === 0 ? (
          <div className="na-box"><b>NO SYNCS</b>No live market sync has been stored in this browser.</div>
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr><th>Sync ID</th><th>Date</th><th>Trigger</th><th>Completed</th><th>Status</th><th>Sources OK</th><th>Observations</th><th>Unavailable</th><th>Integrity</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setOpenId(r.id)}
                    data-testid={`run-row-${r.id}`}>
                    <td className="mono small"><strong>{r.id}</strong></td>
                    <td className="mono small">{r.date}</td>
                    <td className="small">{r.trigger}</td>
                    <td className="mono small">{r.completedAt}</td>
                    <td><Pill text={r.status} color={tone(r.status)} /></td>
                    <td className="small">{r.sourcesOk}</td>
                    <td className="small">{r.observations}</td>
                    <td className="small">{r.unavailable}</td>
                    <td><Pill text={r.integrity} color={tone(r.integrity)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted">
          Select a row to open that run. A stored run is immutable: a later retrieval is appended under a new
          sync id, and no earlier run is ever rewritten.
        </p>
      </Card>

      {shown && (
        <Card title="Source evidence" hint="One row per source: endpoint, HTTP status, bytes and the SHA-256 of exactly what was returned.">
          <div className="scroll">
            <table>
              <thead>
                <tr><th>Source</th><th>Endpoint</th><th>Method</th><th>HTTP</th><th>Retrieved at</th><th>Bytes</th><th>SHA-256</th><th>Identity</th><th>Status</th></tr>
              </thead>
              <tbody>
                {shown.evidence.map((e) => (
                  <tr key={e.sourceId} data-testid={`evidence-${e.sourceId}`}>
                    <td className="small"><strong>{e.source}</strong><div className="muted mono">{e.sourceId}</div></td>
                    <td className="mono small" style={{ wordBreak: 'break-all' }}>{e.endpoint}</td>
                    <td className="small">{e.method}</td>
                    <td className="mono small">{e.httpStatus ?? '—'}</td>
                    <td className="mono small">{e.retrievalTimestamp}</td>
                    <td className="mono small">{e.payloadBytes}</td>
                    <td className="mono small" style={{ wordBreak: 'break-all' }}>
                      {e.payloadHash ?? <span className="muted">DATA UNAVAILABLE (no WebCrypto)</span>}</td>
                    <td><Pill text={e.identityStatus.replace(/_/g, ' ')} color={tone(e.identityStatus)} /></td>
                    <td><Pill text={e.status} color={tone(e.status)} />
                      {e.error && <div className="muted small">{e.error}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {shown && (
        <Card title="Raw evidence" hint="The response text exactly as received, preserved with the run.">
          {shown.evidence.map((e) => (
            <details key={e.sourceId} style={{ marginBottom: 8 }} data-testid={`raw-${e.sourceId}`}>
              <summary className="small" style={{ wordBreak: 'break-all' }}>
                <strong>{e.source}</strong> <span className="mono muted">{e.sourceId}</span>{' '}
                — {e.payloadBytes} bytes{e.truncated ? ' (excerpt)' : ''}{' · '}
                <span className="mono" style={{ wordBreak: 'break-all' }}>{e.payloadHash ?? 'no hash'}</span>
              </summary>
              <pre className="mono small" style={{
                whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 220, overflow: 'auto',
                background: 'var(--plane)', padding: 8, borderRadius: 6, marginTop: 6,
              }}>{e.payload || '(empty response)'}</pre>
            </details>
          ))}
          <p className="small muted">
            No credential is used by the v1 live sync, so no secret can appear in a raw payload.
          </p>
        </Card>
      )}

      {showExport && shown && (
        <Card title="Export JSON" hint="The same content the download produces, shown here in case downloads are blocked.">
          <textarea readOnly rows={12} data-testid="export-json" style={{
            width: '100%', fontFamily: 'var(--mono, monospace)', fontSize: 11,
            background: 'var(--plane)', color: 'var(--text-primary)',
            border: '1px solid var(--border)', borderRadius: 6, padding: 8,
          }} value={exportRun(shown)} />
        </Card>
      )}

      {assessment && (
        <Card title="Daily assessment — CURRENT — SUT MARKET STATE"
          hint="Built only from this run's observations, the frozen evidence, and documented limitations.">
          <p className="small"><strong>1 · OBSERVATION</strong>{' '}
            <span className="muted">— what this sync actually measured. No interpretation.</span></p>
          <ul className="tight" data-testid="assessment-observation">
            {assessment.observation.map((s, i) => <Line key={`o${i}`} s={s} />)}
          </ul>

          <p className="small"><strong>2 · INTERPRETATION</strong>{' '}
            <span className="muted">— what the measurements may indicate. Causality is never established here.</span></p>
          <ul className="tight" data-testid="assessment-interpretation">
            {assessment.interpretation.map((s, i) => <Line key={`i${i}`} s={s} />)}
          </ul>

          <p className="small"><strong>3 · HISTORICAL EVIDENCE</strong>{' '}
            <span className="muted">— frozen findings, quoted and never rewritten.</span></p>
          <ul className="tight"><Line s={assessment.historicalNote} /></ul>
          <div className="scroll">
            <table>
              <thead><tr><th>Record</th><th>Finding</th><th>Status</th><th>Layer</th></tr></thead>
              <tbody>
                {assessment.historicalEvidence.map((h) => (
                  <tr key={h.id} data-testid={`history-${h.id}`}>
                    <td className="mono small"><strong>{h.id}</strong></td>
                    <td className="small">{h.title}</td>
                    <td className="small">{h.status}</td>
                    <td className="small muted">HISTORICAL EVIDENCE — frozen</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="small" style={{ marginTop: 12 }}><strong>UNRESOLVED</strong>{' '}
            <span className="muted">— what the frozen research leaves open, and what no current snapshot can answer.</span></p>
          <ul className="tight" data-testid="assessment-unresolved">
            {assessment.unresolved.map((s, i) => <Line key={`u${i}`} s={s} />)}
            <Line s={assessment.liquidityComparison} />
          </ul>

          <p className="small" style={{ marginTop: 12 }}><strong>4 · CURRENT PROBLEM / OPPORTUNITY</strong></p>
          <div className="scroll">
            <table>
              <thead><tr><th>Candidate</th><th>Evidence status</th><th>Statement</th></tr></thead>
              <tbody>
                {assessment.problems.map((p) => (
                  <tr key={p.id} data-testid={`problem-${p.id}`}>
                    <td className="small"><strong>{p.title}</strong><div className="muted mono">{p.id}</div></td>
                    <td><Pill text={p.status === 'SUPPORTED_BY_CURRENT_EVIDENCE' ? 'SUPPORTED BY CURRENT EVIDENCE' : 'DATA INSUFFICIENT'}
                      color={p.status === 'SUPPORTED_BY_CURRENT_EVIDENCE' ? 'var(--status-warning)' : 'var(--text-muted)'} /></td>
                    <td className="small">{p.statement.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="small" style={{ marginTop: 12 }}><strong>5 · PROPOSED ACTION</strong>{' '}
            <span className="muted">— for business review. Never executed by this application.</span></p>
          <div className="scroll">
            <table>
              <thead><tr><th>Action</th><th>Scope</th><th>Testable</th><th>Reversibility</th><th>Status</th></tr></thead>
              <tbody>
                {assessment.proposedActions.map((p) => (
                  <tr key={p.id} data-testid={`action-${p.id}`}>
                    <td className="small"><strong>{p.title}</strong>
                      <div className="muted">{p.statement.text}</div></td>
                    <td className="small muted">{p.scope}</td>
                    <td className="small muted">{p.testable}</td>
                    <td className="small muted">{p.reversibility}</td>
                    <td><Pill text={p.status} color="var(--text-muted)" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="small" style={{ marginTop: 12 }}><strong>6 · EXPECTED MEASURABLE EFFECT</strong></p>
          <ul className="tight"><Line s={assessment.expectedMeasurableEffect.statement} /></ul>
          <div className="scroll">
            <table>
              <thead><tr><th>Primary KPI</th><th>Baseline (measured)</th><th>Magnitude</th><th>Run</th><th>Evidence</th><th>Direction</th><th>Target</th></tr></thead>
              <tbody>
                {assessment.expectedMeasurableEffect.primaryKpis.map((k) => (
                  <tr key={k.size} data-testid={`kpi-${k.size}`}>
                    <td className="small"><strong>{k.size}</strong></td>
                    <td>{k.baselineValue === null
                      ? <span className="muted">DATA UNAVAILABLE</span>
                      : <strong>{formatMeasured(k.baselineValue)}%</strong>}</td>
                    <td className="small">{k.baselineRounded}</td>
                    <td className="mono small">{k.runId}</td>
                    <td className="mono small">{k.evidenceId ?? '—'}</td>
                    <td className="small muted">{k.direction.replace(/_/g, ' ').toLowerCase()}</td>
                    <td><strong data-testid={`target-${k.size}`}>BUSINESS APPROVAL REQUIRED</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted">{assessment.expectedMeasurableEffect.baselineNote}{' '}
            {assessment.expectedMeasurableEffect.targetNote}</p>
          {assessment.expectedMeasurableEffect.proposedTargets.length > 0 && (
            <p className="small muted" data-testid="proposed-targets">
              Working proposals (NOT approved):{' '}
              {assessment.expectedMeasurableEffect.proposedTargets
                .map((t) => `${t.size} ≤ ${t.value}% [${t.status}]`).join(' · ')}
            </p>
          )}

          <p className="small" style={{ marginTop: 12 }}><strong>7 · EVIDENCE REQUIRED</strong></p>
          <div className="scroll">
            <table>
              <thead><tr><th>Phase</th><th>Item</th><th>Requirement</th><th>Current state</th></tr></thead>
              <tbody>
                {assessment.evidenceRequirements.map((r) => (
                  <tr key={r.item} data-testid={`evreq-${r.phase}`}>
                    <td className="small muted">{r.phase.replace(/_/g, ' ')}</td>
                    <td className="small"><strong>{r.item}</strong></td>
                    <td className="small muted">{r.requirement}</td>
                    <td className="small">
                      <Pill text={r.satisfied ? 'SATISFIED' : 'REQUIRED'}
                        color={r.satisfied ? 'var(--status-good)' : 'var(--status-critical)'} />
                      <div className="muted">{r.currentState}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="tight" style={{ marginTop: 8 }}>
            {assessment.evidenceRequired.map((s, i) => <Line key={`e${i}`} s={s} />)}
          </ul>

          <p className="small" style={{ marginTop: 12 }}><strong>MEASURED RESULT</strong></p>
          <div className="na-box" data-testid="measured-result">
            <b>{assessment.measuredResult.kind === 'MEASURED_RESULT' ? 'MEASURED RESULT' : 'DATA UNAVAILABLE'}</b>
            {assessment.measuredResult.text}
          </div>

          <p className="small" style={{ marginTop: 12 }}><strong>8 · STATUS</strong></p>
          <div className="row" style={{ gap: 8 }}>
            <span data-testid="live-assessment-status">
              <Pill text={assessment.status} color={assessment.status === 'PROPOSED' ? 'var(--text-muted)' : 'var(--status-warning)'} /></span>
            <span className="small muted">{assessment.statusReason}</span>
          </div>
          <p className="small muted">{assessment.statusNote}</p>
          <Warn><strong>{assessment.governanceGateNote}</strong> No approval, intervention or result is created
            by a market observation. {LAYER_LABELS.governance} advances only through the existing governance
            chain, and only a human/business owner decides whether to approve an intervention.</Warn>
        </Card>
      )}

      <Card title="Live sources (v1)" hint="Public endpoints only. No credentialed API is used in v1.">
        <div className="scroll">
          <table>
            <thead><tr><th>Source</th><th>Metrics</th><th>Identity</th><th>Endpoint</th></tr></thead>
            <tbody>
              {LIVE_SOURCES.map((s) => (
                <tr key={s.id}>
                  <td className="small"><strong>{s.name}</strong><div className="muted mono">{s.id}</div></td>
                  <td className="small muted">{s.metrics.join(' · ')}</td>
                  <td><Pill text={s.identityStatus.replace(/_/g, ' ')} color={tone(s.identityStatus)} /></td>
                  <td className="mono small" style={{ wordBreak: 'break-all' }}>{s.endpoint}</td>
                </tr>
              ))}
              {DEFERRED_SOURCES.map((s) => (
                <tr key={s.id}>
                  <td className="small"><strong>{s.name}</strong><div className="muted mono">{s.id}</div></td>
                  <td className="small muted" colSpan={3}>
                    <strong>DEFERRED — not used in v1.</strong> {s.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
