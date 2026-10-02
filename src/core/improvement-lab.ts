/**
 * SUT VALUE IMPROVEMENT LAB — additive prototype.
 *
 * It converts evidence the project already holds into measurable improvement
 * opportunities:
 *
 *   CURRENT EVIDENCE → IDENTIFIED GAPS → PRODUCT / QA OPPORTUNITIES →
 *   PROPOSED EXPERIMENT → EVIDENCE REQUIRED → MEASUREMENT → BUSINESS DECISION
 *
 * It is NOT an automatic decision engine. It collects no market data of its own
 * (it reads the existing live sync), it owns no governance logic (it reads the
 * existing governance state), and it can never approve a threshold, execute an
 * intervention or produce a measured result. Every one of those remains a human
 * decision inside the existing chain.
 */
import { assertAssessmentLanguage } from './live-assessment'
import type { HistoricalAnchor } from './daily-assessment'
import type { GovernanceState } from './governance'
import { allMetricEvidence, type LiveSyncRun, type MetricEvidence } from './live-market-sync'

export type LabStatus =
  | 'SUPPORTED' | 'INCONCLUSIVE' | 'DATA_INSUFFICIENT' | 'DATA_UNAVAILABLE'
  | 'PROPOSED' | 'BUSINESS_REVIEW_REQUIRED' | 'BLOCKED_BY_BUSINESS_DECISION'

export const LAB_STATUSES: LabStatus[] = [
  'SUPPORTED', 'INCONCLUSIVE', 'DATA_INSUFFICIENT', 'DATA_UNAVAILABLE',
  'PROPOSED', 'BUSINESS_REVIEW_REQUIRED', 'BLOCKED_BY_BUSINESS_DECISION',
]

export const LAB_TITLE = 'SUT Value Improvement Lab'

export const LAB_PURPOSE =
  'A decision-ready evidence and experimentation interface. It shows what the frozen research established, '
  + 'what the current market evidence observes, where the measurable gaps are, and what evidence a business '
  + 'decision would need. It decides nothing by itself.'

/** Screened before display: the lab may never make a promise or claim a result. */
const screen = (text: string): string => {
  assertAssessmentLanguage(text)
  return text
}

// ───────────────────────────────────────────── section 2: identified gaps

export interface Gap {
  id: 'GAP-A' | 'GAP-B' | 'GAP-C' | 'GAP-D'
  title: string
  status: LabStatus
  /** what the evidence basis actually is */
  evidenceBasis: string
  known: string[]
  unknown: string[]
  /** frozen record ids and current metric names backing this gap */
  references: string[]
}

const unavailableMetrics = (run: LiveSyncRun | null): MetricEvidence[] =>
  run ? allMetricEvidence(run).filter((m) => m.value === null) : []

