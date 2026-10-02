import { test, expect, type Page } from '@playwright/test'

async function goTo(page: Page, screen: string) {
  await page.getByRole('button', { name: screen, exact: true }).click()
  await expect(page.getByRole('heading', { level: 2 })).toContainText(screen)
}

test('Pre-Registration screen renders with no console errors', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  await page.goto('/')
  await goTo(page, 'Pre-Registration')
  await expect(page.locator('.card').first()).toBeVisible()
  expect(errs, errs.join('\n')).toHaveLength(0)
})

test('all four thresholds await human entry; none is invented', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Pre-Registration')
  await expect(page.locator('.tile').filter({ hasText: 'Awaiting human entry' })).toContainText('4')
  await expect(page.locator('.tile').filter({ hasText: 'Registration complete' })).toContainText('NO')
  for (const size of ['$10,000 buy', '$10,000 sell', '$50,000 buy', '$50,000 sell']) {
    const row = page.locator('tr', { hasText: size }).first()
    await expect(row).toContainText('AWAITING HUMAN ENTRY')
    await expect(row).toContainText('NOT REGISTERED')
  }
})

test('$100K is NOT REGISTERABLE with a stated reason', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Pre-Registration')
  const row = page.locator('tr', { hasText: '$100,000' }).first()
  await expect(row).toContainText('NOT REGISTERABLE')
  await expect(row).toContainText('Cannot be registered')
})

test('a value matching a baseline run is flagged as derivation', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Pre-Registration')
  const row = page.locator('tr', { hasText: '$10,000 buy' }).first()
  await row.locator('input[type=number]').fill('10.59')
  await expect(row).toContainText('matches an observed baseline value')
  await row.locator('input[type=number]').fill('4')
  await expect(row).not.toContainText('matches an observed baseline value')
})

test('the form explicitly states it does not register anything', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Pre-Registration')
  await expect(page.locator('.main')).toContainText('This form does not register anything')
  await expect(page.locator('.main')).toContainText('a reviewer must be configured')
})

test('experiment timeline shows nine stages and the current one', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Pre-Registration')
  const t = page.locator('.card', { hasText: 'Experiment timeline' })
  for (const s of ['PLANNED', 'PRE-REGISTERED', 'BASELINE COLLECTION', 'BASELINE REVIEWED',
    'INTERVENTION', 'COMPARISON CAPTURE', 'RESULT CALCULATED', 'HUMAN REVIEW', 'COMPLETED']) {
    await expect(t.locator('.chip', { hasText: s }).first()).toBeVisible()
  }
  await expect(t).toContainText('Current stage: BASELINE COLLECTION')
})

test('timeline states the next required action and real blockers', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Pre-Registration')
  const t = page.locator('.card', { hasText: 'Experiment timeline' })
  await expect(t).toContainText('Next required action')
  await expect(t).toContainText('register the numeric success thresholds')
  await expect(t).toContainText('No threshold may be derived from RUN-001, RUN-002 or RUN-003')
  await expect(t).toContainText('No intervention has occurred')
  await expect(t).toContainText('baseline collection began before pre-registration')
})

test('Baseline History lists all three captures chronologically', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline History')
  const rows = page.locator('tbody tr')
  await expect(rows.nth(0)).toContainText('RUN-001')
  await expect(rows.nth(1)).toContainText('RUN-002')
  await expect(rows.nth(2)).toContainText('RUN-003')
  await expect(rows.nth(2)).toContainText('94,722,565')
})

test('history shows impact, depth, inventory and spot per run', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline History')
  const head = page.locator('thead').first()
  for (const c of ['Spot', 'SUT inv.', 'USDT inv.', '$10K buy', '$10K sell', '$50K buy', '$50K sell', '$100K']) {
    await expect(head).toContainText(c)
  }
  const r3 = page.locator('tbody tr', { hasText: 'RUN-003' })
  await expect(r3).toContainText('0.412615')
  await expect(r3).toContainText('99,064.97')
  await expect(r3).toContainText('10.64')
})

test('history distinguishes MEASURED, NOT EXECUTABLE and DATA UNAVAILABLE', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline History')
  const r3 = page.locator('tbody tr', { hasText: 'RUN-003' })
  await expect(r3).toContainText('NOT EXECUTABLE')
  await expect(r3.locator('.chip', { hasText: 'MODELLED' }).first()).toBeVisible()
  await expect(page.locator('.main')).toContainText('NOT EXECUTABLE')
})

test('human review is required and none is recorded', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline History')
  const r = page.locator('.card', { hasText: 'A run becomes an approved baseline' })
  await expect(r.locator('.na-box')).toContainText('NO REVIEW RECORDED')
  await expect(r).toContainText('ACCEPT')
  await expect(r).toContainText('REJECT')
  await expect(r).toContainText('record review timestamp')
  await expect(page.locator('.tile').filter({ hasText: 'Approved' })).toContainText('0')
})

test('no result is shown and no outcome is promised', async ({ page }) => {
  await page.goto('/')
  for (const s of ['Pre-Registration', 'Baseline History']) {
    await goTo(page, s)
    const text = (await page.locator('.main').innerText()).toLowerCase()
    for (const p of ['will increase the price', 'higher market rank', 'guaranteed', 'experiment succeeded']) {
      expect(text, `${s} must not contain "${p}"`).not.toContain(p)
    }
  }
  await goTo(page, 'Baseline History')
  await expect(page.locator('.main')).toContainText('No capture implies a result')
})

for (const vp of [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'tablet-1024', width: 1024, height: 900 },
  { name: 'mobile-390', width: 390, height: 844 },
]) {
  test(`pre-registration and history have no overflow @ ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/')
    for (const s of ['Pre-Registration', 'Baseline History']) {
      await goTo(page, s)
      const scrolls = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
      expect(scrolls, `${s} scrolls horizontally @ ${vp.name}`).toBe(false)
      await expect(page.locator('.nav .attribution')).toBeVisible()
      await page.screenshot({
        path: `e2e/screenshots/${vp.name}/${s.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`,
        fullPage: false,
      })
    }
  })
}
