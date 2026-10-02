import { useState } from 'react'
import {
  BarChart, Card, DataUnavailable, Figure, LineChart, Provenance, StatusChip, Tile, Warn,
} from './components'
import {
  caseCounters, c14Reconciliation, combinedAggregate, imbalanceSeries,
  indexedPerformance, liquiditySeries, marketControlComparison,
} from '../core/analysis'
import { generateCaseReport, renderReportText } from '../core/report'
import {
  CASE, CERTIK, DST_DAILY_FLOW, HOP3_FANOUT_DAILY, MAIN_POOL, MARKET_SNAPSHOT,
  PROVIDER_CLOSES, SUT_DEX_DAILY, SWAP_DAILY, TOKEN, TOP100_BENCHMARK, TOP_HOLDERS,
  TRACED_CHAIN, VENUES,
} from '../data/measurements'
import { EVIDENCE } from '../data/evidence'
import { HYPOTHESES } from '../data/hypotheses'
import { CONFLICTS, TIMELINE, WALLETS } from '../data/timeline'
import { SOURCES, SOURCE_BY_ID, RETIRED_CLAIMS } from '../data/sources'
import { FORBIDDEN_WALLET_TERMS, SUT_CONTRACT } from '../core/rules'

const usd = (v: number) => `$${Math.round(v).toLocaleString()}`
const usd2 = (v: number) => `$${v.toFixed(4)}`
const num = (v: number) => Math.round(v).toLocaleString()

// ════════════════════════════════════════════════ 1. Executive Dashboard

export function Dashboard() {
  const ctrl = marketControlComparison()
  const agg = combinedAggregate(['2026-05-17', '2026-05-18'])
  const counters = caseCounters({
    evidenceCount: EVIDENCE.length,
    hypotheses: HYPOTHESES,
    events: TIMELINE,
    conflicts: CONFLICTS,
    dataUnavailableEvidence: EVIDENCE.filter((e) => e.value === null).length,
  })
  const liq = liquiditySeries().find((l) => l.date === '2026-05-17')!

  return (
    <>
      <header>
        <h2>Executive Dashboard</h2>
        <p className="sub">{CASE.id} — {CASE.title} · window {CASE.windowStart} → {CASE.windowEnd} · <strong>RESEARCH FROZEN 2026-09-30</strong></p>
      </header>

      <Warn>
        <strong>Supported mechanism:</strong> sell-side pressure interacting with structurally shallow
        liquidity produced an extreme price response. <strong>The initiating catalyst remains unresolved.</strong>{' '}
        No root cause is stated — the evidence standard is not met for any candidate trigger.
      </Warn>

      <div className="tiles">
        <Tile label="SUT price" value={usd2(MARKET_SNAPSHOT.priceUsd)} meta={`${MARKET_SNAPSHOT.priceSource} · ${MARKET_SNAPSHOT.retrievedAt}`} />
        <Tile label="Market cap" value={usd(MARKET_SNAPSHOT.marketCapUsd)} meta="CMC basis 188.4M circ. — not available liquidity" />
        <Tile label="24h volume" value={usd(MARKET_SNAPSHOT.volume24hUsd)} meta="≈0.1% of market cap" />
        <Tile label="Holders" value={`${num(MARKET_SNAPSHOT.holdersBlockscout)} / ${num(MARKET_SNAPSHOT.holdersCertik)}`} meta="Blockscout / CertiK — conflict C1" />
        <Tile label="Major events" value={counters.majorEvents} meta="timeline entries" />
        <Tile label="Active hypotheses" value={counters.activeHypotheses} meta={`${counters.rejectedHypotheses} rejected · ${counters.dataUnavailableHypotheses} data-unavailable`} />
        <Tile label="Evidence records" value={counters.evidenceRecords} meta={`${EVIDENCE.filter((e) => e.value === null).length} DATA UNAVAILABLE`} />
        <Tile label="Unresolved items" value={counters.unresolvedItems} meta={`${counters.openConflicts} open conflicts`} />
      </div>

      <Card title="Crash summary — 16–20 May 2026" hint="All values derive from stored observations.">
        <div className="grid2">
          <div>
            <table>
              <tbody>
                <tr><td>SUT (DEX close, May 16 → 18)</td><td className="num"><strong>{ctrl.sutPct?.toFixed(1)}%</strong></td></tr>
                <tr><td>BTC control</td><td className="num">{ctrl.btcPct?.toFixed(1)}%</td></tr>
                <tr><td>ETH control</td><td className="num">{ctrl.ethPct?.toFixed(1)}%</td></tr>
                <tr><td>Swap activity May 16 → 17</td><td className="num">246 → 4,341 (~18×)</td></tr>
                <tr><td>Net sell imbalance, May 17</td><td className="num"><strong>{usd(26981)}</strong></td></tr>
                <tr><td>Net liquidity change, May 17</td><td className="num" style={{ color: 'var(--status-good)' }}>+{usd(liq.netUsd)}</td></tr>
                <tr><td>Swap volume, {agg.label}</td><td className="num">{usd(agg.volumeUsd)}</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <p className="small"><strong>Evidence confidence</strong></p>
            <ul className="tight">
              <li>Price: three independent series agree within ~1–5% (one contract-verified).</li>
              <li>Volume: providers disagree up to 4.2× — <strong>no canonical series</strong> (C4).</li>
              <li>Day split for May 17/18 is unreliable (C15) — combined aggregate used.</li>
              <li>May 2026 pool TVL: <strong>never measured</strong>.</li>
              <li>Historical CEX depth: <strong>unrecoverable</strong>.</li>
            </ul>
            <p className="small muted">
              A net imbalance of ~$27,000 accompanied a −62.7% intraday move: depth exhaustion,
              not a large net imbalance, and not LP withdrawal.
            </p>
          </div>
        </div>
        <Provenance period="2026-05-16 → 2026-05-20" source="Polygon RPC (decoded Swap/Mint/Burn), GeckoTerminal, CoinGecko"
          methodology="onchain_swap_decoded + aggregator_reported" retrievedAt="2026-09-30"
          limitations={['May 17/18 day boundary unresolved (C15)', 'May 2026 pool TVL never measured']} />
      </Card>
    </>
  )
}

