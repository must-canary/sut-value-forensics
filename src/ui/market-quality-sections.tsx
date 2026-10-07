/**
 * MARKET QUALITY (QA) — the six dimension panels.
 *
 * Presentation only. Every status, reason and evidence reference is read from the
 * core module; nothing is computed, inferred or defaulted here. Where a value is
 * absent the panel prints DATA UNAVAILABLE or NOT EXECUTED with the reason the
 * core supplied, never a blank and never a substituted success.
 */
import { Card, DataUnavailable } from './components'
import { KeyVal, QaChip } from './market-quality'
import type { QaCheck, QaDimension, QaEvidenceRef } from '../core/market-quality'
import type { RegressionRow } from '../core/market-quality/liquidity-regression'
import type { ScenarioResult } from '../core/market-quality/resilience'
import type { SecurityResult } from '../core/market-quality/security'
import type { TraceRow } from '../core/market-quality/evidence-validation'
import {
  EXPERIMENT_ID_COLLISION,
  type TransactionCase, type TxFieldResult,
} from '../core/market-quality/transaction-integrity'

const dash = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === '' ? '—' : String(v)

/** Evidence detail, collapsed by default so a long table stays readable on a phone. */
function EvidenceDetails({ e }: { e: QaEvidenceRef | null }) {
  if (!e) {
    return <span className="muted small">no evidence reference</span>
  }
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
  if (present.length === 0) {
    return <span className="muted small">no evidence reference</span>
  }
  return (
    <details className="qa-ev">
      <summary>{present.length} evidence field(s)</summary>
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

/** The standard check table, used by the dimensions that do not need a custom shape. */
function CheckTable({ checks, testId }: { checks: QaCheck[]; testId: string }) {
  return (
    <div className="scroll">
      <table data-testid={testId}>
        <thead>
          <tr>
            <th>Check</th><th>Status</th><th>Expected</th><th>Actual</th><th>Reason</th><th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((c) => (
            <tr key={c.id} data-testid={`qa-check-${c.id}`}>
              <td>{c.label}</td>
              <td><QaChip status={c.status} /></td>
              <td className="small">{dash(c.expected)}</td>
              <td className="small">{dash(c.actual)}</td>
              <td className="small">{c.reason ?? '—'}</td>
              <td><EvidenceDetails e={c.evidence} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DimHeader({ dim }: { dim: QaDimension }) {
  return (
    <div className="qa-dim-header">
      <QaChip status={dim.status} />
      {dim.reason && <span className="small muted">{dim.reason}</span>}
    </div>
  )
}

// ───────────────────────────────────────────── 1. transaction integrity

export function TransactionIntegrityPanel({ dim }: {
  dim: QaDimension & { cases: Array<{ c: TransactionCase; fields: TxFieldResult[] }> }
}) {
  const unavailable = dim.cases.length === 0
  return (
    <Card title="1 · Transaction Integrity QA" hint={dim.purpose}>
      <DimHeader dim={dim} />
      {unavailable ? (
        <DataUnavailable
          what="Expected versus actual transaction comparison cannot be evaluated."
          why={dim.checks[0]?.reason ?? 'No expected transaction context is connected.'} />
      ) : (
        dim.cases.map(({ c, fields }) => (
          <div key={c.id} className="qa-case">
            <h4>{c.label}</h4>
            <div className="scroll">
              <table data-testid={`qa-tx-${c.id}`}>
                <thead>
                  <tr><th>Field</th><th>Expected</th><th>Actual</th><th>Status</th><th>Reason</th></tr>
                </thead>
                <tbody>
                  {fields.map((f) => (
                    <tr key={f.field}>
                      <td>{f.label}</td>
                      <td className="mono small">{dash(f.expected)}</td>
                      <td className="mono small">{dash(f.actual)}</td>
                      <td><QaChip status={f.status} /></td>
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
        expected and an observed transaction are supplied. No expected value is invented, and no transaction
        is generated.
      </p>
      <div className="na-box" data-testid="qa-id-collision">
        <b>EXPERIMENT IDENTIFIER COLLISION — OPEN GOVERNANCE ITEM</b>
        <div style={{ marginTop: 6 }}>{EXPERIMENT_ID_COLLISION}</div>
      </div>
    </Card>
  )
}

// ───────────────────────────────────────────── 2. market data

export function MarketDataPanel({ dim }: { dim: QaDimension }) {
  return (
    <Card title="2 · Market Data QA" hint={dim.purpose}>
      <DimHeader dim={dim} />
      <CheckTable checks={dim.checks} testId="qa-market-data-table" />
      <p className="small muted">
        Cross-source deviation is computed only where two independent sources genuinely supply the same
        metric and both values are real numbers. A missing counterpart is reported as DATA UNAVAILABLE —
        agreement is never assumed from absence.
      </p>
    </Card>
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

export function LiquidityRegressionPanel({ dim, note }: {
  dim: QaDimension & { rows: RegressionRow[] }
  note: string
}) {
  return (
    <Card title="3 · Liquidity Regression" hint={dim.purpose}>
      <DimHeader dim={dim} />
      <div className="na-box" data-testid="qa-baseline-not-threshold">
        <b>BASELINE IS NOT A THRESHOLD</b>
        <div style={{ marginTop: 6 }}>{note}</div>
      </div>
      <div className="scroll">
        <table data-testid="qa-liquidity-table">
          <thead>
            <tr>
              <th>Metric</th><th>Baseline</th><th>Current</th><th>Change</th>
              <th>Result</th><th>Reason</th><th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {dim.rows.map((r) => (
              <tr key={r.id} data-testid={`qa-lr-${r.id}`}>
                <td>{r.metric}</td>
                <td>
                  <span className="mono">{r.baselineLabel}</span>
                  <div className="muted small">{r.baselineSource}</div>
                </td>
                <td className="mono">
                  {r.current === null
                    ? <span className="muted">DATA UNAVAILABLE</span>
                    : `${r.current.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${r.unit}`}
                </td>
                <td className="mono small">{fmtChange(r)}</td>
                <td>{verdictChip(r)}</td>
                <td className="small">{r.reason ?? '—'}</td>
                <td><EvidenceDetails e={r.evidence} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        Price impact is compared by absolute magnitude, matching EXP-001's <span className="mono">
        LOWER_IS_BETTER</span> rule. A regression here is a divergence flagged for human review; it is not a
        business acceptance decision, and it registers and approves nothing.
      </p>
    </Card>
  )
}

// ───────────────────────────────────────────── 4. resilience

export function ResiliencePanel({ dim }: { dim: QaDimension & { scenarios: ScenarioResult[] } }) {
  const executed = dim.scenarios.filter((s) => s.evaluatedAt !== null).length
  return (
    <Card title="4 · Resilience Testing" hint={dim.purpose}>
      <DimHeader dim={dim} />
      <p className="small muted">
        {executed} of {dim.scenarios.length} scenarios were actually executed in this environment. The
        remainder report NOT EXECUTED with the dependency they need — none is shown as passing.
      </p>
      <div className="scroll">
        <table data-testid="qa-resilience-table">
          <thead>
            <tr>
              <th>Scenario</th><th>Kind</th><th>Status</th><th>Expected behaviour</th>
              <th>Result</th><th>Evidence</th><th>Executed at</th>
            </tr>
          </thead>
          <tbody>
            {dim.scenarios.map((s) => (
              <tr key={s.id} data-testid={`qa-res-${s.id}`}>
                <td>{s.scenario}</td>
                <td><span className="mono small">{s.kind}</span></td>
                <td><QaChip status={s.status} /></td>
                <td className="small">{s.expectedBehaviour}</td>
                <td className="small">{s.result ?? (s.reason ?? '—')}</td>
                <td className="small">{dash(s.evidence)}</td>
                <td className="mono small">{dash(s.evaluatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ───────────────────────────────────────────── 5. security

export function SecurityPanel({ dim }: { dim: QaDimension & { results: SecurityResult[] } }) {
  const executed = dim.results.filter((r) => r.evaluatedAt !== null).length
  return (
    <Card title="5 · Security QA" hint={dim.purpose}>
      <DimHeader dim={dim} />
      <p className="small muted">
        {executed} of {dim.results.length} controls were executed here against real repository functions and
        real stored evidence. Controls that need an external runtime report NOT EXECUTED.
      </p>
      <div className="scroll">
        <table data-testid="qa-security-table">
          <thead>
            <tr>
              <th>Control</th><th>Executable</th><th>Status</th><th>Requirement</th>
              <th>Result</th><th>Executed at</th>
            </tr>
          </thead>
          <tbody>
            {dim.results.map((r) => (
              <tr key={r.id} data-testid={`qa-sec-${r.id}`}>
                <td>{r.control}</td>
                <td className="mono small">{r.executable ? 'yes' : 'no'}</td>
                <td><QaChip status={r.status} /></td>
                <td className="small">{r.requirement}</td>
                <td className="small">{r.result ?? (r.reason ?? '—')}</td>
                <td className="mono small">{dash(r.evaluatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ───────────────────────────────────────────── 6. evidence validation

export function EvidenceValidationPanel({ dim }: { dim: QaDimension & { rows: TraceRow[] } }) {
  const traceable = dim.rows.filter((r) => r.traceable).length
  return (
    <Card title="6 · Evidence Validation" hint={dim.purpose}>
      <DimHeader dim={dim} />
      <CheckTable checks={dim.checks} testId="qa-evidence-table" />
      <h4>Traceability of every upstream QA result</h4>
      <p className="small muted">
        {traceable} of {dim.rows.length} upstream results can name a source, a metric and a methodology.
        A result that cannot is listed here rather than quietly presented as evidence-backed.
      </p>
      <div className="scroll">
        <table data-testid="qa-trace-table">
          <thead>
            <tr><th>Check</th><th>Status</th><th>Traceable</th><th>Missing</th><th>Evidence</th></tr>
          </thead>
          <tbody>
            {dim.rows.map((r) => (
              <tr key={r.checkId}>
                <td className="small">{r.label}</td>
                <td><QaChip status={r.status as QaCheck['status']} /></td>
                <td className="mono small">{r.traceable ? 'yes' : 'no'}</td>
                <td className="small">{r.missing.length ? r.missing.join(', ') : '—'}</td>
                <td><EvidenceDetails e={r.evidence} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
