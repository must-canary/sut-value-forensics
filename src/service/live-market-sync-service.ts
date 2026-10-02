/**
 * LiveMarketSyncService — the ONE implementation of the live market sync.
 *
 * The same service backs:
 *   - the browser's [Run Live Market Sync] button (trigger MANUAL,    localStorage port)
 *   - the cron entrypoint scripts/daily-sync.ts   (trigger SCHEDULED, file-backed port)
 *
 * v1 uses only public, uncredentialed sources. No key is read here, and nothing
 * in the EXP-001 governance chain or the frozen research is ever written.
 */
import {
  buildRun, LIVE_SOURCES, SUT_CONTRACT,
  type LiveFetchPort, type LiveFetchResult, type LiveSource, type LiveSyncRun, type SyncTrigger,
} from '../core/live-market-sync'
import {
  appendRun, loadLiveLedger, nextSequence, saveLiveLedger, type LiveLedger, type StoragePort,
} from '../core/live-market-store'

export interface LiveSyncDeps {
  storage: StoragePort
  fetcher: LiveFetchPort
  sources?: LiveSource[]
  now?: () => string
  contract?: string
  /** pause between source calls — free public endpoints rate-limit bursts */
  requestGapMs?: number
}

export interface LiveSyncOutcome {
  run: LiveSyncRun
  stored: boolean
  problems: string[]
  ledger: LiveLedger
}

export class LiveMarketSyncService {
  private readonly storage: StoragePort
  private readonly fetcher: LiveFetchPort
  private readonly sources: LiveSource[]
  private readonly now: () => string
  private readonly contract: string
  private readonly requestGapMs: number

  constructor(deps: LiveSyncDeps) {
    this.storage = deps.storage
    this.fetcher = deps.fetcher
    this.sources = deps.sources ?? LIVE_SOURCES
    this.now = deps.now ?? (() => new Date().toISOString())
    this.contract = deps.contract ?? SUT_CONTRACT
    this.requestGapMs = deps.requestGapMs ?? 0
  }

  load(): LiveLedger {
    return loadLiveLedger(this.storage, this.contract)
  }

  /** Sequentially, so one source's rate limit does not take the others down with it. */
  async retrieve(): Promise<LiveFetchResult[]> {
    const out: LiveFetchResult[] = []
    for (const s of this.sources) {
      if (out.length > 0 && this.requestGapMs > 0) {
        await new Promise((r) => setTimeout(r, this.requestGapMs))
      }
      try {
        out.push(await this.fetcher(s))
      } catch (e) {
        out.push({
          sourceId: s.id, httpStatus: null, bodyText: '', parsed: null,
          error: e instanceof Error ? e.message : String(e),
          retrievalTimestamp: this.now(),
        })
      }
    }
    return out
  }

  /**
   * One sync run: retrieve every source, record each observation independently
   * with its raw evidence, derive the snapshot from valid observations only,
   * and append the run. Every run is stored — repeated syncs never overwrite.
   */
  async run(trigger: SyncTrigger = 'MANUAL'): Promise<LiveSyncOutcome> {
    const ledger = this.load()
    const startedAt = this.now()
    const results = await this.retrieve()
    const completedAt = this.now()
    const run = await buildRun({
      results,
      sources: this.sources,
      startedAt,
      completedAt,
      sequence: nextSequence(ledger, completedAt),
      trigger,
    })
    const appended = appendRun(ledger, run)
    if (appended.stored) saveLiveLedger(this.storage, appended.ledger)
    return { run, stored: appended.stored, problems: appended.problems, ledger: appended.ledger }
  }
}

/** The live sync service writes market observations only. */
export function liveServiceTouchesGovernance(): false { return false }