// ════════════════════════════════════════════════ 2. Crash Investigations

export function Investigations() {
  const [filter, setFilter] = useState<string>('all')
  const types = ['all', ...Array.from(new Set(TIMELINE.map((t) => t.type)))]
  const rows = [...TIMELINE].filter((t) => filter === 'all' || t.type === filter).sort((a, b) => a.time.localeCompare(b.time))
  return (
    <>
      <header>
        <h2>Crash Investigations</h2>
        <p className="sub">{CASE.id} event timeline. Onset refined to {CASE.onset} intraday.</p>
      </header>
      <Card>
        <div className="row" style={{ marginBottom: 12 }}>
          {types.map((t) => (
            <button key={t} className="toggle" aria-current={filter === t}
              style={filter === t ? { color: 'var(--text-primary)', fontWeight: 600 } : undefined}
              onClick={() => setFilter(t)}>{t.replace(/_/g, ' ')}</button>
          ))}
        </div>
        <div className="scroll">
          <table>
            <thead><tr><th>Time</th><th>Type</th><th>Event</th><th>Classification</th><th>Identity</th><th>Evidence</th></tr></thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className="mono" style={{ whiteSpace: 'nowrap' }}>{e.time}{e.timeApproximate ? ' ≈' : ''}</td>
                  <td className="small muted">{e.type.replace(/_/g, ' ')}</td>
                  <td><strong className="small">{e.title}</strong><div className="small muted">{e.detail}</div></td>
                  <td><StatusChip status={e.classification} /></td>
                  <td><StatusChip status={e.identityStatus} /></td>
                  <td className="mono">{e.evidenceIds.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

// ════════════════════════════════════════════════ 3. Market Analysis

export function MarketAnalysis() {
  const idx = indexedPerformance()
  const imb = imbalanceSeries()
  const priceDates = SUT_DEX_DAILY.map((d) => d.date)
  const agg = combinedAggregate(['2026-05-17', '2026-05-18'])

  return (
    <>
      <header>
        <h2>Market Analysis</h2>
        <p className="sub">Source-separated series. Provider series are never blended (conflict C4).</p>
      </header>

      <Figure
        title="G1 — SUT vs BTC vs ETH (indexed to 100)"
        hint="Normalised at 2026-04-30 to separate market-wide movement from SUT-specific residual."
        chart={<LineChart labels={idx.map((d) => d.date)} yFormat={(v) => v.toFixed(0)} yLabel="index (100 = Apr 30)"
          series={[
            { key: 'sut', label: 'SUT', color: 'var(--series-1)', values: idx.map((d) => d.sut) },
            { key: 'btc', label: 'BTC', color: 'var(--series-2)', values: idx.map((d) => d.btc) },
            { key: 'eth', label: 'ETH', color: 'var(--series-3)', values: idx.map((d) => d.eth) },
          ]} />}
        table={<table><thead><tr><th>Date</th><th className="num">SUT</th><th className="num">BTC</th><th className="num">ETH</th></tr></thead>
          <tbody>{idx.map((d) => (<tr key={d.date}><td>{d.date}</td>
            <td className="num">{d.sut?.toFixed(1) ?? '—'}</td><td className="num">{d.btc?.toFixed(1) ?? '—'}</td><td className="num">{d.eth?.toFixed(1) ?? '—'}</td></tr>))}</tbody></table>}
        provenance={<Provenance period="2026-04-30 → 2026-05-25" source="GeckoTerminal (contract-keyed pool) · CoinGecko (BTC/ETH)"
          methodology="onchain_swap_decoded (SUT) + aggregator_reported (controls); indexed to first common date"
          retrievedAt="2026-09-30" limitations={['daily closes only', 'two controls; no small-cap index']} />}
      />

      <Figure
        title="G2 — SUT price vs swap volume"
        hint="Volume is decoded Swap events only. Gross pool flow is barred from this field."
        chart={<LineChart labels={priceDates} yFormat={(v) => v.toFixed(2)} yLabel="USD close"
          series={[{ key: 'p', label: 'SUT close', color: 'var(--series-1)', values: SUT_DEX_DAILY.map((d) => d.close) }]} />}
        table={<table><thead><tr><th>Date</th><th className="num">Close</th><th className="num">Low</th><th className="num">Swap volume</th></tr></thead>
          <tbody>{SUT_DEX_DAILY.map((d) => { const s = SWAP_DAILY.find((x) => x.date === d.date)
            return (<tr key={d.date}><td>{d.date}</td><td className="num">{d.close.toFixed(4)}</td><td className="num">{d.low.toFixed(4)}</td>
              <td className="num">{s ? usd(s.volumeUsd) : '—'}</td></tr>) })}</tbody></table>}
        warning={<Warn><strong>{agg.label}.</strong> Swap volume for the event days is reported as a
          combined figure of <strong>{usd(agg.volumeUsd)}</strong> across {num(agg.swaps)} swaps. Single-day
          splits are unreliable (C15) and are not presented as authoritative.</Warn>}
        provenance={<Provenance period="2026-04-25 → 2026-05-25" source="GeckoTerminal pool 0x092295c9…e165 · Polygon RPC"
          methodology="onchain_swap_decoded" retrievedAt="2026-09-30"
          limitations={['May 17/18 day boundary unresolved — use the two-day aggregate']} />}
      />

      <Figure
        title="G3 — Buy / sell imbalance (decoded swaps)"
        hint="Diverging view. Net sell imbalance on May 17 was ~$27K against a −62.7% intraday move."
        chart={<BarChart labels={imb.map((d) => d.date)} yFormat={(v) => `$${Math.round(v / 1000)}k`} diverging
          series={[
            { key: 'buy', label: 'Buy', color: 'var(--series-1)', values: imb.map((d) => d.buyUsd) },
            { key: 'sell', label: 'Sell', color: 'var(--diverge-neg)', values: imb.map((d) => -d.sellUsd) },
          ]} />}
        table={<table><thead><tr><th>Date</th><th className="num">Buy</th><th className="num">Sell</th><th className="num">Net sell</th><th className="num">Close</th></tr></thead>
          <tbody>{imb.map((d) => (<tr key={d.date}><td>{d.date}</td><td className="num">{usd(d.buyUsd)}</td>
            <td className="num">{usd(d.sellUsd)}</td><td className="num"><strong>{usd(d.netSellUsd)}</strong></td>
            <td className="num">{d.price?.toFixed(4) ?? '—'}</td></tr>))}</tbody></table>}
        provenance={<Provenance period="2026-05-13 → 2026-05-22" source="Polygon RPC — decoded Uniswap V3 Swap events"
          methodology="onchain_swap_decoded; direction from signed amount0/amount1" retrievedAt="2026-09-30"
          limitations={['day boundary unresolved for May 17/18 (C15)', 'router-routed trades bundle many end users']} />}
      />

      <Card title="G4 — Provider divergence (data-integrity view)" hint="Closes agree; volume does not. Never blended.">
        <div className="scroll">
          <table>
            <thead><tr><th>Date</th><th className="num">CoinGecko</th><th className="num">Coinranking</th><th className="num">DEX (contract-verified)</th></tr></thead>
            <tbody>{PROVIDER_CLOSES.map((p) => (<tr key={p.date}><td>{p.date}</td>
              <td className="num">{p.coingecko?.toFixed(6) ?? '—'}</td><td className="num">{p.coinranking?.toFixed(3) ?? '—'}</td>
              <td className="num">{p.dex.toFixed(4)}</td></tr>))}</tbody>
          </table>
        </div>
        <Provenance period="2026-05-15 → 2026-05-20" source="CoinGecko · Coinranking · GeckoTerminal"
          methodology="aggregator_reported vs onchain_swap_decoded — shown separately, never averaged"
          retrievedAt="2026-09-30" limitations={['volume divergence up to 4.2× is unresolved (C4)']} />
      </Card>
    </>
  )
}

// ════════════════════════════════════════════════ 4. On-Chain Forensics

export function OnChain() {
  const [q, setQ] = useState('')
  const found = q.length > 3 ? WALLETS.filter((w) => w.address.includes(q.toLowerCase())) : []
  return (
    <>
      <header>
        <h2>On-Chain Forensics</h2>
        <p className="sub">Wallet roles default to UNKNOWN and change only with role evidence.</p>
      </header>

      <Card title="Wallet search">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="0x… (min 4 chars)"
          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--plane)', color: 'var(--text-primary)', font: 'inherit' }} />
        {q.length > 3 && (found.length === 0
          ? <p className="small muted" style={{ marginTop: 10 }}>No indexed wallet matches. Only wallets in Case #001 are indexed.</p>
          : <table style={{ marginTop: 10 }}><thead><tr><th>Address</th><th>Role</th><th>Evidence</th><th>Note</th></tr></thead>
            <tbody>{found.map((w) => (<tr key={w.address}><td className="mono">{w.address}</td>
              <td><StatusChip status={w.role as never} /></td><td className="mono">{w.roleEvidenceId ?? '—'}</td>
              <td className="small muted">{w.note}</td></tr>))}</tbody></table>)}
      </Card>

      <Card title="Traced chain — Case #001" hint="Flow, timing and destination. This relationship is NOT labelled as the cause of the crash.">
        <div className="scroll">
          <table>
            <thead><tr><th>Hop</th><th>Address</th><th>Role</th><th className="num">Flow</th><th>Destination behaviour</th></tr></thead>
            <tbody>
              <tr><td>SRC</td><td className="mono">{TRACED_CHAIN.src}</td><td><StatusChip status={'UNKNOWN' as never} /></td>
                <td className="num">{num(TRACED_CHAIN.srcToDstSut)} SUT → DST</td><td className="small">Top-10 holder #4. Near-daily, May 1–17.</td></tr>
              <tr><td>DST</td><td className="mono">{TRACED_CHAIN.dst}</td><td><StatusChip status={'UNKNOWN' as never} /></td>
                <td className="num">in {num(TRACED_CHAIN.dstInSut)} / out {num(TRACED_CHAIN.dstOutSut)}</td>
                <td className="small">Conduit. Holds ~{num(TRACED_CHAIN.dstSutBalanceNow)} SUT today. Also holds {num(TRACED_CHAIN.dstMsqBalance)} MSQ — evidence bearing on affiliation, <strong>not proof</strong>.</td></tr>
              <tr><td>HOP3</td><td className="mono">{TRACED_CHAIN.hop3}</td><td><StatusChip status={'UNKNOWN' as never} /></td>
                <td className="num">{num(TRACED_CHAIN.hop3OutMaySut)} SUT out</td>
                <td className="small"><strong>Retail fan-out</strong>: {num(TRACED_CHAIN.hop3OutMayTx)} transfers to {num(TRACED_CHAIN.hop3DistinctRecipientsMay)} addresses, avg ~{TRACED_CHAIN.hop3AvgTransferSut} SUT. No venue address among top recipients.</td></tr>
            </tbody>
          </table>
        </div>
        <Warn>
          <strong>Eventual destination:</strong> a retail fan-out, not a market sale. Cluster addresses
          contributed <strong>{TRACED_CHAIN.clusterPoolSellsSut} SUT ({TRACED_CHAIN.clusterPoolSellsPct}%)</strong> of pool
          sell inflow. <strong>Caveat:</strong> this measures direct transfers only — a sale routed through an
          aggregator appears as the router address, so this is not proof the cluster never sold.
        </Warn>
        <p className="small muted">Forbidden without role evidence: {FORBIDDEN_WALLET_TERMS.join(', ')}.</p>
        <Provenance period="2026-05-01 → 2026-05-25" source="Polygon RPC (eth_getLogs) · Blockscout"
          methodology="onchain_transfer; daily buckets via block_ts_interpolated" retrievedAt="2026-09-30"
          limitations={['router-mediated and CEX sales are unattributable', 'all roles UNKNOWN — no public labels exist']} />
      </Card>

      <Figure
        title="Conduit daily flow vs fan-out distribution"
        hint="DST forwarding stopped May 16; the fan-out throttled ~70% the same day and never recovered."
        chart={<BarChart labels={DST_DAILY_FLOW.map((d) => d.date)} yFormat={(v) => `${Math.round(v / 1000)}k`}
          series={[
            { key: 'in', label: 'DST in (SUT)', color: 'var(--series-1)', values: DST_DAILY_FLOW.map((d) => d.inSut) },
            { key: 'out', label: 'DST out (SUT)', color: 'var(--series-2)', values: DST_DAILY_FLOW.map((d) => d.outSut) },
          ]} />}
        table={<table><thead><tr><th>Date</th><th className="num">DST in</th><th className="num">DST out</th><th className="num">Fan-out SUT</th><th className="num">Fan-out tx</th></tr></thead>
          <tbody>{DST_DAILY_FLOW.map((d) => { const f = HOP3_FANOUT_DAILY.find((x) => x.date === d.date)
            return (<tr key={d.date}><td>{d.date}</td><td className="num">{num(d.inSut)}</td><td className="num">{num(d.outSut)}</td>
              <td className="num">{f ? num(f.sut) : '—'}</td><td className="num">{f ? num(f.transfers) : '—'}</td></tr>) })}</tbody></table>}
        warning={<Warn>Timing is correlation, not causation. A pipeline stopping before a crash is equally
          consistent with an operator reacting to stress, an unrelated upstream change, or coincidence.</Warn>}
        provenance={<Provenance period="2026-05-01 → 2026-05-19" source="Polygon RPC · Blockscout"
          methodology="onchain_transfer" retrievedAt="2026-09-30" limitations={['daily buckets from interpolated block timestamps']} />}
      />

      <Card title="Holder concentration" hint="Two different metrics — never presented as one (conflict C6).">
        <div className="scroll">
          <table>
            <thead><tr><th className="num">#</th><th>Address</th><th className="num">Amount</th><th className="num">%</th><th>Note</th></tr></thead>
            <tbody>{TOP_HOLDERS.map((h) => (<tr key={h.rank}><td className="num">{h.rank}</td><td className="mono">{h.address}</td>
              <td className="num">{num(h.amount)}</td><td className="num">{h.pct}</td><td className="small muted">{h.note}</td></tr>))}</tbody>
          </table>
        </div>
        <p className="small"><strong>Top-10 by balance: ~71%</strong> (~50% excluding the dead address) · <strong>CertiK Major Holding Ratio: {CERTIK.majorHoldingRatioPct}%</strong> — different, unpublished methodology.</p>
        <Provenance period="snapshot 2026-09-29/30" source="Blockscout · CertiK" methodology="top-10 by balance vs CertiK proprietary ratio"
          retrievedAt="2026-09-30" limitations={['the two concentration figures are not the same metric (C6)']} />
      </Card>
    </>
  )
}

// ════════════════════════════════════════════════ 5. Exchange & Liquidity

export function ExchangeLiquidity() {
  const liq = liquiditySeries()
  const rec = c14Reconciliation()!
  return (
    <>
      <header>
        <h2>Exchange &amp; Liquidity</h2>
        <p className="sub">Trading volume, liquidity add/remove, fees and raw token flow are kept strictly separate.</p>
      </header>

      <Card title="C14 reconciliation — why gross flow is not volume" hint="Resolved 2026-09-30 by procedure C1.">
        <div className="scroll">
          <table>
            <tbody>
              <tr><td>Swap buy-side (buyers paying in) — <strong>volume</strong></td><td className="num">{usd(rec.swapBuyUsd)}</td></tr>
              <tr><td>LP <code>Mint</code> deposits — <strong>NOT volume</strong></td><td className="num">{usd(rec.lpAddUsd)}</td></tr>
              <tr><td><strong>= predicted gross inflow</strong></td><td className="num"><strong>{usd(rec.predictedGrossIn)}</strong></td></tr>
              <tr><td>Measured gross inflow</td><td className="num">{usd(rec.measuredGrossIn)}</td></tr>
              <tr><td>Difference</td><td className="num" style={{ color: 'var(--status-good)' }}><strong>{usd(rec.inDifference)}</strong></td></tr>
              <tr><td>Outflow reconciliation</td><td className="num">{rec.outDifferencePct.toFixed(2)}%</td></tr>
            </tbody>
          </table>
        </div>
        <Warn><strong>{rec.liquidityShareOfGrossIn.toFixed(0)}% of the apparent "volume" on {rec.date} was liquidity
          provisioning.</strong> Using gross flow overstated trading by ~3.4×. Aggregators were not
          undercounting — the gross-flow proxy was wrong.</Warn>
        <Provenance period="2026-05-17" source="Polygon RPC — decoded Swap + Mint + Burn"
          methodology="onchain_swap_decoded vs gross_pool_flow" retrievedAt="2026-09-30" />
      </Card>

      <Figure
        title="Liquidity add / remove — did LPs flee?"
        hint="Churn rose ~65× on May 17, but net liquidity was positive every crash day."
        chart={<BarChart labels={liq.map((d) => d.date)} yFormat={(v) => `$${Math.round(v / 1000)}k`} diverging
          series={[
            { key: 'add', label: 'Liquidity added', color: 'var(--series-1)', values: liq.map((d) => d.addUsd) },
            { key: 'rem', label: 'Liquidity removed', color: 'var(--diverge-neg)', values: liq.map((d) => -d.removeUsd) },
          ]} />}
        table={<table><thead><tr><th>Date</th><th className="num">Added</th><th className="num">Removed</th><th className="num">Net</th><th className="num">Mints</th><th className="num">Burns</th><th>Fees</th></tr></thead>
          <tbody>{liq.map((d) => (<tr key={d.date}><td>{d.date}</td><td className="num">{usd(d.addUsd)}</td><td className="num">{usd(d.removeUsd)}</td>
            <td className="num"><strong>{usd(d.netUsd)}</strong></td><td className="num">{d.mints}</td><td className="num">{d.burns}</td>
            <td className="small muted">DATA UNAVAILABLE</td></tr>))}</tbody></table>}
        warning={<Warn><strong>LP-flight variant REJECTED.</strong> Net liquidity was positive on every crash
          day (+$15,911 / +$3,667 / +$3,053). The churn is concentrated-liquidity re-ranging, not withdrawal.</Warn>}
        provenance={<Provenance period="2026-05-13 → 2026-05-22" source="Polygon RPC — decoded Uniswap V3 Mint/Burn"
          methodology="onchain_swap_decoded" retrievedAt="2026-09-30"
          limitations={['May 2026 pool TVL was never measured — these are flows, not TVL']} />}
      />

      <Card title="LP fees collected">
        <DataUnavailable what="Fee amounts for May 2026."
          why="Decode defect identified: Collect(owner, recipient, tickLower, tickUpper, amount0, amount1) — amounts sit at data words [1],[2]; the run read [0],[1] and decoded the recipient address as an amount. Event counts are valid (1,471 total; 675 on May 17); amounts are not. Correction pending — no value is substituted." />
      </Card>

      <Card title="Venues" hint="Historical depth is shown only where it exists for the stated period.">
        <div className="scroll">
          <table>
            <thead><tr><th>Exchange</th><th>Pair</th><th>Identity</th><th className="num">24h volume</th><th className="num">Depth ±2%</th><th className="num">Liquidity</th><th>Retrieved</th></tr></thead>
            <tbody>{VENUES.map((v) => (<tr key={v.exchange}>
              <td>{v.exchange}</td><td className="mono">{v.pair}</td><td><StatusChip status={v.identityStatus} /></td>
              <td className="num">{v.volume24hUsd === null ? <span className="muted">no longer trading</span> : usd(v.volume24hUsd)}</td>
              <td className="num">{v.depthPlus2Pct === null ? <span className="muted">DATA UNAVAILABLE</span> : `+${usd(v.depthPlus2Pct)} / −${usd(v.depthMinus2Pct!)}`}</td>
              <td className="num">{v.liquidityUsd === null ? <span className="muted">—</span> : usd(v.liquidityUsd)}</td>
              <td className="small muted">{v.retrievedAt}</td></tr>))}</tbody>
          </table>
        </div>
        <Warn><strong>Historical CEX order-book depth for May 2026: DATA UNAVAILABLE.</strong> No public source
          retains it. The ±2% figures above are <strong>2026-09-29 snapshots</strong> and must never be
          substituted for May 2026 depth. Main-pool liquidity {usd(MAIN_POOL.reserveUsdSep2026)} is likewise
          a September figure; May 2026 pool TVL was never measured.</Warn>
        <Provenance period="snapshot 2026-09-29/30 (NOT the event window)" source="Gate · GeckoTerminal · exchange pages"
          methodology="aggregator_reported" retrievedAt="2026-09-30"
          limitations={['no historical depth exists for the event window']} />
      </Card>
    </>
  )
}

// ════════════════════════════════════════════════ 6. Hypothesis Lab

export function HypothesisLab() {
  const [open, setOpen] = useState<string | null>('H2')
  return (
    <>
      <header>
        <h2>Hypothesis Lab</h2>
        <p className="sub">H1–H12 at the research freeze. Statuses are human-reviewed; the system may not assign them.</p>
      </header>
      {HYPOTHESES.map((h) => (
        <section className="card" key={h.id}>
          <div className="between">
            <div>
              <h3>{h.id} — {h.title}</h3>
              <p className="hint">{h.statement}</p>
            </div>
            <div className="row">
              <StatusChip status={h.status} />
              <button className="toggle" onClick={() => setOpen(open === h.id ? null : h.id)}>
                {open === h.id ? 'Collapse' : 'Expand'}
              </button>
            </div>
          </div>
          <p className="small"><strong>Scope:</strong> {h.scopeOfResult}</p>
          <p className="small row">
            <span className="chip">{h.supportingEvidenceIds.length} supporting</span>
            <span className="chip">{h.contradictingEvidenceIds.length} contradicting</span>
            <span className="chip">{h.missingEvidence.length} missing</span>
            <span className="chip">graphs: {h.graphs.join(', ') || '—'}</span>
          </p>
          {open === h.id && (
            <div style={{ marginTop: 10 }}>
              <p className="small"><strong>Mechanism:</strong> {h.mechanism}</p>
              <p className="small"><strong>Test:</strong> {h.testMethod}</p>
              <p className="small"><strong>Falsification criterion:</strong> {h.falsificationCriterion}</p>
              <div className="grid2">
                <div>
                  <p className="small"><strong>Supporting evidence</strong></p>
                  <ul className="tight">{h.supportingEvidenceIds.length ? h.supportingEvidenceIds.map((id) => (
                    <li key={id}><span className="mono">{id}</span> — {EVIDENCE.find((e) => e.id === id)?.metric}</li>
                  )) : <li className="muted">none</li>}</ul>
                  <p className="small"><strong>Contradictory evidence</strong></p>
                  <ul className="tight">{h.contradictingEvidenceIds.length ? h.contradictingEvidenceIds.map((id) => (
                    <li key={id}><span className="mono">{id}</span> — {EVIDENCE.find((e) => e.id === id)?.metric}</li>
                  )) : <li className="muted">none</li>}</ul>
                </div>
                <div>
                  <p className="small"><strong>Missing data</strong></p>
                  <ul className="tight">{h.missingEvidence.map((m) => <li key={m}>{m}</li>)}</ul>
                  <p className="small"><strong>Limitations</strong></p>
                  <ul className="tight">{h.limitations.map((m) => <li key={m}>{m}</li>)}</ul>
                </div>
              </div>
              <div className="prov">
                <div><b>Human review:</b> {h.review ? `${h.review.author} · ${h.review.reviewedAt}` : 'NOT REVIEWED — status cannot be final'}</div>
                {h.review && <div>{h.review.note}</div>}
              </div>
            </div>
          )}
        </section>
      ))}
    </>
  )
}

// ════════════════════════════════════════════════ 7. Evidence

export function EvidenceScreen() {
  const [sel, setSel] = useState<string | null>(null)
  const e = EVIDENCE.find((x) => x.id === sel)
  return (
    <>
      <header>
        <h2>Evidence</h2>
        <p className="sub">{EVIDENCE.length} records · {EVIDENCE.filter((x) => x.value === null).length} DATA UNAVAILABLE · {CONFLICTS.length} registered conflicts</p>
      </header>

      <Card title="Evidence register">
        <div className="scroll">
          <table>
            <thead><tr><th>ID</th><th>Metric</th><th className="num">Value</th><th>Source</th><th>Observed</th><th>Retrieved</th><th>Method</th><th>Confidence</th><th>Identity</th></tr></thead>
            <tbody>{EVIDENCE.map((x) => (
              <tr key={x.id} onClick={() => setSel(x.id === sel ? null : x.id)} style={{ cursor: 'pointer' }}>
                <td className="mono">{x.id}</td><td className="small">{x.metric}</td>
                <td className="num">{x.value === null ? <span className="muted">DATA UNAVAILABLE</span> : `${typeof x.value === 'number' ? x.value.toLocaleString() : x.value} ${x.unit}`}</td>
                <td className="small">{x.sourceId}</td><td className="small mono">{x.observationTime ?? '—'}</td>
                <td className="small mono">{x.retrievedAt}</td><td className="small muted">{x.methodology}</td>
                <td><StatusChip status={x.confidence} /></td><td><StatusChip status={x.identityStatus} /></td>
              </tr>))}</tbody>
          </table>
        </div>
      </Card>

      {e && (
        <Card title={`${e.id} — full provenance`}>
          <table><tbody>
            <tr><td>Metric</td><td>{e.metric}</td></tr>
            <tr><td>Value / unit</td><td>{e.value === null ? 'DATA UNAVAILABLE' : String(e.value)} {e.unit}</td></tr>
            <tr><td>Source</td><td>{SOURCE_BY_ID.get(e.sourceId)?.name} (tier {SOURCE_BY_ID.get(e.sourceId)?.tier})</td></tr>
            <tr><td>Source URL</td><td className="mono">{SOURCE_BY_ID.get(e.sourceId)?.url}</td></tr>
            <tr><td>Token contract</td><td className="mono">{e.token.contract}</td></tr>
            <tr><td>Chain</td><td>{e.token.chain}</td></tr>
            <tr><td>Observation time</td><td className="mono">{e.observationTime ?? '—'}</td></tr>
            <tr><td>Retrieval time</td><td className="mono">{e.retrievedAt}</td></tr>
            <tr><td>Method</td><td>{e.methodology}</td></tr>
            <tr><td>Confidence</td><td><StatusChip status={e.confidence} /></td></tr>
            <tr><td>Identity</td><td><StatusChip status={e.identityStatus} /></td></tr>
            <tr><td>Aggregation caveat</td><td>{e.aggregationCaveat ?? '—'}</td></tr>
            <tr><td>Limitations / notes</td><td className="small">{e.notes}</td></tr>
            <tr><td>Related hypotheses</td><td className="mono">{HYPOTHESES.filter((h) => h.supportingEvidenceIds.includes(e.id) || h.contradictingEvidenceIds.includes(e.id)).map((h) => h.id).join(', ') || '—'}</td></tr>
          </tbody></table>
        </Card>
      )}

      <Card title="Data conflicts" hint="Rendered as conflicts. Never averaged, never silently reconciled.">
        {CONFLICTS.map((c) => (
          <div key={c.id} style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10 }}>
            <div className="row"><strong className="small">{c.id} — {c.metric}</strong>
              <StatusChip status={(c.resolution === 'RESOLVED' ? 'VERIFIED' : 'UNRESOLVED') as never} />
              {c.observationTime && <span className="small muted">{c.observationTime}</span>}</div>
            <table style={{ marginTop: 6 }}>
              <tbody>{c.observations.map((o, i) => (<tr key={i}><td className="small">{o.sourceId}</td>
                <td className="num">{typeof o.value === 'number' ? o.value.toLocaleString() : o.value}</td>
                <td><StatusChip status={o.identityStatus} /></td></tr>))}</tbody>
            </table>
            <p className="small muted">{c.methodologicalReason}</p>
            {c.resolutionNote && <p className="small" style={{ color: 'var(--status-good)' }}>{c.resolutionNote}</p>}
            <p className="small"><strong>Display rule:</strong> {c.displayRule} · <strong>Canonical:</strong> {c.canonicalForAnalysis ?? 'none — report all observations'}</p>
          </div>
        ))}
      </Card>

      <Card title="Source integrity" hint="Duplicate sources, internal-document claims and retired claims.">
        <table>
          <thead><tr><th>Source</th><th className="num">Tier</th><th>Status</th><th>Not authoritative for</th></tr></thead>
          <tbody>{SOURCES.map((s) => (<tr key={s.id}><td className="small">{s.name}</td><td className="num">{s.tier}</td>
            <td className="small">{s.formatOf ? <span className="chip">DUPLICATE of {s.formatOf}</span> : s.internal ? <span className="chip">INTERNAL — no privilege</span> : '—'}</td>
            <td className="small muted">{s.notAuthoritativeFor.join('; ')}</td></tr>))}</tbody>
        </table>
        <p className="small" style={{ marginTop: 12 }}><strong>Retired claims (detected wherever re-typed):</strong></p>
        <ul className="tight">{RETIRED_CLAIMS.map((r) => (<li key={r.id}><strong>{r.claim}</strong> — retired by {r.retiredBy} on {r.retiredOn}. {r.reason}</li>))}</ul>
      </Card>
    </>
  )
}

