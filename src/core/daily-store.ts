/**
 * Persistence for the daily market-data layer — same architecture as the other
 * stores: localStorage behind the injectable StoragePort, pure core logic,
 * in-memory adapter for tests.
 *
 * A stored daily report is IMMUTABLE. If a source later publishes a different
 * value, a NEW retrieval is appended; the earlier report is never rewritten.
 */
import {
  fingerprintReport, reportDateOf, valueOf, type DailyReport, type SyncStatus,
} from './daily-sync'
import { MemoryStorage, type StoragePort } from './decision-store'

export { MemoryStorage, type StoragePort }

export const DAILY_STORE_KEY = 'sut-value-forensics:daily-market:v1'
export const DAILY_SCHEMA_VERSION = 1

export type ReportIntegrity = 'OK' | 'TAMPERED'

export interface ScheduleConfig {
  /** A browser-only schedule: it can only fire while the application is open. */
  enabled: boolean
  /** UTC hour 0-23 the operator wants the sync attempted. */
  hourUtc: number
}

export interface DailyLedger {
  schemaVersion: number
  contract: string
  reports: DailyReport[]
  schedule: ScheduleConfig
}

export const BROWSER_SCHEDULING_NOTICE =
  'Browser scheduling requires the application to be open. Fully unattended daily execution requires an '
  + 'external scheduler/backend, which this client-side application does not have.'

export function emptyDailyLedger(contract: string): DailyLedger {
  return {
    schemaVersion: DAILY_SCHEMA_VERSION,
    contract,
    reports: [],
    schedule: { enabled: false, hourUtc: 9 },
  }
}

export function checkReportIntegrity(r: DailyReport): ReportIntegrity {
  const { fingerprint: _f, ...rest } = r
  return fingerprintReport(rest) === r.fingerprint ? 'OK' : 'TAMPERED'
}

function isLedger(x: unknown): x is DailyLedger {
  if (!x || typeof x !== 'object') return false
  const l = x as Partial<DailyLedger>
  return Array.isArray(l.reports) && typeof l.contract === 'string'
}

export function loadDailyLedger(storage: StoragePort, contract: string): DailyLedger {
  let raw: string | null = null
  try { raw = storage.getItem(DAILY_STORE_KEY) } catch { return emptyDailyLedger(contract) }
  if (!raw) return emptyDailyLedger(contract)
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return emptyDailyLedger(contract) }
  if (!isLedger(parsed)) return emptyDailyLedger(contract)
  if (parsed.schemaVersion !== DAILY_SCHEMA_VERSION) return emptyDailyLedger(contract)
  // a ledger written for a different asset is never merged into this one
  if (parsed.contract.toLowerCase() !== contract.toLowerCase()) return emptyDailyLedger(contract)
  return {
    schemaVersion: DAILY_SCHEMA_VERSION,
    contract,
    reports: parsed.reports,
    schedule: {
      enabled: parsed.schedule?.enabled === true,
      hourUtc: Number.isInteger(parsed.schedule?.hourUtc) ? parsed.schedule.hourUtc : 9,
    },
  }
}

export function saveDailyLedger(storage: StoragePort, ledger: DailyLedger): void {
  try { storage.setItem(DAILY_STORE_KEY, JSON.stringify(ledger)) } catch { /* quota / blocked: non-fatal */ }
}

export class DailyReportImmutableError extends Error {}

/** The sequence number a new retrieval gets for a given day. */
export function nextSequence(ledger: DailyLedger, nowIso: string): number {
  const date = reportDateOf(nowIso)
  return ledger.reports.filter((r) => r.reportDate === date).length + 1
}

export interface AppendOutcome {
  ledger: DailyLedger
  problems: string[]
  /** false when nothing was written (duplicate observation, or refused) */
  stored: boolean
  /** set when an identical observation was already stored */
  duplicateOf: string | null
}

/**
 * Append a retrieval.
 *
 *   - an existing report id is never replaced: history is immutable;
 *   - a retrieval whose DATA is identical to the latest stored one is a no-op
 *     (idempotent) — repeating a sync does not multiply identical records;
 *   - any changed value produces a NEW report; the earlier one is never rewritten.
 */
export function appendReport(ledger: DailyLedger, report: DailyReport): AppendOutcome {
  if (ledger.reports.some((r) => r.id === report.id)) {
    return {
      ledger, stored: false, duplicateOf: report.id,
      problems: [`${report.id} already exists and is immutable — a later retrieval is appended as a new report`],
    }
  }
  if (checkReportIntegrity(report) !== 'OK') {
    return {
      ledger, stored: false, duplicateOf: null,
      problems: [`${report.id} does not match its own fingerprint and was not stored`],
    }
  }
  const last = ledger.reports[ledger.reports.length - 1] ?? null
  if (last && last.contentFingerprint === report.contentFingerprint) {
    return { ledger, stored: false, duplicateOf: last.id, problems: [] }
  }
  return {
    ledger: { ...ledger, reports: [...ledger.reports, report] },
    problems: [], stored: true, duplicateOf: null,
  }
}

export function latestReport(ledger: DailyLedger): DailyReport | null {
  const trustworthy = ledger.reports.filter((r) => checkReportIntegrity(r) === 'OK')
  return trustworthy.length ? trustworthy[trustworthy.length - 1]! : null
}

export function reportById(ledger: DailyLedger, id: string): DailyReport | null {
  return ledger.reports.find((r) => r.id === id) ?? null
}

export interface HistoryRow {
  id: string
  date: string
  status: SyncStatus
  sutPrice: number | null
  change24h: number | null
  volume24h: number | null
  marketCap: number | null
  btcChange: number | null
  ethChange: number | null
  generatedAt: string
  sourceStatus: string
  integrity: ReportIntegrity
}

export function historyRows(ledger: DailyLedger): HistoryRow[] {
  return [...ledger.reports].reverse().map((r) => {
    const live = r.sources.filter((s) => s.status !== 'NOT_CONFIGURED')
    return {
      id: r.id,
      date: r.reportDate,
      status: r.status,
      sutPrice: valueOf(r.observations, 'SUT price'),
      change24h: valueOf(r.observations, 'SUT 24h change'),
      volume24h: valueOf(r.observations, 'SUT 24h volume'),
      marketCap: valueOf(r.observations, 'SUT market cap'),
      btcChange: valueOf(r.observations, 'BTC 24h change'),
      ethChange: valueOf(r.observations, 'ETH 24h change'),
      generatedAt: r.generatedAt,
      sourceStatus: `${live.filter((s) => s.status === 'OK').length}/${live.length} OK`,
      integrity: checkReportIntegrity(r),
    }
  })
}

/** The next time the browser schedule would fire — only while the app is open. */
export function nextExpectedSync(ledger: DailyLedger, nowIso: string): string | null {
  if (!ledger.schedule.enabled) return null
  const now = new Date(nowIso)
  const next = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), ledger.schedule.hourUtc, 0, 0, 0,
  ))
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString()
}

export function lastSyncAt(ledger: DailyLedger): string | null {
  return ledger.reports.length ? ledger.reports[ledger.reports.length - 1]!.generatedAt : null
}

/** The daily layer owns market observations only — it writes nothing into EXP-001. */
export function dailyLedgerTouchesGovernance(_l: DailyLedger): false { return false }
