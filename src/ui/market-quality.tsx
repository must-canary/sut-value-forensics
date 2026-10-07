/**
 * MARKET QUALITY (QA) — screen.
 *
 * A QA layer inside SUT Value Forensics, not a separate application. It reuses
 * the existing design system, the existing live-market ledger, the existing
 * governance state and the frozen EXP-001 baseline.
 *
 * Presentation hierarchy, deliberately in this order:
 *
 *   1 overall status → 2 six dimensions → 3 key findings
 *     → 4 detailed sections (collapsed) → 5 evidence (on demand)
 *
 * The reader should not meet level 5 before understanding level 1. Every detail
 * remains in the DOM when collapsed — nothing is removed, only deferred — so no
 * information is lost and a text search still finds it.
 *
 * This file is presentation only. It calls the QA engine exactly once per
 * ledger/governance change and renders the result; it computes no status,
 * approves nothing and writes nothing.
 */
import { useCallback, useMemo, useState } from 'react'
import { Card, DataUnavailable, Provenance } from './components'
import {
  buildMarketQuality, qaTrend, statusLabel, INSUFFICIENT_TREND, QA_TITLE, QA_WORKFLOW,
  isEvaluated, type MarketQualityReport, type QaDimension, type QaDimensionId,
  type QaOverall, type QaStatus,
} from '../core/market-quality'
import { EXPERIMENT_ID_COLLISION } from '../core/market-quality/transaction-integrity'
import { latestRun, previousRunOf } from '../core/live-market-store'
import { checkRunIntegrity } from '../core/live-market-sync'
import { effectiveState } from '../core/governance-store'
import { EVIDENCE } from '../data/evidence'
import { EXPERIMENT_RUNS } from '../data/experiment-runs'
import { PRE_REGISTRATION } from '../data/pre-registration'
import { baselineImpacts } from '../data/current-state'
import { useLiveLedger } from './live-state'
import { useGovernanceLedger } from './governance-state'
import {
  EvidenceValidationPanel, LiquidityRegressionPanel, MarketDataPanel,
  ResiliencePanel, SecurityPanel, TransactionIntegrityPanel,
} from './market-quality-sections'

/** The page's own one-line description. Short by design — detail lives below. */
const QA_STRAPLINE =
  'Evidence-driven validation of SUT market-supporting systems, data quality, liquidity behaviour, '
  + 'resilience, security and traceability.'

// ───────────────────────────────────────────── shared presentation

export const statusTone = (s: QaStatus | QaOverall): string => {
  switch (s) {
    case 'PASS':
    case 'HEALTHY':
      return 'var(--status-good)'
    case 'WARNING':
      return 'var(--status-warning)'
    case 'FAIL':
    case 'DEGRADED':
      return 'var(--status-critical)'
    case 'BLOCKED':
      return 'var(--status-serious)'
    default:
      // DATA_UNAVAILABLE, NOT_EXECUTED, DATA_INSUFFICIENT are absence, not
      // failure, and must never be coloured like one.
      return 'var(--text-muted)'
  }
}

export function QaChip({ status }: { status: QaStatus | QaOverall }) {
  return (
    <span className="chip" data-qa-status={status}>
      <span className="dot" style={{ background: statusTone(status) }} />
      {statusLabel(status)}
    </span>
  )
}

/** Two-column label/value row that collapses to one column on narrow screens. */
export function KeyVal({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="qa-kv">
      <span className="qa-kv-k">{k}</span>
      <span className="qa-kv-v">{v}</span>
    </div>
  )
}

/**
 * What each dimension actually tested. Added in the UI so a status can never be
 * read as a claim about the whole SUT market: "Security QA — PASS" over
 * "repository-level controls" says precisely what was and was not validated.
 */
const SCOPE: Record<QaDimensionId, string> = {
  'transaction-integrity': 'Observed vs expected transaction',
  'market-data': 'Stored live market evidence',
  'liquidity-regression': 'Frozen baseline vs current observation',
  resilience: 'Repository-level checks',
  security: 'Repository-level controls',
  'evidence-validation': 'QA result traceability',
}

const SECTION_NO: Record<QaDimensionId, number> = {
  'transaction-integrity': 1,
  'market-data': 2,
  'liquidity-regression': 3,
  resilience: 4,
  security: 5,
  'evidence-validation': 6,
}

