/**
 * Experiment Guide + Daily Market Sync.
 *
 * Every external call is intercepted and answered with a CONTROLLED FIXTURE, so
 * no assertion depends on a live market value. Production behaviour is
 * unchanged: the app calls the real sources, the test answers them.
 */
import { test, expect, type Page, type Route } from '@playwright/test'

const CONTRACT = '0x98965474ecbec2f532f1f780ee37b0b05f77ca55'
const POOL = '0x092295c92BAB5e734c4a60DbC0F0FfdCdfC4E165'
const DAILY_KEY = 'sut-value-forensics:daily-market:v1'

async function goTo(page: Page, screen: string) {
  await page.getByRole('button', { name: screen, exact: true }).click()
  await expect(page.getByRole('heading', { level: 2 })).toContainText(screen)
}

const json = (route: Route, body: unknown) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

/** Controlled fixtures for every configured source. `price` lets a test change the data. */
async function routeSources(page: Page, opts: { price?: () => number; failGlobal?: boolean } = {}) {
  const price = opts.price ?? (() => 0.431152)
  const ts = Math.floor(Date.parse('2026-10-02T00:00:00Z') / 1000)

  await page.route('**api.coingecko.com/api/v3/simple/token_price/**', (r) => json(r, {
    [CONTRACT]: {
      usd: price(), usd_market_cap: 0, usd_24h_vol: 97303.21, usd_24h_change: 4.575, last_updated_at: ts,
    },
  }))
  await page.route('**api.coingecko.com/api/v3/coins/**', (r) => json(r, {
    last_updated: '2026-10-02T00:00:00.000Z',
    market_cap_rank: null,
    market_data: { circulating_supply: 0, total_supply: 238403732 },
    tickers: [{ base: 'SUT', target: 'USDT', market: { name: 'Gate' } }],
  }))
  await page.route('**api.coingecko.com/api/v3/simple/price**', (r) => json(r, {
    bitcoin: { usd: 83920, usd_24h_change: 0.178, last_updated_at: ts },
    ethereum: { usd: 2704.71, usd_24h_change: 0.45, last_updated_at: ts },
  }))
  await page.route('**api.coingecko.com/api/v3/global**', (r) => (opts.failGlobal
    ? r.fulfill({ status: 429, contentType: 'text/plain', body: 'Throttled' })
    : json(r, { data: { total_market_cap: { usd: 2.9e12 }, market_cap_change_percentage_24h_usd: -0.42, updated_at: ts } })))
  await page.route('**api.dexscreener.com/**', (r) => json(r, {
    pairs: [{
      pairAddress: POOL, priceUsd: String(price()),
      liquidity: { usd: 94440.93 }, volume: { h24: 41043.01 }, priceChange: { h24: 3.65 },
    }],
  }))
  await page.route('**polygon-bor-rpc.publicnode.com**', (r) => json(r, [
    { jsonrpc: '2.0', id: 1, result: '0x5a60a3e' },
    {
      jsonrpc: '2.0', id: 2,
      result: '0x000000000000000000000000000000000000000000000b055455128e6729c8fa'
        + 'fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffba7c6' + '0'.repeat(320),
    },
    { jsonrpc: '2.0', id: 3, result: { number: '0x5a60a3e', timestamp: '0x' + ts.toString(16) } },
  ]))
}

const sync = async (page: Page) => {
  await page.getByTestId('run-daily-sync').click()
  await expect(page.getByTestId('run-daily-sync')).toBeEnabled()
}

// ───────────────────────────────────────────── Experiment Guide