export function identifiedGaps(args: {
  run: LiveSyncRun | null
  anchors: HistoricalAnchor[]
  baselineRunIds: string[]
}): Gap[] {
  const missing = unavailableMetrics(args.run)
  const missingNames = missing.map((m) => m.label)
  const anchorId = (id: string) => (args.anchors.some((a) => a.id === id) ? [id] : [])

  return [
    {
      id: 'GAP-A',
      title: 'Liquidity / market-depth measurement',
      status: 'SUPPORTED',
      evidenceBasis: screen(
        `The EXP-001 baseline exists and was captured from real runs (${args.baselineRunIds.join(', ') || 'none'}). `
        + 'Price impact at the standardised sizes is therefore measurable with a fixed method. What is not '
        + 'measured is whether added executable depth changes it — that requires a new measurement run.'),
      known: [
        'Modelled price impact at four standardised sizes, captured from live pool state at exact blocks.',
        'The frozen research supports depth exhaustion as the amplification mechanism (H2).',
        '$100,000 is NOT EXECUTABLE and therefore NOT REGISTERABLE.',
      ],
      unknown: [
        'Whether a disclosed depth change moves the measured price impact — no post-intervention run exists.',
        'May 2026 pool liquidity, which was never measured (EV-901) and cannot be reconstructed.',
      ],
      references: [...args.baselineRunIds, ...anchorId('H2'), ...anchorId('OPP-01'), 'EV-901'],
    },
    {
      id: 'GAP-B',
      title: 'Market-data coverage',
      status: missing.length > 0 ? 'SUPPORTED' : 'DATA_INSUFFICIENT',
      evidenceBasis: screen(args.run
        ? `In sync ${args.run.id}, ${missing.length} of ${allMetricEvidence(args.run).length} observed metrics are `
          + `DATA UNAVAILABLE: ${missingNames.join(', ') || 'none'}. Each carries the source's own reason; no value `
          + 'is substituted.'
        : 'No live sync is stored in this browser, so the current coverage cannot be stated. Run a live market '
          + 'sync first — nothing is assumed in its absence.'),
      known: missing.map((m) => `${m.label}: DATA UNAVAILABLE — ${m.reason ?? 'no reason recorded'} (${m.source})`),
      unknown: [
        'Whether another verified public source publishes these fields for this contract address.',
        'Whether the absence is a source limitation or an asset-level reporting gap.',
      ],
      references: args.run ? [args.run.id, ...missing.map((m) => m.metric)] : [],
    },
    {
      id: 'GAP-C',
      title: 'Exchange / venue access evidence',
      status: 'DATA_INSUFFICIENT',
      evidenceBasis: screen(
        'The frozen research leaves exchange-access deterioration INCONCLUSIVE (H4), and historical CEX '
        + 'order-book depth is unrecoverable (EV-902). The current sync observes one DEX pool and public '
        + 'aggregator data, so it can neither support nor rule out a venue-access gap.'),
      known: [
        'The canonical Polygon pool is observable and contract-verified.',
        'Public aggregator venue rows identified only by ticker are NOT contract-verified.',
      ],
      unknown: [
        'Venue-level order-book depth, spread and access conditions — no public source is configured.',
        'Whether venue access changed around the May 2026 window — the evidence is unrecoverable.',
      ],
      references: [...anchorId('H4'), 'EV-902'],
    },
    {
      id: 'GAP-D',
      title: 'Utility / token value-capture measurement',
      status: 'DATA_UNAVAILABLE',
      evidenceBasis: screen(
        'The frozen research records weak organic utility/adoption as INCONCLUSIVE (H7) and weak token value '
        + 'capture as DATA_UNAVAILABLE (H8). No product telemetry is connected to this application, so no '
        + 'utility activity is observed here. Nothing is inferred in its absence.'),
      known: [
        'No product telemetry source exists in this project.',
        'On-chain pool activity is observable, but it is not evidence of product usage.',
      ],
      unknown: [
        'Whether real product usage exists and whether any of it is connected to SUT-related activity.',
        'What measurable telemetry would evidence value capture.',
      ],
      references: [...anchorId('H7'), ...anchorId('H8')],
    },
  ]
}

// ───────────────────────────────────────────── section 3: opportunities

export interface NextAction {
  text: string
  status: LabStatus
  /** what QA has already prepared and can continue without a business decision */
  preparedByQa: string[]
}

export interface LabOpportunity {
  id: string
  title: string
  relatedGapId: Gap['id']
  currentEvidence: string[]
  known: string[]
  unknown: string[]
  proposedInvestigation: string
  evidenceRequired: string[]
  status: LabStatus
  nextAction: NextAction
}

