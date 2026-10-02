/**
 * One shared, persisted daily-market ledger for the UI.
 * Reads and writes go through the same storage port as the other stores.
 */
import { useSyncExternalStore } from 'react'
import {
  loadDailyLedger, saveDailyLedger, type DailyLedger,
} from '../core/daily-store'
import { SUT_CONTRACT } from '../core/daily-sync'
import { browserStorage } from '../data/decision-storage'

const storage = browserStorage()
let ledger: DailyLedger = loadDailyLedger(storage, SUT_CONTRACT)
const listeners = new Set<() => void>()

function subscribe(l: () => void) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

export function getDailyLedger(): DailyLedger { return ledger }

/** Persist, then re-read, so the UI shows exactly what was stored. */
export function commitDailyLedger(next: DailyLedger): void {
  saveDailyLedger(storage, next)
  ledger = loadDailyLedger(storage, SUT_CONTRACT)
  for (const l of listeners) l()
}

export { storage as dailyStoragePort }

export function useDailyLedger(): DailyLedger {
  return useSyncExternalStore(subscribe, getDailyLedger, getDailyLedger)
}
