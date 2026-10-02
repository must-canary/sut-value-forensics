/**
 * CURRENT — SUT MARKET STATE: the manual live sync, in a real browser.
 *
 * Every external call is answered with a CONTROLLED FIXTURE, so no assertion
 * depends on a live market value. Production behaviour is unchanged: the app
 * calls the real endpoints, the test answers them.
 */
import { test, expect, type Page, type Route } from '@playwright/test'

const CONTRACT = '0x98965474ecbec2f532f1f780ee37b0b05f77ca55'
const POOL = '0x092295c92BAB5e734c4a60DbC0F0FfdCdfC4E165'
const LIVE_KEY = 'sut-value-forensics:live-market:v1'

async function goTo(page: Page, screen: string) {
  await page.getByRole('button', { name: screen, exact: true }).click()
  await expect(page.getByRole('heading', { level: 2 })).toContainText(screen)
}

const json = (route: Route, body: unknown) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

async function routeLive(page: Page, opts: { price?: () => number; failGlobal?: boolean } = {}) {
  const price = opts.price ?? (() => 0.43)
  const ts = Math.floor(Date.parse('2026-10-02T00:00:00Z') / 1000)

  await page.route('**api.coingecko.com/api/v3/simple/token_price/**', (r) => json(r, {
    [CONTRACT]: { usd: price(), usd_market_cap: 0, usd_24h_vol: 97303.21, usd_24h_change: 4.5, last_updated_at: ts },
  }))
  await page.route('**api.coingecko.com/api/v3/coins/**', (r) => json(r, {
    last_updated: '2026-10-02T00:00:00.000Z', market_cap_rank: null,
    market_data: { circulating_supply: 0, total_supply: 238403732, max_supply: 238403732 },
    tickers: [],
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
      chainId: 'polygon', dexId: 'uniswap', pairAddress: POOL,
      baseToken: { address: CONTRACT, symbol: 'SUT' },
      quoteToken: { address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', symbol: 'USDT' },
      priceUsd: String(price()), liquidity: { usd: 94440.93 }, volume: { h24: 41043.01 }, priceChange: { h24: 3.65 },
    }],
  }))
  await page.route('**polygon-bor-rpc.publicnode.com**', (r) => json(r, [
    { jsonrpc: '2.0', id: 1, result: '0x5a60a3e' },
    {
      jsonrpc: '2.0', id: 2,
      result: '0x000000000000000000000000000000000000000000000b055455128e6729c8fa'
        + 'fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffba7c6' + '0'.repeat(320),
    },
    { jsonrpc: '2.0', id: 3, result: { number: '0x5a60a3e', timestamp: `0x${ts.toString(16)}` } },
  ]))
}

const runSync = async (page: Page) => {
  await page.getByTestId('run-live-sync').click()
  await expect(page.getByTestId('run-live-sync')).toBeEnabled()
}

const liveCard = (page: Page) => page.locator('.card', { hasText: 'Live production market data for contract' })

test('the live sync panel is the CURRENT layer and fetches nothing on load', async ({ page }) => {
  const calls: string[] = []
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost')) calls.push(r.url()) })
  await routeLive(page)
  await page.goto('/')
  await goTo(page, 'Daily Market Sync')

  const card = liveCard(page)
  await expect(card.locator('h3')).toHaveText('CURRENT — SUT MARKET STATE')
  await expect(page.getByTestId('run-live-sync')).toBeVisible()
  await expect(card).toContainText('NO LIVE SYNC YET')
  await expect(card).toContainText('no missing field is filled with zero')
  await expect(page.locator('.card', { hasText: 'Sync history' })).toContainText('NO SYNCS')
  const sources = page.locator('.card', { hasText: 'Live sources (v1)' })
  await expect(sources).toContainText('CoinGecko')
  await expect(sources).toContainText('DexScreener')
  await expect(sources).toContainText('Polygon RPC')
  await expect(sources).toContainText('DEFERRED — not used in v1')
  expect(calls, `no external request on load: ${calls.join(', ')}`).toHaveLength(0)
})