test('Experiment Guide opens and explains all ten steps', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })

  await page.goto('/')
  await goTo(page, 'Experiment Guide')
  const titles = [
    'STEP 1 — Review the research', 'STEP 2 — Review the baseline', 'STEP 3 — Business threshold decision',
    'STEP 4 — Pre-registration', 'STEP 5 — Baseline review', 'STEP 6 — Intervention',
    'STEP 7 — Actual measurement', 'STEP 8 — Comparison', 'STEP 9 — Result', 'STEP 10 — Final human review',
  ]
  for (const t of titles) await expect(page.locator('.card h3', { hasText: t })).toBeVisible()

  const main = page.locator('.main')
  await expect(main).toContainText('$100,000 is NOT EXECUTABLE')
  await expect(main).toContainText('Business approval is NOT registration')
  await expect(main).toContainText('LOWER_IS_BETTER uses absolute magnitude')
  await expect(main).toContainText('Registration is immutable')
  for (const r of [
    'Do not fabricate missing data.', 'Do not treat proposed thresholds as approved.',
    'Do not treat business approval as registration.', 'Do not use $100K while it is NOT EXECUTABLE.',
  ]) await expect(main).toContainText(r)
  expect(errs, errs.join('\n')).toHaveLength(0)
})

test('the guide reflects live state and promises no outcome', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Experiment Guide')
  const glance = page.locator('.card', { hasText: 'At a glance' })
  await expect(glance.locator('tbody tr')).toHaveCount(10)
  await expect(glance).toContainText('0 OF 4 REGISTERED')
  await expect(glance).toContainText('AWAITING NAMED REVIEWER')
  const text = (await page.locator('.main').innerText()).toLowerCase()
  for (const p of ['will increase the price', 'higher market rank', 'guaranteed', 'experiment succeeded']) {
    expect(text, `guide must not contain "${p}"`).not.toContain(p)
  }
})

// ───────────────────────────────────────────── Daily Market Sync

test('Daily Market Sync opens, offers the button, and fetches nothing on load', async ({ page }) => {
  const calls: string[] = []
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost')) calls.push(r.url()) })
  await routeSources(page)

  await page.goto('/')
  await goTo(page, 'Daily Market Sync')
  await expect(page.getByTestId('run-daily-sync')).toBeVisible()
  await expect(page.locator('.card', { hasText: 'SUT daily snapshot' })).toContainText('NO SNAPSHOT YET')
  await expect(page.locator('.tile').filter({ hasText: 'Sync status' })).toContainText('NEVER RUN')
  await expect(page.locator('.card', { hasText: 'Daily report history' })).toContainText('NO REPORTS')
  await expect(page.getByTestId('scheduling-notice')).toContainText('requires the application to be open')
  await expect(page.getByTestId('cron-schedule')).toHaveText('5 0 * * *')
  const sources = page.locator('.card', { hasText: 'Data sources' })
  await expect(sources).toContainText('CoinGecko')
  await expect(sources).toContainText('DexScreener')
  await expect(sources).toContainText('Polygon RPC')
  await expect(sources).toContainText('CoinMarketCap')
  await expect(sources).toContainText('not yet called')
  expect(calls, `no external request may happen on load: ${calls.join(', ')}`).toHaveLength(0)
})

test('Run Daily Sync records a snapshot with provenance and real DATA UNAVAILABLE fields', async ({ page }) => {
  await routeSources(page)
  await page.goto('/')
  await goTo(page, 'Daily Market Sync')
  await sync(page)

  await expect(page.locator('.tile').filter({ hasText: 'Sync status' })).toContainText('SUCCESS')
  await expect(page.getByTestId('snap-price')).toContainText('0.431152')
  await expect(page.getByTestId('snap-change')).toContainText('4.575')
  await expect(page.getByTestId('snap-volume')).toContainText('97,303.21')
  await expect(page.getByTestId('snap-btc')).toContainText('83,920')
  await expect(page.getByTestId('snap-eth')).toContainText('2,704.71')
  await expect(page.getByTestId('snap-data-ts')).toHaveText('2026-10-02T00:00:00.000Z')
  await expect(page.getByTestId('snap-retrieved')).not.toBeEmpty()

  // fields the source does not publish stay unavailable, with a stated reason
  await expect(page.getByTestId('snap-mcap')).toContainText('DATA UNAVAILABLE')
  await expect(page.getByTestId('snap-mcap')).toContainText('not a measurement')
  await expect(page.getByTestId('snap-rank')).toContainText('DATA UNAVAILABLE')

  const report = page.locator('.card', { hasText: 'Daily SUT Market Report' })
  await expect(report).toContainText('TRIGGER MANUAL')
  for (const section of [
    '1 · Current market snapshot', '2 · Supply snapshot', '3 · Liquidity / market structure',
    '4 · Exchange / venue context', '5 · BTC / ETH context', '6 · Changes since the previous observation',
    '7 · Historical evidence relevant to the current condition', '8 · Current problem / opportunity',
    '9 · Candidate action', '10 · Expected measurable effect', '11 · Evidence required',
    '12 · Data quality / limitations',
  ]) await expect(report).toContainText(section)
  await expect(report).toContainText('Sources and provenance')
  await expect(report).toContainText('Source status')
  await expect(page.getByTestId('daily-disclaimer'))
    .toContainText('does not by itself establish causality, business impact, or the root cause')
  await expect(page.getByTestId('daily-interpretation'))
    .toContainText('interpreted according to the retrieval timestamp and source provenance')
  await expect(page.getByTestId('comparison-text')).toContainText('no causal relationship')
  await expect(report).toContainText('CONTRACT VERIFIED')
  await expect(report).toContainText('Market events / news')
  await expect(report).toContainText('no public, browser-reachable news')
})

