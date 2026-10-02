import { useState } from 'react'
import { Card, formatMeasured, Provenance, Tile, Warn } from './components'
import { OPPORTUNITIES } from '../data/opportunities'
import { readinessCounts, type Measure, type Opportunity } from '../core/experiments'
import { EVIDENCE_BY_ID } from '../data/evidence'

const STATUS_LABEL: Record<string, string> = {
  IDENTIFIED: 'IDENTIFIED',
  READY_FOR_EXPERIMENT: 'READY FOR EXPERIMENT',
  DATA_REQUIRED: 'DATA REQUIRED',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  INCONCLUSIVE: 'INCONCLUSIVE',
}

const STATUS_DOT: Record<string, string> = {
  READY_FOR_EXPERIMENT: 'var(--series-1)',
  DATA_REQUIRED: 'var(--text-muted)',
  IDENTIFIED: 'var(--status-warning)',
  RUNNING: 'var(--status-warning)',
  COMPLETED: 'var(--status-good)',
  INCONCLUSIVE: 'var(--status-warning)',
}

const READINESS_DOT: Record<string, string> = {
  READY: 'var(--status-good)',
  PARTIAL: 'var(--status-warning)',
  BLOCKED: 'var(--status-critical)',
}

const STRENGTH_DOT: Record<string, string> = {
  STRONG: 'var(--status-good)',
  MODERATE: 'var(--status-warning)',
  WEAK: 'var(--status-serious)',
  ABSENT: 'var(--status-critical)',
}

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span className="chip">
      <span className="dot" style={{ background: color }} />
      {text}
    </span>
  )
}

/** A measured value with its provenance, or an explicit DATA UNAVAILABLE. */
function MeasureRow({ m }: { m: Measure }) {
  const ev = m.evidenceId ? EVIDENCE_BY_ID.get(m.evidenceId) : undefined
  return (
    <tr>
      <td>
        {m.value === null
          ? <span className="muted"><strong>DATA UNAVAILABLE</strong></span>
          : <strong>{typeof m.value === 'number' ? formatMeasured(m.value) : m.value} <span className="muted">{m.unit}</span></strong>}
        {m.periodMismatch && (
          <div className="small" style={{ color: 'var(--status-warning)' }}>
            ⚠ Period mismatch — this figure is from a different period than the analysis needs and is not a substitute.
          </div>
        )}
        <div className="small muted">{m.note}</div>
      </td>
      <td className="small mono" style={{ whiteSpace: 'nowrap' }}>
        {m.evidenceId ?? '—'}
        {m.observationTime && <div className="muted">{m.observationTime}</div>}
        {ev && <div className="muted">{ev.sourceId}</div>}
      </td>
    </tr>
  )
}

function KpiBlock({ label, kpi }: { label: string; kpi: Opportunity['primaryKpi'] }) {
  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10 }}>
      <div className="row">
        <strong className="small">{label}: {kpi.name}</strong>
        <Pill text={kpi.measurableToday ? 'MEASURABLE TODAY' : 'NOT MEASURABLE TODAY'}
          color={kpi.measurableToday ? 'var(--status-good)' : 'var(--status-critical)'} />
      </div>
      <table style={{ marginTop: 6 }}>
        <tbody><MeasureRow m={kpi.baseline} /></tbody>
      </table>
      <p className="small"><strong>Success criterion (predefined):</strong> {kpi.successCriterion}</p>
    </div>
  )
}

// ══════════════════════════════════════════ Executive Improvement Backlog