const firstSentence = (text: string): string => {
  const m = text.match(/^[^.]+\./)
  return (m ? m[0] : text).trim()
}

/**
 * The one-line result on a summary card, derived from the engine's own output.
 * Nothing here is a fixed string keyed to an expected status: a PASS line counts
 * real checks, and an unavailable line quotes the engine's real reason.
 */
function headline(dim: QaDimension): string {
  const evaluated = dim.checks.filter((c) => isEvaluated(c.status)).length
  const passed = dim.checks.filter((c) => c.status === 'PASS').length
  if (dim.status === 'PASS') {
    return `${passed} of ${dim.checks.length} checks executed and passed.`
  }
  // A specific check reason ("No live market sync run is stored.") tells the
  // reader far more than the dimension's generic rollup ("no evaluable data…"),
  // so the concrete one wins. Both come from the engine; only the choice is ours.
  const firstProblem = dim.checks.find((c) => c.status !== 'PASS' && c.reason)
  if (firstProblem?.reason) return firstSentence(firstProblem.reason)
  if (dim.reason) return firstSentence(dim.reason)
  return `${evaluated} of ${dim.checks.length} checks evaluated.`
}

// ───────────────────────────────────────────── accordion

interface SectionProps {
  id: QaDimensionId
  dim: QaDimension
  open: boolean
  onToggle: (id: QaDimensionId) => void
  children: React.ReactNode
}

/**
 * Collapsed by default. The panel stays in the DOM and is hidden, so collapsing
 * defers information rather than discarding it.
 */
function Section({ id, dim, open, onToggle, children }: SectionProps) {
  const btnId = `qa-acc-btn-${id}`
  const panelId = `qa-acc-panel-${id}`
  return (
    <section className="card qa-section" data-testid={`qa-section-${id}`}>
      <h3 className="qa-acc-h">
        <button
          id={btnId}
          type="button"
          className="qa-acc-btn"
          aria-expanded={open}
          aria-controls={panelId}
          data-qa-disclosure="section"
          data-testid={`qa-acc-${id}`}
          onClick={() => onToggle(id)}
        >
          <span className="qa-acc-no">{SECTION_NO[id]}</span>
          <span className="qa-acc-title">
            {dim.title}
            <span className="qa-acc-scope">{SCOPE[id]}</span>
          </span>
          <QaChip status={dim.status} />
          <span className="qa-acc-caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
        </button>
      </h3>
      <div id={panelId} role="region" aria-labelledby={btnId} hidden={!open} className="qa-acc-panel">
        {children}
      </div>
    </section>
  )
}

// ───────────────────────────────────────────── level 1 + 2 + 3

function Hero({ report }: { report: MarketQualityReport }) {
  const { summary } = report
  return (
    <section className="card qa-hero" data-testid="qa-overall">
      <div className="qa-hero-top">
        <div>
          <div className="qa-hero-label">Overall QA status</div>
          <div className="qa-hero-status"><QaChip status={summary.overall} /></div>
        </div>
      </div>
      <p className="qa-hero-reason">{summary.reason}</p>
    </section>
  )
}