export function labOpportunities(gaps: Gap[], gov: GovernanceState): LabOpportunity[] {
  const gap = (id: Gap['id']) => gaps.find((g) => g.id === id)!
  const thresholdsRegistered = gov.thresholdsComplete

  return [
    {
      id: 'OPP-L1',
      title: 'Liquidity / market-depth improvement',
      relatedGapId: 'GAP-A',
      currentEvidence: gap('GAP-A').references,
      known: gap('GAP-A').known,
      unknown: gap('GAP-A').unknown,
      proposedInvestigation: screen(
        'Investigate whether increasing executable depth around the canonical pool changes the measured price '
        + 'impact at the four standardised sizes, using the existing EXP-001 method unchanged.'),
      evidenceRequired: [
        'Business-approved thresholds, registered by a named human',
        'An approved baseline run',
        'A recorded controlled intervention with real evidence references',
        'A new post-intervention measurement with the identical method fingerprint',
        'A named human review of the calculated comparison',
      ],
      status: thresholdsRegistered ? 'PROPOSED' : 'BUSINESS_REVIEW_REQUIRED',
      nextAction: {
        text: screen('Obtain business approval for the measurement thresholds, then register the approved '
          + 'thresholds before any intervention.'),
        status: 'BLOCKED_BY_BUSINESS_DECISION',
        preparedByQa: [
          'Baseline captured from three real runs',
          'Evidence traceability available for every observation',
          'Measurement methodology fixed and fingerprinted',
          'Governance workflow implemented end to end',
          'Post-intervention comparison path ready and tested',
        ],
      },
    },
    {
      id: 'OPP-L2',
      title: 'Market transparency / data coverage',
      relatedGapId: 'GAP-B',
      currentEvidence: gap('GAP-B').references,
      known: gap('GAP-B').known,
      unknown: gap('GAP-B').unknown,
      proposedInvestigation: screen(
        'Investigate additional verified public sources that publish market capitalisation, circulating supply '
        + 'and rank for this contract address, so the observed coverage gap can be closed without inferring any '
        + 'value.'),
      evidenceRequired: [
        'A candidate source that addresses the asset by contract, not by ticker',
        'A retrieval with preserved raw payload and hash',
        'Identity verification against the canonical Polygon contract',
        'A documented limitation where a field remains unpublished',
      ],
      status: 'PROPOSED',
      nextAction: {
        text: screen('Investigate an additional verified public source for the currently unavailable '
          + 'market-cap / circulating-supply / rank observations.'),
        status: 'PROPOSED',
        preparedByQa: [
          'Source adapter pattern and identity gate already implemented',
          'DATA UNAVAILABLE reasons recorded per field',
          'Raw payload + SHA-256 preserved for every retrieval',
        ],
      },
    },
    {
      id: 'OPP-L3',
      title: 'Exchange / market access evidence',
      relatedGapId: 'GAP-C',
      currentEvidence: gap('GAP-C').references,
      known: gap('GAP-C').known,
      unknown: gap('GAP-C').unknown,
      proposedInvestigation: screen(
        'Identify what verified venue-level evidence would be required to measure market access, spread and '
        + 'depth, and whether any of it is obtainable from a public, identity-verifiable source.'),
      evidenceRequired: [
        'A venue-level source that can be tied to the canonical asset identity',
        'Order-book depth and spread observations with timestamps and provenance',
        'An explicit statement where historical evidence is unrecoverable',
      ],
      status: 'DATA_INSUFFICIENT',
      nextAction: {
        text: screen('Identify the verified venue-level evidence required to measure market access, liquidity, '
          + 'spread and depth.'),
        status: 'DATA_INSUFFICIENT',
        preparedByQa: [
          'Identity ladder implemented (contract / pair / ticker-only)',
          'Ticker-only rows are isolated and never merged into contract-verified data',
        ],
      },
    },
    {
      id: 'OPP-L4',
      title: 'Utility / token value-capture measurement',
      relatedGapId: 'GAP-D',
      currentEvidence: gap('GAP-D').references,
      known: gap('GAP-D').known,
      unknown: gap('GAP-D').unknown,
      proposedInvestigation: screen(
        'Identify measurable product telemetry that would connect real product usage with SUT-related activity, '
        + 'and define what each measurement would and would not evidence.'),
      evidenceRequired: [
        'A real telemetry source with a stated owner and retention policy',
        'A defined metric, unit and observation window',
        'An identity link between product activity and on-chain activity, where one genuinely exists',
      ],
      status: 'DATA_UNAVAILABLE',
      nextAction: {
        text: screen('Identify measurable product telemetry connecting real product usage with SUT-related '
          + 'activity.'),
        status: 'DATA_UNAVAILABLE',
        preparedByQa: [
          'Evidence model supports DATA UNAVAILABLE with a stated reason',
          'No utility activity is fabricated anywhere in the application',
        ],
      },
    },
  ]
}

