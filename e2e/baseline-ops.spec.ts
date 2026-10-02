import { test, expect, type Page } from '@playwright/test'

async function goTo(page: Page, screen: string) {
  await page.getByRole('button', { name: screen, exact: true }).click()
  await expect(page.getByRole('heading', { level: 2 })).toContainText(screen)
}

test('Baseline Operations screen renders with no console errors', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })

  await page.goto('/')
  await goTo(page, 'Baseline Operations')
  await expect(page.locator('.card').first()).toBeVisible()
  expect(errs, errs.join('\n')).toHaveLength(0)
})

test('executive roll-up shows the required operational counters', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline Operations')
  const tiles = page.locator('.tile')
  for (const label of [
    'Active experiments', 'Baseline runs captured', 'Capture records', 'Missing / unavailable',
    'Review required', 'Experiments blocked', 'Ready for intervention', '30-day coverage',
  ]) {
    await expect(tiles.filter({ hasText: label }).first()).toBeVisible()
  }
  // nothing may be ready for intervention while every baseline is unreviewed
  await expect(tiles.filter({ hasText: 'Ready for intervention' })).toContainText('0')
})

test('repeated baseline capture is visible — RUN-001 and RUN-002', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline Operations')
  const log = page.locator('.card', { hasText: 'Baseline capture log' })
  await expect(log).toContainText('RUN-001')
  await expect(log).toContainText('RUN-002')
  // the two captures carry genuinely different measured values
  await expect(log).toContainText('0.416396')
  await expect(log).toContainText('0.409377')
})

test('EXP-001 baseline values render with provenance and observation times', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline Operations')
  const log = page.locator('.card', { hasText: 'Baseline capture log' })
  await expect(log.locator('thead')).toContainText('Evidence')
  await expect(log.locator('thead')).toContainText('Observed')
  await expect(log).toContainText('EV-100')
  await expect(log).toContainText('EV-120')
  await expect(log).toContainText('2026-09-30T12:51:21Z')
  await expect(log).toContainText('2026-09-30T13:18:56Z')
})

test('$100K renders NOT EXECUTABLE in every run and never a percentage', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline Operations')
  const rows = page.locator('tr', { hasText: '$100,000 both sides' })
  const n = await rows.count()
  expect(n).toBeGreaterThanOrEqual(3)   // one per captured run
  for (let i = 0; i < n; i++) {
    await expect(rows.nth(i)).toContainText('NOT EXECUTABLE')
    await expect(rows.nth(i)).not.toContainText('129.84')
    await expect(rows.nth(i)).not.toContainText('131.17')
    await expect(rows.nth(i)).not.toContainText('130.55')
  }
})

test('MODELLED labels are preserved on derived readings', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline Operations')
  const log = page.locator('.card', { hasText: 'Baseline capture log' })
  expect(await log.locator('.chip', { hasText: 'MODELLED' }).count()).toBeGreaterThanOrEqual(8)
  // a direct contract read must NOT be labelled modelled
  const spot = log.locator('tr', { hasText: 'Spot price' }).first()
  await expect(spot).not.toContainText('MODELLED')
})

test('DATA UNAVAILABLE states render and CEX spread is not filled from the fee tier', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline Operations')
  const log = page.locator('.card', { hasText: 'Baseline capture log' })
  const spread = log.locator('tr', { hasText: 'CEX bid/ask spread' })
  const sn = await spread.count()
  expect(sn).toBeGreaterThanOrEqual(2)   // RUN-002 and RUN-003
  for (let i = 0; i < sn; i++) {
    await expect(spread.nth(i)).toContainText('DATA UNAVAILABLE')
    await expect(spread.nth(i)).not.toContainText('1 percent')
  }
})

test('30-day coverage shows missing days as DATA UNAVAILABLE without backfill', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline Operations')
  const cov = page.locator('.card', { hasText: '30-day coverage — Spot price' })
  await expect(cov).toBeVisible()
  await expect(cov.locator('.tile').filter({ hasText: 'Days captured' })).toContainText('1')
  await expect(cov.locator('.tile').filter({ hasText: 'Days missing' })).toContainText('29')
  await expect(cov).toContainText('captured days only')
  await expect(cov).toContainText('never backfilled')
  const missing = cov.locator('tbody tr', { hasText: 'DATA UNAVAILABLE' })
  expect(await missing.count()).toBe(29)
  await expect(missing.first()).toContainText('Not backfilled')
})

