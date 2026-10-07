/**
 * MARKET QUALITY (QA) — unit coverage.
 *
 * Fixtures are built here and are clearly marked TEST DATA. They are constructed
 * in memory, never written to a store and never exported, so no fixture can
 * reach a production evidence store.
 *
 * The suite also asserts the governance protections the module must not break:
 * the EXP-001 baseline, the frozen layer, the proposed-threshold status, the
 * experiment registry (including the frozen EXP-002) and the DATA UNAVAILABLE /
 * NOT EXECUTED semantics.
 */
import { describe, expect, it } from 'vitest'
import * as QaModule from '../src/core/market-quality'
import {
  buildMarketQuality, check, dimension, evaluateRegression, isEvaluated, minutesBetween,
  qaTrend, rollUpDimension, rollUpOverall, summarise, QaCheckError, QA_STATUSES,
  MIN_TREND_POINTS,
} from '../src/core/market-quality'
import {
  completenessCheck, crossSourceChecks, duplicateCheck, freshnessCheck, marketDataQa,
  provenanceCheck, schemaCheck, sourceAvailabilityCheck, staleObservationCheck,
  FRESHNESS_FAIL_MINUTES, FRESHNESS_WARNING_MINUTES,
} from '../src/core/market-quality/market-data-qa'
import {
  frozenImpactRows, liquidityRegression, runOverRunRows, IMPACT_UNAVAILABLE_REASON,
} from '../src/core/market-quality/liquidity-regression'
import {
  compareTransaction, transactionIntegrity, EXPECTED_CONTEXT_UNAVAILABLE,
  EXPERIMENT_ID_COLLISION, TX_FIELDS,
} from '../src/core/market-quality/transaction-integrity'
import { resilienceScenarios } from '../src/core/market-quality/resilience'
import { securityResults } from '../src/core/market-quality/security'
import {
  evidenceValidation, experimentLinkageCheck, frozenEvidenceReasonCheck, hashCoverageCheck,
  traceabilityCheck,
} from '../src/core/market-quality/evidence-validation'
import {
  fingerprintRun, type LiveSyncRun, type MarketObservation, type SourceEvidence, type SnapshotField,
} from '../src/core/live-market-sync'
import { BASELINE_CAPTURES } from '../src/data/baseline-captures'
import { PROPOSED_THRESHOLDS } from '../src/data/proposed-thresholds'
import { EXPERIMENT_RUNS } from '../src/data/experiment-runs'
import { EVIDENCE } from '../src/data/evidence'
import type { GovernanceState } from '../src/core/governance'

// ═══════════════════════════════════════════════ TEST DATA (fixtures only)

const NOW = '2026-10-07T12:00:00Z'

/** TEST DATA — a synthetic observation. Never persisted. */
function obs(p: Partial<MarketObservation> & { metric: string }): MarketObservation {
  return {
    id: `TEST-OBS-${p.metric}`,
    asset: 'Super Trust', ticker: 'SUT',
    contractAddress: '0x98965474ecbec2f532f1f780ee37b0b05f77ca55',
    chain: 'polygon', venue: null, pair: null,
    metric: p.metric, value: p.value ?? null, unit: p.unit ?? 'USD',
    observationTimestamp: p.observationTimestamp ?? '2026-10-07T11:00:00Z',
    retrievalTimestamp: p.retrievalTimestamp ?? '2026-10-07T11:30:00Z',
    source: p.source ?? 'TEST-SOURCE-A',
    endpoint: p.endpoint ?? 'https://test.invalid/a',
    identityStatus: 'CONTRACT_VERIFIED',
    status: p.status ?? 'VALIDATED',
    rawPayloadHash: 'rawPayloadHash' in p ? p.rawPayloadHash! : 'deadbeef',
    rawPayload: '{"test":true}',
    methodology: p.methodology ?? 'TEST methodology',
    limitation: p.limitation ?? null,
  }
}

/** TEST DATA — a synthetic source evidence record. */
function srcEv(p: Partial<SourceEvidence> & { source: string }): SourceEvidence {
  return {
    sourceId: `test-${p.source}`, source: p.source,
    endpoint: p.endpoint ?? 'https://test.invalid/a',
    method: 'GET', httpStatus: p.httpStatus ?? 200,
    retrievalTimestamp: '2026-10-07T11:30:00Z',
    payloadBytes: 12,
    // `in` rather than `??` so an explicitly-passed null is preserved: the fixture
    // must be able to express "this source carries no payload hash".
    payloadHash: 'payloadHash' in p ? p.payloadHash! : 'deadbeef',
    payload: '{"test":true}',
    truncated: false, error: p.error ?? null,
    status: p.status ?? 'VALIDATED', identityStatus: 'CONTRACT_VERIFIED',
  }
}

function snap(o: MarketObservation): SnapshotField {
  return {
    label: o.metric, metric: o.metric, value: o.value, unit: o.unit,
    source: o.source, observationTimestamp: o.observationTimestamp,
    retrievalTimestamp: o.retrievalTimestamp,
    identityStatus: o.identityStatus, status: o.status, reason: o.limitation,
  }
}