test('an unavailable source is reported, never invented', async ({ page }) => {
  await routeSources(page, { failGlobal: true })
  await page.goto('/')
  await goTo(page, 'Daily Market Sync')
  await sync(page)

  await expect(page.locator('.tile').filter({ hasText: 'Sync status' })).toContainText('PARTIAL')
  const report = page.locator('.card', { hasText: 'Daily SUT Market Report' })
  await expect(report.locator('tr', { hasText: 'Total crypto market cap' }).first()).toContainText('DATA UNAVAILABLE')
  await expect(report.locator('tr', { hasText: 'Total crypto market cap' }).first()).toContainText('rate-limited')
  await expect(report.locator('tr', { hasText: 'CoinGecko — global' }).last()).toContainText('RATE_LIMITED')
  await expect(report).toContainText('Sources that did not respond normally')
  // the CoinMarketCap source has no key here and says exactly that
  await expect(report.locator('tr', { hasText: 'CoinMarketCap' }).last()).toContainText('NOT_CONFIGURED')
  await expect(report).toContainText('set CMC_API_KEY and run the scheduled server-side sync')
})

test('reports persist across reload, history grows only when the data changes', async ({ page }) => {
  let price = 0.431152
  await routeSources(page, { price: () => price })
  await page.goto('/')
  await goTo(page, 'Daily Market Sync')
  await sync(page)
  const firstId = await page.locator('.card', { hasText: 'Daily report history' })
    .locator('tbody tr').first().innerText()

  // identical data → idempotent, nothing written
  await sync(page)
  await expect(page.getByTestId('sync-notice')).toContainText('identical to')
  await expect(page.locator('.card', { hasText: 'Daily report history' }).locator('tbody tr')).toHaveCount(1)

  // changed data → a new immutable report
  price = 0.5
  await sync(page)
  const hist = page.locator('.card', { hasText: 'Daily report history' })
  await expect(hist.locator('tbody tr')).toHaveCount(2)

  await page.reload()
  await goTo(page, 'Daily Market Sync')
  const hist2 = page.locator('.card', { hasText: 'Daily report history' })
  await expect(hist2.locator('tbody tr')).toHaveCount(2)
  await expect(hist2.locator('tbody tr').nth(0)).toContainText('0.5')
  await expect(hist2.locator('tbody tr').nth(1)).toContainText('0.431152')
  expect(firstId).toContain('DMR-')

  // the earlier report still carries its own value — it was not rewritten
  await hist2.locator('tbody tr').nth(1).click()
  const report = page.locator('.card', { hasText: 'Daily SUT Market Report' })
  await expect(report.locator('tr', { hasText: 'SUT price' }).first()).toContainText('0.431152')
  await expect(report).toContainText('DMR-')
  await expect(page.locator('.tile').filter({ hasText: 'Reports stored' })).toContainText('2')
})