test('coverage statistics are present and scoped to captured days', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline Operations')
  const cov = page.locator('.card', { hasText: '30-day coverage — Spot price' })
  for (const l of ['Coverage', 'Latest', 'Average', 'Median', 'Min', 'Max']) {
    await expect(cov.locator('.tile').filter({ hasText: l }).first()).toBeVisible()
  }
  // coverage tracks the latest capture of the day (RUN-003)
  await expect(cov.locator('.tile').filter({ hasText: 'Latest' })).toContainText('0.412615')
})

test('EXP-002 exact-timestamp workflow is shown with blocks, drift and exclusions', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline Operations')
  const w = page.locator('.card', { hasText: 'EXP-002 — weekly active addresses' })
  await expect(w).toContainText('2026-W39')
  await expect(w).toContainText('1,423')
  await expect(w).toContainText('EXACT BLOCK')
  await expect(w).toContainText('94,162,485')
  await expect(w).toContainText('94,565,640')
  await expect(w).toContainText('interpolation not used')
  await expect(w).toContainText('never interpolated')
  await expect(w).toContainText('EV-130')
})

test('EXP-002 exclusions are listed and framed as measurement rules, not ownership', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline Operations')
  const w = page.locator('.card', { hasText: 'EXP-002 — weekly active addresses' })
  for (const ex of ['Pool address', 'Router / aggregator', 'Dead address', 'Operational cluster', 'Intra-cluster', 'Fan-out receipts']) {
    await expect(w).toContainText(ex)
  }
  await expect(w).toContainText('UNKNOWN')
  await expect(w).toContainText('not an ownership claim')
  await expect(w).toContainText('Not comparable with CertiK')
})

test('reviewer workflow: no review recorded, actions listed, creator is not a reviewer', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline Operations')
  const r = page.locator('.card', { hasText: 'Human review' })
  await expect(r.locator('.na-box')).toContainText('NO REVIEW RECORDED')
  await expect(r).toContainText('accept baseline')
  await expect(r).toContainText('reject baseline')
  await expect(r).toContainText('request re-measurement')
  await expect(r).toContainText('none configured')
  await expect(r).toContainText('Magha Ram')
  await expect(r).toContainText('not a review identity')
})

test('every capture is PENDING review', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline Operations')
  const log = page.locator('.card', { hasText: 'Baseline capture log' })
  const pending = log.locator('.chip', { hasText: 'PENDING' })
  expect(await pending.count()).toBeGreaterThanOrEqual(20)
  await expect(log.locator('.chip', { hasText: 'ACCEPTED' })).toHaveCount(0)
})

test('no outcome promise on the baseline operations screen', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline Operations')
  const text = (await page.locator('.main').innerText()).toLowerCase()
  for (const p of ['will increase the price', 'will raise the price', 'higher market rank', 'guaranteed']) {
    expect(text, `must not contain "${p}"`).not.toContain(p)
  }
  expect(text).toContain('not market outcomes')
})

test('attribution remains visible alongside the new screen', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline Operations')
  await expect(page.locator('.nav .attribution')).toHaveText('Created & Idea by Magha Ram')
  await goTo(page, 'Settings')
  await expect(page.locator('.card', { hasText: 'About' }).first()).toContainText('Magha Ram')
})

for (const vp of [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'tablet-1024', width: 1024, height: 900 },
  { name: 'mobile-390', width: 390, height: 844 },
]) {
  test(`Baseline Operations has no horizontal overflow @ ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/')
    await goTo(page, 'Baseline Operations')
    const scrolls = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )
    expect(scrolls, `page scrolls horizontally @ ${vp.name}`).toBe(false)
    await expect(page.locator('.tile').first()).toBeVisible()
    await expect(page.locator('.nav .attribution')).toBeVisible()
    await page.screenshot({ path: `e2e/screenshots/${vp.name}/baseline-operations.png`, fullPage: false })
  })
}