/** TEST DATA — a complete, fingerprint-valid synthetic run. */
function makeRun(p: {
  id?: string
  observations: MarketObservation[]
  evidence?: SourceEvidence[]
  completedAt?: string
  status?: LiveSyncRun['status']
}): LiveSyncRun {
  const base = {
    id: p.id ?? 'TEST-RUN-001',
    date: '2026-10-07', sequence: 1, trigger: 'MANUAL' as const,
    startedAt: '2026-10-07T11:29:00Z',
    completedAt: p.completedAt ?? '2026-10-07T11:30:00Z',
    status: p.status ?? ('VALIDATED' as LiveSyncRun['status']),
    observations: p.observations,
    evidence: p.evidence ?? [srcEv({ source: 'TEST-SOURCE-A' })],
    snapshot: p.observations.map(snap),
  }
  return { ...base, fingerprint: fingerprintRun(base) }
}

const GOV: GovernanceState = {
  thresholdsRegistered: 0, thresholdsRequired: 4, thresholdsComplete: false,
  approvedBaselineRuns: [], intervention: null, comparison: null,
  calculation: null, finalReview: null,
}

// ═══════════════════════════════════════════════ status model

describe('QA status model', () => {
  it('never collapses DATA_UNAVAILABLE into FAIL', () => {
    expect(rollUpDimension([
      check({ id: 'a', label: 'a', status: 'DATA_UNAVAILABLE', reason: 'r' }),
    ])).toBe('DATA_UNAVAILABLE')
  })

  it('never collapses NOT_EXECUTED into PASS', () => {
    expect(rollUpDimension([
      check({ id: 'a', label: 'a', status: 'NOT_EXECUTED', reason: 'r' }),
    ])).toBe('NOT_EXECUTED')
  })

  it('does not let a PASS mask a FAIL', () => {
    expect(rollUpDimension([
      check({ id: 'a', label: 'a', status: 'PASS' }),
      check({ id: 'b', label: 'b', status: 'FAIL', reason: 'r' }),
    ])).toBe('FAIL')
  })

  it('does not let a non-evaluated check raise a rollup to PASS', () => {
    expect(rollUpDimension([
      check({ id: 'a', label: 'a', status: 'DATA_UNAVAILABLE', reason: 'r' }),
      check({ id: 'b', label: 'b', status: 'NOT_EXECUTED', reason: 'r' }),
    ])).not.toBe('PASS')
  })

  it('ranks BLOCKED above WARNING but below FAIL', () => {
    expect(rollUpDimension([
      check({ id: 'a', label: 'a', status: 'WARNING', reason: 'r' }),
      check({ id: 'b', label: 'b', status: 'BLOCKED', reason: 'r' }),
    ])).toBe('BLOCKED')
    expect(rollUpDimension([
      check({ id: 'a', label: 'a', status: 'BLOCKED', reason: 'r' }),
      check({ id: 'b', label: 'b', status: 'FAIL', reason: 'r' }),
    ])).toBe('FAIL')
  })

  it('treats an empty dimension as DATA_UNAVAILABLE, not PASS', () => {
    expect(rollUpDimension([])).toBe('DATA_UNAVAILABLE')
  })

  it('requires a reason for every non-PASS check', () => {
    expect(() => check({ id: 'x', label: 'x', status: 'FAIL' })).toThrow(QaCheckError)
    expect(() => check({ id: 'x', label: 'x', status: 'DATA_UNAVAILABLE' })).toThrow(QaCheckError)
    expect(() => check({ id: 'x', label: 'x', status: 'PASS' })).not.toThrow()
  })

  it('refuses an evaluation timestamp on a check that produced no verdict', () => {
    expect(() => check({
      id: 'x', label: 'x', status: 'NOT_EXECUTED', reason: 'r', evaluatedAt: NOW,
    })).toThrow(QaCheckError)
  })

  it('classifies only PASS/WARNING/FAIL as evaluated', () => {
    expect(QA_STATUSES.filter(isEvaluated)).toEqual(['PASS', 'WARNING', 'FAIL'])
  })

  it('reports DATA_INSUFFICIENT overall when nothing was evaluated', () => {
    const d = dimension({
      id: 'market-data', title: 't', purpose: 'p',
      checks: [check({ id: 'a', label: 'a', status: 'DATA_UNAVAILABLE', reason: 'r' })],
    })
    expect(rollUpOverall([d]).overall).toBe('DATA_INSUFFICIENT')
  })

  it('reports DEGRADED overall when any dimension fails', () => {
    const ok = dimension({
      id: 'security', title: 't', purpose: 'p',
      checks: [check({ id: 'a', label: 'a', status: 'PASS' })],
    })
    const bad = dimension({
      id: 'market-data', title: 't', purpose: 'p',
      checks: [check({ id: 'b', label: 'b', status: 'FAIL', reason: 'r' })],
    })
    expect(rollUpOverall([ok, bad]).overall).toBe('DEGRADED')
  })

  it('counts statuses without inventing any', () => {
    const d = dimension({
      id: 'security', title: 't', purpose: 'p',
      checks: [
        check({ id: 'a', label: 'a', status: 'PASS' }),
        check({ id: 'b', label: 'b', status: 'NOT_EXECUTED', reason: 'r' }),
      ],
    })
    const s = summarise([d], NOW)
    expect(s.counts.PASS).toBe(1)
    expect(s.counts.NOT_EXECUTED).toBe(1)
    expect(s.evaluated).toBe(1)
    expect(s.defined).toBe(2)
  })

  it('computes minute deltas and refuses unparseable input', () => {
    expect(minutesBetween('2026-10-07T12:00:00Z', '2026-10-07T11:00:00Z')).toBe(60)
    expect(minutesBetween(null, NOW)).toBeNull()
    expect(minutesBetween('nonsense', NOW)).toBeNull()
  })
})