function DimensionGrid({ report, onOpen }: {
  report: MarketQualityReport
  onOpen: (id: QaDimensionId) => void
}) {
  return (
    <div className="qa-grid" data-testid="qa-dimension-grid">
      {report.summary.dimensions.map((d) => (
        <div className="qa-dim" key={d.id} data-testid={`qa-dim-${d.id}`}>
          <div className="qa-dim-head">
            <span className="qa-dim-title">{d.title}</span>
            <QaChip status={d.status} />
          </div>
          <div className="qa-dim-scope">{SCOPE[d.id]}</div>
          <p className="qa-dim-line">{headline(d)}</p>
          <div className="qa-dim-foot">
            <span className="qa-dim-count">{d.checks.length} checks</span>
            <button
              type="button"
              className="qa-link"
              data-qa-disclosure="card"
              data-testid={`qa-view-${d.id}`}
              onClick={() => onOpen(d.id)}
            >
              View details <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function MetricsStrip({ report }: { report: MarketQualityReport }) {
  const { summary } = report
  // Evidence records = QA results that carry a usable evidence reference.
  // Derived from the engine's own output; nothing is counted that is not there.
  const withEvidence = summary.dimensions
    .flatMap((d) => d.checks)
    .filter((c) => c.evidence && (c.evidence.source || c.evidence.evidenceId || c.evidence.evidenceHash))
    .length
  const cells: Array<[string, string, string]> = [
    ['QA dimensions', String(summary.dimensions.length), 'validated areas'],
    ['Evaluated', `${summary.evaluated} / ${summary.defined}`, 'checks producing a verdict'],
    ['Evidence records', String(withEvidence), 'results naming their evidence'],
    ['Last evaluation', summary.generatedAt, 'UTC'],
  ]
  return (
    <div className="qa-metrics" data-testid="qa-metrics">
      {cells.map(([k, v, meta]) => (
        <div className="qa-metric" key={k}>
          <div className="qa-metric-k">{k}</div>
          <div className="qa-metric-v">{v}</div>
          <div className="qa-metric-m">{meta}</div>
        </div>
      ))}
    </div>
  )
}

function KeyFindings({ report, onOpen }: {
  report: MarketQualityReport
  onOpen: (id: QaDimensionId) => void
}) {
  // Only dimensions that are not plainly passing are worth a reader's attention.
  const notable = report.summary.dimensions.filter((d) => d.status !== 'PASS')
  return (
    <Card title="Key QA findings"
      hint="Only open items are listed. A passing dimension is shown in the status grid above.">
      <ul className="qa-findings" data-testid="qa-findings">
        {notable.map((d) => (
          <li key={d.id} data-testid={`qa-finding-${d.id}`}>
            <QaChip status={d.status} />
            <div className="qa-finding-body">
              <b>{d.title}</b>
              <div className="qa-finding-reason">{headline(d)}</div>
            </div>
            <button type="button" className="qa-link" data-qa-disclosure="finding"
              onClick={() => onOpen(d.id)}>
              View details <span aria-hidden="true">→</span>
            </button>
          </li>
        ))}
        <li data-testid="qa-finding-governance">
          <span className="chip">
            <span className="dot" style={{ background: 'var(--status-warning)' }} />
            OPEN GOVERNANCE ITEM
          </span>
          <div className="qa-finding-body">
            <b>Experiment identifier collision</b>
            <div className="qa-finding-reason">
              The frozen in-code EXP-002 is unchanged and the public utility audit is referenced by
              document path. No automatic renumbering was performed.
            </div>
          </div>
          <button type="button" className="qa-link" data-qa-disclosure="finding"
            onClick={() => onOpen('transaction-integrity')}>
            View governance details <span aria-hidden="true">→</span>
          </button>
        </li>
      </ul>
    </Card>
  )
}

function Workflow() {
  return (
    <Card title="How this runs"
      hint="The QA layer consumes the existing Live Market / Daily Sync evidence. It starts no second
        market-data ingestion path.">
      <ol className="qa-steps" data-testid="qa-workflow">
        {QA_WORKFLOW.map((w, i) => (
          <li key={w.step}>
            <span className="qa-step-n">{i + 1}</span>
            <span className="qa-step-name">{w.step}</span>
            <span className="qa-step-detail">{w.detail}</span>
          </li>
        ))}
      </ol>
    </Card>
  )
}

// ───────────────────────────────────────────── trends

function Trends({ points }: { points: ReturnType<typeof qaTrend> }) {
  if (points.length === 0) {
    return (
      <Card title="Trends" hint="Shown only where enough real stored observations exist.">
        <DataUnavailable what={INSUFFICIENT_TREND}
          why="At least two comparable stored runs are required. Each Live Market Sync appends one
            immutable run; no trend point is manufactured in the meantime." />
      </Card>
    )
  }
  return (
    <Card title="Trends" hint={`Built from ${points.length} stored sync run(s). No value is interpolated.`}>
      <div className="scroll">
        <table className="qa-table" data-testid="qa-trend-table">
          <thead>
            <tr>
              <th>Sync</th><th>Date</th><th>Snapshot completeness</th>
              <th>Source health</th><th>Unavailable observations</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.syncId}>
                <td className="mono">{p.syncId}</td>
                <td className="mono">{p.date}</td>
                <td>{p.completeness === null ? 'DATA UNAVAILABLE' : `${p.completeness.toFixed(0)}%`}</td>
                <td>{p.sourceHealth === null ? 'DATA UNAVAILABLE' : `${p.sourceHealth.toFixed(0)}%`}</td>
                <td>{p.unavailable}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Provenance
        period={`${points[0]!.date} → ${points[points.length - 1]!.date}`}
        source="stored Live Market Sync runs (append-only ledger)"
        methodology="completeness = snapshot fields carrying a value / snapshot fields defined; source health
          = sources validated / sources attempted. Read from the stored runs, never recomputed."
        limitations={['A run that was never performed is absent, never backfilled.']}
      />
    </Card>
  )
}

// ───────────────────────────────────────────── screen

export function MarketQuality() {
  const liveLedger = useLiveLedger()
  const govLedger = useGovernanceLedger()
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const report = useMemo<MarketQualityReport>(() => {
    const verified = liveLedger.runs.filter((r) => checkRunIntegrity(r) === 'OK')
    const latest = latestRun(liveLedger)
    const previous = previousRunOf(liveLedger, latest)
    const gov = effectiveState(govLedger, PRE_REGISTRATION).state

    // Frozen EXP-001 impacts, READ from the baseline captures. The $100,000 slot
    // is carried through as not-executable rather than dropped or filled in.
    const impacts = baselineImpacts().map((b) => ({
      size: b.size,
      value: b.value,
      runId: b.runId,
      evidenceId: b.evidenceId,
      notExecutable: b.value === null,
    }))

    return buildMarketQuality({
      runs: verified,
      latest,
      previous,
      impacts,
      gov,
      frozen: EVIDENCE,
      knownExperimentIds: EXPERIMENT_RUNS.map((e: { id: string }) => e.id),
      // No expected-transaction context is connected, so this is empty and the
      // dimension reports DATA UNAVAILABLE with that reason.
      transactionCases: [],
      nowIso: new Date().toISOString(),
    })
  }, [liveLedger, govLedger])

  const points = useMemo(
    () => qaTrend(liveLedger.runs.filter((r) => checkRunIntegrity(r) === 'OK')),
    [liveLedger],
  )

  const toggle = useCallback((id: QaDimensionId) => {
    setOpen((o) => ({ ...o, [id]: !o[id] }))
  }, [])

  /** "View details" opens the section and brings it into view. */
  const openSection = useCallback((id: QaDimensionId) => {
    setOpen((o) => ({ ...o, [id]: true }))
    requestAnimationFrame(() => {
      document.querySelector(`[data-testid="qa-section-${id}"]`)
        ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      document.getElementById(`qa-acc-btn-${id}`)?.focus()
    })
  }, [])

  const sec = (id: QaDimensionId, dim: QaDimension, body: React.ReactNode) => (
    <Section id={id} dim={dim} open={!!open[id]} onToggle={toggle}>{body}</Section>
  )

  return (
    <>
      <h2>{QA_TITLE}</h2>
      <p className="hint" data-testid="qa-purpose">{QA_STRAPLINE}</p>

      {/* level 1 */}
      <Hero report={report} />

      {/* level 2 */}
      <DimensionGrid report={report} onOpen={openSection} />
      <MetricsStrip report={report} />

      {/* level 3 */}
      <KeyFindings report={report} onOpen={openSection} />
      <Workflow />

      {/* level 4 + 5 — collapsed by default, nothing removed */}
      <h3 className="qa-details-h">Detailed QA results</h3>
      <p className="hint">
        Every check, reason and evidence reference remains available. Sections are collapsed so the
        status above can be read first.
      </p>

      {sec('transaction-integrity', report.transaction,
        <TransactionIntegrityPanel dim={report.transaction} collision={EXPERIMENT_ID_COLLISION} />)}
      {sec('market-data', report.marketData, <MarketDataPanel dim={report.marketData} />)}
      {sec('liquidity-regression', report.liquidity,
        <LiquidityRegressionPanel dim={report.liquidity} />)}
      {sec('resilience', report.resilience, <ResiliencePanel dim={report.resilience} />)}
      {sec('security', report.security, <SecurityPanel dim={report.security} />)}
      {sec('evidence-validation', report.evidence,
        <EvidenceValidationPanel dim={report.evidence} />)}

      <Trends points={points} />
    </>
  )
}
