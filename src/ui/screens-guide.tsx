/**
 * Experiment Guide — how EXP-001 is run, start to finish, in plain language.
 *
 * The guide describes the workflow that already exists. It registers nothing,
 * approves nothing and changes no state.
 */
import { Card, Warn } from './components'
import { PRE_REGISTRATION } from '../data/pre-registration'
import { PROPOSED_THRESHOLDS } from '../data/proposed-thresholds'
import { BASELINE_CAPTURES } from '../data/baseline-captures'
import { effectiveState } from '../core/governance-store'
import { useGovernanceLedger } from './governance-state'
import { registrationSummary } from '../core/pre-registration'

interface Step {
  n: number
  title: string
  where: string
  body: Array<string | [string, string]>
}

const STEPS: Step[] = [
  {
    n: 1,
    title: 'Review the research',
    where: 'Executive Dashboard · Crash Investigations · Hypothesis Lab · Evidence',
    body: [
      ['What the research found', 'SUT lost most of its quoted value in May 2026. The investigation is frozen: '
        + 'the mechanism is supported by measurement, but the initiating catalyst — who sold first and why — '
        + 'remains unresolved. Nothing in this application changes that.'],
      ['The supported mechanism', 'On May 17, the observed pool flow showed approximately $27K net selling '
        + 'within approximately $784K gross swap activity, while the observed price move was approximately '
        + '-62.7%. The historical analysis supports shallow/fragile liquidity as a mechanism that can amplify '
        + 'price impact, but the initiating catalyst remains unresolved. The evidence does not establish that '
        + 'the net sell imbalance alone caused the price move.'],
      ['The opportunity', 'If thin depth is what turns ordinary flow into a large price move, then depth is the '
        + 'thing to test. That is OPP-01: measure how sensitive the quoted price is to a standardised trade size.'],
      ['The objective of EXP-001', 'Measure price impact at standardised trade sizes before and after a disclosed, '
        + 'controlled depth intervention — using one fixed measurement method. The experiment measures market '
        + 'structure. It does not promise a price level or a market position.'],
    ],
  },
  {
    n: 2,
    title: 'Review the baseline',
    where: 'Baseline History · Baseline Operations',
    body: [
      ['What a baseline run is', 'One reading of the live pool at an exact block: spot price, both inventories, '
        + 'liquidity, fee tier, and the modelled price impact for each standardised size.'],
      ['RUN-001 / RUN-002 / RUN-003', 'Three captures taken on 2026-09-30 at blocks 94,711,694 · 94,712,797 · '
        + '94,722,565. Repeating the capture is deliberate: it shows how much the numbers move on their own '
        + 'between readings, before anything is changed.'],
      ['What price impact means', 'The percentage the quoted price moves if one trade of that size is executed '
        + 'right now against the pool. A $10,000 buy moving the price by about +10.6% means the pool is thin: '
        + 'a small order walks the price a long way. It is a model output from pool state, not an executed trade. '
        + 'The measurement describes current market-depth sensitivity. It does not predict price movement, '
        + 'establish causality, or measure business impact.'],
      ['$100,000 is NOT EXECUTABLE', 'The pool cannot fill $100,000 on either side at any of the three captures. '
        + 'No percentage is shown for it, because a number would describe a trade the venue cannot perform. '
        + 'It stays NOT EXECUTABLE and NOT REGISTERABLE until inventory actually supports it.'],
    ],
  },
  {
    n: 3,
    title: 'Business threshold decision',
    where: 'Proposed Thresholds',
    body: [
      ['Proposed values are planning values', 'The working proposals (8% / 8% / 40% / 30%) were written for '
        + 'planning. They are PROPOSED and PENDING BUSINESS APPROVAL. They are not success criteria and they '
        + 'unlock nothing.'],
      ['The business owner decides', 'A named business owner enters the thresholds the business is actually '
        + 'willing to accept, with a rationale for each, and confirms the decision explicitly.'],
      ['Approval is a human action', 'The application never approves on anyone\'s behalf. Approval requires a '
        + 'named person, a note and an explicit confirmation; it is then locked and stored with a fingerprint.'],
      ['Business approval is NOT registration', 'A locked business approval is a business decision only. It does '
        + 'not register a threshold and does not open any gate. The pre-registration workflow still has to run — '
        + 'the approved value is merely offered there as a pre-filled suggestion.'],
    ],
  },
  {
    n: 4,
    title: 'Pre-registration',
    where: 'Pre-Registration',
    body: [
      ['Threshold value', 'The number that decides the outcome, fixed before any result is seen. It may not be '
        + 'read off RUN-001, RUN-002 or RUN-003 — a criterion taken from the data it will judge is not a criterion.'],
      ['Named human author', 'A real person registers it. The product credit "Magha Ram" is not a review identity '
        + 'and is refused as one unless explicitly configured.'],
      ['Written rationale', 'Why this number. A number without a reason is not a criterion.'],
      ['Independence confirmation', 'An explicit tick that the value was chosen independently of the observed runs.'],
      ['Experiment version and timestamp', 'Each registration is stamped with the experiment version (EXP-001/v1) '
        + 'and the exact moment it was recorded.'],
      ['Register & Lock', 'Validate first — the form shows exactly what would be written. Pressing Register & Lock '
        + 'commits it. Only then does the slot change from AWAITING HUMAN ENTRY to REGISTERED.'],
      ['Registration is immutable', 'A registered threshold cannot be edited, and it survives a browser reload. '
        + 'A correction means opening a new experiment version: the old record is kept in the audit history and '
        + 'the new version must be registered again from scratch.'],
    ],
  },
  {
    n: 5,
    title: 'Baseline review',
    where: 'Baseline History',
    body: [
      ['Every run needs a named reviewer', 'A capture is only evidence until a person accepts it. Each of '
        + 'RUN-001, RUN-002 and RUN-003 is reviewed on its own.'],
      ['ACCEPT or REJECT', 'ACCEPT makes that run the reference the experiment is measured against. REJECT '
        + 'requires a stated reason.'],
      ['Review is never automatic', 'No run is ever approved by the application, by a timer, or by the fact that '
        + 'data exists. Until a named human commits a review, the intervention gate stays closed.'],
    ],
  },
  {
    n: 6,
    title: 'Intervention',
    where: 'Pre-Registration → Controlled intervention',
    body: [
      ['A controlled, human-recorded action', 'Example only: a controlled, human-recorded intervention could '
        + 'involve an approved change to executable liquidity/depth around the canonical pool. No such '
        + 'intervention has been executed in the current experiment state. A human records what was done, when '
        + 'it started, and who recorded it.'],
      ['Evidence must already exist', 'The record must cite evidence IDs the project already holds. A reference '
        + 'to evidence that does not exist is refused outright.'],
      ['The method is held constant', 'The record must declare the same measurement fingerprint as the baseline. '
        + 'Change the method and the before/after comparison is meaningless.'],
      ['Never generated automatically', 'The application cannot record an intervention. If no one performed one, '
        + 'the stage stays AWAITING HUMAN RECORD — which is its current state.'],
    ],
  },
  {
    n: 7,
    title: 'Actual measurement',
    where: 'Pre-Registration → Comparison capture',
    body: [
      ['It must come from a real measured run', 'The comparison capture is a repeat of the baseline procedure '
        + 'after the intervention, using the identical method.'],
      ['No one can type a result', 'There is deliberately no input field for an actual result anywhere in this '
        + 'application. A capture is accepted only from a measured run.'],
      ['Provenance is required', 'Every stated value must carry an evidence ID that already exists, plus the '
        + 'capture time and the method fingerprint. A value without provenance is rejected.'],
    ],
  },
  {
    n: 8,
    title: 'Comparison',
    where: 'Pre-Registration → Calculated result',
    body: [
      ['Measured against the registered threshold', 'Each standardised size is compared with the threshold that '
        + 'was pre-registered before the measurement existed — never one chosen afterwards.'],
      ['LOWER_IS_BETTER uses absolute magnitude', 'Sell impacts are negative numbers. A sell impact of −9.6% is '
        + 'worse than −8.0% because |9.6| > |8.0|. The comparison therefore uses the absolute magnitude of the '
        + 'signed price impact, in both directions.'],
      ['Both halves must exist', 'If the baseline value or the comparison value is missing, that size is '
        + 'DATA UNAVAILABLE. It is never scored as a pass or a failure.'],
    ],
  },
  {
    n: 9,
    title: 'Result',
    where: 'Pre-Registration → Calculated result',
    body: [
      ['SUPPORTED', 'Every judged size met its pre-registered threshold.'],
      ['REJECTED / NOT MET', 'No judged size met its threshold. A single size that misses is reported as NOT MET '
        + 'for that size.'],
      ['INCONCLUSIVE', 'Some met and some did not, or too little could be judged.'],
      ['Derived, never entered', 'The result is recomputed from the registered thresholds, the approved baseline '
        + 'and the captured measurement every time the page loads. It is not stored as a typed value and it '
        + 'cannot be edited. Until a human reviews it, it is provisional — not a finding.'],
    ],
  },
  {
    n: 10,
    title: 'Final human review',
    where: 'Pre-Registration → Final human review',
    body: [
      ['Named reviewer', 'A real person, not the product credit, records the review.'],
      ['Timestamp and note', 'When it was reviewed and what the reviewer concluded, in their own words.'],
      ['Evidence links', 'The recorded result must point at evidence that exists.'],
      ['Completion', 'Only when every gate above has genuinely passed does EXP-001 reach COMPLETE. A provisional '
        + 'calculation is not a conclusion until a named human records it.'],
    ],
  },
]