// ═══════════════════════════════════════════════ market data QA

describe('Market Data QA', () => {
  const good = makeRun({ observations: [obs({ metric: 'price', value: 0.42 })] })

  it('reports DATA UNAVAILABLE with a reason when no run is stored', () => {
    for (const c of [
      sourceAvailabilityCheck(null), freshnessCheck(null, NOW), schemaCheck(null),
      provenanceCheck(null), completenessCheck(null), duplicateCheck(null),
      staleObservationCheck(null),
    ]) {
      expect(c.status).toBe('DATA_UNAVAILABLE')
      expect(c.reason).toBeTruthy()
      expect(c.evaluatedAt).toBeNull()
    }
  })

  it('passes freshness for a recent run and fails a stale one', () => {
    expect(freshnessCheck(good, '2026-10-07T12:00:00Z').status).toBe('PASS')
    const warnAt = new Date(Date.parse(good.completedAt) + (FRESHNESS_WARNING_MINUTES + 60) * 60_000)
    expect(freshnessCheck(good, warnAt.toISOString()).status).toBe('WARNING')
    const failAt = new Date(Date.parse(good.completedAt) + (FRESHNESS_FAIL_MINUTES + 60) * 60_000)
    expect(freshnessCheck(good, failAt.toISOString()).status).toBe('FAIL')
  })

  it('warns rather than passes when a run is timestamped in the future', () => {
    const c = freshnessCheck(good, '2026-10-07T10:00:00Z')
    expect(c.status).toBe('WARNING')
    expect(c.reason).toContain('future')
  })

  it('fails schema when a valued observation lacks a unit', () => {
    const bad = makeRun({ observations: [obs({ metric: 'price', value: 1, unit: '' })] })
    expect(schemaCheck(bad).status).toBe('FAIL')
  })

  it('fails provenance when a validated source has no payload hash', () => {
    const bad = makeRun({
      observations: [obs({ metric: 'price', value: 1 })],
      evidence: [srcEv({ source: 'TEST-SOURCE-A', payloadHash: null })],
    })
    expect(provenanceCheck(bad).status).toBe('FAIL')
  })

  it('warns on incomplete coverage and names each absent metric with its reason', () => {
    const c = completenessCheck(good)
    expect(c.status).toBe('WARNING')
    expect(c.reason).toContain('volume_24h')
  })

  it('detects a duplicated metric/source pair', () => {
    const dup = makeRun({
      observations: [obs({ metric: 'price', value: 1 }), obs({ metric: 'price', value: 1 })],
    })
    expect(duplicateCheck(dup).status).toBe('FAIL')
    expect(duplicateCheck(good).status).toBe('PASS')
  })

  it('warns when a source served data older than the freshness window', () => {
    const stale = makeRun({
      observations: [obs({
        metric: 'price', value: 1,
        observationTimestamp: '2026-10-01T00:00:00Z',
        retrievalTimestamp: '2026-10-07T11:30:00Z',
      })],
    })
    expect(staleObservationCheck(stale).status).toBe('WARNING')
  })

  it('computes cross-source deviation only when both sides are real numbers', () => {
    const both = makeRun({
      observations: [
        obs({ metric: 'price', value: 1.00, source: 'A' }),
        obs({ metric: 'pair_price', value: 1.02, source: 'B' }),
      ],
    })
    const ok = crossSourceChecks(both).find((c) => c.id.includes('price-vs-pair-price'))!
    expect(ok.status).toBe('PASS')
    expect(ok.deviationPct).toBeCloseTo(2, 5)

    const far = makeRun({
      observations: [
        obs({ metric: 'price', value: 1.00, source: 'A' }),
        obs({ metric: 'pair_price', value: 1.50, source: 'B' }),
      ],
    })
    expect(crossSourceChecks(far).find((c) => c.id.includes('pair-price'))!.status).toBe('FAIL')
  })

  it('never assumes agreement when a counterpart is missing', () => {
    const oneSide = makeRun({ observations: [obs({ metric: 'price', value: 1 })] })
    const c = crossSourceChecks(oneSide).find((x) => x.id.includes('price-vs-pair-price'))!
    expect(c.status).toBe('DATA_UNAVAILABLE')
    expect(c.deviationPct).toBeNull()
    expect(c.reason).toContain('no agreement is assumed')
  })

  it('refuses a percentage deviation against a zero reference', () => {
    const zero = makeRun({
      observations: [obs({ metric: 'price', value: 0 }), obs({ metric: 'pair_price', value: 5 })],
    })
    expect(crossSourceChecks(zero).find((c) => c.id.includes('pair-price'))!.status)
      .toBe('DATA_UNAVAILABLE')
  })

  it('rolls the whole dimension to DATA_UNAVAILABLE with no stored run', () => {
    expect(marketDataQa(null, NOW).status).toBe('DATA_UNAVAILABLE')
  })

  it('warns, not fails, when some sources did not validate', () => {
    const partial = makeRun({
      observations: [obs({ metric: 'price', value: 1 })],
      evidence: [srcEv({ source: 'A' }), srcEv({ source: 'B', status: 'ERROR', error: 'timeout' })],
    })
    expect(sourceAvailabilityCheck(partial).status).toBe('WARNING')
  })

  it('fails when no source validated at all', () => {
    const dead = makeRun({
      observations: [obs({ metric: 'price', value: null, status: 'DATA_UNAVAILABLE' })],
      evidence: [srcEv({ source: 'A', status: 'ERROR', error: 'down' })],
    })
    expect(sourceAvailabilityCheck(dead).status).toBe('FAIL')
  })
})

