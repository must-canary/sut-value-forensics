/**
 * Data-side wiring for the governance persistence layer.
 *
 * Reuses the same storage adapter as the Business Decision store (localStorage
 * behind a guarded StoragePort). Everything here is a read of existing data —
 * no value is invented.
 */
import { EVIDENCE } from './evidence'
import { BASELINE_CAPTURES } from './baseline-captures'
import { loadLedger, viewLedger, type StoragePort } from '../core/decision-store'
import { browserStorage } from './decision-storage'
import { EXECUTABLE_SIZES } from '../core/business-decision'

export { browserStorage }

/** Evidence references an intervention or review may legitimately cite. */
export const KNOWN_EVIDENCE_IDS: string[] = EVIDENCE.map((e) => e.id)

/** Baseline runs a human may act on. */
export function baselineRunIds(experimentId = 'EXP-001'): string[] {
  return [...new Set(BASELINE_CAPTURES.filter((c) => c.experimentId === experimentId).map((c) => c.runId))].sort()
}

/**
 * Measured price-impact values for one captured run, keyed by standardised size.
 * Read straight from the committed capture records — never recomputed here.
 */
export function baselineImpactValues(runId: string): Record<string, number | null> {
  const out: Record<string, number | null> = {}
  for (const c of BASELINE_CAPTURES) {
    if (c.runId !== runId || c.kpi !== 'Price impact') continue
    out[c.dimension] = typeof c.value === 'number' ? c.value : null
  }
  return out
}

/** The newest trustworthy business-approved threshold per size, or null. */
export function businessApprovedThresholds(storage: StoragePort = browserStorage()): Record<string, number> {
  const view = viewLedger(loadLedger(storage))
  const approved = view.latestTrustworthyApproval
  const out: Record<string, number> = {}
  if (!approved) return out
  for (const t of approved.thresholds) {
    if (t.value === null) continue
    if (!(EXECUTABLE_SIZES as readonly string[]).includes(t.size)) continue
    out[t.size] = t.value
  }
  return out
}

/** Provenance line for the business → pre-registration handoff. */
export function businessApprovalRef(storage: StoragePort = browserStorage()): string | null {
  const approved = viewLedger(loadLedger(storage)).latestTrustworthyApproval
  if (!approved) return null
  return `${approved.experimentId}/${approved.version} approved by ${approved.reviewer} at ${approved.approvedAt}`
}
