/**
 * Browser storage adapter. localStorage is the smallest mechanism consistent
 * with this app's architecture (client-only SPA, no backend). Access is guarded
 * so a blocked or absent store degrades to in-memory rather than throwing.
 */
import { MemoryStorage, type StoragePort } from '../core/decision-store'

const fallback = new MemoryStorage()

export function browserStorage(): StoragePort {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback
    const probe = '__sutvf_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return fallback
  }
}
