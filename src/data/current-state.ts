/**
 * Read-only bridge from the CURRENT layer to the frozen HISTORICAL layer.
 *
 * Every function here READS existing records and returns copies. Nothing in
 * this file writes to, recalculates or reinterprets the research, the
 * hypotheses, the evidence or the captured baseline runs.
 */
import { HYPOTHESIS_BY_ID } from './hypotheses'
import { OPPORTUNITY_BY_ID } from './opportunities'
import { BASELINE_CAPTURES } from './baseline-captures'
import { EVIDENCE_BY_ID } from './evidence'
import { PRE_REGISTRATION } from './pre-registration'
import { effectiveEntries, type GovernanceLedger } from '../core/governance-store'
import type { HistoricalAnchor } from '../core/daily-assessment'

/** Evidence the depth mechanism rests on, quoted from the frozen records. */
const ANCHOR_EVIDENCE_IDS = ['EV-010', 'EV-012', 'EV-013', 'EV-014'] as const

/** The frozen findings a current-state assessment may legitimately point at. */
export function historicalAnchors(): HistoricalAnchor[] {
  const out: HistoricalAnchor[] = []

  const h2 = HYPOTHESIS_BY_ID.get('H2')
  if (h2) {
    out.push({
      kind: 'HYPOTHESIS', id: h2.id, title: h2.title, status: h2.status,
      note: h2.scopeOfResult, frozen: true,
    })
  }

  const opp = OPPORTUNITY_BY_ID.get('OPP-01')
  if (opp) {
    out.push({
      kind: 'OPPORTUNITY', id: opp.id, title: opp.title, status: opp.status,
      note: opp.problem, frozen: true,
    })
  }

  const runIds = [...new Set(BASELINE_CAPTURES
    .filter((c) => c.experimentId === 'EXP-001')
    .map((c) => c.runId))].sort()
  for (const runId of runIds) {
    const first = BASELINE_CAPTURES.find((c) => c.runId === runId)!
    out.push({
      kind: 'BASELINE_RUN', id: runId, title: `EXP-001 baseline capture ${runId}`,
      status: first.reviewerStatus,
      note: `Captured ${first.observationTime} from live pool state. The captured values are evidence and are `
        + 'never recalculated by the daily layer.',
      frozen: true,
    })
  }

  for (const id of ANCHOR_EVIDENCE_IDS) {
    const ev = EVIDENCE_BY_ID.get(id)
    if (!ev) continue
    out.push({
      kind: 'EVIDENCE', id: ev.id, title: ev.metric, status: ev.identityStatus,
      note: `${ev.value === null ? 'DATA UNAVAILABLE' : `${ev.value} ${ev.unit}`}`
        + `${ev.observationTime ? ` observed ${ev.observationTime}` : ''}.`,
      frozen: true,
    })
  }
  return out
}

/** Measured baseline impacts from the latest captured run. Read, never recomputed. */
export function baselineImpacts(runId?: string): Array<{
  size: string; value: number | null; runId: string; evidenceId: string | null
}> {
  const runs = [...new Set(BASELINE_CAPTURES
    .filter((c) => c.experimentId === 'EXP-001')
    .map((c) => c.runId))].sort()
  const target = runId ?? runs[runs.length - 1] ?? ''
  return BASELINE_CAPTURES
    .filter((c) => c.runId === target && c.kpi === 'Price impact')
    .map((c) => ({
      size: c.dimension,
      value: typeof c.value === 'number' ? c.value : null,
      runId: c.runId,
      evidenceId: c.evidenceId,
    }))
}

/** Registered targets, if a named human has registered any. Never invented. */
export function registeredTargets(ledger: GovernanceLedger): Array<{ size: string; threshold: number | null }> {
  return effectiveEntries(PRE_REGISTRATION, ledger)
    .filter((e) => e.state !== 'NOT_REGISTERABLE')
    .map((e) => ({ size: e.standardisedSize, threshold: e.successThreshold }))
}

/**
 * Extra frozen anchors the Value Improvement Lab points at. Read-only, like
 * every other access to the research layer.
 */
export function labAnchors(): HistoricalAnchor[] {
  const out: HistoricalAnchor[] = []
  for (const id of ['H4', 'H7', 'H8'] as const) {
    const h = HYPOTHESIS_BY_ID.get(id)
    if (!h) continue
    out.push({
      kind: 'HYPOTHESIS', id: h.id, title: h.title, status: h.status,
      note: h.scopeOfResult, frozen: true,
    })
  }
  for (const id of ['EV-901', 'EV-902'] as const) {
    const ev = EVIDENCE_BY_ID.get(id)
    if (!ev) continue
    out.push({
      kind: 'EVIDENCE', id: ev.id, title: ev.metric, status: ev.identityStatus,
      note: ev.notes ?? 'DATA UNAVAILABLE', frozen: true,
    })
  }
  return out
}