// ═══════════════════════════════════════════════ liquidity regression

describe('Liquidity regression — deterministic core', () => {
  it('detects no regression when a lower-is-better metric is unchanged', () => {
    const r = evaluateRegression({
      baseline: 9.6, current: 9.6, direction: 'LOWER_IS_BETTER',
      marginWarning: 1, marginFail: 5, useMagnitude: true,
    })
    expect(r.verdict).toBe('NO_REGRESSION')
    expect(r.change).toBe(0)
  })

  it('detects regression when a lower-is-better metric deteriorates', () => {
    // The spec's illustrative case: baseline 9.6 -> current 14.2.
    const r = evaluateRegression({
      baseline: 9.6, current: 14.2, direction: 'LOWER_IS_BETTER',
      marginWarning: 1, marginFail: 5, useMagnitude: true,
    })
    expect(r.verdict).toBe('REGRESSION_DETECTED')
    expect(r.change).toBeCloseTo(4.6, 5)
    expect(r.changePct).toBeCloseTo(47.9166, 3)
    expect(r.status).toBe('WARNING')
  })

  it('compares price impact by absolute magnitude, matching EXP-001', () => {
    // A sell impact of -9.6 worsening to -14.2 is a regression even though the
    // signed value decreased.
    const r = evaluateRegression({
      baseline: -9.6, current: -14.2, direction: 'LOWER_IS_BETTER',
      marginWarning: 1, marginFail: 5, useMagnitude: true,
    })
    expect(r.verdict).toBe('REGRESSION_DETECTED')
    expect(r.change).toBeCloseTo(4.6, 5)
  })

  it('does not flag an improvement as a regression', () => {
    const r = evaluateRegression({
      baseline: -14.2, current: -9.6, direction: 'LOWER_IS_BETTER',
      marginWarning: 1, marginFail: 5, useMagnitude: true,
    })
    expect(r.verdict).toBe('NO_REGRESSION')
  })

  it('escalates to FAIL past the fail margin', () => {
    expect(evaluateRegression({
      baseline: 9.6, current: 20, direction: 'LOWER_IS_BETTER',
      marginWarning: 1, marginFail: 5, useMagnitude: true,
    }).status).toBe('FAIL')
  })

  it('handles higher-is-better in the opposite direction', () => {
    const decline = evaluateRegression({
      baseline: 100_000, current: 50_000, direction: 'HIGHER_IS_BETTER',
      marginWarning: 10_000, marginFail: 30_000, useMagnitude: false,
    })
    expect(decline.verdict).toBe('REGRESSION_DETECTED')
    const growth = evaluateRegression({
      baseline: 100_000, current: 150_000, direction: 'HIGHER_IS_BETTER',
      marginWarning: 10_000, marginFail: 30_000, useMagnitude: false,
    })
    expect(growth.verdict).toBe('NO_REGRESSION')
  })

  it('returns DATA_UNAVAILABLE when either side is missing — never a verdict', () => {
    for (const [b, c] of [[null, 9.6], [9.6, null], [null, null]] as const) {
      const r = evaluateRegression({
        baseline: b, current: c, direction: 'LOWER_IS_BETTER',
        marginWarning: 1, marginFail: 5, useMagnitude: true,
      })
      expect(r.verdict).toBe('DATA_UNAVAILABLE')
      expect(r.status).toBe('DATA_UNAVAILABLE')
      expect(r.change).toBeNull()
    }
  })

  it('leaves changePct null against a zero baseline', () => {
    const r = evaluateRegression({
      baseline: 0, current: 5, direction: 'LOWER_IS_BETTER',
      marginWarning: 1, marginFail: 5, useMagnitude: false,
    })
    expect(r.changePct).toBeNull()
  })
})

