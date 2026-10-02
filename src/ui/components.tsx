import { useState, type ReactNode } from 'react'
import type { Confidence, EventClassification, HypothesisStatus, IdentityStatus } from '../core/types'

/** Preserve measured precision — toLocaleString() truncates to 3 decimals by default,
 *  which silently drops precision from small values such as a sub-dollar price. */
export function formatMeasured(v: number): string {
  if (Number.isInteger(v)) return v.toLocaleString()
  return v.toLocaleString(undefined, { maximumFractionDigits: 8 })
}

// ------------------------------------------------------------------ chrome

export function Card({ title, hint, children }: { title?: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card">
      {title && <h3>{title}</h3>}
      {hint && <p className="hint">{hint}</p>}
      {children}
    </section>
  )
}

export function Tile({ label, value, meta }: { label: string; value: string | number | null; meta?: string }) {
  const na = value === null || value === undefined
  return (
    <div className="tile">
      <div className="label">{label}</div>
      <div className={na ? 'value na' : 'value'}>{na ? 'DATA UNAVAILABLE' : value}</div>
      {meta && <div className="meta">{meta}</div>}
    </div>
  )
}

/** Status is never colour-alone: a dot plus an always-visible text label. */
export function StatusChip({ status }: { status: HypothesisStatus | EventClassification | IdentityStatus | Confidence }) {
  const map: Record<string, string> = {
    SUPPORTED: 'var(--series-1)',
    REJECTED: 'var(--text-muted)',
    INCONCLUSIVE: 'var(--status-warning)',
    DATA_UNAVAILABLE: 'var(--text-muted)',
    VERIFIED: 'var(--status-good)',
    REPORTED: 'var(--status-warning)',
    CLAIM: 'var(--status-serious)',
    OPINION: 'var(--text-muted)',
    UNRESOLVED: 'var(--status-warning)',
    EXCHANGE_STATED_CONCERN: 'var(--status-serious)',
    LEGAL_PROCEEDING: 'var(--status-serious)',
    COMPANY_RESPONSE: 'var(--text-muted)',
    CONTRACT_VERIFIED: 'var(--status-good)',
    PAIR_VERIFIED: 'var(--series-1)',
    TICKER_ONLY: 'var(--status-warning)',
    IDENTITY_NOT_VERIFIED: 'var(--status-critical)',
    SECONDARY: 'var(--text-muted)',
    SNIPPET_ONLY: 'var(--status-warning)',
    UNVERIFIED: 'var(--status-critical)',
  }
  return (
    <span className="chip">
      <span className="dot" style={{ background: map[status] ?? 'var(--text-muted)' }} />
      {String(status).replace(/_/g, ' ')}
    </span>
  )
}

/** Every chart and figure carries this. */
export function Provenance(p: {
  period: string; source: string; methodology: string; limitations?: string[]; retrievedAt?: string
}) {
  return (
    <div className="prov">
      <div><b>Period:</b> {p.period}</div>
      <div><b>Source:</b> {p.source}{p.retrievedAt ? ` · retrieved ${p.retrievedAt}` : ''}</div>
      <div><b>Methodology:</b> {p.methodology}</div>
      {p.limitations?.length ? <div><b>Limitations:</b> {p.limitations.join(' · ')}</div> : null}
    </div>
  )
}

export function DataUnavailable({ what, why }: { what: string; why: string }) {
  return (
    <div className="na-box">
      <b>DATA UNAVAILABLE</b>
      {what}
      <div style={{ marginTop: 6 }}>{why}</div>
    </div>
  )
}

export function Warn({ children }: { children: ReactNode }) {
  return <div className="warn">{children}</div>
}

// ------------------------------------------------------------------ charts

const PAD = { l: 52, r: 16, t: 12, b: 26 }

export interface Series { key: string; label: string; color: string; values: Array<number | null> }

function useTooltip() {
  const [tip, setTip] = useState<{ x: number; y: number; content: ReactNode } | null>(null)
  const node = tip ? (
    <div className="tooltip" style={{ left: Math.min(tip.x + 14, window.innerWidth - 200), top: tip.y + 14 }}>
      {tip.content}
    </div>
  ) : null
  return { setTip, node }
}

/**
 * Multi-series line chart with crosshair + tooltip and selective direct labels.
 * Single y-axis only — never dual-axis.
 */
