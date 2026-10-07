/**
 * MARKET QUALITY (QA) — the six dimension panels.
 *
 * Presentation only. Every status, reason and evidence reference is read from the
 * core module; nothing is computed, inferred or defaulted here. Where a value is
 * absent the panel prints DATA UNAVAILABLE or NOT EXECUTED with the reason the
 * core supplied, never a blank and never a substituted success.
 *
 * These panels render inside a collapsed accordion, so they are free to be
 * detailed — but a repeated identical reason is lifted into one shared block
 * rather than printed on every row.
 */
import { useMemo, useState } from 'react'
import { Card, DataUnavailable } from './components'
import { KeyVal, QaChip } from './market-quality'
import { isEvaluated, type QaCheck, type QaDimension, type QaEvidenceRef, type QaStatus } from '../core/market-quality'
import { BASELINE_NOT_A_THRESHOLD, type RegressionRow } from '../core/market-quality/liquidity-regression'
import type { ScenarioResult } from '../core/market-quality/resilience'
import type { SecurityResult } from '../core/market-quality/security'
import type { TraceRow } from '../core/market-quality/evidence-validation'
import type { TransactionCase, TxFieldResult } from '../core/market-quality/transaction-integrity'

const dash = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === '' ? '—' : String(v)

/** Evidence detail, collapsed so a long table stays readable on a phone. */
function EvidenceDetails({ e }: { e: QaEvidenceRef | null }) {
  if (!e) return <span className="muted small">no evidence reference</span>
  const rows: Array<[string, string | number | null]> = [
    ['Evidence ID', e.evidenceId],
    ['Source', e.source],
    ['Source URL', e.sourceUrl],
    ['Retrieved at', e.retrievedAt],
    ['Observed at', e.observedAt],
    ['Metric', e.metric],
    ['Value', e.value],
    ['Unit', e.unit],
    ['Symbol', e.symbol],
    ['Source status', e.sourceStatus],
    ['Provenance', e.provenance],
    ['Evidence hash', e.evidenceHash],
    ['Related experiment', e.relatedExperiment],
    ['Related sync', e.relatedSyncId],
  ]
  const present = rows.filter(([, v]) => v !== null && v !== undefined && v !== '')
  if (present.length === 0) return <span className="muted small">no evidence reference</span>
  return (
    <details className="qa-ev">
      <summary>{present.length} field(s)</summary>
      <div className="qa-ev-body">
        {rows.map(([k, v]) => (
          <KeyVal key={k} k={k}
            v={v === null || v === undefined || v === ''
              ? <span className="muted">DATA UNAVAILABLE</span>
              : <span className="mono">{String(v)}</span>} />
        ))}
      </div>
    </details>
  )
}

/**
 * When every non-passing check shares one reason, print it once above the table
 * and leave the per-row cell as a pointer. Repeating the same paragraph on eight
 * rows is noise, not thoroughness.
 */
function sharedReason(checks: QaCheck[]): string | null {
  const reasons = [...new Set(checks.filter((c) => c.reason).map((c) => c.reason!))]
  return reasons.length === 1 && checks.filter((c) => c.reason).length > 2 ? reasons[0]! : null
}

function SharedNote({ text }: { text: string }) {
  return (
    <div className="qa-shared-note" data-testid="qa-shared-reason">
      <b>Reason for every unavailable check below</b>
      <div>{text}</div>
    </div>
  )
}

