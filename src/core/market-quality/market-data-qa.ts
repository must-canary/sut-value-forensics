/**
 * MARKET DATA QA — automated validation over the existing Live Market layer.
 *
 * It reads stored `LiveSyncRun` records. It performs no retrieval of its own:
 * a second ingestion path would produce a second version of the truth, which is
 * exactly what this layer exists to detect.
 *
 * Every check answers one question about the evidence the sync already captured:
 * is it there, is it fresh, is it shaped correctly, does it carry provenance, is
 * it duplicated, and — only where two sources genuinely supply the same metric —
 * do they agree.
 */
import {
  allMetricEvidence, type LiveSyncRun, type MetricEvidence, type SnapshotField,
} from '../live-market-sync'
import {
  check, dimension, emptyEvidenceRef, minutesBetween, pct,
  type QaCheck, type QaDimension, type QaEvidenceRef,
} from './types'

/**
 * Freshness bands, in minutes, for the daily sync cadence (cron 00:05 UTC).
 * These are QA observation thresholds for data staleness only. They are NOT
 * business thresholds, they are not registered, and they gate nothing.
 */
export const FRESHNESS_WARNING_MINUTES = 26 * 60
export const FRESHNESS_FAIL_MINUTES = 72 * 60

/** Metrics a run is expected to carry. Absence is reported, never inferred. */
export const EXPECTED_METRICS = [
  'price', 'price_change_24h_pct', 'volume_24h', 'market_cap',
  'circulating_supply', 'total_supply', 'onchain_spot_price',
  'pair_liquidity_usd', 'pair_volume_24h', 'block_number',
] as const

/**
 * Metric pairs that two independent sources both supply and that are genuinely
 * comparable: same asset, same unit, same meaning. Cross-source deviation is
 * computed ONLY for these, and only when both values are real numbers.
 */
export const COMPARABLE_PAIRS: Array<{
  id: string; label: string; a: string; b: string; unit: string
  /** deviation bands in percent — QA observation only, not business thresholds */
  warningPct: number; failPct: number
}> = [
  {
    id: 'price-vs-pair-price',
    label: 'SUT price — CoinGecko vs DexScreener pair',
    a: 'price', b: 'pair_price', unit: 'USD',
    warningPct: 5, failPct: 20,
  },
  {
    id: 'price-vs-onchain-spot',
    label: 'SUT price — CoinGecko vs on-chain pool spot',
    a: 'price', b: 'onchain_spot_price', unit: 'USD per SUT',
    warningPct: 5, failPct: 20,
  },
]

function refFromMetric(m: MetricEvidence, run: LiveSyncRun): QaEvidenceRef {
  return {
    ...emptyEvidenceRef(),
    source: m.source ?? null,
    sourceUrl: m.endpoint ?? null,
    retrievedAt: m.retrievalTimestamp ?? null,
    observedAt: m.observationTimestamp ?? null,
    metric: m.metric,
    value: m.value,
    unit: m.unit ?? null,
    symbol: m.ticker ?? null,
    sourceStatus: m.status ?? null,
    provenance: m.methodology ?? null,
    evidenceHash: m.payloadHash ?? null,
    relatedSyncId: run.id,
  }
}

const findMetric = (ev: MetricEvidence[], metric: string): MetricEvidence | null =>
  ev.find((m) => m.metric === metric) ?? null

// ───────────────────────────────────────────── individual checks