test('Run Live Market Sync records a snapshot with identity, timestamps and raw evidence', async ({ page }) => {
  await routeLive(page)
  await page.goto('/')
  await goTo(page, 'Daily Market Sync')
  await runSync(page)

  // sync id + status
  const card = liveCard(page)
  await expect(card.locator('.tile').filter({ hasText: 'Sync ID' })).toContainText('LMS-')
  await expect(card.locator('.tile').filter({ hasText: 'Run status' })).toContainText('VALIDATED')

  // values present
  await expect(page.getByTestId('snapshot-price')).toContainText('0.43')
  await expect(page.getByTestId('snapshot-price')).toContainText('CONTRACT VERIFIED')
  await expect(page.getByTestId('snapshot-volume_24h')).toContainText('97,303.21')
  await expect(page.getByTestId('snapshot-pair_liquidity_usd')).toContainText('94,440.93')
  await expect(page.getByTestId('snapshot-onchain_spot_price')).toContainText('0.431507')
  await expect(page.getByTestId('snapshot-block_number')).toContainText('94,767,678')
  await expect(page.getByTestId('snapshot-btc_price')).toContainText('83,920')
  await expect(page.getByTestId('snapshot-eth_price')).toContainText('2,704.71')

  // missing values stay unavailable with a stated reason — never zero
  for (const m of ['market_cap', 'circulating_supply', 'market_rank']) {
    await expect(page.getByTestId(`snapshot-${m}`)).toContainText('DATA UNAVAILABLE')
    await expect(page.getByTestId(`snapshot-${m}`)).toContainText('Reason:')
  }
  await expect(page.getByTestId('snapshot-market_cap')).toContainText('not a measurement')

  // raw evidence: endpoint, HTTP status, bytes, SHA-256
  const ev = page.getByTestId('evidence-coingecko-token')
  await expect(ev).toContainText('api.coingecko.com')
  await expect(ev).toContainText('200')
  await expect(ev).toContainText(/sha256:[0-9a-f]{8}/)
  await expect(page.getByTestId('raw-polygon-rpc')).toContainText('bytes')
  await page.getByTestId('raw-dexscreener-pair').locator('summary').click()
  await expect(page.getByTestId('raw-dexscreener-pair').locator('pre')).toContainText(POOL)
})

test('a failing source is recorded as ERROR and never invented', async ({ page }) => {
  await routeLive(page, { failGlobal: true })
  await page.goto('/')
  await goTo(page, 'Daily Market Sync')
  await runSync(page)

  await expect(liveCard(page).locator('.tile').filter({ hasText: 'Run status' })).toContainText('PARTIAL')
  await expect(page.getByTestId('evidence-coingecko-global')).toContainText('429')
  await expect(page.getByTestId('evidence-coingecko-global')).toContainText('ERROR')
  await expect(page.getByTestId('snapshot-price')).toContainText('0.43')   // unaffected
})

test('runs are append-only, immutable, and survive a reload', async ({ page }) => {
  let price = 0.43
  await routeLive(page, { price: () => price })
  await page.goto('/')
  await goTo(page, 'Daily Market Sync')
  await runSync(page)
  const firstId = await liveCard(page).locator('.tile').filter({ hasText: 'Sync ID' }).innerText()

  price = 0.5
  await runSync(page)

  await page.reload()
  await goTo(page, 'Daily Market Sync')
  const history = page.locator('.card', { hasText: 'Sync history' })
  await expect(history.locator('tbody tr')).toHaveCount(2)
  await expect(history.locator('tbody tr').nth(0)).toContainText('-002')
  await expect(history.locator('tbody tr').nth(1)).toContainText('-001')
  await expect(history.locator('tbody tr').nth(0)).toContainText('OK')
  expect(firstId).toContain('LMS-')

  // the earlier run keeps its own value
  await history.locator('tbody tr').nth(1).click()
  await expect(page.getByTestId('snapshot-price')).toContainText('0.43')
  await expect(page.getByTestId('snapshot-price')).not.toContainText('0.5 ')
})

test('comparison with the previous sync is only calculated when valid', async ({ page }) => {
  let price = 0.43
  await routeLive(page, { price: () => price })
  await page.goto('/')
  await goTo(page, 'Daily Market Sync')
  await runSync(page)
  // the very first run has nothing to compare against
  await expect(page.getByTestId('compare-price')).toContainText('COMPARISON UNAVAILABLE')
  await expect(page.getByTestId('compare-price')).toContainText('no earlier sync is stored')

  price = 0.4515
  await runSync(page)
  await expect(page.getByTestId('compare-price')).toContainText('COMPARED')
  await expect(page.getByTestId('compare-price')).toContainText('+0.0215')
  await expect(page.getByTestId('compare-price')).toContainText('+5.0000%')
  // a metric that is unavailable in both runs is never given a number
  await expect(page.getByTestId('compare-market_cap')).toContainText('COMPARISON UNAVAILABLE')
})