test('a stored report cannot be silently rewritten', async ({ page }) => {
  await routeSources(page)
  await page.goto('/')
  await goTo(page, 'Daily Market Sync')
  await sync(page)

  await page.evaluate((k) => {
    const l = JSON.parse(localStorage.getItem(k)!)
    l.reports[0].observations[0].value = 9.99
    localStorage.setItem(k, JSON.stringify(l))
  }, DAILY_KEY)

  await page.reload()
  await goTo(page, 'Daily Market Sync')
  await expect(page.locator('.card', { hasText: 'Daily report history' }).locator('tbody tr').first())
    .toContainText('TAMPERED')
  // an edited record is not served as the current snapshot
  await expect(page.locator('.card', { hasText: 'SUT daily snapshot' })).toContainText('NO SNAPSHOT YET')
})

test('a daily sync unlocks nothing in EXP-001', async ({ page }) => {
  await routeSources(page)
  await page.goto('/')
  await goTo(page, 'Daily Market Sync')
  await sync(page)
  await expect(page.locator('.tile').filter({ hasText: 'Sync status' })).toContainText('SUCCESS')

  await goTo(page, 'Pre-Registration')
  await expect(page.getByTestId('nra-registered')).toHaveText('0 of 4')
  await expect(page.getByTestId('nra-approved')).toHaveText('0 of 3')
  await expect(page.locator('.tile').filter({ hasText: 'Registration complete' })).toContainText('NO')
  await expect(page.getByTestId('intervention-status')).toHaveText('BLOCKED')
  await expect(page.getByTestId('comparison-status')).toHaveText('BLOCKED')
  await expect(page.getByTestId('result-status')).toHaveText('NOT AVAILABLE')
  await expect(page.getByTestId('final-review-status')).toHaveText('BLOCKED')
  await expect(page.getByTestId('gate-action')).toContainText('register the four numeric thresholds')

  await goTo(page, 'Baseline History')
  await expect(page.locator('.tile').filter({ hasText: 'Approved' })).toContainText('0')

  await goTo(page, 'Proposed Thresholds')
  const p = page.locator('.card', { hasText: 'EXP-001 — governance status' })
  await expect(p.locator('tbody tr').nth(3)).toContainText('PENDING')
  await expect(p.locator('tbody tr').nth(6)).toContainText('BLOCKED')
  await expect(p.locator('tbody tr').nth(7)).toContainText('NOT AVAILABLE')
})

