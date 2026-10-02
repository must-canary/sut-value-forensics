import { Card, Warn } from './components'
import { EOD_HANDOFF, OBSERVED_BASELINE_RANGES, PROPOSED_THRESHOLDS } from '../data/proposed-thresholds'
import { handoffOutstanding, summariseProposals } from '../core/proposed-thresholds'
import { BusinessDecisionWorkflow } from './business-decision'

function Pill({ text, color }: { text: string; color: string }) {
  return <span className="chip"><span className="dot" style={{ background: color }} />{text}</span>
}

export function ProposedThresholds() {
  const s = summariseProposals(PROPOSED_THRESHOLDS)
  const outstanding = handoffOutstanding(EOD_HANDOFF)
  return (
    <>
      <header>
        <h2>Proposed Thresholds</h2>
        <p className="sub">Working proposals for experiment planning. Not business approved; they unlock nothing.</p>
      </header>

      <Warn>
        <strong>PROPOSED / PENDING BUSINESS APPROVAL.</strong> These {s.total} values are planning artefacts.
        They are <strong>not registered thresholds</strong>, they are <strong>not</strong> experimental success
        criteria, and they do <strong>not</strong> unlock an intervention or a result. Registration remains
        AWAITING HUMAN ENTRY until a business owner approves a number and it is registered through the
        pre-registration workflow.
      </Warn>

      <Card title="Working proposals" hint="Stated explicitly — never derived or recomputed from the observed baseline.">
        <div className="scroll">
          <table>
            <thead><tr>
              <th>Trade size</th><th>Side</th><th>Proposed</th><th>Direction</th>
              <th>Status</th><th>Approval</th><th>Observed baseline</th><th>Created</th>
            </tr></thead>
            <tbody>
              {PROPOSED_THRESHOLDS.map((t) => (
                <tr key={t.tradeSize}>
                  <td><strong className="small">{t.tradeSize}</strong><div className="small muted">{t.metric}</div></td>
                  <td className="small">{t.side}</td>
                  <td><strong>&le; {t.proposedThreshold}%</strong><div className="small muted">{t.thresholdUnit}</div></td>
                  <td className="small">{t.comparisonDirection.replace(/_/g, ' ').toLowerCase()}</td>
                  <td><Pill text={t.status} color="var(--status-warning)" /></td>
                  <td><Pill text={t.approvalStatus} color="var(--status-critical)" /></td>
                  <td className="small muted">{OBSERVED_BASELINE_RANGES[t.tradeSize]}</td>
                  <td className="mono small">{t.createdAt}</td>
                </tr>
              ))}
              <tr>
                <td><strong className="small">$100,000 (both sides)</strong></td>
                <td className="small">&mdash;</td>
                <td><span className="muted"><strong>NOT EXECUTABLE</strong></span></td>
                <td colSpan={4} className="small muted">
                  No threshold proposed. The venue cannot execute the size; no value is modelled or backfilled.
                </td>
                <td className="small muted">&mdash;</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="small"><strong>Author / source:</strong> {PROPOSED_THRESHOLDS[0]!.authorSource}</p>
        <p className="small"><strong>Rationale:</strong> {PROPOSED_THRESHOLDS[0]!.rationale}</p>
      </Card>

      <Card title="EOD business input handoff — EXP-001" hint={`Created ${EOD_HANDOFF.createdAt}`}>
        <Warn><strong>{EOD_HANDOFF.statement}</strong></Warn>
        <p className="small"><strong>Baseline:</strong> {EOD_HANDOFF.baselineStatus}</p>
        <p className="small"><strong>Required business input</strong></p>
        <div className="scroll">
          <table>
            <thead><tr><th>Trade size</th><th>Question</th><th>Proposed working value</th><th>Business answer</th></tr></thead>
            <tbody>
              {EOD_HANDOFF.requests.map((r) => (
                <tr key={r.tradeSize}>
                  <td className="small"><strong>{r.tradeSize}</strong></td>
                  <td className="small">{r.question}</td>
                  <td className="small">&le; {r.proposedWorkingValue}%</td>
                  <td>{r.businessAnswer === null
                    ? <span className="muted"><strong>AWAITING BUSINESS INPUT</strong></span>
                    : <strong>{r.businessAnswer}%</strong>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small" style={{ marginTop: 10 }}><strong>{EOD_HANDOFF.proposalQuestion}</strong></p>
        <p className="small">Answer: {EOD_HANDOFF.proposalAnswer === null
          ? <span className="muted"><strong>AWAITING BUSINESS INPUT</strong></span>
          : <strong>{EOD_HANDOFF.proposalAnswer}</strong>}</p>
        <p className="small muted">{EOD_HANDOFF.notExecutableNote}</p>
        <p className="small"><strong>Responded by:</strong>{' '}
          {EOD_HANDOFF.respondedBy ?? <span className="muted">no named business responder</span>}</p>
        <p className="small"><strong>Outstanding ({outstanding.length})</strong></p>
        <ul className="tight">{outstanding.map((o) => <li key={o}>{o}</li>)}</ul>
      </Card>

      <BusinessDecisionWorkflow />
    </>
  )
}