// ════════════════════════════════════════════════ 8. Reports

export function Reports() {
  const [approved, setApproved] = useState(false)
  const sections = generateCaseReport({
    evidence: EVIDENCE, hypotheses: HYPOTHESES, events: TIMELINE, conflicts: CONFLICTS,
    rootCause: approved
      ? {
          statement: '[example of the gated path — a real conclusion requires a named reviewer and all six gates]',
          author: 'Lead Investigator (example)', approvedAt: new Date().toISOString().slice(0, 10),
          gatesMet: { timing: true, magnitude: true, mechanism: true, controls: true, alternatives: true, human_authorship: true },
        }
      : null,
  })
  return (
    <>
      <header>
        <h2>Reports</h2>
        <p className="sub">Case #001 evidence report. The generator cannot state a root cause without a recorded human approval.</p>
      </header>
      <Card>
        <div className="between">
          <p className="small" style={{ margin: 0 }}>
            <strong>Root-cause conclusion:</strong>{' '}
            {approved ? 'human-approved (example)' : 'none recorded — report states mechanism + unresolved catalyst'}
          </p>
          <div className="row">
            <button className="toggle" onClick={() => setApproved((a) => !a)}>
              {approved ? 'Revoke example approval' : 'Simulate human approval'}
            </button>
            <button className="toggle" onClick={() => navigator.clipboard?.writeText(renderReportText(sections))}>Copy report</button>
          </div>
        </div>
        {!approved && <Warn>No human reviewer has recorded a causal conclusion. The report therefore states a{' '}
          <strong>supported mechanism</strong> and that the <strong>initiating catalyst remains unresolved</strong>.</Warn>}
      </Card>
      {sections.map((s) => (
        <Card key={s.heading} title={s.heading}>
          <ul className="tight">{s.body.map((b, i) => <li key={i}>{b}</li>)}</ul>
        </Card>
      ))}
      <div className="report-footer">
        <div>SUT Value Forensics — {CASE.id} evidence report · research frozen 2026-09-30</div>
        <div className="attribution-line">Created &amp; Idea by Magha Ram</div>
        <div className="muted">
          Product direction and implementation attribution. The underlying frozen research documents are
          referenced as sources and are not claimed as the attributed author&apos;s work.
        </div>
      </div>
    </>
  )
}