describe('Liquidity regression — frozen EXP-001 wiring', () => {
  const impacts = [
    { size: '$10,000 buy', value: 10.64, runId: 'RUN-003', evidenceId: 'EV-143' },
    { size: '$10,000 sell', value: -9.61, runId: 'RUN-003', evidenceId: 'EV-144' },
    { size: '$100,000 both sides', value: null, runId: 'RUN-003', evidenceId: 'EV-147', notExecutable: true },
  ]

  it('reports DATA UNAVAILABLE for price impact and names what is required', () => {
    const rows = frozenImpactRows(impacts)
    const buy = rows.find((r) => r.id.includes('$10,000 buy'))!
    expect(buy.current).toBeNull()
    expect(buy.verdict).toBe('DATA_UNAVAILABLE')
    expect(buy.reason).toBe(IMPACT_UNAVAILABLE_REASON)
    expect(buy.reason).toContain('identical EXP-001 method')
  })

  it('carries the frozen baseline value through unchanged', () => {
    const rows = frozenImpactRows(impacts)
    expect(rows.find((r) => r.id.includes('$10,000 buy'))!.baseline).toBe(10.64)
    expect(rows.find((r) => r.id.includes('$10,000 sell'))!.baseline).toBe(-9.61)
  })

  it('keeps the $100,000 slot as not-registerable rather than inventing a figure', () => {
    const row = frozenImpactRows(impacts).find((r) => r.id.includes('$100,000'))!
    expect(row.baseline).toBeNull()
    expect(row.baselineLabel).toBe('NOT EXECUTABLE / NOT REGISTERABLE')
    expect(row.reason).toContain('none is invented')
  })

  it('computes a real run-over-run comparison when two syncs exist', () => {
    const prev = makeRun({
      id: 'TEST-RUN-001',
      observations: [obs({ metric: 'pair_liquidity_usd', value: 100_000 })],
    })
    const cur = makeRun({
      id: 'TEST-RUN-002',
      observations: [obs({ metric: 'pair_liquidity_usd', value: 50_000 })],
    })
    const row = runOverRunRows(cur, prev).find((r) => r.id.includes('pair_liquidity_usd'))!
    expect(row.baseline).toBe(100_000)
    expect(row.current).toBe(50_000)
    expect(row.change).toBe(-50_000)
    expect(row.verdict).toBe('REGRESSION_DETECTED')
    expect(row.reason).toContain('not a business acceptance decision')
  })

  it('reports DATA UNAVAILABLE run-over-run with only one stored sync', () => {
    const cur = makeRun({ observations: [obs({ metric: 'pair_liquidity_usd', value: 50_000 })] })
    const row = runOverRunRows(cur, null).find((r) => r.id.includes('pair_liquidity_usd'))!
    expect(row.verdict).toBe('DATA_UNAVAILABLE')
    expect(row.reason).toContain('No comparable current observation is available')
  })

  it('rolls the dimension to DATA_UNAVAILABLE when nothing is comparable', () => {
    const dim = liquidityRegression({ impacts, current: null, previous: null })
    expect(dim.status).toBe('DATA_UNAVAILABLE')
    expect(dim.rows.every((r) => r.current === null)).toBe(true)
  })
})

// ═══════════════════════════════════════════════ transaction integrity

describe('Transaction integrity', () => {
  it('passes every field when expected and actual agree', () => {
    const tx = {
      sender: '0xAAA', receiver: '0xBBB', amount: 100, token: 'SUT',
      transactionHash: '0xHASH', timestamp: '2026-10-07T11:00:00Z',
      status: 'success', chain: 'polygon', contract: '0xCONTRACT',
    }
    const r = compareTransaction(tx, { ...tx })
    expect(r.every((f) => f.status === 'PASS')).toBe(true)
    expect(r).toHaveLength(TX_FIELDS.length)
  })

  it('is case-insensitive for hex identifiers but exact for amounts', () => {
    expect(compareTransaction({ sender: '0xAbC' }, { sender: '0xabc' })[0]!.status).toBe('PASS')
    const amt = compareTransaction({ amount: 100 }, { amount: 100.5 })
      .find((f) => f.field === 'amount')!
    expect(amt.status).toBe('FAIL')
  })

  it('treats equivalent timestamps as a match', () => {
    const f = compareTransaction(
      { timestamp: '2026-10-07T11:00:00Z' },
      { timestamp: '2026-10-07T11:00:00.000Z' },
    ).find((x) => x.field === 'timestamp')!
    expect(f.status).toBe('PASS')
  })

  it('fails a mismatched field', () => {
    const f = compareTransaction({ receiver: '0xAAA' }, { receiver: '0xBBB' })
      .find((x) => x.field === 'receiver')!
    expect(f.status).toBe('FAIL')
  })

  it('reports DATA UNAVAILABLE — never FAIL — when the expected side is absent', () => {
    const f = compareTransaction(null, { sender: '0xAAA' }).find((x) => x.field === 'sender')!
    expect(f.status).toBe('DATA_UNAVAILABLE')
    expect(f.reason).toContain('no expected value')
  })

  it('reports DATA UNAVAILABLE when the observed side is absent', () => {
    const f = compareTransaction({ sender: '0xAAA' }, null).find((x) => x.field === 'sender')!
    expect(f.status).toBe('DATA_UNAVAILABLE')
  })

  it('reports the real reason and no case when no telemetry is connected', () => {
    const dim = transactionIntegrity([])
    expect(dim.status).toBe('DATA_UNAVAILABLE')
    expect(dim.cases).toHaveLength(0)
    expect(dim.checks[0]!.reason).toBe(EXPECTED_CONTEXT_UNAVAILABLE)
    expect(dim.checks[0]!.reason).toContain('Expected transaction context is not available')
  })

  it('does not claim the frozen EXP-002 identity for the public utility audit', () => {
    const dim = transactionIntegrity([])
    expect(dim.checks[0]!.evidence!.relatedExperiment).toBeNull()
    expect(dim.checks[0]!.evidence!.source).toContain('docs/EXP-002-PUBLIC-SUT-UTILITY')
    expect(EXPERIMENT_ID_COLLISION).toContain('Reproducible weekly active addresses')
    expect(EXPERIMENT_ID_COLLISION).toContain('governance decision')
  })
})

