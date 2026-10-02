/**
 * DailyMarketSyncService — the ONE implementation of the daily sync.
 *
 * The same service is used by:
 *   - the browser's [Run Daily Sync] button      (trigger MANUAL,    localStorage port)
 *   - the cron entrypoint scripts/daily-sync.ts  (trigger SCHEDULED, file-backed port)
 *
 * The sync logic is not duplicated anywhere: both callers differ only in the
 * storage port, the source list and the trigger label. Credentials are supplied
 * by the caller (from environment variables, server-side only) and never live
 * in this module or in the client bundle.
 */
import {
  buildReport, SOURCES, SUT_CONTRACT, type DailyReport, type FetchPort, type FetchResult,
  type SourceDescriptor, type SyncTrigger,
} from '../core/daily-sync'
import {
  appendReport, latestReport, loadDailyLedger, nextSequence, saveDailyLedger,
  type DailyLedger, type StoragePort,
} from '../core/daily-store'

/** 00:05 UTC every day. */
export const DAILY_CRON_SCHEDULE = '5 0 * * *'
export const DAILY_CRON_SCHEDULE_PADDED = '05 00 * * *'
export const DAILY_CRON_DESCRIPTION = 'daily at 00:05 UTC'

export interface SyncServiceDeps {
  storage: StoragePort
  fetcher: FetchPort
  /** Defaults to the public, browser-reachable sources. */
  sources?: SourceDescriptor[]
  now?: () => string
  contract?: string
  /** Pause between source calls. Free public APIs rate-limit bursts. */
  requestGapMs?: number
}

export interface SyncRunResult {
  trigger: SyncTrigger
  status: DailyReport['status']
  report: DailyReport
  /** false when the retrieval was an exact duplicate of the stored one */
  stored: boolean
  duplicateOf: string | null
  problems: string[]
  ledger: DailyLedger
}

export class DailyMarketSyncService {
  private readonly storage: StoragePort
  private readonly fetcher: FetchPort
  private readonly sources: SourceDescriptor[]
  private readonly now: () => string
  private readonly contract: string
  private readonly requestGapMs: number

  constructor(deps: SyncServiceDeps) {
    this.storage = deps.storage
    this.fetcher = deps.fetcher
    this.sources = deps.sources ?? SOURCES
    this.now = deps.now ?? (() => new Date().toISOString())
    this.contract = deps.contract ?? SUT_CONTRACT
    this.requestGapMs = deps.requestGapMs ?? 0
  }

  load(): DailyLedger {
    return loadDailyLedger(this.storage, this.contract)
  }

  /** Sources that are actually called: a source without a URL is not configured. */
  callableSources(): SourceDescriptor[] {
    return this.sources.filter((s) => s.url !== '')
  }

  /**
   * Retrieve every callable source, one at a time: a parallel burst trips the
   * rate limiter on the free public endpoints. One failing source never aborts
   * the rest.
   */
  async retrieve(): Promise<FetchResult[]> {
    const out: FetchResult[] = []
    for (const s of this.callableSources()) {
      if (out.length > 0 && this.requestGapMs > 0) {
        await new Promise((r) => setTimeout(r, this.requestGapMs))
      }
      try {
        out.push(await this.fetcher(s))
      } catch (e) {
        out.push({
          sourceId: s.id, ok: false, httpStatus: null, body: null,
          error: e instanceof Error ? e.message : String(e),
          retrievedAt: this.now(),
        })
      }
    }
    return out
  }

  /**
   * Run one sync: retrieve, timestamp, validate, build the report, persist.
   * A retrieval whose data is identical to the stored one is a no-op.
   */
  async run(trigger: SyncTrigger = 'MANUAL'): Promise<SyncRunResult> {
    const ledger = this.load()
    const retrievalStartedAt = this.now()
    const results = await this.retrieve()
    const at = this.now()
    const report = buildReport({
      results,
      sources: this.sources,
      now: at,
      retrievalStartedAt,
      sequence: nextSequence(ledger, at),
      previous: latestReport(ledger),
      trigger,
    })
    const appended = appendReport(ledger, report)
    if (appended.stored) saveDailyLedger(this.storage, appended.ledger)
    return {
      trigger,
      status: report.status,
      report,
      stored: appended.stored,
      duplicateOf: appended.duplicateOf,
      problems: appended.problems,
      ledger: appended.ledger,
    }
  }
}

/** Daily sync writes only the market ledger — never any EXP-001 governance record. */
export function serviceTouchesGovernance(): false { return false }
