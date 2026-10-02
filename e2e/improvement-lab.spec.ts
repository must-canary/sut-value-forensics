/**
 * SUT Value Improvement Lab — browser coverage.
 *
 * Live sources are answered with controlled fixtures, so no assertion depends
 * on a live market value. The lab must approve nothing, execute nothing and
 * claim no result.
 */
import { test, expect, type Page, type Route } from '@playwright/test'

const CONTRACT = '0x98965474ecbec2f532f1f780ee37b0b05f77ca55'
const POOL = '0x092295c92BAB5e734c4a60DbC0F0FfdCdfC4E165'

async function goTo(page: Page, screen: string) {
  await page.getByRole('button', { name: screen, exact: true }).click()
  await expect(page.getByRole('heading', { level: 2 })).toContainText(screen)
}

const json = (route: Route, body: unknown) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

async function routeLive(page: Page) {
  const ts = Math.floor(Date.parse('2026-10-01T14:27:00Z') / 1000)
  await page.route('**api.coingecko.com/api/v3/simple/token_price/**', (r) => json(r, {
    [CONTRACT]: { usd: 0.426378, usd_market_cap: 0, usd_24h_vol: 90243.75, usd_24h_change: 3.9587, last_updated_at: ts },
  }))
  await page.route('**api.coingecko.com/api/v3/coins/**', (r) => json(r, {
    last_updated: '2026-10-01T14:27:00.000Z', market_cap_rank: null,
    market_data: { circulating_supply: 0, total_supply: 238403732, max_supply: 238403732 }, tickers: [],
  }))
  await page.route('**api.coingecko.com/api/v3/simple/price**', (r) => json(r, {
    bitcoin: { usd: 84004, usd_24h_change: 0.1228, last_updated_at: ts },
    ethereum: { usd: 2694.12, usd_24h_change: 0.3694, last_updated_at: ts },
  }))
  await page.route('**api.coingecko.com/api/v3/global**', (r) =>
    r.fulfill({ status: 429, contentType: 'text/plain', body: 'Throttled' }))
  await page.route('**api.dexscreener.com/**', (r) => json(r, {
    pairs: [{
      chainId: 'polygon', dexId: 'uniswap', pairAddress: POOL,
      baseToken: { address: CONTRACT, symbol: 'SUT' },
      quoteToken: { address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', symbol: 'USDT' },
      priceUsd: '0.4250', liquidity: { usd: 93876.36 }, volume: { h24: 35749.29 }, priceChange: { h24: 3.33 },
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

/** Run the existing live sync, then open the lab. */
async function syncThenLab(page: Page) {
  await goTo(page, 'Daily Market Sync')
  await page.getByTestId('run-live-sync').click()
  await expect(page.getByTestId('run-live-sync')).toBeEnabled()
  await goTo(page, 'Value Improvement Lab')
}

test('the lab opens, is labelled, and states the execution chain', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  await routeLive(page)
  await page.goto('/')
  await goTo(page, 'Value Improvement Lab')

  await expect(page.getByTestId('lab-title')).toHaveText('SUT Value Improvement Lab')
  await expect(page.locator('.main')).toContainText('decision support, not a decision engine')
  const chain = page.getByTestId('execution-chain')
  for (const c of [
    'Research tells us what the problem areas are',
    'Live Sync tells us what the current market condition is',
    'QA/Product prototypes allow us to test what can be improved',
    'Experiments tell us what actually improved',
    'Business review decides what to scale, continue, change, or stop',
  ]) await expect(chain).toContainText(c)
  expect(errs, errs.join('\n')).toHaveLength(0)
})

test('section 1 reuses the live sync and says DATA UNAVAILABLE when none exists', async ({ page }) => {
  await routeLive(page)
  await page.goto('/')
  await goTo(page, 'Value Improvement Lab')
  await expect(page.getByTestId('lab-no-evidence')).toContainText('DATA UNAVAILABLE')
  await expect(page.getByTestId('lab-no-evidence')).toContainText('never collects or assumes market data of its own')

  await syncThenLab(page)
  await expect(page.getByTestId('lab-evidence-price')).toContainText('0.426378')
  await expect(page.getByTestId('lab-evidence-price')).toContainText('CONTRACT VERIFIED')
  await expect(page.getByTestId('lab-evidence-price')).toContainText(CONTRACT)
  await expect(page.getByTestId('lab-evidence-price')).toContainText('polygon')
  await expect(page.getByTestId('lab-evidence-price')).toContainText('2026-10-01 14:27:00 UTC')
  await expect(page.getByTestId('lab-evidence-price')).toContainText(/sha256:[0-9a-f]{64}/)
  await expect(page.getByTestId('lab-evidence-pair_liquidity_usd')).toContainText('93,876.36')
  await expect(page.getByTestId('lab-evidence-pair_liquidity_usd')).toContainText('uniswap')
  await expect(page.getByTestId('lab-evidence-circulating_supply')).toContainText('DATA UNAVAILABLE')
  await expect(page.getByTestId('lab-evidence-circulating_supply')).toContainText('Reason:')
})

test('sections 2 and 3 show the four gaps and the four opportunities', async ({ page }) => {
  await routeLive(page)
  await page.goto('/')
  await syncThenLab(page)

  await expect(page.getByTestId('gap-GAP-A')).toContainText('Liquidity / market-depth measurement')
  await expect(page.getByTestId('gap-GAP-A')).toContainText('SUPPORTED')
  await expect(page.getByTestId('gap-GAP-A')).toContainText('RUN-001, RUN-002, RUN-003')
  await expect(page.getByTestId('gap-GAP-B')).toContainText('Market-data coverage')
  await expect(page.getByTestId('gap-GAP-B')).toContainText('it reports 0, which is not a measurement')
  await expect(page.getByTestId('gap-GAP-C')).toContainText('DATA INSUFFICIENT')
  await expect(page.getByTestId('gap-GAP-C')).toContainText('H4')
  await expect(page.getByTestId('gap-GAP-D')).toContainText('DATA UNAVAILABLE')
  await expect(page.getByTestId('gap-GAP-D')).toContainText('No product telemetry')

  await expect(page.getByTestId('opportunity-OPP-L1')).toContainText('Liquidity / market-depth improvement')
  await expect(page.getByTestId('opportunity-OPP-L1')).toContainText('BUSINESS REVIEW REQUIRED')
  await expect(page.getByTestId('opportunity-OPP-L2')).toContainText('Market transparency / data coverage')
  await expect(page.getByTestId('opportunity-OPP-L2')).toContainText('PROPOSED')
  await expect(page.getByTestId('opportunity-OPP-L3')).toContainText('DATA INSUFFICIENT')
  await expect(page.getByTestId('opportunity-OPP-L4')).toContainText('DATA UNAVAILABLE')
})

test('section 4 shows the real baseline as not a target and the thresholds as pending', async ({ page }) => {
  await routeLive(page)
  await page.goto('/')
  await goTo(page, 'Value Improvement Lab')

  await expect(page.getByTestId('baseline-label')).toHaveText('Observed baseline — not a target.')
  await expect(page.getByTestId('lab-baseline-$10,000 buy')).toContainText('10.6%')
  await expect(page.getByTestId('lab-baseline-$10,000 sell')).toContainText('9.6%')
  await expect(page.getByTestId('lab-baseline-$50,000 buy')).toContainText('58.6%')
  await expect(page.getByTestId('lab-baseline-$50,000 sell')).toContainText('36.9%')
  await expect(page.getByTestId('lab-baseline-100k')).toContainText('NOT EXECUTABLE / NOT REGISTERABLE')

  await expect(page.getByTestId('lab-proposed-$10,000 buy')).toContainText('≤ 8%')
  await expect(page.getByTestId('lab-proposed-$50,000 buy')).toContainText('≤ 40%')
  await expect(page.getByTestId('lab-proposed-$50,000 sell')).toContainText('≤ 30%')
  await expect(page.getByTestId('proposed-threshold-status'))
    .toHaveText('PROPOSED — PENDING BUSINESS APPROVAL')

  await expect(page.getByTestId('exp-business-approval')).toHaveText('PENDING')
  await expect(page.getByTestId('exp-baseline-approval')).toHaveText('PENDING')
  await expect(page.getByTestId('exp-intervention')).toHaveText('NOT EXECUTED')
  await expect(page.getByTestId('exp-post-measurement')).toHaveText('DATA UNAVAILABLE')
  await expect(page.getByTestId('exp-measured-result')).toHaveText('DATA UNAVAILABLE')
  // the lab offers no control that could register, approve or execute anything
  const lab = page.locator('.main')
  await expect(lab.locator('button')).toHaveCount(0)
  await expect(lab.locator('input')).toHaveCount(0)
})

test('sections 5 and 6 show the eight evidence steps and the decision status', async ({ page }) => {
  await routeLive(page)
  await page.goto('/')
  await goTo(page, 'Value Improvement Lab')

  for (const [n, item] of [
    [1, 'Registered business-approved thresholds'], [2, 'Approved baseline'], [3, 'Intervention evidence'],
    [4, 'Same measurement methodology'], [5, 'Same method fingerprint'],
    [6, 'New post-intervention measurement'], [7, 'Named human review'], [8, 'Final decision'],
  ] as const) {
    await expect(page.getByTestId(`evidence-step-${n}`)).toContainText(item)
    await expect(page.getByTestId(`evidence-step-${n}`)).toContainText('REQUIRED')
  }

  await expect(page.getByTestId('decision-threshold')).toHaveText('PENDING BUSINESS REVIEW')
  await expect(page.getByTestId('decision-experiment')).toHaveText('READY FOR BUSINESS DECISION')
  await expect(page.getByTestId('decision-intervention')).toHaveText('NOT EXECUTED')
  await expect(page.getByTestId('decision-measured')).toHaveText('DATA UNAVAILABLE')
  await expect(page.getByTestId('decision-final')).toHaveText('NOT DETERMINED')
  await expect(page.getByTestId('qa-continues')).toContainText('Capture further live market evidence')
})

test('section 7 shows a next action per opportunity and what QA already prepared', async ({ page }) => {
  await routeLive(page)
  await page.goto('/')
  await goTo(page, 'Value Improvement Lab')

  const l1 = page.getByTestId('next-action-OPP-L1')
  await expect(l1).toContainText('BLOCKED BY BUSINESS DECISION')
  await expect(l1).toContainText('Obtain business approval for the measurement thresholds')
  await expect(l1).toContainText('Baseline captured from three real runs')
  await expect(l1).toContainText('Evidence traceability available')
  await expect(l1).toContainText('Measurement methodology fixed')
  await expect(l1).toContainText('Governance workflow implemented')
  await expect(l1).toContainText('Post-intervention comparison path ready')

  await expect(page.getByTestId('next-action-OPP-L2')).toContainText('additional verified public source')
  await expect(page.getByTestId('next-action-OPP-L3')).toContainText('DATA INSUFFICIENT')
  await expect(page.getByTestId('next-action-OPP-L4')).toContainText('product telemetry')
})

test('sections 8 and 11 state the ranking context and the week-2 summary', async ({ page }) => {
  await routeLive(page)
  await page.goto('/')
  await goTo(page, 'Value Improvement Lab')

  await expect(page.getByTestId('top100-context'))
    .toContainText('downstream market outcome, not a direct operating KPI')
  await expect(page.getByTestId('top100-context')).toContainText('does not predict or claim ranking improvement')

  const w = page.getByTestId('week2-summary')
  for (const line of [
    'Historical research frozen as reference layer',
    'Current SUT market-state evidence implemented',
    'Source-level evidence traceability implemented',
    'EXP-001 baseline captured from three real runs',
    'Governance workflow implemented',
    'Business threshold decision remains human-controlled',
    'Value Improvement Lab converts evidence into measurable improvement opportunities',
    'No business result is fabricated',
  ]) await expect(w).toContainText(line)
})

test('the lab makes no forbidden claim', async ({ page }) => {
  await routeLive(page)
  await page.goto('/')
  await syncThenLab(page)
  const text = (await page.locator('.main').innerText()).toLowerCase()
  for (const p of [
    'will increase price', 'will improve ranking', 'will reach top 100', 'liquidity improved',
    'adoption increased', 'the intervention succeeded', 'this caused the price increase',
    'this will increase demand', 'this guarantees value', 'target achieved',
  ]) expect(text, `must not contain "${p}"`).not.toContain(p)
})

test('the lab changes nothing in EXP-001 governance or the frozen research', async ({ page }) => {
  await routeLive(page)
  await page.goto('/')
  await syncThenLab(page)

  await goTo(page, 'Pre-Registration')
  await expect(page.getByTestId('nra-registered')).toHaveText('0 of 4')
  await expect(page.getByTestId('nra-approved')).toHaveText('0 of 3')
  await expect(page.getByTestId('intervention-status')).toHaveText('BLOCKED')
  await expect(page.getByTestId('result-status')).toHaveText('NOT AVAILABLE')

  await goTo(page, 'Baseline History')
  await expect(page.locator('.tile').filter({ hasText: 'Approved' })).toContainText('0')
  const r3 = page.locator('tbody tr', { hasText: 'RUN-003' })
  await expect(r3).toContainText('10.64')
  await expect(r3).toContainText('0.412615')

  await goTo(page, 'Proposed Thresholds')
  const p = page.locator('.card', { hasText: 'EXP-001 — governance status' })
  await expect(p.locator('tbody tr').nth(3)).toContainText('PENDING')
  await expect(p.locator('tbody tr').nth(6)).toContainText('BLOCKED')
})

test('no overflow on the lab at tablet and mobile', async ({ page }) => {
  await routeLive(page)
  for (const vp of [{ width: 1024, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp)
    await page.goto('/')
    await syncThenLab(page)
    const scrolls = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    expect(scrolls, `overflow @ ${vp.width}`).toBe(false)
  }
})
