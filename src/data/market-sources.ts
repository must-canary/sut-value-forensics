/**
 * Live source adapter for the daily market layer.
 *
 * The only place in the application that talks to the network. It is called
 * from an explicit [Run Daily Sync] click — never on page load — and it returns
 * raw payloads plus the real HTTP status. Interpretation happens in the pure
 * core; nothing here fills in a missing value.
 */
import { SOURCES, SUT_CONTRACT, type FetchPort, type FetchResult, type SourceDescriptor } from '../core/daily-sync'
import type { LiveFetchPort, LiveFetchResult, LiveSource } from '../core/live-market-sync'
import { browserStorage } from './decision-storage'

export { SOURCES, SUT_CONTRACT }
export { browserStorage as dailyStorage }

export const REQUEST_TIMEOUT_MS = 15_000
/** One retry for a THROWN network error only. An HTTP status is a real answer and is never retried. */
export const NETWORK_ATTEMPTS = 2

/** Sources that are actually called over the network. */
export const LIVE_SOURCES: SourceDescriptor[] = SOURCES.filter((s) => s.url !== '')

async function fetchOne(s: SourceDescriptor): Promise<FetchResult> {
  const retrievedAt = new Date().toISOString()
  if (!s.url) {
    return { sourceId: s.id, ok: false, httpStatus: null, body: null, error: 'no source configured', retrievedAt }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    // credential headers are supplied by the server-side caller and are never
    // logged, never returned in the result, and never persisted
    const headers: Record<string, string> = {
      ...(s.method === 'POST' ? { 'content-type': 'application/json' } : {}),
      ...(s.headers ?? {}),
    }
    const res = await fetch(s.url, {
      method: s.method,
      signal: controller.signal,
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
      ...(s.method === 'POST' ? { body: JSON.stringify(s.body) } : {}),
    })
    let body: unknown = null
    try { body = await res.json() } catch { body = null }
    return {
      sourceId: s.id,
      ok: res.ok,
      httpStatus: res.status,
      body,
      error: null,
      retrievedAt,
    }
  } catch (e) {
    return {
      sourceId: s.id, ok: false, httpStatus: null, body: null,
      error: e instanceof Error ? e.message : String(e),
      retrievedAt,
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Retrieve one source. A thrown network error (DNS, reset, timeout) is retried
 * once; an HTTP status — including 401, 429 and 5xx — is a real answer from the
 * source and is returned as-is, never retried and never replaced by a value.
 */
export const liveFetcher: FetchPort = async (s) => {
  let last = await fetchOne(s)
  for (let attempt = 1; attempt < NETWORK_ATTEMPTS && last.error !== null; attempt++) {
    await new Promise((r) => setTimeout(r, 750))
    last = await fetchOne(s)
  }
  return last
}

export async function retrieveAll(fetcher: FetchPort = liveFetcher): Promise<FetchResult[]> {
  return Promise.all(LIVE_SOURCES.map((s) => fetcher(s)))
}

// ───────────────────────────────────────────── live market sync (v1, no credentials)

/**
 * Retrieval for the live market sync. The VERBATIM response text is preserved
 * so the run can carry a SHA-256 of exactly what the source returned; parsing
 * happens in the pure core. A thrown network error is retried once; an HTTP
 * status is a real answer and is returned as-is.
 */
async function fetchLiveOnce(s: LiveSource): Promise<LiveFetchResult> {
  const retrievalTimestamp = new Date().toISOString()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(s.endpoint, {
      method: s.method,
      signal: controller.signal,
      ...(s.method === 'POST'
        ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(s.body) }
        : {}),
    })
    const bodyText = await res.text()
    let parsed: unknown = null
    try { parsed = JSON.parse(bodyText) } catch { parsed = null }
    return {
      sourceId: s.id,
      httpStatus: res.status,
      bodyText,
      parsed,
      error: parsed === null && res.ok ? 'the response was not readable JSON' : null,
      retrievalTimestamp,
    }
  } catch (e) {
    return {
      sourceId: s.id, httpStatus: null, bodyText: '', parsed: null,
      error: e instanceof Error ? e.message : String(e),
      retrievalTimestamp,
    }
  } finally {
    clearTimeout(timer)
  }
}

export const liveMarketFetcher: LiveFetchPort = async (s) => {
  let last = await fetchLiveOnce(s)
  for (let attempt = 1; attempt < NETWORK_ATTEMPTS && last.error !== null && last.httpStatus === null; attempt++) {
    await new Promise((r) => setTimeout(r, 750))
    last = await fetchLiveOnce(s)
  }
  return last
}