// ════════════════════════════════════════════════ 9. Settings

export function Settings({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
  return (
    <>
      <header>
        <h2>Settings</h2>
        <p className="sub">Identity rules and enforced data rules are frozen and not user-editable.</p>
      </header>

      <Card title="About">
        <table><tbody>
          <tr><td style={{ width: '32%' }}>Product</td><td>SUT Value Forensics</td></tr>
          <tr><td>Case</td><td>{CASE.id} — {CASE.title}</td></tr>
          <tr><td>Research state</td><td>FROZEN 2026-09-30 · mechanism supported, initiating catalyst unresolved</td></tr>
          <tr><td><strong>Created &amp; Idea by</strong></td><td><strong>Magha Ram</strong></td></tr>
        </tbody></table>
      </Card>

      <Card title="Appearance">
        <div className="row">
          {['system', 'light', 'dark'].map((t) => (
            <button key={t} className="toggle" style={theme === t ? { fontWeight: 600, color: 'var(--text-primary)' } : undefined}
              onClick={() => setTheme(t)}>{t}</button>
          ))}
        </div>
      </Card>

      <Card title="Token identity (enforced, frozen)">
        <table><tbody>
          <tr><td>Symbol</td><td>{TOKEN.symbol}</td></tr>
          <tr><td>Contract</td><td className="mono">{SUT_CONTRACT}</td></tr>
          <tr><td>Chain</td><td>{TOKEN.chain} (chainId {TOKEN.chainId})</td></tr>
          <tr><td>Total supply</td><td className="num">{num(TOKEN.totalSupply)}</td></tr>
        </tbody></table>
        <Warn>Sources are never merged by ticker alone. Three unrelated tokens have used "SUT";
          one misattribution (Sanity United via BitMart) already occurred and recurred inside an internal document.</Warn>
      </Card>

      <Card title="Enforced data rules">
        <ul className="tight">
          <li><strong>gross_pool_flow may never populate a volume field</strong> — only decoded Swap events are trading volume.</li>
          <li><strong>Wallet roles default to UNKNOWN</strong> and require role evidence to change.</li>
          <li><strong>Causal language requires a named human author</strong> and all six evidence gates.</li>
          <li><strong>Unresolved conflicts declare no canonical series</strong> and are never averaged or blended.</li>
          <li><strong>Single-day claims are blocked</strong> where the day boundary is unresolved (C15).</li>
          <li><strong>Same-source duplicates do not raise confidence.</strong></li>
          <li><strong>Internal documents carry no identity privilege</strong> and cannot be graded VERIFIED.</li>
        </ul>
      </Card>

      <Card title="CertiK — dynamic source">
        <table><tbody>
          <tr><td>Skynet score</td><td>{CERTIK.score} ({CERTIK.grade}) — retrieved {CERTIK.retrievedAt}</td></tr>
          <tr><td>Previous</td><td>{CERTIK.previousScore} — retrieved {CERTIK.previousRetrievedAt} (both valid at their times)</td></tr>
          <tr><td>Audit / KYC / bounty</td><td>{String(CERTIK.certikAudit)} / {String(CERTIK.kyc)} / {String(CERTIK.bugBounty)}</td></tr>
          <tr><td>Owner field</td><td className="mono">{CERTIK.ownerAddressShown} — <strong>STALE</strong></td></tr>
        </tbody></table>
        <p className="small muted">{CERTIK.ownerStaleNote} CertiK's score is not CoinMarketCap's "3.7" (different field, different scale).</p>
      </Card>

      <Card title="Top-100 peer benchmark" hint={`Source: ${TOP100_BENCHMARK.sourceId} · ${TOP100_BENCHMARK.confidence} · observed ${TOP100_BENCHMARK.observationTime}`}>
        <div className="scroll">
          <table><thead><tr><th>Metric</th><th>Top-100 band</th><th>SUT</th><th>Gap</th></tr></thead>
            <tbody>{TOP100_BENCHMARK.rows.map((r) => (<tr key={r.metric}><td className="small">{r.metric}</td>
              <td className="small">{r.peer}</td><td className="small">{r.sut}</td><td className="small"><strong>{r.gap}</strong></td></tr>))}</tbody></table>
        </div>
        <p className="small muted">{TOP100_BENCHMARK.caveat}</p>
      </Card>
    </>
  )
}