/** Is a stored run available at all? Everything else depends on this. */
export function sourceAvailabilityCheck(run: LiveSyncRun | null): QaCheck {
  if (!run) {
    return check({
      id: 'md-source-availability',
      label: 'Source availability',
      status: 'DATA_UNAVAILABLE',
      reason: 'No live market sync run is stored. Run a Live Market Sync, or wait for the scheduled '
        + 'daily sync, to give this dimension something to validate.',
    })
  }
  const ok = run.evidence.filter((e) => e.status === 'VALIDATED').length
  const total = run.evidence.length
  const failed = run.evidence.filter((e) => e.status !== 'VALIDATED')
  const ref: QaEvidenceRef = { ...emptyEvidenceRef(), relatedSyncId: run.id, sourceStatus: run.status }
  if (total === 0) {
    return check({
      id: 'md-source-availability',
      label: 'Source availability',
      status: 'DATA_UNAVAILABLE',
      reason: `Sync ${run.id} recorded no source evidence.`,
      evidence: ref,
    })
  }
  if (ok === 0) {
    return check({
      id: 'md-source-availability',
      label: 'Source availability',
      status: 'FAIL',
      reason: `No source returned usable data in sync ${run.id} (0 of ${total} validated).`,
      expected: `${total} of ${total} sources validated`,
      actual: `0 of ${total}`,
      evidence: ref,
      evaluatedAt: run.completedAt,
    })
  }
  if (failed.length) {
    return check({
      id: 'md-source-availability',
      label: 'Source availability',
      status: 'WARNING',
      reason: `${failed.length} of ${total} sources did not validate in sync ${run.id}: `
        + `${failed.map((f) => `${f.source} (${f.status}${f.error ? `: ${f.error}` : ''})`).join('; ')}.`,
      expected: `${total} of ${total} sources validated`,
      actual: `${ok} of ${total}`,
      evidence: ref,
      evaluatedAt: run.completedAt,
    })
  }
  return check({
    id: 'md-source-availability',
    label: 'Source availability',
    status: 'PASS',
    expected: `${total} of ${total} sources validated`,
    actual: `${ok} of ${total}`,
    evidence: ref,
    evaluatedAt: run.completedAt,
  })
}

/**
 * Freshness, measured from the run's own completion timestamp against `nowIso`.
 * `nowIso` is injected so the check is deterministic under test.
 */
export function freshnessCheck(run: LiveSyncRun | null, nowIso: string): QaCheck {
  if (!run) {
    return check({
      id: 'md-freshness',
      label: 'Freshness',
      status: 'DATA_UNAVAILABLE',
      reason: 'No stored sync run, so data age cannot be measured.',
    })
  }
  const age = minutesBetween(nowIso, run.completedAt)
  const ref: QaEvidenceRef = {
    ...emptyEvidenceRef(),
    relatedSyncId: run.id, retrievedAt: run.completedAt, sourceStatus: run.status,
    provenance: 'age of the most recent stored sync measured against the current clock',
  }
  if (age === null) {
    return check({
      id: 'md-freshness',
      label: 'Freshness',
      status: 'DATA_UNAVAILABLE',
      reason: `Sync ${run.id} does not carry a parseable completion timestamp.`,
      evidence: ref,
    })
  }
  const hrs = (age / 60).toFixed(1)
  const expected = `at most ${(FRESHNESS_WARNING_MINUTES / 60).toFixed(0)}h old`
  if (age < 0) {
    return check({
      id: 'md-freshness',
      label: 'Freshness',
      status: 'WARNING',
      reason: `Sync ${run.id} is timestamped ${Math.abs(age).toFixed(0)} minutes in the future, so its age `
        + 'cannot be interpreted. Check the clock on the machine that produced it.',
      expected, actual: `${hrs}h in the future`,
      evidence: ref, evaluatedAt: nowIso,
    })
  }
  if (age > FRESHNESS_FAIL_MINUTES) {
    return check({
      id: 'md-freshness',
      label: 'Freshness',
      status: 'FAIL',
      reason: `The most recent stored sync is ${hrs}h old, beyond the `
        + `${(FRESHNESS_FAIL_MINUTES / 60).toFixed(0)}h staleness limit for a daily cadence.`,
      expected, actual: `${hrs}h old`,
      evidence: ref, evaluatedAt: nowIso,
    })
  }
  if (age > FRESHNESS_WARNING_MINUTES) {
    return check({
      id: 'md-freshness',
      label: 'Freshness',
      status: 'WARNING',
      reason: `The most recent stored sync is ${hrs}h old — more than one daily cycle has been missed.`,
      expected, actual: `${hrs}h old`,
      evidence: ref, evaluatedAt: nowIso,
    })
  }
  return check({
    id: 'md-freshness',
    label: 'Freshness',
    status: 'PASS',
    expected, actual: `${hrs}h old`,
    evidence: ref, evaluatedAt: nowIso,
  })
}

/**
 * Schema validation: every snapshot field must carry the structural fields the
 * evidence model requires. A missing VALUE is completeness (reported separately);
 * a missing unit, source or timestamp on a field that DOES have a value is a
 * schema defect.
 */