test('no overflow on the new screens at tablet and mobile', async ({ page }) => {
  await routeSources(page)
  for (const vp of [{ width: 1024, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp)
    await page.goto('/')
    for (const s of ['Experiment Guide', 'Daily Market Sync']) {
      await goTo(page, s)
      const scrolls = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
      expect(scrolls, `${s} scrolls horizontally @ ${vp.width}`).toBe(false)
    }
    await sync(page)
    const scrolls = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    expect(scrolls, `report scrolls horizontally @ ${vp.width}`).toBe(false)
  }
})

test('CURRENT layer is labelled and separated from the frozen and governance layers', async ({ page }) => {
  await routeSources(page)
  await page.goto('/')
  await expect(page.getByTestId('nav-group-dashboard')).toHaveText('HISTORICAL RESEARCH — FROZEN 2026-09-30')
  await expect(page.getByTestId('nav-group-backlog')).toHaveText('EXPERIMENT & GOVERNANCE — EXP-001')
  await expect(page.getByTestId('nav-group-daily')).toHaveText('CURRENT — SUT MARKET STATE')

  await goTo(page, 'Daily Market Sync')
  await expect(page.getByTestId('current-layer-label')).toHaveText('CURRENT — SUT MARKET STATE')
  await expect(page.locator('.main')).toContainText('Layer 2 of 3 — current market state')
  await expect(page.locator('.main')).toContainText('which never changes')
})

test('the report separates observation, interpretation, proposal and measured result', async ({ page }) => {
  await routeSources(page)
  await page.goto('/')
  await goTo(page, 'Daily Market Sync')
  await sync(page)

  const report = page.locator('.card', { hasText: 'Daily SUT Market Report' })
  await expect(report).toContainText('OBSERVATION')
  await expect(report).toContainText('INTERPRETATION')
  await expect(report).toContainText('PROPOSAL')
  await expect(report).toContainText('EXPECTED EFFECT')
  await expect(report).not.toContainText('MEASURED RESULT')      // no measurement exists

  // section 7 cites the frozen records, marked frozen
  await expect(report).toContainText('HYPOTHESIS H2')
  await expect(report).toContainText('OPPORTUNITY OPP-01')
  await expect(report).toContainText('BASELINE_RUN RUN-003')
  await expect(report).toContainText('FROZEN: this record is never modified by the daily layer')
  await expect(report).toContainText('Modelled price impact at the standardised trade sizes is an EXP-001 measurement')
})

test('the candidate action stays a proposal and never becomes a result', async ({ page }) => {
  await routeSources(page)
  await page.goto('/')
  await goTo(page, 'Daily Market Sync')
  await sync(page)

  const action = page.locator('.card', { hasText: 'Candidate action — evidence-based improvement' })
  await expect(action.getByTestId('action-status')).toHaveText('PROPOSED')
  await expect(action.getByTestId('action-problem')).toContainText('attributes nothing to it')
  await expect(action.getByTestId('action-proposal')).toContainText('candidate for human decision')
  await expect(action.getByTestId('action-expected')).toContainText('should fall relative to the approved baseline')
  await expect(action.getByTestId('action-target')).toContainText('NOT REGISTERED')
  await expect(action.getByTestId('action-measurement')).toContainText('DATA UNAVAILABLE')
  await expect(action.getByTestId('action-next')).toContainText('business owner must decide')
  await expect(action).toContainText('RUN-001')
  await expect(action).toContainText('10.64')                    // RUN-003 captured impact, quoted unchanged
  await expect(action).toContainText('NOT EXECUTABLE')
  await expect(action).toContainText('will not execute it')

  // the frozen baseline is quoted, never edited
  await goTo(page, 'Baseline History')
  const r3 = page.locator('tbody tr', { hasText: 'RUN-003' })
  await expect(r3).toContainText('10.64')
  await expect(r3).toContainText('0.412615')
})

test('the browser never holds a CMC credential and labels CMC identity as unverified', async ({ page }) => {
  await routeSources(page)
  await page.goto('/')
  await goTo(page, 'Daily Market Sync')
  await sync(page)

  // the client bundle has no credential and never calls the credentialed endpoint
  const bundleCalls: string[] = []
  page.on('request', (r) => { if (r.url().includes('coinmarketcap')) bundleCalls.push(r.url()) })
  await page.reload()
  await goTo(page, 'Daily Market Sync')
  expect(bundleCalls, 'the browser must never call the credentialed endpoint').toHaveLength(0)

  const stored = await page.evaluate((k) => localStorage.getItem(k) ?? '', DAILY_KEY)
  expect(stored).not.toContain('X-CMC_PRO_API_KEY')
  expect(stored.toLowerCase()).not.toContain('authorization')
  // the only permitted mention is the env-var NAME inside the "how to configure" reason
  expect(stored.replace(/CMC_API_KEY/g, '')).not.toMatch(/api[_-]?key/i)

  // CMC is shown as NOT CONFIGURED with the exact reason, never as a value
  await page.getByTestId('open-latest-report').click()
  const report = page.locator('.card', { hasText: 'Daily SUT Market Report' })
  await expect(report.locator('tr', { hasText: 'CoinMarketCap' }).last()).toContainText('NOT_CONFIGURED')
  await expect(report).toContainText('set CMC_API_KEY and run the scheduled server-side sync')
  await expect(report).toContainText('TICKER ONLY')
  await expect(report).toContainText('never merged into the contract-verified SUT values')

  // the contract-verified price is unaffected by CMC being unavailable
  await expect(page.getByTestId('snap-price')).toContainText('0.431152')
  await expect(page.getByTestId('snap-cmc-supply')).toContainText('DATA UNAVAILABLE')
  await expect(page.getByTestId('supply-tracking').first()).toContainText('CMC circulating supply')
})