// ───────────────────────────────────────────── section 4: experiment view

export interface BaselineRow {
  size: string
  value: number | null
  magnitudeRounded: string
  runId: string
  evidenceId: string | null
  note: string
}

export interface ProposedThresholdRow {
  size: string
  proposed: number
  status: 'PROPOSED — PENDING BUSINESS APPROVAL'
}

export interface ExperimentView {
  experimentId: string
  title: string
  baselineLabel: string
  baseline: BaselineRow[]
  notExecutable: { size: string; status: string }
  proposedThresholds: ProposedThresholdRow[]
  proposedThresholdStatus: 'PROPOSED — PENDING BUSINESS APPROVAL'
  businessApproval: string
  baselineApproval: string
  intervention: string
  postInterventionMeasurement: string
  measuredResult: string
  /** the lab can never run it */
  executableByLab: false
}

export function experimentView(args: {
  gov: GovernanceState
  baselineKpis: Array<{ size: string; value: number | null; runId: string; evidenceId: string | null }>
  proposedThresholds: Array<{ size: string; value: number }>
}): ExperimentView {
  const baseline: BaselineRow[] = args.baselineKpis
    .filter((k) => !k.size.startsWith('$100,000'))
    .map((k) => ({
      size: k.size,
      value: k.value,
      magnitudeRounded: k.value === null ? 'DATA UNAVAILABLE' : `${Math.abs(k.value).toFixed(1)}%`,
      runId: k.runId,
      evidenceId: k.evidenceId,
      note: 'Observed baseline — not a target.',
    }))

  return {
    experimentId: 'EXP-001',
    title: 'EXP-001 — Liquidity / market depth',
    baselineLabel: 'Observed baseline — not a target.',
    baseline,
    notExecutable: { size: '$100,000 (both sides)', status: 'NOT EXECUTABLE / NOT REGISTERABLE' },
    proposedThresholds: args.proposedThresholds.map((t) => ({
      size: t.size, proposed: t.value, status: 'PROPOSED — PENDING BUSINESS APPROVAL' as const,
    })),
    proposedThresholdStatus: 'PROPOSED — PENDING BUSINESS APPROVAL',
    businessApproval: args.gov.thresholdsComplete ? 'REGISTERED' : 'PENDING',
    baselineApproval: args.gov.approvedBaselineRuns.length > 0
      ? `APPROVED: ${args.gov.approvedBaselineRuns.join(', ')}` : 'PENDING',
    intervention: args.gov.intervention ? 'RECORDED' : 'NOT EXECUTED',
    postInterventionMeasurement: args.gov.comparison ? 'CAPTURED' : 'DATA UNAVAILABLE',
    measuredResult: args.gov.finalReview ? String(args.gov.finalReview.result) : 'DATA UNAVAILABLE',
    executableByLab: false,
  }
}

// ───────────────────────────────────────────── section 5: evidence required

export interface EvidenceStep {
  step: number
  item: string
  satisfied: boolean
  state: string
}