test('the assessment is a proposal and never a measured result', async ({ page }) => {
  await routeLive(page)
  await page.goto('/')
  await goTo(page, 'Daily Market Sync')
  await runSync(page)

  const a = page.locator('.card', { hasText: 'Daily assessment' })
  for (const s of [
    '1 · OBSERVATION', '2 · INTERPRETATION', '3 · HISTORICAL EVIDENCE', 'UNRESOLVED',
    '4 · CURRENT PROBLEM / OPPORTUNITY', '5 · PROPOSED ACTION', '6 · EXPECTED MEASURABLE EFFECT',
    '7 · EVIDENCE REQUIRED', 'MEASURED RESULT', '8 · STATUS',
  ]) await expect(a).toContainText(s)
  await expect(page.getByTestId('live-assessment-status')).toHaveText('PROPOSED')
  await expect(a).toContainText('not a business decision')
  await expect(a).toContainText('no causal relationship')
  await expect(a).toContainText('H2')
  await expect(a).toContainText('RUN-003')
  // the MEASURED RESULT slot exists but is explicitly empty — it is never the proposal
  await expect(page.getByTestId('measured-result')).toContainText('DATA UNAVAILABLE')
  await expect(page.getByTestId('measured-result')).toContainText('no post-intervention measurement exists')
})

test('the live sync changes nothing in EXP-001 governance', async ({ page }) => {
  await routeLive(page)
  await page.goto('/')
  await goTo(page, 'Daily Market Sync')
  await runSync(page)
  await expect(liveCard(page).locator('.tile').filter({ hasText: 'Run status' })).toContainText('VALIDATED')

  await goTo(page, 'Pre-Registration')
  await expect(page.getByTestId('nra-registered')).toHaveText('0 of 4')
  await expect(page.getByTestId('nra-approved')).toHaveText('0 of 3')
  await expect(page.getByTestId('intervention-status')).toHaveText('BLOCKED')
  await expect(page.getByTestId('comparison-status')).toHaveText('BLOCKED')
  await expect(page.getByTestId('result-status')).toHaveText('NOT AVAILABLE')

  await goTo(page, 'Baseline History')
  await expect(page.locator('.tile').filter({ hasText: 'Approved' })).toContainText('0')
  const r3 = page.locator('tbody tr', { hasText: 'RUN-003' })
  await expect(r3).toContainText('10.64')
  await expect(r3).toContainText('0.412615')
})

test('no credential is stored and JSON export is offered', async ({ page }) => {
  await routeLive(page)
  await page.goto('/')
  await goTo(page, 'Daily Market Sync')
  await runSync(page)

  const stored = await page.evaluate((k) => localStorage.getItem(k) ?? '', LIVE_KEY)
  expect(stored.length).toBeGreaterThan(0)
  expect(stored).not.toMatch(/api[_-]?key/i)
  expect(stored).not.toMatch(/authorization/i)
  expect(stored).toContain('sha256:')

  await page.getByTestId('export-run').click()
  await expect(page.getByTestId('export-json')).toContainText('"id": "LMS-')
  await expect(page.getByTestId('export-json')).toContainText('"rawPayloadHash": "sha256:')
})

