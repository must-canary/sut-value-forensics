/** One shared, persisted live-market ledger for the UI. */
import { useSyncExternalStore } from 'react'
import { loadLiveLedger, saveLiveLedger, type LiveLedger } from '../core/live-market-store'
import { SUT_CONTRACT } from '../core/live-market-sync'
import { browserStorage } from '../data/decision-storage'

const storage = browserStorage()
let ledger: LiveLedger = loadLiveLedger(storage, SUT_CONTRACT)
const listeners = new Set<() => void>()

function subscribe(l: () => void) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

export function getLiveLedger(): LiveLedger { return ledger }

/** Persist, then re-read, so the UI shows exactly what was stored. */
export function commitLiveLedger(next: LiveLedger): void {
  saveLiveLedger(storage, next)
  ledger = loadLiveLedger(storage, SUT_CONTRACT)
  for (const l of listeners) l()
}

export function useLiveLedger(): LiveLedger {
  return useSyncExternalStore(subscribe, getLiveLedger, getLiveLedger)
}

export { storage as liveStoragePort }