/** The standard compact check table. */
function CheckTable({ checks, testId, shared }: {
  checks: QaCheck[]; testId: string; shared: string | null
}) {
  return (
    <div className="scroll">
      <table className="qa-table" data-testid={testId}>
        <thead>
          <tr>
            <th className="col-status">Status</th>
            <th className="col-check">Check</th>
            <th>Result</th>
            <th>Reason</th>
            <th className="col-ev">Evidence</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((c) => (
            <tr key={c.id} data-testid={`qa-check-${c.id}`}>
              <td><QaChip status={c.status} /></td>
              <td>
                {c.label}
                {c.expected && <div className="muted xsmall">expected: {c.expected}</div>}
              </td>
              <td className="small">{dash(c.actual)}</td>
              <td className="small">
                {!c.reason ? '—' : shared && c.reason === shared
                  ? <span className="muted">see the shared reason above</span>
                  : c.reason}
              </td>
              <td><EvidenceDetails e={c.evidence} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Counts by status, so each panel can state its own composition at a glance. */
function Tally({ checks }: { checks: Array<{ status: QaStatus }> }) {
  const by = (s: QaStatus) => checks.filter((c) => c.status === s).length
  const parts: Array<[QaStatus, number]> = (
    ['PASS', 'WARNING', 'FAIL', 'DATA_UNAVAILABLE', 'NOT_EXECUTED', 'BLOCKED'] as QaStatus[]
  ).map((s) => [s, by(s)])
  return (
    <div className="qa-tally">
      {parts.filter(([, n]) => n > 0).map(([s, n]) => (
        <span key={s} className="qa-tally-item"><QaChip status={s} /> <b>{n}</b></span>
      ))}
    </div>
  )
}

// ───────────────────────────────────────────── 1. transaction integrity

export function TransactionIntegrityPanel({ dim, collision }: {
  dim: QaDimension & { cases: Array<{ c: TransactionCase; fields: TxFieldResult[] }> }
  collision: string
}) {
  return (
    <>
      <p className="qa-panel-purpose">{dim.purpose}</p>
      <Tally checks={dim.checks} />
      {dim.cases.length === 0 ? (
        <DataUnavailable
          what="Expected versus actual transaction comparison cannot be evaluated."
          why={dim.checks[0]?.reason ?? 'No expected transaction context is connected.'} />
      ) : (
        dim.cases.map(({ c, fields }) => (
          <div key={c.id} className="qa-case">
            <h4>{c.label}</h4>
            <div className="scroll">
              <table className="qa-table" data-testid={`qa-tx-${c.id}`}>
                <thead>
                  <tr><th className="col-status">Status</th><th>Field</th><th>Expected</th>
                    <th>Actual</th><th>Reason</th></tr>
                </thead>
                <tbody>
                  {fields.map((f) => (
                    <tr key={f.field}>
                      <td><QaChip status={f.status} /></td>
                      <td>{f.label}</td>
                      <td className="mono small">{dash(f.expected)}</td>
                      <td className="mono small">{dash(f.actual)}</td>
                      <td className="small">{f.reason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
      <p className="small muted">
        The comparator is implemented and tested for all nine fields. It stays unevaluated until both an
        expected and an observed transaction are supplied. No expected value is invented, and no
        transaction is generated.
      </p>
      <div className="na-box" data-testid="qa-id-collision">
        <b>OPEN GOVERNANCE ITEM — EXPERIMENT IDENTIFIER COLLISION</b>
        <div style={{ marginTop: 6 }}>{collision}</div>
      </div>
    </>
  )
}

// ───────────────────────────────────────────── 2. market data

export function MarketDataPanel({ dim }: { dim: QaDimension }) {
  const shared = sharedReason(dim.checks)
  return (
    <>
      <p className="qa-panel-purpose">{dim.purpose}</p>
      <Tally checks={dim.checks} />
      {shared && <SharedNote text={shared} />}
      <CheckTable checks={dim.checks} testId="qa-market-data-table" shared={shared} />
      <p className="small muted">
        Cross-source deviation is computed only where two independent sources genuinely supply the same
        metric and both values are real numbers. A missing counterpart is reported as DATA UNAVAILABLE —
        agreement is never assumed from absence.
      </p>
    </>
  )
}

// ───────────────────────────────────────────── 3. liquidity regression

function verdictChip(r: RegressionRow) {
  const text = r.verdict === 'NO_REGRESSION' ? 'NO REGRESSION'
    : r.verdict === 'REGRESSION_DETECTED' ? 'REGRESSION DETECTED'
    : 'DATA UNAVAILABLE'
  const color = r.verdict === 'NO_REGRESSION' ? 'var(--status-good)'
    : r.verdict === 'REGRESSION_DETECTED' ? 'var(--status-critical)'
    : 'var(--text-muted)'
  return <span className="chip"><span className="dot" style={{ background: color }} />{text}</span>
}

const fmtChange = (r: RegressionRow): string => {
  if (r.change === null) return 'DATA UNAVAILABLE'
  const unitWord = r.unit === 'percent' ? ' percentage points' : ` ${r.unit}`
  const sign = r.change > 0 ? '+' : ''
  const pctPart = r.changePct === null ? '' : ` (${r.changePct > 0 ? '+' : ''}${r.changePct.toFixed(1)}%)`
  return `${sign}${r.change.toLocaleString(undefined, { maximumFractionDigits: 2 })}${unitWord}${pctPart}`
}

export function LiquidityRegressionPanel({ dim }: { dim: QaDimension & { rows: RegressionRow[] } }) {
  const comparable = dim.rows.filter((r) => r.current !== null).length
  const withBaseline = dim.rows.filter((r) => r.baseline !== null).length
  // The clearest statement of this dimension is the pair of availabilities, so
  // lead with it rather than making the reader infer it from the table.
  const why = dim.rows.find((r) => r.id.startsWith('lr-impact-') && r.reason)?.reason ?? null
  return (
    <>
      <p className="qa-panel-purpose">{dim.purpose}</p>
      <div className="qa-facts" data-testid="qa-lr-facts">
        <div className="qa-fact">
          <div className="qa-fact-k">EXP-001 baseline</div>
          <div className="qa-fact-v">{withBaseline > 0 ? 'Available' : 'DATA UNAVAILABLE'}</div>
          <div className="qa-fact-m">{withBaseline} of {dim.rows.length} rows carry a reference value</div>
        </div>
        <div className="qa-fact">
          <div className="qa-fact-k">Current comparable observation</div>
          <div className="qa-fact-v">{comparable > 0 ? 'Available' : 'Unavailable'}</div>
          <div className="qa-fact-m">{comparable} of {dim.rows.length} rows have a current value</div>
        </div>
      </div>
      {why && (
        <div className="qa-shared-note" data-testid="qa-lr-why">
          <b>Why</b>
          <div>{why}</div>
          <b style={{ marginTop: 8 }}>Next required input</b>
          <div>A comparable observation captured with the identical EXP-001 measurement method.</div>
        </div>
      )}
      <div className="na-box" data-testid="qa-baseline-not-threshold">
        <b>BASELINE IS NOT A THRESHOLD</b>
        <div style={{ marginTop: 6 }}>{BASELINE_NOT_A_THRESHOLD}</div>
      </div>
      <div className="scroll">
        <table className="qa-table" data-testid="qa-liquidity-table">
          <thead>
            <tr>
              <th className="col-status">Result</th><th>Metric</th><th>Baseline</th>
              <th>Current</th><th>Change</th><th>Reason</th><th className="col-ev">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {dim.rows.map((r) => (
              <tr key={r.id} data-testid={`qa-lr-${r.id}`}>
                <td>{verdictChip(r)}</td>
                <td>{r.metric}</td>
                <td>
                  <span className="mono">{r.baselineLabel}</span>
                  <div className="muted xsmall">{r.baselineSource}</div>
                </td>
                <td className="mono">
                  {r.current === null
                    ? <span className="muted">DATA UNAVAILABLE</span>
                    : `${r.current.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${r.unit}`}
                </td>
                <td className="mono small">{fmtChange(r)}</td>
                <td className="small">
                  {!r.reason ? '—' : r.reason === why
                    ? <span className="muted">see “Why” above</span> : r.reason}
                </td>
                <td><EvidenceDetails e={r.evidence} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        Price impact is compared by absolute magnitude, matching EXP-001's <span className="mono">
        LOWER_IS_BETTER</span> rule. A regression here is a divergence flagged for human review; it is not
        a business acceptance decision, and it registers and approves nothing.
      </p>
    </>
  )
}

// ───────────────────────────────────────────── 4. resilience

const KIND_LABEL: Record<ScenarioResult['kind'], string> = {
  EXECUTABLE: 'Executed',
  EVIDENCE_LED: 'Evidence-led',
  EXTERNAL: 'Not executed',
}

export function ResiliencePanel({ dim }: { dim: QaDimension & { scenarios: ScenarioResult[] } }) {
  const executed = dim.scenarios.filter((s) => s.evaluatedAt !== null).length
  return (
    <>
      <p className="qa-panel-purpose">{dim.purpose}</p>
      <Tally checks={dim.checks} />
      <p className="small muted">
        {executed} of {dim.scenarios.length} scenarios were actually executed here. The remainder state the
        dependency they need — none is shown as passing.
      </p>
      <div className="scroll">
        <table className="qa-table" data-testid="qa-resilience-table">
          <thead>
            <tr>
              <th className="col-status">Status</th><th>Scenario</th><th className="col-kind">Kind</th>
              <th>Expected behaviour</th><th>Result</th><th>Evidence</th><th>Executed at</th>
            </tr>
          </thead>
          <tbody>
            {dim.scenarios.map((s) => (
              <tr key={s.id} data-testid={`qa-res-${s.id}`}>
                <td><QaChip status={s.status} /></td>
                <td>{s.scenario}</td>
                <td><span className={`qa-kind qa-kind-${s.kind.toLowerCase()}`}>{KIND_LABEL[s.kind]}</span></td>
                <td className="small">{s.expectedBehaviour}</td>
                <td className="small">{s.result ?? (s.reason ?? '—')}</td>
                <td className="small">{dash(s.evidence)}</td>
                <td className="mono xsmall">{dash(s.evaluatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ───────────────────────────────────────────── 5. security

export function SecurityPanel({ dim }: { dim: QaDimension & { results: SecurityResult[] } }) {
  const executed = dim.results.filter((r) => r.evaluatedAt !== null).length
  return (
    <>
      <p className="qa-panel-purpose">{dim.purpose}</p>
      <Tally checks={dim.checks} />
      <p className="small muted">
        {executed} of {dim.results.length} controls were executed here against real repository functions
        and real stored evidence. Controls needing an external runtime are reported as not executed. This
        is not an ecosystem-wide security statement.
      </p>
      <div className="scroll">
        <table className="qa-table" data-testid="qa-security-table">
          <thead>
            <tr>
              <th className="col-status">Status</th><th>Control</th><th className="col-kind">Executable</th>
              <th>Requirement</th><th>Result</th><th>Executed at</th>
            </tr>
          </thead>
          <tbody>
            {dim.results.map((r) => (
              <tr key={r.id} data-testid={`qa-sec-${r.id}`}>
                <td><QaChip status={r.status} /></td>
                <td>{r.control}</td>
                <td>
                  <span className={`qa-kind qa-kind-${r.executable ? 'executable' : 'external'}`}>
                    {r.executable ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="small">{r.requirement}</td>
                <td className="small">{r.result ?? (r.reason ?? '—')}</td>
                <td className="mono xsmall">{dash(r.evaluatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ───────────────────────────────────────────── 6. evidence validation

const FILTERS: Array<{ id: string; label: string; match: (s: string) => boolean }> = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'PASS', label: 'Pass', match: (s) => s === 'PASS' },
  { id: 'WARNING', label: 'Warning', match: (s) => s === 'WARNING' },
  { id: 'FAIL', label: 'Fail', match: (s) => s === 'FAIL' },
  { id: 'DATA_UNAVAILABLE', label: 'Data unavailable', match: (s) => s === 'DATA_UNAVAILABLE' },
  { id: 'NOT_EXECUTED', label: 'Not executed', match: (s) => s === 'NOT_EXECUTED' },
]

export function EvidenceValidationPanel({ dim }: { dim: QaDimension & { rows: TraceRow[] } }) {
  const [filter, setFilter] = useState('all')
  const active = FILTERS.find((f) => f.id === filter) ?? FILTERS[0]!
  const rows = useMemo(() => dim.rows.filter((r) => active.match(r.status)), [dim.rows, active])

  const traceable = dim.rows.filter((r) => r.traceable).length
  const evaluated = dim.rows.filter((r) => isEvaluated(r.status as QaStatus)).length
  const unavailable = dim.rows.filter((r) => r.status === 'DATA_UNAVAILABLE').length

  return (
    <>
      <p className="qa-panel-purpose">{dim.purpose}</p>
      <div className="qa-facts" data-testid="qa-ev-facts">
        <div className="qa-fact">
          <div className="qa-fact-k">Traceable coverage</div>
          <div className="qa-fact-v">{traceable} / {dim.rows.length}</div>
          <div className="qa-fact-m">upstream results naming source, metric and methodology</div>
        </div>
        <div className="qa-fact">
          <div className="qa-fact-k">Evaluated</div>
          <div className="qa-fact-v">{evaluated}</div>
          <div className="qa-fact-m">upstream results producing a verdict</div>
        </div>
        <div className="qa-fact">
          <div className="qa-fact-k">Data unavailable</div>
          <div className="qa-fact-v">{unavailable}</div>
          <div className="qa-fact-m">never counted as a failure</div>
        </div>
      </div>

      <h4>Validation checks</h4>
      <CheckTable checks={dim.checks} testId="qa-evidence-table" shared={sharedReason(dim.checks)} />

      <h4>Evidence coverage — every upstream QA result</h4>
      <div className="qa-filters" role="group" aria-label="Filter evidence coverage by status"
        data-testid="qa-ev-filters">
        {FILTERS.map((f) => {
          const n = dim.rows.filter((r) => f.match(r.status)).length
          return (
            <button key={f.id} type="button" data-qa-disclosure="filter"
              data-testid={`qa-ev-filter-${f.id}`}
              className={`qa-filter${filter === f.id ? ' is-active' : ''}`}
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}>
              {f.label} <span className="qa-filter-n">{n}</span>
            </button>
          )
        })}
      </div>
      <div className="scroll">
        <table className="qa-table" data-testid="qa-trace-table">
          <thead>
            <tr>
              <th className="col-status">Status</th><th>Check</th><th className="col-kind">Traceable</th>
              <th>Missing</th><th className="col-ev">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.checkId}>
                <td><QaChip status={r.status as QaStatus} /></td>
                <td className="small">{r.label}</td>
                <td>
                  <span className={`qa-kind qa-kind-${r.traceable ? 'executable' : 'external'}`}>
                    {r.traceable ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="small">{r.missing.length ? r.missing.join(', ') : '—'}</td>
                <td><EvidenceDetails e={r.evidence} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <p className="small muted" data-testid="qa-ev-empty">
          No upstream result currently carries this status. The filter is showing an empty set, which is
          not a finding.
        </p>
      )}
    </>
  )
}

/** Re-exported so the screen can keep its single Card import surface. */
export { Card }
