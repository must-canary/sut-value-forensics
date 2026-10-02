/**
 * Phase 5 — baseline operations, coverage and reviewer integrity.
 */
import { describe, expect, it } from 'vitest'
import {
  assertCapture, assertExactTimestamps, assertNoBackfill, assertReviewerIdentity,
  BaselineProvenanceError, buildCoverage, CONFIGURED_REVIEWERS, CREATOR_ATTRIBUTION,
  reviewerStatusFor, ReviewerError, validateCapture,
  type BaselineCaptureRecord, type ReviewRecord,
} from '../src/core/baseline-ops'
import {
  BASELINE_CAPTURES, EXP002_WEEK, IMPACT_10K_COVERAGE, REVIEWS, SPOT_COVERAGE,
} from '../src/data/baseline-captures'
import { EVIDENCE_BY_ID } from '../src/data/evidence'
import { RUN_BY_ID } from '../src/data/experiment-runs'
import { WALLETS } from '../src/data/timeline'

const ok = (): BaselineCaptureRecord => ({
  experimentId: 'EXP-001', runId: 'RUN-001', kpi: 'Spot price', dimension: 'spot',
  value: 0.416396, unit: 'USD per SUT', observationTime: '2026-09-30T12:51:21Z',
  retrievedAt: '2026-09-30', source: 'Polygon RPC', evidenceId: 'EV-100',
  methodology: 'contract_call', limitations: [], dataStatus: 'MEASURED',
  reviewerStatus: 'PENDING', modelled: false, timestampPrecision: 'EXACT_BLOCK',
})

describe('baseline provenance', () => {
  it('every stored capture passes validation', () => {
    for (const c of BASELINE_CAPTURES) {
      expect(validateCapture(c), `${c.experimentId}/${c.runId}/${c.kpi}`).toEqual([])
    }
  })

  it('every MEASURED capture links to a real evidence record', () => {
    for (const c of BASELINE_CAPTURES.filter((x) => x.dataStatus === 'MEASURED')) {
      expect(c.evidenceId, `${c.kpi}`).toBeTruthy()
      expect(EVIDENCE_BY_ID.has(c.evidenceId!), `${c.kpi} -> ${c.evidenceId}`).toBe(true)
    }
  })

  it('rejects a measured capture with no evidence', () => {
    const c = ok(); c.evidenceId = null
    expect(() => assertCapture(c)).toThrow(BaselineProvenanceError)
  })

  it('rejects a capture missing observation or retrieval time', () => {
    const a = ok(); a.observationTime = ''
    expect(validateCapture(a)).toContain('observationTime is required')
    const b = ok(); b.retrievedAt = ''
    expect(validateCapture(b)).toContain('retrievedAt is required')
  })

  it('rejects a capture with no source or methodology', () => {
    const a = ok(); a.source = ''
    expect(validateCapture(a)).toContain('source is required')
    const b = ok(); b.methodology = ''
    expect(validateCapture(b)).toContain('methodology is required')
  })

  it('every capture carries all the mandatory fields', () => {
    for (const c of BASELINE_CAPTURES) {
      for (const f of ['experimentId', 'runId', 'kpi', 'unit', 'observationTime', 'retrievedAt', 'source', 'methodology'] as const) {
        expect(c[f], `${c.kpi}.${f}`).toBeTruthy()
      }
      expect(c.dataStatus).toBeTruthy()
      expect(c.reviewerStatus).toBeTruthy()
    }
  })
})

describe('no fabricated unavailable measurement', () => {
  it('non-measured captures carry a null value', () => {
    for (const c of BASELINE_CAPTURES.filter((x) => x.dataStatus !== 'MEASURED')) {
      expect(c.value, `${c.kpi}/${c.dataStatus}`).toBeNull()
    }
  })

  it('refuses a fabricated value on a DATA_UNAVAILABLE capture', () => {
    const c = ok(); c.dataStatus = 'DATA_UNAVAILABLE'; c.value = 1.23
    expect(validateCapture(c).join(' ')).toMatch(/never a fabricated one/)
  })

  it('the $100K size is NOT_EXECUTABLE with a null value in every run', () => {
    const runIds = new Set(BASELINE_CAPTURES.filter((c) => c.experimentId === 'EXP-001').map((c) => c.runId))
    const rows = BASELINE_CAPTURES.filter((c) => c.dimension.includes('$100,000'))
    expect(rows).toHaveLength(runIds.size)
    for (const c of rows) {
      expect(c.dataStatus).toBe('NOT_EXECUTABLE')
      expect(c.value).toBeNull()
    }
  })

  it('the unfillable size never leaks a modelled percentage into evidence', () => {
    for (const id of ['EV-108', 'EV-127']) expect(EVIDENCE_BY_ID.get(id)!.value).toBeNull()
  })
})

