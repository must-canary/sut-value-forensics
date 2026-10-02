import { test, expect, type Page } from '@playwright/test'

async function goTo(page: Page, screen: string) {
  await page.getByRole('button', { name: screen, exact: true }).click()
  await expect(page.getByRole('heading', { level: 2 })).toContainText(screen)
}
async function openExp1(page: Page) {
  await goTo(page, 'Experiment Execution')
  await page.locator('tbody tr', { hasText: 'EXP-001' }).click()
  await expect(page.getByRole('heading', { level: 2 })).toContainText('EXP-001')
}

test('PRE-REGISTRATION REQUIRED is surfaced, not a hidden threshold', async ({ page }) => {
  await page.goto('/')
  await openExp1(page)
  const i = page.locator('.card', { hasText: '6. Interpretation' })
  await expect(i.locator('.chip', { hasText: 'PRE-REGISTRATION REQUIRED' })).toBeVisible()
  await expect(i).toContainText('has NOT been agreed')
  await expect(i).toContainText('never be chosen after a result is seen')
})

test('OPP-01 shows RUNNING in the backlog', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Improvement Backlog')
  const row = page.locator('tbody tr', { hasText: 'OPP-01' })
  await expect(row).toContainText('RUNNING')
  await expect(page.locator('.tile').filter({ hasText: 'Completed' })).toContainText('0')
})

test('Objective section states it does not reconstruct May TVL', async ({ page }) => {
  await page.goto('/')
  await openExp1(page)
  const o = page.locator('.card', { hasText: 'Objective' }).first()
  await expect(o).toContainText('reproducible baseline')
  await expect(o).toContainText('does not')
  await expect(o).toContainText('May 2026 historical TVL')
  await expect(o).toContainText('never substituted')
})

test('KPI Results shows both runs with a method fingerprint', async ({ page }) => {
  await page.goto('/')
  await openExp1(page)
  const k = page.locator('.card', { hasText: 'KPI Results' })
  await expect(k).toContainText('RUN-001')
  await expect(k).toContainText('RUN-002')
  await expect(k).toContainText('NOT EXECUTABLE')
  await expect(k).toContainText('v3-single-active-range')
  await expect(k).toContainText('comparable only when the method fingerprint matches')
})

test('KPI Results never reports a percentage for the unfillable size', async ({ page }) => {
  await page.goto('/')
  await openExp1(page)
  const k = page.locator('.card', { hasText: 'KPI Results' })
  await expect(k).not.toContainText('129.84')
  await expect(k).not.toContainText('131.17')
})

test('liquidity concentration renders DATA UNAVAILABLE with its reason', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline Operations')
  const row = page.locator('tr', { hasText: 'Liquidity concentration' })
  await expect(row).toContainText('DATA UNAVAILABLE')
  await expect(row).toContainText('NonfungiblePositionManager')
  await expect(row).toContainText('EV-131')
})

test('Reports footer carries the attribution with its scope', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Reports')
  const f = page.locator('.report-footer')
  await expect(f).toBeVisible()
  await expect(f.locator('.attribution-line')).toHaveText('Created & Idea by Magha Ram')
  await expect(f).toContainText('not claimed as the attributed author')
})

test('attribution appears in all three places', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.nav .attribution')).toHaveText('Created & Idea by Magha Ram')
  await goTo(page, 'Settings')
  await expect(page.locator('.card', { hasText: 'About' }).first()).toContainText('Magha Ram')
  await goTo(page, 'Reports')
  await expect(page.locator('.report-footer .attribution-line')).toContainText('Magha Ram')
})

test('experiment still has no result despite RUNNING status', async ({ page }) => {
  await page.goto('/')
  await openExp1(page)
  await expect(page.locator('.card', { hasText: '6. Interpretation' })).toContainText('NO RESULT')
  await expect(page.locator('.card', { hasText: '6. Interpretation' })).toContainText('named human reviewer')
})

test('experiment-01 surfaces render at mobile without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await openExp1(page)
  const scrolls = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  expect(scrolls).toBe(false)
  await expect(page.locator('.card', { hasText: 'KPI Results' })).toBeVisible()
  await goTo(page, 'Reports')
  await expect(page.locator('.report-footer')).toBeVisible()
})