// ═══════════════════════════════════════════════ resilience + security

describe('Resilience scenarios', () => {
  const run = makeRun({ observations: [obs({ metric: 'price', value: 1 })] })

  it('executes the real degradation paths and passes them', () => {
    const s = resilienceScenarios({ runs: [run], latest: run, nowIso: NOW })
    for (const id of [
      'res-malformed-payload', 'res-storage-unavailable', 'res-schema-mismatch',
      'res-duplicate-run', 'res-tamper-detection',
    ]) {
      const got = s.find((x) => x.id === id)!
      expect(got.status, id).toBe('PASS')
      expect(got.evaluatedAt, id).toBe(NOW)
      expect(got.kind, id).toBe('EXECUTABLE')
    }
  })

  it('never reports an external scenario as PASS', () => {
    const s = resilienceScenarios({ runs: [], latest: null, nowIso: NOW })
    const ext = s.filter((x) => x.kind === 'EXTERNAL')
    expect(ext.length).toBeGreaterThan(0)
    for (const e of ext) {
      expect(e.status).toBe('NOT_EXECUTED')
      expect(e.evaluatedAt).toBeNull()
      expect(e.reason).toContain('external dependency')
    }
  })

  it('reports NOT EXECUTED for scenarios needing a stored run when none exists', () => {
    const s = resilienceScenarios({ runs: [], latest: null, nowIso: NOW })
    expect(s.find((x) => x.id === 'res-duplicate-run')!.status).toBe('NOT_EXECUTED')
    expect(s.find((x) => x.id === 'res-partial-response')!.status).toBe('NOT_EXECUTED')
    expect(s.find((x) => x.id === 'res-rate-limiting')!.status).toBe('NOT_EXECUTED')
  })

  it('decides the partial-response scenario from a real PARTIAL run', () => {
    const partial = makeRun({
      id: 'TEST-RUN-PARTIAL', status: 'PARTIAL',
      observations: [obs({ metric: 'price', value: null, status: 'DATA_UNAVAILABLE', limitation: 'source down' })],
      evidence: [srcEv({ source: 'A', status: 'ERROR', error: 'down' })],
    })
    const got = resilienceScenarios({ runs: [partial], latest: partial, nowIso: NOW })
      .find((x) => x.id === 'res-partial-response')!
    expect(got.status).toBe('PASS')
    expect(got.result).toContain('PARTIAL')
  })

  it('decides rate limiting from a real HTTP 429 record', () => {
    const throttled = makeRun({
      id: 'TEST-RUN-429', status: 'PARTIAL',
      observations: [obs({ metric: 'price', value: 1 })],
      evidence: [srcEv({ source: 'A', httpStatus: 429, status: 'DATA_UNAVAILABLE', error: 'throttled' })],
    })
    const got = resilienceScenarios({ runs: [throttled], latest: throttled, nowIso: NOW })
      .find((x) => x.id === 'res-rate-limiting')!
    expect(got.status).toBe('PASS')
    expect(got.result).toContain('429')
  })
})