describe('MODELLED label preservation', () => {
  it('every modelled capture declares itself in its limitations', () => {
    for (const c of BASELINE_CAPTURES.filter((x) => x.modelled)) {
      expect(c.limitations.some((l) => /model/i.test(l)), c.kpi).toBe(true)
    }
  })

  it('refuses a modelled capture that does not declare itself', () => {
    const c = ok(); c.modelled = true; c.limitations = ['nothing relevant']
    expect(validateCapture(c).join(' ')).toMatch(/must declare/)
  })

  it('direct contract reads are not marked modelled', () => {
    const spot = BASELINE_CAPTURES.find((c) => c.kpi === 'Spot price' && c.runId === 'RUN-001')!
    expect(spot.modelled).toBe(false)
  })

  it('price-impact captures are all modelled', () => {
    for (const c of BASELINE_CAPTURES.filter((x) => x.kpi === 'Price impact')) {
      expect(c.modelled, c.dimension).toBe(true)
    }
  })
})

describe('exact timestamp requirement', () => {
  it('every capture records EXACT_BLOCK precision', () => {
    for (const c of BASELINE_CAPTURES) expect(c.timestampPrecision, c.kpi).toBe('EXACT_BLOCK')
  })

  it('boundary-sensitive work refuses interpolated timestamps', () => {
    const c = ok(); c.timestampPrecision = 'INTERPOLATED'
    expect(() => assertExactTimestamps(c, true)).toThrow(/requires EXACT_BLOCK/)
    expect(() => assertExactTimestamps(c, false)).not.toThrow()
  })

  it('the EXP-002 week used exact block boundaries with sub-2s drift', () => {
    expect(EXP002_WEEK.boundaryDriftSeconds.start).toBeLessThanOrEqual(2)
    expect(EXP002_WEEK.boundaryDriftSeconds.end).toBeLessThanOrEqual(2)
    expect(EXP002_WEEK.blockStart).toBe(94_162_485)
    expect(EXP002_WEEK.blockEnd).toBe(94_565_640)
  })

  it('the EXP-002 capture states that interpolation was not used', () => {
    const c = BASELINE_CAPTURES.find((x) => x.experimentId === 'EXP-002' && x.value !== null)!
    expect(c.methodology).toMatch(/never interpolated/i)
  })
})

describe('30-day coverage — no backfill', () => {
  it('coverage windows are structurally sound', () => {
    for (const w of [SPOT_COVERAGE, IMPACT_10K_COVERAGE]) {
      expect(() => assertNoBackfill(w)).not.toThrow()
      expect(w.days).toHaveLength(30)
      expect(w.plannedDays).toBe(30)
    }
  })

  it('missing days are null with no evidence id', () => {
    const missing = SPOT_COVERAGE.days.filter((d) => d.value === null)
    expect(missing.length).toBe(29)
    for (const d of missing) {
      expect(d.evidenceId).toBeNull()
      expect(d.note).toMatch(/Not backfilled/)
    }
  })

  it('statistics use captured days only', () => {
    expect(SPOT_COVERAGE.daysCaptured).toBe(1)
    expect(SPOT_COVERAGE.daysMissing).toBe(29)
    // coverage tracks the latest capture of each day (RUN-003)
    expect(SPOT_COVERAGE.average).toBe(0.412615)
    expect(SPOT_COVERAGE.min).toBe(0.412615)
    expect(SPOT_COVERAGE.max).toBe(0.412615)
    expect(SPOT_COVERAGE.latest!.value).toBe(0.412615)
    expect(SPOT_COVERAGE.coveragePct).toBeCloseTo(100 / 30, 5)
  })

  it('an empty window reports null statistics rather than zero', () => {
    const w = buildCoverage('EXP-X', 'k', 'u', '2026-09-01', 5, [])
    expect(w.average).toBeNull()
    expect(w.median).toBeNull()
    expect(w.min).toBeNull()
    expect(w.latest).toBeNull()
    expect(w.coveragePct).toBe(0)
  })

  it('refuses a missing day that carries an evidence id', () => {
    const w = buildCoverage('EXP-X', 'k', 'u', '2026-09-01', 3, [])
    w.days[0]!.evidenceId = 'EV-100'
    expect(() => assertNoBackfill(w)).toThrow(/must not carry an evidenceId/)
  })
})