test('no overflow with a stored run at tablet and mobile', async ({ page }) => {
  await routeLive(page)
  for (const vp of [{ width: 1024, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp)
    await page.goto('/')
    await goTo(page, 'Daily Market Sync')
    await runSync(page)
    const scrolls = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    expect(scrolls, `overflow @ ${vp.width}`).toBe(false)
  }
})

test('the evidence header summarises the run', async ({ page }) => {
  await routeLive(page)
  await page.goto('/')
  await goTo(page, 'Daily Market Sync')
  await runSync(page)

  const card = liveCard(page)
  await expect(page.getByTestId('evidence-header-title')).toHaveText('LIVE MARKET EVIDENCE')
  await expect(card.locator('.tile').filter({ hasText: 'Sync ID' })).toContainText('LMS-')
  await expect(card.locator('.tile').filter({ hasText: 'Captured at' })).toContainText('UTC')
  await expect(card.locator('.tile').filter({ hasText: 'Status' }).first()).toContainText('VALIDATED')
  await expect(card.locator('.tile').filter({ hasText: 'Sources' })).toContainText('6/6')
  await expect(card.locator('.tile').filter({ hasText: 'Observations' })).toContainText('/')
  await expect(card.locator('.tile').filter({ hasText: 'Evidence integrity' })).toContainText('OK')
})

test('every metric exposes a full Evidence panel traceable to its response', async ({ page }) => {
  await routeLive(page)
  await page.goto('/')
  await goTo(page, 'Daily Market Sync')
  await runSync(page)

  const price = page.getByTestId('evidence-detail-price')
  await price.locator('summary').click()
  for (const label of [
    'SOURCE', 'ENDPOINT', 'OBSERVED AT', 'RETRIEVED AT', 'SYNC ID', 'ASSET', 'IDENTITY',
    'CONTRACT', 'CHAIN', 'VENUE / PAIR', 'STATUS', 'EVIDENCE HASH', 'METHODOLOGY',
  ]) await expect(price).toContainText(label)

  await expect(price).toContainText('CoinGecko')
  await expect(price).toContainText('api.coingecko.com')
  await expect(price).toContainText('2026-10-02 00:00:00 UTC')          // observation timestamp, as stored
  await expect(price).toContainText(/RETRIEVED AT\s*20\d\d-\d\d-\d\d \d\d:\d\d:\d\d UTC/)
  await expect(price).toContainText(/LMS-\d{4}-\d{2}-\d{2}-\d{3}/)
  await expect(price).toContainText('CONTRACT VERIFIED')
  await expect(price).toContainText(CONTRACT)
  await expect(price).toContainText('polygon')
  await expect(price).toContainText('HTTP 200 / VALIDATED')
  await expect(price).toContainText(/sha256:[0-9a-f]{64}/)

  // a pair metric names its venue and pair
  const pool = page.getByTestId('evidence-detail-pair_liquidity_usd')
  await pool.locator('summary').click()
  await expect(pool).toContainText('uniswap')
  await expect(pool).toContainText('SUT/USDT')
  await expect(pool).toContainText('DexScreener')
})

test('an unavailable metric shows the real reason inside its evidence', async ({ page }) => {
  await routeLive(page, { failGlobal: true })
  await page.goto('/')
  await goTo(page, 'Daily Market Sync')
  await runSync(page)

  const mcap = page.getByTestId('snapshot-market_cap')
  await expect(mcap).toContainText('DATA UNAVAILABLE')
  await expect(mcap).toContainText('Reason: the source publishes no market capitalisation')
  await page.getByTestId('evidence-detail-market_cap').locator('summary').click()
  const mcapEv = page.getByTestId('evidence-detail-market_cap')
  await expect(mcapEv).toContainText('DATA UNAVAILABLE')
  await expect(mcapEv).toContainText('Reason: the source publishes no market capitalisation')
  await expect(mcapEv).toContainText('not a measurement')
  await expect(mcapEv).toContainText('HTTP 200 / DATA UNAVAILABLE')   // the source answered; the field is absent

  const global = page.getByTestId('evidence-detail-total_market_cap_usd')
  await global.locator('summary').click()
  await expect(global).toContainText('HTTP 429')
  await expect(global).toContainText('rate-limited')
})

test('View Raw Evidence shows the preserved response and its SHA-256', async ({ page }) => {
  await routeLive(page)
  await page.goto('/')
  await goTo(page, 'Daily Market Sync')
  await runSync(page)

  await page.getByTestId('evidence-detail-pair_liquidity_usd').locator('summary').click()
  await expect(page.getByTestId('raw-panel-pair_liquidity_usd')).toHaveCount(0)
  await page.getByTestId('view-raw-pair_liquidity_usd').click()

  const raw = page.getByTestId('raw-panel-pair_liquidity_usd')
  await expect(raw).toContainText(POOL)
  await expect(raw).toContainText('94440.93')
  await expect(raw).toContainText(/sha256:[0-9a-f]{64}/)
  await expect(raw).toContainText('bytes')

  // and it matches the run-level raw evidence for the same source
  await page.getByTestId('raw-dexscreener-pair').locator('summary').click()
  await expect(page.getByTestId('raw-dexscreener-pair').locator('pre')).toContainText(POOL)

  await page.getByTestId('view-raw-pair_liquidity_usd').click()
  await expect(page.getByTestId('raw-panel-pair_liquidity_usd')).toHaveCount(0)
})

test('evidence timestamps survive a reload unchanged', async ({ page }) => {
  await routeLive(page)
  await page.goto('/')
  await goTo(page, 'Daily Market Sync')
  await runSync(page)
  await page.getByTestId('evidence-detail-price').locator('summary').click()
  const before = await page.getByTestId('evidence-detail-price').innerText()

  await page.reload()
  await goTo(page, 'Daily Market Sync')
  await page.getByTestId('evidence-detail-price').locator('summary').click()
  expect(await page.getByTestId('evidence-detail-price').innerText()).toBe(before)
})