describe('Security QA', () => {
  const run = makeRun({ observations: [obs({ metric: 'price', value: 1 })] })

  it('executes the real controls and passes them', () => {
    const r = securityResults({ runs: [run], latest: run, gov: GOV, nowIso: NOW })
    for (const id of [
      'sec-address-validation', 'sec-input-validation', 'sec-replay-protection',
      'sec-evidence-integrity', 'sec-authorization-boundary',
    ]) {
      const got = r.find((x) => x.id === id)!
      expect(got.status, id).toBe('PASS')
      expect(got.executable, id).toBe(true)
      expect(got.evaluatedAt, id).toBe(NOW)
    }
  })

  it('never reports a non-executable control as PASS', () => {
    const r = securityResults({ runs: [], latest: null, gov: GOV, nowIso: NOW })
    for (const c of r.filter((x) => !x.executable)) {
      expect(c.status).toBe('NOT_EXECUTED')
      expect(c.evaluatedAt).toBeNull()
      expect(c.reason).toBeTruthy()
    }
  })

  it('reports DATA UNAVAILABLE for evidence integrity with nothing stored', () => {
    const r = securityResults({ runs: [], latest: null, gov: GOV, nowIso: NOW })
    expect(r.find((x) => x.id === 'sec-evidence-integrity')!.status).toBe('DATA_UNAVAILABLE')
  })

  it('detects a tampered stored record as a security failure', () => {
    const tampered = { ...run, status: 'ERROR' as LiveSyncRun['status'] }
    const got = securityResults({ runs: [tampered], latest: tampered, gov: GOV, nowIso: NOW })
      .find((x) => x.id === 'sec-evidence-integrity')!
    expect(got.status).toBe('FAIL')
    expect(got.reason).toContain('no longer match')
  })

  it('reads the governance boundary without modifying it', () => {
    const before = JSON.stringify(GOV)
    securityResults({ runs: [run], latest: run, gov: GOV, nowIso: NOW })
    expect(JSON.stringify(GOV)).toBe(before)
  })
})

// ═══════════════════════════════════════════════ evidence validation

describe('Evidence validation', () => {
  it('reports DATA UNAVAILABLE when nothing was evaluated', () => {
    expect(traceabilityCheck([
      check({ id: 'a', label: 'a', status: 'DATA_UNAVAILABLE', reason: 'r' }),
    ]).status).toBe('DATA_UNAVAILABLE')
  })

  it('warns when an evaluated result cannot name its evidence', () => {
    const c = traceabilityCheck([check({ id: 'a', label: 'a', status: 'PASS' })])
    expect(c.status).toBe('WARNING')
    expect(c.reason).toContain('cannot name')
  })

  it('passes when evaluated results carry source, metric and provenance', () => {
    const c = traceabilityCheck([check({
      id: 'a', label: 'a', status: 'PASS',
      evidence: {
        evidenceId: null, source: 'S', sourceUrl: null, retrievedAt: null, observedAt: null,
        metric: 'm', value: 1, unit: 'USD', symbol: 'SUT', sourceStatus: null,
        provenance: 'p', evidenceHash: null, relatedExperiment: null, relatedSyncId: null,
      },
    })])
    expect(c.status).toBe('PASS')
  })

  it('verifies the frozen rule that an unavailable value states its reason', () => {
    const c = frozenEvidenceReasonCheck(EVIDENCE, NOW)
    expect(c.status).toBe('PASS')
  })

  it('fails when a frozen null value has no stated reason', () => {
    const c = frozenEvidenceReasonCheck([
      { ...EVIDENCE[0]!, id: 'TEST-EV-X', value: null, notes: undefined },
    ], NOW)
    expect(c.status).toBe('FAIL')
    expect(c.reason).toContain('TEST-EV-X')
  })

  it('fails when a QA result references an experiment that does not exist', () => {
    const c = experimentLinkageCheck([check({
      id: 'a', label: 'a', status: 'PASS',
      evidence: {
        evidenceId: null, source: 'S', sourceUrl: null, retrievedAt: null, observedAt: null,
        metric: 'm', value: null, unit: null, symbol: null, sourceStatus: null,
        provenance: 'p', evidenceHash: null, relatedExperiment: 'EXP-999', relatedSyncId: null,
      },
    })], ['EXP-001', 'EXP-002'])
    expect(c.status).toBe('FAIL')
    expect(c.reason).toContain('EXP-999')
  })

  it('reports hash coverage honestly with no stored run', () => {
    expect(hashCoverageCheck(null).status).toBe('DATA_UNAVAILABLE')
  })

  it('excludes non-evaluated upstream checks from the traceability denominator', () => {
    const upstream = [
      check({ id: 'a', label: 'a', status: 'DATA_UNAVAILABLE', reason: 'r' }),
      check({ id: 'b', label: 'b', status: 'NOT_EXECUTED', reason: 'r' }),
    ]
    const dim = evidenceValidation({
      allChecks: upstream, run: null, frozen: EVIDENCE,
      knownExperimentIds: ['EXP-001'], nowIso: NOW,
    })
    expect(dim.checks.find((c) => c.id === 'ev-traceability')!.status).toBe('DATA_UNAVAILABLE')
  })
})

// ═══════════════════════════════════════════════ trends

describe('QA trends', () => {
  it('manufactures no trend from fewer than two runs', () => {
    expect(qaTrend([])).toEqual([])
    expect(qaTrend([makeRun({ observations: [obs({ metric: 'price', value: 1 })] })])).toEqual([])
    expect(MIN_TREND_POINTS).toBe(2)
  })

  it('builds a point per run once enough runs exist', () => {
    const a = makeRun({ id: 'R1', observations: [obs({ metric: 'price', value: 1 })] })
    const b = makeRun({ id: 'R2', observations: [obs({ metric: 'price', value: null, status: 'DATA_UNAVAILABLE' })] })
    const t = qaTrend([a, b])
    expect(t).toHaveLength(2)
    expect(t[0]!.completeness).toBe(100)
    expect(t[1]!.completeness).toBe(0)
    expect(t[1]!.unavailable).toBe(1)
  })
})

