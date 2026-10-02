import { useEffect, useState } from 'react'
import './theme.css'
import {
  Dashboard, EvidenceScreen, ExchangeLiquidity, HypothesisLab, Investigations,
  MarketAnalysis, OnChain, Reports, Settings,
} from './screens'
import { ImprovementBacklog, ImprovementOpportunities } from './screens-improvement'
import { ExperimentDetail, ExperimentExecution } from './screens-experiments'
import { BaselineOperations } from './screens-baseline-ops'
import { BaselineHistory, PreRegistration } from './screens-prereg'
import { ProposedThresholds } from './proposed-thresholds'
import { ExperimentGuide } from './screens-guide'
import { DailyMarketSync } from './screens-daily'
import { ImprovementLab } from './improvement-lab'
import { CASE } from '../data/measurements'
import { LAYER_LABELS } from '../core/daily-assessment'

const SCREENS = [
  { id: 'dashboard', label: 'Executive Dashboard', group: LAYER_LABELS.historical },
  { id: 'investigations', label: 'Crash Investigations' },
  { id: 'market', label: 'Market Analysis' },
  { id: 'onchain', label: 'On-Chain Forensics' },
  { id: 'liquidity', label: 'Exchange & Liquidity' },
  { id: 'hypotheses', label: 'Hypothesis Lab' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'backlog', label: 'Improvement Backlog', group: LAYER_LABELS.governance },
  { id: 'opportunities', label: 'Improvement Opportunities' },
  { id: 'experiments', label: 'Experiment Execution' },
  { id: 'baseline-ops', label: 'Baseline Operations' },
  { id: 'proposed', label: 'Proposed Thresholds' },
  { id: 'prereg', label: 'Pre-Registration' },
  { id: 'history', label: 'Baseline History' },
  { id: 'guide', label: 'Experiment Guide' },
  { id: 'daily', label: 'Daily Market Sync', group: LAYER_LABELS.current },
  { id: 'lab', label: 'Value Improvement Lab' },
  { id: 'reports', label: 'Reports', group: 'REPORTING' },
  { id: 'settings', label: 'Settings' },
] as const

const groupStyle = {
  fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
  color: 'var(--text-muted)', margin: '14px 0 4px', lineHeight: 1.3,
} as const

export default function App() {
  const [screen, setScreen] = useState<string>('dashboard')
  const [theme, setTheme] = useState<string>('system')
  const [openOpportunity, setOpenOpportunity] = useState<string | null>(null)
  const [openExperiment, setOpenExperiment] = useState<string | null>(null)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])

  const openOpp = (id: string) => {
    setOpenOpportunity(id)
    setScreen('opportunities')
  }

  return (
    <div className="app">
      <nav className="nav">
        <h1>SUT Value Forensics</h1>
        <p className="case">{CASE.id} · {CASE.title}</p>
        <div className="nav-scroll" data-testid="nav-scroll">
          {SCREENS.map((s) => (
            <div key={s.id}>
              {'group' in s && (
                <div className="layer-group" style={groupStyle} data-testid={`nav-group-${s.id}`}>{s.group}</div>
              )}
              <button aria-current={screen === s.id}
                onClick={() => {
                  setScreen(s.id)
                  if (s.id === 'opportunities') setOpenOpportunity(null)
                  if (s.id === 'experiments') setOpenExperiment(null)
                }}>
                {s.label}
              </button>
            </div>
          ))}
        </div>
        <div className="freeze">
          Research frozen 2026-09-30.<br />
          Mechanism supported; initiating catalyst unresolved.
          <div className="attribution">Created &amp; Idea by Magha Ram</div>
        </div>
      </nav>
      <main className="main">
        {screen === 'dashboard' && <Dashboard />}
        {screen === 'investigations' && <Investigations />}
        {screen === 'market' && <MarketAnalysis />}
        {screen === 'onchain' && <OnChain />}
        {screen === 'liquidity' && <ExchangeLiquidity />}
        {screen === 'hypotheses' && <HypothesisLab />}
        {screen === 'evidence' && <EvidenceScreen />}
        {screen === 'backlog' && <ImprovementBacklog onOpen={openOpp} />}
        {screen === 'opportunities' && (
          <ImprovementOpportunities selected={openOpportunity} onSelect={setOpenOpportunity} />
        )}
        {screen === 'experiments' && (
          openExperiment
            ? <ExperimentDetail id={openExperiment} onBack={() => setOpenExperiment(null)} />
            : <ExperimentExecution onOpen={setOpenExperiment} />
        )}
        {screen === 'baseline-ops' && <BaselineOperations />}
        {screen === 'proposed' && <ProposedThresholds />}
        {screen === 'prereg' && <PreRegistration />}
        {screen === 'history' && <BaselineHistory />}
        {screen === 'guide' && <ExperimentGuide />}
        {screen === 'daily' && <DailyMarketSync />}
        {screen === 'lab' && <ImprovementLab />}
        {screen === 'reports' && <Reports />}
        {screen === 'settings' && <Settings theme={theme} setTheme={setTheme} />}
      </main>
    </div>
  )
}