export function schemaCheck(run: LiveSyncRun | null): QaCheck {
  if (!run) {
    return check({
      id: 'md-schema', label: 'Schema', status: 'DATA_UNAVAILABLE',
      reason: 'No stored sync run, so no observation shape can be validated.',
    })
  }
  const defects: string[] = []
  const valued = run.snapshot.filter((f: SnapshotField) => f.value !== null)
  for (const f of valued) {
    if (!f.unit) defects.push(`${f.metric}: no unit`)
    if (!f.source) defects.push(`${f.metric}: no source`)
    if (!f.retrievalTimestamp) defects.push(`${f.metric}: no retrieval timestamp`)
    if (f.status === 'VALIDATED' && !f.observationTimestamp && !f.retrievalTimestamp) {
      defects.push(`${f.metric}: validated with neither an observation nor a retrieval timestamp`)
    }
  }
  const ref: QaEvidenceRef = { ...emptyEvidenceRef(), relatedSyncId: run.id }
  if (valued.length === 0) {
    return check({
      id: 'md-schema', label: 'Schema', status: 'DATA_UNAVAILABLE',
      reason: `Sync ${run.id} carries no valued observation, so there is no shape to validate.`,
      evidence: ref,
    })
  }
  if (defects.length) {
    return check({
      id: 'md-schema', label: 'Schema', status: 'FAIL',
      reason: `${defects.length} structural defect(s): ${defects.slice(0, 6).join('; ')}`
        + `${defects.length > 6 ? ` (+${defects.length - 6} more)` : ''}.`,
      expected: 'every valued observation carries unit, source and retrieval timestamp',
      actual: `${defects.length} defect(s) across ${valued.length} valued observations`,
      evidence: ref, evaluatedAt: run.completedAt,
    })
  }
  return check({
    id: 'md-schema', label: 'Schema', status: 'PASS',
    expected: 'every valued observation carries unit, source and retrieval timestamp',
    actual: `${valued.length} of ${valued.length} valued observations well-formed`,
    evidence: ref, evaluatedAt: run.completedAt,
  })
}

/** Provenance: a payload hash and endpoint must exist for each captured source. */
export function provenanceCheck(run: LiveSyncRun | null): QaCheck {
  if (!run) {
    return check({
      id: 'md-provenance', label: 'Provenance', status: 'DATA_UNAVAILABLE',
      reason: 'No stored sync run, so provenance cannot be inspected.',
    })
  }
  const captured = run.evidence.filter((e) => e.status === 'VALIDATED')
  const missing = captured.filter((e) => !e.payloadHash || !e.endpoint)
  const ref: QaEvidenceRef = { ...emptyEvidenceRef(), relatedSyncId: run.id }
  if (captured.length === 0) {
    return check({
      id: 'md-provenance', label: 'Provenance', status: 'DATA_UNAVAILABLE',
      reason: `Sync ${run.id} has no validated source payload to carry provenance.`,
      evidence: ref,
    })
  }
  if (missing.length) {
    return check({
      id: 'md-provenance', label: 'Provenance', status: 'FAIL',
      reason: `${missing.length} of ${captured.length} validated sources lack an endpoint or a payload hash: `
        + `${missing.map((m) => m.source).join(', ')}.`,
      expected: 'every validated source carries an endpoint and a SHA-256 payload hash',
      actual: `${captured.length - missing.length} of ${captured.length} complete`,
      evidence: ref, evaluatedAt: run.completedAt,
    })
  }
  return check({
    id: 'md-provenance', label: 'Provenance', status: 'PASS',
    expected: 'every validated source carries an endpoint and a SHA-256 payload hash',
    actual: `${captured.length} of ${captured.length} complete`,
    evidence: ref, evaluatedAt: run.completedAt,
  })
}