// ═══════════════════════════════════════════════ full module

describe('buildMarketQuality', () => {
  const impacts = [{ size: '$10,000 buy', value: 10.64, runId: 'RUN-003', evidenceId: 'EV-143' }]

  it('degrades honestly when the project holds no live evidence', () => {
    const r = buildMarketQuality({
      runs: [], latest: null, previous: null, impacts, gov: GOV,
      frozen: EVIDENCE, knownExperimentIds: ['EXP-001', 'EXP-002'],
      transactionCases: [], nowIso: NOW,
    })
    expect(r.transaction.status).toBe('DATA_UNAVAILABLE')
    expect(r.marketData.status).toBe('DATA_UNAVAILABLE')
    expect(r.liquidity.status).toBe('DATA_UNAVAILABLE')
    // Resilience and security still run their real in-memory checks.
    expect(r.resilience.status).toBe('PASS')
    expect(r.security.status).toBe('PASS')
    expect(r.summary.overall).not.toBe('HEALTHY')
  })

  it('produces six dimensions in the documented order', () => {
    const r = buildMarketQuality({
      runs: [], latest: null, previous: null, impacts, gov: GOV,
      frozen: EVIDENCE, knownExperimentIds: ['EXP-001'], transactionCases: [], nowIso: NOW,
    })
    expect(r.summary.dimensions.map((d) => d.id)).toEqual([
      'transaction-integrity', 'market-data', 'liquidity-regression',
      'resilience', 'security', 'evidence-validation',
    ])
  })

  it('never reports a numeric quality score', () => {
    const r = buildMarketQuality({
      runs: [], latest: null, previous: null, impacts, gov: GOV,
      frozen: EVIDENCE, knownExperimentIds: ['EXP-001'], transactionCases: [], nowIso: NOW,
    })
    expect(r.summary).not.toHaveProperty('score')
    expect(JSON.stringify(r.summary)).not.toMatch(/81\s*\/\s*100/)
  })
})

// ═══════════════════════════════════════════════ governance protections

describe('Market Quality changes no governed state', () => {
  const impacts = [{ size: '$10,000 buy', value: 10.64, runId: 'RUN-003', evidenceId: 'EV-143' }]
  const runQa = () => buildMarketQuality({
    runs: [], latest: null, previous: null, impacts, gov: GOV,
    frozen: EVIDENCE, knownExperimentIds: EXPERIMENT_RUNS.map((e) => e.id),
    transactionCases: [], nowIso: NOW,
  })

  it('leaves the EXP-001 baseline captures byte-identical', () => {
    const before = JSON.stringify(BASELINE_CAPTURES)
    runQa()
    expect(JSON.stringify(BASELINE_CAPTURES)).toBe(before)
  })

  it('leaves the frozen evidence layer byte-identical', () => {
    const before = JSON.stringify(EVIDENCE)
    runQa()
    expect(JSON.stringify(EVIDENCE)).toBe(before)
  })

  it('leaves the experiment registry byte-identical, frozen EXP-002 included', () => {
    const before = JSON.stringify(EXPERIMENT_RUNS)
    runQa()
    expect(JSON.stringify(EXPERIMENT_RUNS)).toBe(before)
    const exp002 = EXPERIMENT_RUNS.find((e) => e.id === 'EXP-002')!
    expect(exp002.title).toBe('Reproducible weekly active addresses')
    expect(exp002.stage).toBe('PLANNED')
  })

  it('keeps the EXP-001 price-impact baselines at their frozen values', () => {
    runQa()
    const impact = (dim: string) => BASELINE_CAPTURES
      .find((c) => c.experimentId === 'EXP-001' && c.runId === 'RUN-003'
        && c.kpi === 'Price impact' && c.dimension === dim)!.value
    expect(impact('$10,000 buy')).toBe(10.64)
    expect(impact('$10,000 sell')).toBe(-9.61)
    expect(impact('$50,000 buy')).toBe(58.56)
    expect(impact('$50,000 sell')).toBe(-36.93)
    expect(impact('$100,000 both sides')).toBeNull()
  })

  it('leaves every proposed threshold proposed and unregistered', () => {
    const before = JSON.stringify(PROPOSED_THRESHOLDS)
    runQa()
    expect(JSON.stringify(PROPOSED_THRESHOLDS)).toBe(before)
  })

  it('leaves the governance state untouched', () => {
    const before = JSON.stringify(GOV)
    runQa()
    expect(JSON.stringify(GOV)).toBe(before)
    expect(GOV.thresholdsRegistered).toBe(0)
    expect(GOV.thresholdsComplete).toBe(false)
    expect(GOV.approvedBaselineRuns).toEqual([])
  })

  it('exposes no function that could approve, register or execute anything', () => {
    const forbidden = Object.keys(QaModule)
      .filter((k) => /^(approve|register|execute|commit|save|write|set)/i.test(k))
    expect(forbidden).toEqual([])
  })
})
