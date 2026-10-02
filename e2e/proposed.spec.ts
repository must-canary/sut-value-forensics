import { test, expect, type Page } from '@playwright/test'

async function goTo(page: Page, s: string) {
  await page.getByRole('button', { name: s, exact: true }).click()
  await expect(page.getByRole('heading', { level: 2 })).toContainText(s)
}

test('status panel shows the required five lines', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  await page.goto('/')
  await goTo(page, 'Proposed Thresholds')
  // single derived panel; rows asserted by position so "Baseline" cannot match "Baseline Approval"
  const rows = page.locator('.card', { hasText: 'EXP-001 — governance status' }).locator('tbody tr')
  await expect(rows.nth(0)).toContainText('COMPLETE')        // Baseline
  await expect(rows.nth(1)).toContainText('PRESENT')         // Proposed Thresholds
  await expect(rows.nth(3)).toContainText('PENDING')         // Business Approval
  await expect(rows.nth(6)).toContainText('BLOCKED')         // Intervention
  await expect(rows.nth(7)).toContainText('NOT AVAILABLE')   // Result
  expect(errs, errs.join('\n')).toHaveLength(0)
})

test('all four proposals render as PROPOSED / PENDING', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Proposed Thresholds')
  const c = page.locator('.card', { hasText: 'Working proposals' })
  for (const [size, val] of [['$10,000 buy', '8'], ['$10,000 sell', '8'], ['$50,000 buy', '40'], ['$50,000 sell', '30']]) {
    const row = c.locator('tbody tr', { hasText: size! })
    await expect(row).toContainText(`≤ ${val}%`)
    await expect(row).toContainText('PROPOSED')
    await expect(row).toContainText('PENDING')
  }
})

test('proposals are labelled as not unlocking anything', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Proposed Thresholds')
  await expect(page.locator('.main')).toContainText('PROPOSED / PENDING BUSINESS APPROVAL')
  await expect(page.locator('.main')).toContainText('not registered thresholds')
  await expect(page.locator('.main')).toContainText('not a business-approved target')
})

test('$100K shows NOT EXECUTABLE with no proposed value', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Proposed Thresholds')
  const row = page.locator('tbody tr', { hasText: '$100,000' }).first()
  await expect(row).toContainText('NOT EXECUTABLE')
  await expect(row).toContainText('no value is modelled or backfilled')
})

test('EOD handoff lists four questions, all awaiting input', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Proposed Thresholds')
  const h = page.locator('.card', { hasText: 'EOD business input handoff' })
  await expect(h).toContainText('Baseline evidence is complete. Intervention is pending business-approved success thresholds.')
  await expect(h).toContainText('May the proposed working thresholds')
  expect(await h.locator('tbody tr').count()).toBe(4)
  expect(await h.getByText('AWAITING BUSINESS INPUT').count()).toBeGreaterThanOrEqual(5)
  await expect(h).toContainText('no named business responder')
  await expect(h).toContainText('Outstanding (6)')
})

test('pre-registration remains unregistered and intervention blocked', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Pre-Registration')
  await expect(page.locator('.tile').filter({ hasText: 'Awaiting human entry' })).toContainText('4')
  await expect(page.locator('.tile').filter({ hasText: 'Registration complete' })).toContainText('NO')
  await expect(page.locator('.card', { hasText: 'NEXT REQUIRED ACTION' }).first()).toContainText('0 of 4')
})

test('no overflow at mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await goTo(page, 'Proposed Thresholds')
  const scrolls = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  expect(scrolls).toBe(false)
  await expect(page.locator('.nav .attribution')).toBeVisible()
})