/** Completeness: how many expected metrics actually carry a value. */
export function completenessCheck(run: LiveSyncRun | null): QaCheck {
  if (!run) {
    return check({
      id: 'md-completeness', label: 'Completeness', status: 'DATA_UNAVAILABLE',
      reason: 'No stored sync run, so metric coverage cannot be measured.',
    })
  }
  const ev = allMetricEvidence(run)
  const present: string[] = []
  const absent: Array<{ metric: string; reason: string }> = []
  for (const metric of EXPECTED_METRICS) {
    const m = findMetric(ev, metric)
    if (m && m.value !== null) present.push(metric)
    else absent.push({ metric, reason: m?.reason ?? m?.status ?? 'not captured' })
  }
  const ref: QaEvidenceRef = { ...emptyEvidenceRef(), relatedSyncId: run.id }
  const expected = `${EXPECTED_METRICS.length} of ${EXPECTED_METRICS.length} expected metrics valued`
  const actual = `${present.length} of ${EXPECTED_METRICS.length}`
  if (present.length === 0) {
    return check({
      id: 'md-completeness', label: 'Completeness', status: 'DATA_UNAVAILABLE',
      reason: `Sync ${run.id} supplied no expected metric with a value.`,
      expected, actual, evidence: ref,
    })
  }
  if (absent.length) {
    return check({
      id: 'md-completeness', label: 'Completeness', status: 'WARNING',
      reason: `${absent.length} expected metric(s) carry no value, each with the source's own reason: `
        + `${absent.map((a) => `${a.metric} (${a.reason})`).join('; ')}.`,
      expected, actual, evidence: ref, evaluatedAt: run.completedAt,
    })
  }
  return check({
    id: 'md-completeness', label: 'Completeness', status: 'PASS',
    expected, actual, evidence: ref, evaluatedAt: run.completedAt,
  })
}

/** Duplicate observations: the same metric captured twice within one run. */
export function duplicateCheck(run: LiveSyncRun | null): QaCheck {
  if (!run) {
    return check({
      id: 'md-duplicates', label: 'Duplicate observations', status: 'DATA_UNAVAILABLE',
      reason: 'No stored sync run, so duplication cannot be assessed.',
    })
  }
  const seen = new Map<string, number>()
  for (const o of run.observations) {
    const key = `${o.metric}|${o.source}|${o.endpoint}`
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }
  const dupes = [...seen.entries()].filter(([, n]) => n > 1)
  const ref: QaEvidenceRef = { ...emptyEvidenceRef(), relatedSyncId: run.id }
  if (run.observations.length === 0) {
    return check({
      id: 'md-duplicates', label: 'Duplicate observations', status: 'DATA_UNAVAILABLE',
      reason: `Sync ${run.id} contains no observation.`,
      evidence: ref,
    })
  }
  if (dupes.length) {
    return check({
      id: 'md-duplicates', label: 'Duplicate observations', status: 'FAIL',
      reason: `${dupes.length} metric/source pair(s) appear more than once in sync ${run.id}: `
        + `${dupes.map(([k, n]) => `${k.split('|')[0]} ×${n}`).join(', ')}.`,
      expected: 'one observation per metric per source per run',
      actual: `${dupes.length} duplicated pair(s)`,
      evidence: ref, evaluatedAt: run.completedAt,
    })
  }
  return check({
    id: 'md-duplicates', label: 'Duplicate observations', status: 'PASS',
    expected: 'one observation per metric per source per run',
    actual: `${run.observations.length} observations, no duplicate metric/source pair`,
    evidence: ref, evaluatedAt: run.completedAt,
  })
}

/**
 * Stale observations: a source reporting an observation timestamp far older than
 * the retrieval that fetched it. Detects a source serving cached data.
 */
export function staleObservationCheck(run: LiveSyncRun | null): QaCheck {
  if (!run) {
    return check({
      id: 'md-stale', label: 'Stale observations', status: 'DATA_UNAVAILABLE',
      reason: 'No stored sync run, so observation staleness cannot be assessed.',
    })
  }
  const ev = allMetricEvidence(run)
  const datable = ev.filter((m) => m.value !== null && m.observationTimestamp && m.retrievalTimestamp)
  const stale = datable
    .map((m) => ({ m, lag: minutesBetween(m.retrievalTimestamp, m.observationTimestamp) }))
    .filter((x) => x.lag !== null && x.lag > FRESHNESS_WARNING_MINUTES)
  const ref: QaEvidenceRef = { ...emptyEvidenceRef(), relatedSyncId: run.id }
  if (datable.length === 0) {
    return check({
      id: 'md-stale', label: 'Stale observations', status: 'DATA_UNAVAILABLE',
      reason: `No observation in sync ${run.id} carries both an observation and a retrieval timestamp, `
        + 'so source-side lag cannot be measured.',
      evidence: ref,
    })
  }
  if (stale.length) {
    return check({
      id: 'md-stale', label: 'Stale observations', status: 'WARNING',
      reason: `${stale.length} of ${datable.length} observations were already older than `
        + `${(FRESHNESS_WARNING_MINUTES / 60).toFixed(0)}h when retrieved: `
        + `${stale.map((s) => `${s.m.metric} (${(s.lag! / 60).toFixed(1)}h lag)`).join(', ')}.`,
      expected: `source-side lag under ${(FRESHNESS_WARNING_MINUTES / 60).toFixed(0)}h`,
      actual: `${stale.length} lagging observation(s)`,
      evidence: ref, evaluatedAt: run.completedAt,
    })
  }
  return check({
    id: 'md-stale', label: 'Stale observations', status: 'PASS',
    expected: `source-side lag under ${(FRESHNESS_WARNING_MINUTES / 60).toFixed(0)}h`,
    actual: `${datable.length} dated observations, none lagging`,
    evidence: ref, evaluatedAt: run.completedAt,
  })
}