/** Derived from the EXISTING governance state — this module owns no gate logic. */
export function evidenceSteps(gov: GovernanceState, methodFingerprint: string): EvidenceStep[] {
  const comparison = gov.comparison !== null
  return [
    {
      step: 1, item: 'Registered business-approved thresholds',
      satisfied: gov.thresholdsComplete,
      state: gov.thresholdsComplete
        ? `REGISTERED (${gov.thresholdsRegistered} of ${gov.thresholdsRequired})`
        : `NOT REGISTERED (${gov.thresholdsRegistered} of ${gov.thresholdsRequired}) — business approval required`,
    },
    {
      step: 2, item: 'Approved baseline',
      satisfied: gov.approvedBaselineRuns.length > 0,
      state: gov.approvedBaselineRuns.length > 0
        ? `APPROVED: ${gov.approvedBaselineRuns.join(', ')}`
        : 'CAPTURED but NOT APPROVED — a named human must accept a run',
    },
    {
      step: 3, item: 'Intervention evidence',
      satisfied: gov.intervention !== null,
      state: gov.intervention ? 'RECORDED' : 'NOT EXECUTED',
    },
    {
      step: 4, item: 'Same measurement methodology',
      satisfied: comparison,
      state: comparison ? 'DECLARED' : 'NOT APPLICABLE until a comparison exists',
    },
    {
      step: 5, item: 'Same method fingerprint',
      satisfied: comparison,
      state: comparison ? 'DECLARED' : `REQUIRED: ${methodFingerprint}`,
    },
    {
      step: 6, item: 'New post-intervention measurement',
      satisfied: comparison,
      state: comparison ? 'CAPTURED' : 'DATA UNAVAILABLE',
    },
    {
      step: 7, item: 'Named human review',
      satisfied: gov.finalReview !== null,
      state: gov.finalReview ? `RECORDED by ${gov.finalReview.reviewer}` : 'NOT RECORDED',
    },
    {
      step: 8, item: 'Final decision',
      satisfied: gov.finalReview !== null,
      state: gov.finalReview ? String(gov.finalReview.result) : 'NOT DETERMINED',
    },
  ]
}

// ───────────────────────────────────────────── section 6: decision status

export interface DecisionPanel {
  businessThreshold: string
  experiment: string
  intervention: string
  measuredImprovement: string
  finalResult: string
  /** work that proceeds while a business decision is outstanding */
  qaCanContinue: string[]
}

export function decisionPanel(gov: GovernanceState): DecisionPanel {
  return {
    businessThreshold: gov.thresholdsComplete ? 'REGISTERED' : 'PENDING BUSINESS REVIEW',
    experiment: gov.thresholdsComplete && gov.approvedBaselineRuns.length > 0
      ? 'READY FOR INTERVENTION RECORD' : 'READY FOR BUSINESS DECISION',
    intervention: gov.intervention ? 'RECORDED' : 'NOT EXECUTED',
    measuredImprovement: gov.comparison ? 'MEASURED' : 'DATA UNAVAILABLE',
    finalResult: gov.finalReview ? String(gov.finalReview.result) : 'NOT DETERMINED',
    qaCanContinue: [
      'Capture further live market evidence with full provenance',
      'Extend source coverage for currently unavailable fields',
      'Keep the measurement methodology and fingerprint stable',
      'Maintain the governance workflow and its refusal paths',
      'Prepare the post-intervention comparison path and its tests',
    ],
  }
}

// ───────────────────────────────────────────── sections 8 and 11

export const TOP100_CONTEXT = screen(
  'Top-100 ranking is a downstream market outcome, not a direct operating KPI. This lab does not predict or '
  + 'claim ranking improvement. The purpose is to identify measurable product and market factors that may '
  + 'contribute to sustainable usage, liquidity, value capture, market access and market confidence.')

export const WEEK2_SUMMARY: string[] = [
  'Historical research frozen as reference layer.',
  'Current SUT market-state evidence implemented.',
  'Source-level evidence traceability implemented.',
  'EXP-001 baseline captured from three real runs.',
  'Governance workflow implemented.',
  'Business threshold decision remains human-controlled.',
  'Value Improvement Lab converts evidence into measurable improvement opportunities.',
  'No business result is fabricated.',
].map(screen)

export const EXECUTION_CHAIN: string[] = [
  'Research tells us what the problem areas are.',
  'Live Sync tells us what the current market condition is.',
  'QA/Product prototypes allow us to test what can be improved.',
  'Experiments tell us what actually improved.',
  'Business review decides what to scale, continue, change, or stop.',
].map(screen)

// ───────────────────────────────────────────── structural guarantees

/** The lab never approves a threshold. */
export function labApprovesThreshold(): false { return false }
/** The lab never executes an intervention. */
export function labExecutesIntervention(): false { return false }
/** The lab never produces a measured result. */
export function labProducesResult(): false { return false }
/** The lab never writes to the frozen research. */
export function labMutatesResearch(): false { return false }