const RULES = [
  ['Do not fabricate missing data.', 'A missing value is shown as DATA UNAVAILABLE with a reason. Nothing is '
    + 'estimated, carried over from another period, or filled with zero.'],
  ['Do not treat proposed thresholds as approved.', 'PROPOSED values are planning artefacts. They are not success '
    + 'criteria until a business owner approves them and a named human registers them.'],
  ['Do not treat business approval as registration.', 'Business approval and pre-registration are separate gates '
    + 'with separate records. Approval alone unlocks nothing.'],
  ['Do not use $100K while it is NOT EXECUTABLE.', 'The venue cannot fill the size. No threshold may be '
    + 'registered for it and no result may be reported for it.'],
] as const

export function ExperimentGuide() {
  const ledger = useGovernanceLedger()
  const eff = effectiveState(ledger, PRE_REGISTRATION)
  const reg = registrationSummary(eff.entries)
  const runs = new Set(BASELINE_CAPTURES.filter((c) => c.experimentId === 'EXP-001').map((c) => c.runId)).size

  const stageOf = (n: number): string => {
    switch (n) {
      case 1: return 'RESEARCH FROZEN'
      case 2: return `${runs} BASELINE RUNS CAPTURED`
      case 3: return 'AWAITING BUSINESS OWNER'
      case 4: return reg.complete ? 'REGISTERED' : `${reg.registered} OF ${reg.registered + reg.awaiting} REGISTERED`
      case 5: return eff.state.approvedBaselineRuns.length > 0
        ? `${eff.state.approvedBaselineRuns.length} RUN(S) APPROVED` : 'AWAITING NAMED REVIEWER'
      case 6: return eff.state.intervention ? 'RECORDED' : 'NOT RECORDED'
      case 7: return eff.state.comparison ? 'CAPTURED' : 'NO MEASUREMENT'
      case 8: return eff.state.calculation ? 'CALCULATED' : 'NOT AVAILABLE'
      case 9: return eff.state.calculation?.provisionalResult ?? 'NOT AVAILABLE'
      default: return eff.state.finalReview ? 'RECORDED' : 'NOT RECORDED'
    }
  }

  return (
    <>
      <header>
        <h2>Experiment Guide</h2>
        <p className="sub">How EXP-001 runs, from the frozen research to a reviewed result — ten steps, in order.</p>
      </header>

      <Warn>
        This guide explains the workflow. It registers nothing, approves nothing and changes no experiment state.
        Each step shows where in the application the work is actually done, and what EXP-001 currently stands at.
      </Warn>

      <Card title="At a glance" hint="The ten steps and where each one happens.">
        <div className="scroll">
          <table>
            <thead><tr><th>Step</th><th>What happens</th><th>Where</th><th>Current state</th></tr></thead>
            <tbody>
              {STEPS.map((s) => (
                <tr key={s.n}>
                  <td className="mono"><strong>{s.n}</strong></td>
                  <td className="small"><strong>{s.title}</strong></td>
                  <td className="small muted">{s.where}</td>
                  <td className="small"><span className="chip">{stageOf(s.n)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {STEPS.map((s) => (
        <Card key={s.n} title={`STEP ${s.n} — ${s.title}`} hint={s.where}>
          <dl style={{ margin: 0 }}>
            {s.body.map((b) => {
              const [term, def] = Array.isArray(b) ? b : ['', b]
              return (
                <div key={term || def} style={{ marginBottom: 10 }}>
                  {term && <dt className="small" style={{ fontWeight: 700 }}>{term}</dt>}
                  <dd className="small" style={{ margin: '2px 0 0', color: 'var(--text-secondary)' }}>{def}</dd>
                </div>
              )
            })}
          </dl>
        </Card>
      ))}

      <Card title="Rules that never bend" hint="These hold at every step, for every user.">
        <div className="scroll">
          <table>
            <tbody>
              {RULES.map(([rule, why]) => (
                <tr key={rule}>
                  <td style={{ width: '38%' }}><strong className="small">{rule}</strong></td>
                  <td className="small muted">{why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Where the numbers come from" hint="Working values currently in the application.">
        <p className="small">
          Proposed (not approved) thresholds on file: {PROPOSED_THRESHOLDS.length}. Baseline runs captured: {runs}.
          Thresholds registered: {reg.registered} of {reg.registered + reg.awaiting}. Baseline runs approved:{' '}
          {eff.state.approvedBaselineRuns.length}. Current governance gate:{' '}
          <span className="mono">{eff.gate.replace(/_/g, ' ')}</span>.
        </p>
        <p className="small muted">
          The Daily Market Sync screen is a separate, observational market-data layer. It is not EXP-001, and
          nothing it records can register a threshold, approve a baseline, or produce an experiment result.
        </p>
      </Card>
    </>
  )
}