export interface CrossSourceResult extends QaCheck {
  deviationPct: number | null
}

/**
 * Cross-source deviation — computed ONLY where two independent sources supply a
 * genuinely comparable metric, and only when both are real numbers. A missing
 * counterpart yields DATA UNAVAILABLE, never an assumed agreement.
 */
export function crossSourceChecks(run: LiveSyncRun | null): CrossSourceResult[] {
  if (!run) {
    return [{
      ...check({
        id: 'md-cross-source', label: 'Cross-source deviation', status: 'DATA_UNAVAILABLE',
        reason: 'No stored sync run, so no two sources can be compared.',
      }),
      deviationPct: null,
    }]
  }
  const ev = allMetricEvidence(run)
  return COMPARABLE_PAIRS.map((pair) => {
    const a = findMetric(ev, pair.a)
    const b = findMetric(ev, pair.b)
    const ref = a ? refFromMetric(a, run) : { ...emptyEvidenceRef(), relatedSyncId: run.id }
    const id = `md-cross-${pair.id}`
    if (!a || !b || typeof a.value !== 'number' || typeof b.value !== 'number') {
      const which = !a || typeof a?.value !== 'number' ? pair.a : pair.b
      return {
        ...check({
          id, label: pair.label, status: 'DATA_UNAVAILABLE',
          reason: `Both sides must supply a comparable number. "${which}" is not available as a number in `
            + `sync ${run.id}, so no deviation is computed and no agreement is assumed.`,
          evidence: ref,
        }),
        deviationPct: null,
      }
    }
    if (a.value === 0) {
      return {
        ...check({
          id, label: pair.label, status: 'DATA_UNAVAILABLE',
          reason: `The reference value for "${pair.a}" is zero in sync ${run.id}, so a percentage `
            + 'deviation is not defined.',
          evidence: ref,
        }),
        deviationPct: null,
      }
    }
    const dev = Math.abs((b.value - a.value) / a.value) * 100
    const common = {
      id, label: pair.label,
      expected: `agreement within ${pair.warningPct}%`,
      actual: `${pct(dev)} apart (${a.source} ${a.value} ${pair.unit} vs ${b.source} ${b.value} ${pair.unit})`,
      evidence: ref,
      evaluatedAt: run.completedAt,
    }
    if (dev > pair.failPct) {
      return {
        ...check({
          ...common, status: 'FAIL',
          reason: `${a.source} and ${b.source} disagree by ${pct(dev)} on ${pair.a}, beyond the `
            + `${pair.failPct}% limit. One of the two is not describing the same quantity.`,
        }),
        deviationPct: dev,
      }
    }
    if (dev > pair.warningPct) {
      return {
        ...check({
          ...common, status: 'WARNING',
          reason: `${a.source} and ${b.source} differ by ${pct(dev)} on ${pair.a}.`,
        }),
        deviationPct: dev,
      }
    }
    return { ...check({ ...common, status: 'PASS' }), deviationPct: dev }
  })
}

// ───────────────────────────────────────────── dimension

export const MARKET_DATA_PURPOSE =
  'Validates that the stored live market evidence is available, fresh, well-formed, traceable, complete, '
  + 'free of duplicates, and — where two sources genuinely supply the same metric — mutually consistent.'

export function marketDataQa(run: LiveSyncRun | null, nowIso: string): QaDimension {
  const checks: QaCheck[] = [
    sourceAvailabilityCheck(run),
    freshnessCheck(run, nowIso),
    schemaCheck(run),
    provenanceCheck(run),
    completenessCheck(run),
    duplicateCheck(run),
    staleObservationCheck(run),
    ...crossSourceChecks(run),
  ]
  return dimension({
    id: 'market-data',
    title: 'Market Data QA',
    purpose: MARKET_DATA_PURPOSE,
    checks,
  })
}
