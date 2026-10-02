/**
 * Deterministic calculations over the measured datasets.
 * Every function that touches "volume" goes through the swap-only guard.
 */
import { assertVolumeSource, TWO_DAY_AGGREGATE_LABEL } from './rules'
import {
  CONTROL_DAILY, GROSS_POOL_FLOW, LIQUIDITY_DAILY, SUT_DEX_DAILY, SWAP_DAILY,
} from '../data/measurements'
import type { SwapDay } from '../data/measurements'

export interface IndexedPoint { date: string; sut: number | null; btc: number | null; eth: number | null }

/** Graph G1 — normalise all series to 100 at the first common date. */
export function indexedPerformance(): IndexedPoint[] {
  const ctrl = new Map(CONTROL_DAILY.map((c) => [c.date, c]))
  const dates = CONTROL_DAILY.map((c) => c.date)
  const first = dates[0]
  if (!first) return []
  const base = { sut: SUT_DEX_DAILY.find((d) => d.date === first)?.close, btc: ctrl.get(first)?.btc, eth: ctrl.get(first)?.eth }
  return dates.map((date) => {
    const s = SUT_DEX_DAILY.find((d) => d.date === date)?.close
    const c = ctrl.get(date)
    return {
      date,
      sut: s && base.sut ? (s / base.sut) * 100 : null,
      btc: c && base.btc ? (c.btc / base.btc) * 100 : null,
      eth: c && base.eth ? (c.eth / base.eth) * 100 : null,
    }
  })
}

/** H1 test: SUT move vs controls over the event interval. */
export function marketControlComparison(from = '2026-05-16', to = '2026-05-18') {
  const pct = (a?: number, b?: number) => (a && b ? ((b / a) - 1) * 100 : null)
  const s0 = SUT_DEX_DAILY.find((d) => d.date === from)?.close
  const s1 = SUT_DEX_DAILY.find((d) => d.date === to)?.close
  const c0 = CONTROL_DAILY.find((d) => d.date === from)
  const c1 = CONTROL_DAILY.find((d) => d.date === to)
  return {
    from, to,
    sutPct: pct(s0, s1),
    btcPct: pct(c0?.btc, c1?.btc),
    ethPct: pct(c0?.eth, c1?.eth),
  }
}

/**
 * Trading volume — SWAP EVENTS ONLY.
 * Throws if anyone attempts to derive volume from gross pool flow.
 */
export function swapVolume(date: string): number | null {
  assertVolumeSource('onchain_swap_decoded', 'swapVolume')
  return SWAP_DAILY.find((d) => d.date === date)?.volumeUsd ?? null
}

export interface CombinedAggregate {
  label: string
  dates: string[]
  volumeUsd: number
  buyUsd: number
  sellUsd: number
  netSellUsd: number
  swaps: number
  caveat: string | null
}

/**
 * Combined aggregate for days whose boundary is unresolved (conflict C15).
 * This is the SAFE way to report May 17/18.
 */
export function combinedAggregate(dates: string[]): CombinedAggregate {
  assertVolumeSource('onchain_swap_decoded', 'combinedAggregate')
  const rows = SWAP_DAILY.filter((d) => dates.includes(d.date))
  const sum = (f: (r: SwapDay) => number) => rows.reduce((a, r) => a + f(r), 0)
  const uncertain = rows.some((r) => r.dayBoundaryUncertain)
  return {
    label: dates.length > 1 && uncertain ? TWO_DAY_AGGREGATE_LABEL : dates.join(', '),
    dates,
    volumeUsd: sum((r) => r.volumeUsd),
    buyUsd: sum((r) => r.buyUsd),
    sellUsd: sum((r) => r.sellUsd),
    netSellUsd: sum((r) => r.sellUsd) - sum((r) => r.buyUsd),
    swaps: sum((r) => r.swaps),
    caveat: uncertain ? TWO_DAY_AGGREGATE_LABEL : null,
  }
}

/** Graph G3 — buy/sell imbalance per day. */
export function imbalanceSeries() {
  return SWAP_DAILY.map((d) => ({
    date: d.date,
    buyUsd: d.buyUsd,
    sellUsd: d.sellUsd,
    netSellUsd: d.sellUsd - d.buyUsd,
    price: SUT_DEX_DAILY.find((p) => p.date === d.date)?.close ?? null,
    dayBoundaryUncertain: d.dayBoundaryUncertain,
  }))
}

/** Net liquidity change — the H2 "LP flight" test. */
export function liquiditySeries() {
  return LIQUIDITY_DAILY.map((l) => ({
    date: l.date,
    addUsd: l.addUsd,
    removeUsd: l.removeUsd,
    netUsd: l.addUsd - l.removeUsd,
    mints: l.mints,
    burns: l.burns,
    feesUsd: l.feesUsd, // always null — decode defect, DATA UNAVAILABLE
  }))
}

/** The C14 reconciliation, computed rather than asserted. */
export function c14Reconciliation(date = '2026-05-17') {
  const swap = SWAP_DAILY.find((d) => d.date === date)
  const liq = LIQUIDITY_DAILY.find((d) => d.date === date)
  const gross = GROSS_POOL_FLOW.find((d) => d.date === date)
  if (!swap || !liq || !gross) return null
  const predictedIn = swap.buyUsd + liq.addUsd
  const predictedOut = swap.sellUsd + liq.removeUsd
  return {
    date,
    swapBuyUsd: swap.buyUsd,
    lpAddUsd: liq.addUsd,
    predictedGrossIn: predictedIn,
    measuredGrossIn: gross.inUsd,
    inDifference: gross.inUsd - predictedIn,
    swapSellUsd: swap.sellUsd,
    lpRemoveUsd: liq.removeUsd,
    predictedGrossOut: predictedOut,
    measuredGrossOut: gross.outUsd,
    outDifference: gross.outUsd - predictedOut,
    outDifferencePct: ((gross.outUsd - predictedOut) / gross.outUsd) * 100,
    liquidityShareOfGrossIn: (liq.addUsd / gross.inUsd) * 100,
  }
}

/** Case-level counters for the dashboard — all derived, none hard-coded. */
export function caseCounters(args: {
  evidenceCount: number
  hypotheses: Array<{ status: string }>
  events: Array<{ classification: string }>
  conflicts: Array<{ resolution: string }>
  dataUnavailableEvidence: number
}) {
  return {
    evidenceRecords: args.evidenceCount,
    activeHypotheses: args.hypotheses.filter((h) => h.status === 'INCONCLUSIVE' || h.status === 'SUPPORTED').length,
    rejectedHypotheses: args.hypotheses.filter((h) => h.status === 'REJECTED').length,
    dataUnavailableHypotheses: args.hypotheses.filter((h) => h.status === 'DATA_UNAVAILABLE').length,
    majorEvents: args.events.length,
    unresolvedItems:
      args.conflicts.filter((c) => c.resolution === 'UNRESOLVED').length +
      args.events.filter((e) => e.classification === 'UNRESOLVED' || e.classification === 'DATA_UNAVAILABLE').length +
      args.dataUnavailableEvidence,
    openConflicts: args.conflicts.filter((c) => c.resolution === 'UNRESOLVED').length,
    resolvedConflicts: args.conflicts.filter((c) => c.resolution === 'RESOLVED').length,
  }
}