describe('reviewer gate — identity is separate from creator attribution', () => {
  it('no review has been recorded', () => {
    expect(REVIEWS).toHaveLength(0)
  })

  it('every capture is PENDING review', () => {
    for (const c of BASELINE_CAPTURES) expect(c.reviewerStatus, c.kpi).toBe('PENDING')
  })

  it('no reviewer is configured by default', () => {
    expect(CONFIGURED_REVIEWERS).toHaveLength(0)
  })

  it('refuses the creator attribution as a reviewer when not configured', () => {
    const rec: ReviewRecord = {
      reviewer: CREATOR_ATTRIBUTION, action: 'ACCEPT_BASELINE',
      at: '2026-09-30', notes: '', runId: 'RUN-001',
    }
    expect(() => assertReviewerIdentity(rec, CONFIGURED_REVIEWERS)).toThrow(ReviewerError)
    expect(() => assertReviewerIdentity(rec, CONFIGURED_REVIEWERS)).toThrow(/separate concepts/)
  })

  it('allows the creator only when explicitly configured as a reviewer', () => {
    const rec: ReviewRecord = {
      reviewer: CREATOR_ATTRIBUTION, action: 'ACCEPT_BASELINE',
      at: '2026-09-30', notes: '', runId: 'RUN-001',
    }
    expect(() => assertReviewerIdentity(rec, [CREATOR_ATTRIBUTION])).not.toThrow()
  })

  it('refuses an unnamed or blank reviewer', () => {
    for (const name of ['', '   ']) {
      expect(() => assertReviewerIdentity(
        { reviewer: name, action: 'ACCEPT_BASELINE', at: '2026-09-30', notes: '', runId: 'R' }, [],
      )).toThrow(/named human reviewer/)
    }
  })

  it('supports accept / reject / request re-measurement', () => {
    const base = { reviewer: 'A. Reviewer', at: '2026-09-30', notes: 'n', runId: 'RUN-001' }
    expect(reviewerStatusFor([{ ...base, action: 'ACCEPT_BASELINE' }], 'RUN-001')).toBe('ACCEPTED')
    expect(reviewerStatusFor([{ ...base, action: 'REJECT_BASELINE' }], 'RUN-001')).toBe('REJECTED')
    expect(reviewerStatusFor([{ ...base, action: 'REQUEST_REMEASUREMENT' }], 'RUN-001')).toBe('RE_MEASUREMENT_REQUESTED')
    expect(reviewerStatusFor([], 'RUN-001')).toBe('PENDING')
  })
})

describe('result-before-intervention prevention', () => {
  it('no experiment carries a result after repeated baseline capture', () => {
    for (const e of [RUN_BY_ID.get('EXP-001')!, RUN_BY_ID.get('EXP-002')!]) {
      expect(e.result, e.id).toBeNull()
      expect(e.resultRecordedBy, e.id).toBeNull()
    }
  })

  it('EXP-001 has two baseline runs and both are marked baseline-only', () => {
    const e = RUN_BY_ID.get('EXP-001')!
    expect(e.measurements).toHaveLength(2)
    for (const m of e.measurements) expect(m.isBaselineRun, m.runId).toBe(true)
    expect(e.stage).toBe('REVIEW')
  })

  it('repeated capture does not advance the stage past REVIEW', () => {
    expect(RUN_BY_ID.get('EXP-001')!.stage).toBe('REVIEW')
  })
})

describe('no historical-period substitution', () => {
  it('May 2026 pool TVL stays unavailable despite two new September captures', () => {
    expect(EVIDENCE_BY_ID.get('EV-901')!.value).toBeNull()
    const e = RUN_BY_ID.get('EXP-001')!
    expect(e.limitations.join(' ')).toMatch(/May 2026 pool TVL remains DATA UNAVAILABLE/)
  })

  it('CEX spread is never filled from the DEX fee tier', () => {
    const spread = BASELINE_CAPTURES.find((c) => c.kpi === 'CEX bid/ask spread')!
    expect(spread.value).toBeNull()
    expect(spread.limitations.join(' ')).toMatch(/NOT substituted/)
    const fee = BASELINE_CAPTURES.find((c) => c.kpi === 'Fee tier')!
    expect(fee.limitations.join(' ')).toMatch(/NOT a bid\/ask spread/)
  })
})

describe('UNKNOWN wallet role preservation', () => {
  it('cluster addresses excluded by EXP-002 still carry role UNKNOWN', () => {
    for (const a of [
      '0xaaa4d5dd26eb1a2afe5fd5fb529fc24cee89cc2c',
      '0x7cc2f8914b4d77b68355757286f146373f4bf7ad',
      '0xe6e7ec8dfbacc0dbfc8e838ff2a49a252ab4ff85',
      '0x0d0707963952f2fba59dd06f2b425ace40b492fe',
    ]) {
      const w = WALLETS.find((x) => x.address === a)
      if (w) expect(w.role, a).toBe('UNKNOWN')
    }
  })

  it('exclusion is a measurement rule, not an ownership claim', () => {
    expect(EXP002_WEEK.exclusions.join(' ')).toMatch(/cluster/i)
    const c = BASELINE_CAPTURES.find((x) => x.experimentId === 'EXP-002' && x.value !== null)!
    expect(c.limitations.join(' ')).not.toMatch(/owned by|belongs to the company/i)
  })
})