export function ImprovementBacklog({ onOpen }: { onOpen: (id: string) => void }) {
  const c = readinessCounts(OPPORTUNITIES)
  return (
    <>
      <header>
        <h2>Improvement Backlog</h2>
        <p className="sub">Derived only from the frozen research. Opportunities target measurable business mechanisms — not price or market rank.</p>
      </header>

      <Warn>
        <strong>Scope rule.</strong> No opportunity below claims that an intervention will raise SUT’s price or
        market rank. Each measures an underlying mechanism first. No experiment is marked successful before it
        has been measured, and no result may be recorded without a named human.
      </Warn>

      <div className="tiles">
        <Tile label="Opportunities" value={c.total} meta="8 frozen categories" />
        <Tile label="Ready for experiment" value={c.readyForExperiment} meta="baseline measurable today" />
        <Tile label="Data required" value={c.dataRequired} meta="blocked on missing data" />
        <Tile label="Measurable primary KPIs" value={`${c.measurableKpis} / ${c.total}`} meta={`${c.blockedKpis} not measurable today`} />
        <Tile label="Completed" value={c.completed} meta={c.completed === 0 ? 'none measured yet' : 'measured and reviewed'} />
        <Tile label="Running" value={c.running} meta={c.running === 0 ? 'none started' : 'baseline collection started'} />
      </div>

      <Card title="Backlog" hint="Click a row to open the experiment detail.">
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Opportunity</th><th>Status</th><th>Evidence strength</th><th>Data readiness</th>
                <th>Experiment readiness</th><th>Primary KPI</th><th>Category</th>
              </tr>
            </thead>
            <tbody>
              {OPPORTUNITIES.map((o) => (
                <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(o.id)}>
                  <td><strong className="small">{o.id}</strong><div className="small">{o.title}</div></td>
                  <td><Pill text={STATUS_LABEL[o.status]!} color={STATUS_DOT[o.status]!} /></td>
                  <td><Pill text={o.evidence.strength} color={STRENGTH_DOT[o.evidence.strength]!} /></td>
                  <td><Pill text={o.dataReadiness} color={READINESS_DOT[o.dataReadiness]!} /></td>
                  <td><Pill text={o.experimentReadiness} color={READINESS_DOT[o.experimentReadiness]!} /></td>
                  <td className="small">{o.primaryKpi.name}
                    {!o.primaryKpi.measurableToday && <div className="muted">not measurable today</div>}</td>
                  <td className="small muted">{o.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Provenance
          period="frozen research 2026-09-30"
          source="research-freeze.md · hypothesis-matrix.md · evidence register"
          methodology="derived; every baseline links to an evidence record or is DATA UNAVAILABLE"
          retrievedAt="2026-09-30"
          limitations={[
            'no opportunity asserts a price or market-rank outcome',
            'no experiment has been run — every result field is empty by design',
          ]}
        />
      </Card>
    </>
  )
}

// ══════════════════════════════════════════ Opportunities + Experiment Detail

export function ImprovementOpportunities({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const [tab, setTab] = useState<'overview' | 'experiment'>('overview')
  const open = selected ? OPPORTUNITIES.find((o) => o.id === selected) ?? null : null

  if (!open) {
    return (
      <>
        <header>
          <h2>Improvement Opportunities</h2>
          <p className="sub">Eight categories derived from the frozen research. Select one to see its full definition and experiment.</p>
        </header>
        {OPPORTUNITIES.map((o) => (
          <section className="card" key={o.id}>
            <div className="between">
              <div>
                <h3>{o.id} — {o.title}</h3>
                <p className="hint">{o.category}</p>
              </div>
              <div className="row">
                <Pill text={STATUS_LABEL[o.status]!} color={STATUS_DOT[o.status]!} />
                <button className="toggle" onClick={() => { onSelect(o.id); setTab('overview') }}>Open</button>
              </div>
            </div>
            <p className="small">{o.problem}</p>
            <div className="row">
              <Pill text={`evidence: ${o.evidence.strength}`} color={STRENGTH_DOT[o.evidence.strength]!} />
              <Pill text={`data: ${o.dataReadiness}`} color={READINESS_DOT[o.dataReadiness]!} />
              <Pill text={`experiment: ${o.experimentReadiness}`} color={READINESS_DOT[o.experimentReadiness]!} />
              <span className="chip">{o.evidence.evidenceIds.length} evidence refs</span>
              <span className="chip">{o.evidence.hypothesisIds.join(', ')}</span>
            </div>
          </section>
        ))}
      </>
    )
  }

  const o = open
  const ex = o.experiment
  return (
    <>
      <header>
        <div className="row">
          <button className="toggle" onClick={() => onSelect(null)}>← All opportunities</button>
        </div>
        <h2 style={{ marginTop: 10 }}>{o.id} — {o.title}</h2>
        <p className="sub">{o.category}</p>
      </header>

      <div className="row" style={{ marginBottom: 14 }}>
        <Pill text={STATUS_LABEL[o.status]!} color={STATUS_DOT[o.status]!} />
        <Pill text={`evidence: ${o.evidence.strength}`} color={STRENGTH_DOT[o.evidence.strength]!} />
        <Pill text={`data: ${o.dataReadiness}`} color={READINESS_DOT[o.dataReadiness]!} />
        <Pill text={`experiment: ${o.experimentReadiness}`} color={READINESS_DOT[o.experimentReadiness]!} />
        <button className="toggle" style={tab === 'overview' ? { fontWeight: 600, color: 'var(--text-primary)' } : undefined}
          onClick={() => setTab('overview')}>Overview</button>
        <button className="toggle" style={tab === 'experiment' ? { fontWeight: 600, color: 'var(--text-primary)' } : undefined}
          onClick={() => setTab('experiment')}>Experiment detail</button>
      </div>

      {tab === 'overview' ? (
        <>
          <Card title="1. Opportunity / problem"><p className="small">{o.problem}</p></Card>

          <Card title="2. Evidence supporting investigation" hint={`Strength: ${o.evidence.strength}`}>
            <p className="small">{o.evidence.summary}</p>
            <div className="row">
              {o.evidence.evidenceIds.map((id) => (
                <span className="chip mono" key={id}>{id} — {EVIDENCE_BY_ID.get(id)?.metric ?? 'unknown'}</span>
              ))}
              {o.evidence.hypothesisIds.map((h) => <span className="chip" key={h}>{h}</span>)}
            </div>
          </Card>

          <Card title="3. Current baseline" hint="Every value carries provenance, or is explicitly DATA UNAVAILABLE.">
            <div className="scroll">
              <table>
                <thead><tr><th>Measure</th><th>Provenance</th></tr></thead>
                <tbody>{o.currentBaseline.map((mm, i) => <MeasureRow key={i} m={mm} />)}</tbody>
              </table>
            </div>
          </Card>

          <Card title="4. What is missing or weak">
            <ul className="tight">{o.missingOrWeak.map((x) => <li key={x}>{x}</li>)}</ul>
          </Card>

          <Card title="5. Proposed intervention"><p className="small">{o.intervention}</p></Card>

          <Card title="6–9. KPIs, baseline and success criteria">
            <KpiBlock label="Primary KPI" kpi={o.primaryKpi} />
            {o.secondaryKpis.map((k) => <KpiBlock key={k.name} label="Secondary KPI" kpi={k} />)}
          </Card>

          <Card title="10–11. Experiment period and control">
            <p className="small"><strong>Period:</strong> {o.experimentPeriod}</p>
            <p className="small"><strong>Control / comparison:</strong> {o.controlMethod}</p>
          </Card>

          <Card title="12–13. Required data and dependencies">
            <p className="small"><strong>Required data</strong></p>
            <ul className="tight">{o.requiredData.map((x) => <li key={x}>{x}</li>)}</ul>
            <p className="small"><strong>Dependencies</strong></p>
            <ul className="tight">{o.dependencies.map((x) => <li key={x}>{x}</li>)}</ul>
          </Card>

          <Card title="14. Risks and limitations">
            <ul className="tight">{o.risks.map((x) => <li key={x}>{x}</li>)}</ul>
          </Card>

          <Card title="15. Evidence required before execution">
            <ul className="tight">{o.evidenceRequiredBeforeExecution.map((x) => <li key={x}>{x}</li>)}</ul>
          </Card>
        </>
      ) : (
        <>
          <Warn>
            <strong>Baseline → Intervention → Measurement → Interpretation.</strong> Interpretation rules are fixed
            before the run so a result cannot be rationalised afterwards. No result is recorded until the
            experiment has actually been measured and a named human records it.
          </Warn>

          <Card title="① BASELINE" hint={`${ex.baseline.windowDays}-day window`}>
            <p className="small">{ex.baseline.description}</p>
            <div className="scroll">
              <table>
                <thead><tr><th>Measure</th><th>Provenance</th></tr></thead>
                <tbody>{ex.baseline.measures.map((mm, i) => <MeasureRow key={i} m={mm} />)}</tbody>
              </table>
            </div>
            {ex.baseline.blockers.length > 0 && (
              <>
                <p className="small" style={{ marginTop: 10 }}><strong>Blockers</strong></p>
                <ul className="tight">{ex.baseline.blockers.map((b) => <li key={b}>{b}</li>)}</ul>
              </>
            )}
          </Card>

          <Card title="② INTERVENTION">
            <p className="small">{ex.intervention.description}</p>
            <p className="small"><strong>Controlled:</strong> {ex.intervention.controlled ? 'yes' : 'no — stated weakness'}</p>
            <p className="small"><strong>Method:</strong> {ex.intervention.method}</p>
            <p className="small"><strong>Held constant:</strong></p>
            <ul className="tight">{ex.intervention.whatIsHeldConstant.map((x) => <li key={x}>{x}</li>)}</ul>
          </Card>

          <Card title="③ MEASUREMENT" hint={`${ex.measurement.windowDays}-day window`}>
            <p className="small"><strong>Method:</strong> {ex.measurement.method}</p>
            <p className="small"><strong>Control:</strong> {ex.measurement.controlMethod}</p>
            <p className="small"><strong>Data required:</strong></p>
            <ul className="tight">{ex.measurement.dataRequired.map((x) => <li key={x}>{x}</li>)}</ul>
          </Card>

          <Card title="④ INTERPRETATION" hint="Fixed before the run.">
            <table>
              <tbody>
                <tr><td style={{ width: '30%' }}><strong>SUPPORTED if</strong></td><td className="small">{ex.interpretation.supportedIf}</td></tr>
                <tr><td><strong>REJECTED if</strong></td><td className="small">{ex.interpretation.rejectedIf}</td></tr>
                <tr><td><strong>INCONCLUSIVE if</strong></td><td className="small">{ex.interpretation.inconclusiveIf}</td></tr>
                <tr>
                  <td><strong>Result</strong></td>
                  <td>
                    {ex.interpretation.result === null
                      ? <span className="muted"><strong>NOT YET MEASURED</strong> — no result may be recorded before the experiment runs.</span>
                      : <strong>{ex.interpretation.result}</strong>}
                  </td>
                </tr>
                <tr>
                  <td><strong>Recorded by</strong></td>
                  <td className="small">{ex.interpretation.resultRecordedBy ?? <span className="muted">— a result requires a named human recorder</span>}</td>
                </tr>
              </tbody>
            </table>
          </Card>

          <Provenance
            period={o.experimentPeriod}
            source="frozen research — research-freeze.md, hypothesis-matrix.md, evidence register"
            methodology="pre-registered experiment design; interpretation rules fixed before execution"
            retrievedAt="2026-09-30"
            limitations={o.risks}
          />
        </>
      )}
    </>
  )
}
