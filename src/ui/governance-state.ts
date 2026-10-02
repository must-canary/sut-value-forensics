/**
 * One shared, persisted governance ledger for the whole UI.
 *
 * Every card reads the same snapshot, so a committed registration or approval
 * is immediately reflected in the gates — and, because it is written through
 * the storage port, it is still there after a reload.
 */
import { useSyncExternalStore } from 'react'
import {
  loadGovernanceLedger, saveGovernanceLedger, type GovernanceLedger,
} from '../core/governance-store'
import { browserStorage } from '../data/decision-storage'

const storage = browserStorage()
let ledger: GovernanceLedger = loadGovernanceLedger(storage)
const listeners = new Set<() => void>()

function emit() { for (const l of listeners) l() }

function subscribe(l: () => void) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

export function getGovernanceLedger(): GovernanceLedger { return ledger }

/** Persist and publish. The only write path in the UI. */
export function commitGovernanceLedger(next: GovernanceLedger): void {
  saveGovernanceLedger(storage, next)
  ledger = loadGovernanceLedger(storage)   // re-read, so the UI shows exactly what was stored
  emit()
}

export function useGovernanceLedger(): GovernanceLedger {
  return useSyncExternalStore(subscribe, getGovernanceLedger, getGovernanceLedger)
}

export { storage as governanceStoragePort }
