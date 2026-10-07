/**
 * MARKET QUALITY (QA) — screen.
 *
 * A QA layer inside SUT Value Forensics, not a separate application. It reuses
 * the existing design system, the existing live-market ledger, the existing
 * governance state and the frozen EXP-001 baseline. It renders no control that
 * could approve, register or execute anything.
 */
import { useMemo } from 'react'
import { Card, DataUnavailable, Provenance, Tile, Warn } from './components'
import {
  buildMarketQuality, qaTrend, statusLabel, INSUFFICIENT_TREND, QA_PURPOSE, QA_SCOPE_STATEMENT,
  QA_TITLE, QA_WORKFLOW, type MarketQualityReport, type QaOverall, type QaStatus,
} from '../core/market-quality'
import { BASELINE_NOT_A_THRESHOLD } from '../core/market-quality/liquidity-regression'
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
      // DATA_UNAVAILABLE, NOT_EXECUTED, DATA_INSUFFICIENT — absence, not failure.
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

// ───────────────────────────────────────────── summary

function Summary({ report }: { report: MarketQualityReport }) {
  const { summary } = report
  return (
    <>
      <Card title="Market Quality"
        hint="One categorical status per dimension. There is deliberately no numeric quality score: a score
          would need a documented, deterministic and approved scoring methodology, and none exists.">
        <div className="qa-grid" data-testid="qa-dimension-grid">
          {summary.dimensions.map((d) => (
            <div className="qa-dim" key={d.id} data-testid={`qa-dim-${d.id}`}>
              <div className="qa-dim-head">
                <span className="qa-dim-title">{d.title}</span>
                <QaChip status={d.status} />
              </div>
              <p className="qa-dim-purpose">{d.purpose}</p>
              {d.reason && <p className="qa-dim-reason">{d.reason}</p>}
              <div className="qa-dim-meta">
                {d.checks.filter((c) => c.status === 'PASS').length} pass ·{' '}
                {d.checks.filter((c) => c.status === 'WARNING').length} warning ·{' '}
                {d.checks.filter((c) => c.status === 'FAIL').length} fail ·{' '}
                {d.checks.filter((c) => c.status === 'DATA_UNAVAILABLE').length} unavailable ·{' '}
                {d.checks.filter((c) => c.status === 'NOT_EXECUTED').length} not executed
              </div>
            </div>
          ))}
        </div>

        <div className="qa-overall" data-testid="qa-overall">
          <div>
            <div className="label">Overall QA status</div>
            <div className="qa-overall-value">
              <QaChip status={summary.overall} />
            </div>
          </div>
          <p className="qa-dim-reason">{summary.reason}</p>
        </div>

        <div className="tiles">
          <Tile label="Checks evaluated" value={`${summary.evaluated} of ${summary.defined}`}
            meta="a check counts as evaluated only when it produced PASS, WARNING or FAIL" />
          <Tile label="Data unavailable" value={summary.counts.DATA_UNAVAILABLE}
            meta="never counted as a failure" />
          <Tile label="Not executed" value={summary.counts.NOT_EXECUTED}
            meta="never counted as a pass" />
          <Tile label="Generated at" value={summary.generatedAt} meta="UTC" />
        </div>

        <Warn>
          {QA_SCOPE_STATEMENT}
        </Warn>
      </Card>

      <Card title="How this layer runs"
        hint="The QA layer consumes the existing Live Market / Daily Sync evidence. It starts no second
          market-data ingestion path.">
        <ol className="qa-flow" data-testid="qa-workflow">
          {QA_WORKFLOW.map((w, i) => (
            <li key={w.step}>
              <span className="qa-flow-n">{i + 1}</span>
              <div>
                <b>{w.step}</b>
                <div className="muted small">{w.detail}</div>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </>
  )
}

// ───────────────────────────────────────────── trends

function Trends({ report, points }: {
  report: MarketQualityReport
  points: ReturnType<typeof qaTrend>
}) {
  void report
  if (points.length === 0) {
    return (
      <Card title="Trends"
        hint="Historical QA trends are shown only where enough real stored observations exist.">
        <DataUnavailable what={INSUFFICIENT_TREND}
          why="A trend across one point is not a trend. Each Live Market Sync appends one immutable run;
            once two or more runs are stored, completeness and source health are plotted here from those
            runs alone. No trend is manufactured in the meantime." />
      </Card>
    )
  }
  return (
    <Card title="Trends" hint={`Built from ${points.length} stored sync run(s). No value is interpolated.`}>
      <div className="scroll">
        <table data-testid="qa-trend-table">
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
          = sources validated / sources attempted. Both are read from the stored runs, never recomputed from
          a fresh retrieval."
        limitations={['A run that was never performed is absent, never backfilled.']}
      />
    </Card>
  )
}

// ───────────────────────────────────────────── screen

export function MarketQuality() {
  const liveLedger = useLiveLedger()
  const govLedger = useGovernanceLedger()

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

  return (
    <>
      <h2>{QA_TITLE}</h2>
      <p className="hint" data-testid="qa-purpose">{QA_PURPOSE}</p>

      <Summary report={report} />

      <TransactionIntegrityPanel dim={report.transaction} />
      <MarketDataPanel dim={report.marketData} />
      <LiquidityRegressionPanel dim={report.liquidity} note={BASELINE_NOT_A_THRESHOLD} />
      <ResiliencePanel dim={report.resilience} />
      <SecurityPanel dim={report.security} />
      <EvidenceValidationPanel dim={report.evidence} />

      <Trends report={report} points={points} />
    </>
  )
}