export function LineChart({
  labels, series, height = 240, yFormat = (v: number) => v.toFixed(0), yLabel,
}: { labels: string[]; series: Series[]; height?: number; yFormat?: (v: number) => string; yLabel?: string }) {
  const { setTip, node } = useTooltip()
  const [hover, setHover] = useState<number | null>(null)
  const W = 760, H = height
  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null)
  if (all.length === 0) return <DataUnavailable what="No plottable values." why="All series are empty." />
  const min = Math.min(...all), max = Math.max(...all)
  const span = max - min || 1
  const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / Math.max(labels.length - 1, 1)
  const y = (v: number) => PAD.t + (1 - (v - min) / span) * (H - PAD.t - PAD.b)
  const ticks = [min, min + span / 2, max]

  return (
    <div>
      <div className="legend">
        {series.map((s) => (
          <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>
        ))}
        {/* axis caption lives outside the SVG so it cannot collide with tick labels */}
        {yLabel && <span className="axis-caption">{yLabel}</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img"
        aria-label={`Line chart: ${series.map((s) => s.label).join(', ')}`}
        onMouseLeave={() => { setHover(null); setTip(null) }}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize={10} fill="var(--text-muted)">{yFormat(t)}</text>
          </g>
        ))}
        {labels.map((l, i) =>
          i % Math.ceil(labels.length / 7) === 0 ? (
            <text key={l} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--text-muted)">{l.slice(5)}</text>
          ) : null,
        )}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--axis)" strokeWidth={1} strokeDasharray="3 3" />
        )}
        {series.map((s) => {
          const pts = s.values.map((v, i) => (v === null ? null : `${x(i)},${y(v)}`)).filter(Boolean).join(' ')
          const lastIdx = s.values.reduce<number>((acc, v, i) => (v !== null ? i : acc), -1)
          const lastVal = lastIdx >= 0 ? (s.values[lastIdx] ?? null) : null
          return (
            <g key={s.key}>
              <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {lastVal != null && lastIdx >= 0 && (
                <text x={x(lastIdx) - 4} y={y(lastVal) - 8} textAnchor="end" fontSize={11} fontWeight={600} fill={s.color}>
                  {s.label}
                </text>
              )}
              {hover !== null && s.values[hover] != null && (
                <circle cx={x(hover)} cy={y(s.values[hover]!)} r={4} fill={s.color} stroke="var(--surface-1)" strokeWidth={2} />
              )}
            </g>
          )
        })}
        {labels.map((l, i) => (
          <rect key={l} x={x(i) - 10} y={0} width={20} height={H} fill="transparent"
            onMouseMove={(e) => {
              setHover(i)
              setTip({
                x: e.clientX, y: e.clientY,
                content: (
                  <>
                    <div className="t-date">{l}</div>
                    {series.map((s) => (
                      <div className="t-row" key={s.key}>
                        <span><i style={{ background: s.color }} />{s.label}</span>
                        <b>{s.values[i] == null ? 'n/a' : yFormat(s.values[i]!)}</b>
                      </div>
                    ))}
                  </>
                ),
              })
            }} />
        ))}
      </svg>
      {node}
    </div>
  )
}

/** Grouped/diverging bar chart with per-bar hover. 2px gap between adjacent bars. */
export function BarChart({
  labels, series, height = 240, yFormat = (v: number) => v.toFixed(0), diverging = false,
}: { labels: string[]; series: Series[]; height?: number; yFormat?: (v: number) => string; diverging?: boolean }) {
  const { setTip, node } = useTooltip()
  const W = 760, H = height
  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null)
  if (all.length === 0) return <DataUnavailable what="No plottable values." why="All series are empty." />
  const max = Math.max(...all, 0)
  const min = diverging ? Math.min(...all, 0) : 0
  const span = max - min || 1
  const bw = (W - PAD.l - PAD.r) / labels.length
  const inner = Math.max((bw - 6) / series.length - 2, 2)
  const y = (v: number) => PAD.t + (1 - (v - min) / span) * (H - PAD.t - PAD.b)
  const zero = y(0)

  return (
    <div>
      <div className="legend">
        {series.map((s) => (<span key={s.key}><i style={{ background: s.color }} />{s.label}</span>))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img"
        aria-label={`Bar chart: ${series.map((s) => s.label).join(', ')}`}>
        {[min, (min + max) / 2, max].map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize={10} fill="var(--text-muted)">{yFormat(t)}</text>
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={zero} y2={zero} stroke="var(--axis)" strokeWidth={1} />
        {labels.map((l, i) => (
          <g key={l}>
            {series.map((s, si) => {
              const v = s.values[i]
              if (v == null) return null
              const bx = PAD.l + i * bw + 3 + si * (inner + 2)
              const top = v >= 0 ? y(v) : zero
              const h = Math.max(Math.abs(y(v) - zero), 1)
              return (
                <rect key={s.key} x={bx} y={top} width={inner} height={h} rx={3} fill={s.color}
                  onMouseMove={(e) => setTip({
                    x: e.clientX, y: e.clientY,
                    content: (<><div className="t-date">{l}</div>
                      <div className="t-row"><span><i style={{ background: s.color }} />{s.label}</span><b>{yFormat(v)}</b></div></>),
                  })}
                  onMouseLeave={() => setTip(null)} />
              )
            })}
            {i % Math.ceil(labels.length / 7) === 0 && (
              <text x={PAD.l + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--text-muted)">{l.slice(5)}</text>
            )}
          </g>
        ))}
      </svg>
      {node}
    </div>
  )
}

/** Chart + table-view toggle. The table is the accessibility fallback. */
export function Figure({
  title, hint, chart, table, provenance, warning,
}: { title: string; hint?: string; chart: ReactNode; table: ReactNode; provenance: ReactNode; warning?: ReactNode }) {
  const [showTable, setShowTable] = useState(false)
  return (
    <section className="card">
      <div className="between">
        <div>
          <h3>{title}</h3>
          {hint && <p className="hint">{hint}</p>}
        </div>
        <button className="toggle" onClick={() => setShowTable((s) => !s)}>
          {showTable ? 'Show chart' : 'Show table'}
        </button>
      </div>
      {warning}
      {showTable ? <div className="scroll">{table}</div> : chart}
      {provenance}
    </section>
  )
}
