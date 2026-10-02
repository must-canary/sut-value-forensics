import { test, expect, type Page } from '@playwright/test'

async function open(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Proposed Thresholds', exact: true }).click()
  await expect(page.getByRole('heading', { level: 2 })).toContainText('Proposed Thresholds')
}

const SIZES = ['$10,000 buy', '$10,000 sell', '$50,000 buy', '$50,000 sell']

async function fillAll(page: Page) {
  const c = page.locator('.card', { hasText: 'Business Decision Input' })
  for (const s of SIZES) {
    await c.getByLabel(`business threshold for ${s}`).fill('8')
    await c.getByLabel(`business rationale for ${s}`).fill('business tolerance')
  }
  await c.getByTestId('bd-reviewer').fill('B. Owner')
  await c.getByTestId('bd-note').fill('approved at EOD review')
  return c
}

test('business input section renders with four inputs and no $100K slot', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  await open(page)
  const c = page.locator('.card', { hasText: 'Business Decision Input' })
  await expect(c).toBeVisible()
  await expect(c.locator('input[type=number]')).toHaveCount(4)
  for (const s of SIZES) await expect(c.getByLabel(`business rationale for ${s}`)).toBeVisible()
  await expect(c).toContainText('NOT EXECUTABLE')
  await expect(c).toContainText('no threshold input is offered')
  expect(errs, errs.join('\n')).toHaveLength(0)
})

test('status panel is derived and shows the eight lines', async ({ page }) => {
  await open(page)
  const p = page.locator('.card', { hasText: 'EXP-001 — governance status' })
  // fixed row order; label and value asserted per row so "Baseline" cannot match "Baseline Approval"
  const expected: Array<[string, string]> = [
    ['Baseline', 'COMPLETE'], ['Proposed Thresholds', 'PRESENT'], ['Business Input', 'PENDING'],
    ['Business Approval', 'PENDING'], ['Threshold Registration', 'PENDING'],
    ['Baseline Approval', 'PENDING'], ['Intervention', 'BLOCKED'], ['Result', 'NOT AVAILABLE'],
  ]
  const rows = p.locator('tbody tr')
  await expect(rows).toHaveCount(expected.length)
  for (let i = 0; i < expected.length; i++) {
    await expect(rows.nth(i)).toContainText(expected[i]![0])
    await expect(rows.nth(i)).toContainText(expected[i]![1])
  }
  await expect(p).toContainText('PROPOSED')
})

test('approval refused when incomplete', async ({ page }) => {
  await open(page)
  const c = page.locator('.card', { hasText: 'Business Decision Input' })
  await c.getByRole('button', { name: 'Approve & Lock Thresholds' }).click()
  await expect(c).toContainText('REFUSED')
  await expect(c).toContainText('a threshold value is required')
  await expect(c).toContainText('business reviewer name is required')
  await expect(c).toContainText('explicitly confirm')
})

test('invalid value refused', async ({ page }) => {
  await open(page)
  const c = await fillAll(page)
  await c.getByLabel('business threshold for $10,000 buy').fill('-5')
  await c.getByLabel('confirm approval').check()
  await c.getByRole('button', { name: 'Approve & Lock Thresholds' }).click()
  await expect(c).toContainText('must be a positive number')
})

test('Save does not approve and does not unlock', async ({ page }) => {
  await open(page)
  const c = await fillAll(page)
  await c.getByRole('button', { name: 'Save Business Proposal' }).click()
  await expect(c).toContainText('BUSINESS INPUT SAVED')
  await expect(c).toContainText('not approval and unlocks nothing')
  const p = page.locator('.card', { hasText: 'EXP-001 — governance status' })
  await expect(p.locator('tbody tr').nth(2)).toContainText('SAVED')
  await expect(p.locator('tbody tr').nth(3)).toContainText('PENDING')
  await expect(p.locator('tbody tr').nth(6)).toContainText('BLOCKED')
})

test('approve creates an auditable record but does NOT register or unlock', async ({ page }) => {
  await open(page)
  const c = await fillAll(page)
  await c.getByLabel('confirm approval').check()
  await c.getByRole('button', { name: 'Approve & Lock Thresholds' }).click()
  await expect(c).toContainText('BUSINESS APPROVED & LOCKED')
  await expect(c).toContainText('does NOT register the threshold')
  await expect(c).toContainText('Approval record (auditable)')
  await expect(c).toContainText('B. Owner')
  await expect(c).toContainText('EXP-001/v1')
  await expect(c.locator('tr', { hasText: 'Fingerprint' })).toContainText('BA-EXP-001/v1-')
  await expect(c.locator('tr', { hasText: 'Registers threshold' })).toContainText('NO')
  const p = page.locator('.card', { hasText: 'EXP-001 — governance status' })
  await expect(p.locator('tbody tr').nth(3)).toContainText('APPROVED')
  await expect(p.locator('tbody tr').nth(4)).toContainText('PENDING')
  await expect(p.locator('tbody tr').nth(6)).toContainText('BLOCKED')
  await expect(p).toContainText('BUSINESS_APPROVED')
})

test('after approval fields are LOCKED and uneditable', async ({ page }) => {
  await open(page)
  const c = await fillAll(page)
  await c.getByLabel('confirm approval').check()
  await c.getByRole('button', { name: 'Approve & Lock Thresholds' }).click()
  await expect(c).toContainText('LOCKED')
  await expect(c.getByLabel('business threshold for $10,000 buy')).toBeDisabled()
  await expect(c.getByLabel('business rationale for $10,000 buy')).toBeDisabled()
  await expect(c.getByTestId('bd-reviewer')).toBeDisabled()
  await expect(c.getByRole('button', { name: 'Approve & Lock Thresholds' })).toBeDisabled()
  await expect(c).toContainText('requires a new experiment version')
})

test('Run Experiment is blocked and offers no actual-result input', async ({ page }) => {
  await open(page)
  const r = page.locator('.card', { hasText: 'Run Experiment' })
  await expect(r).toContainText('BLOCKED')
  await expect(r).toContainText('Business approval alone does not unlock the experiment')
  await expect(r.locator('input')).toHaveCount(0)
  await expect(r).toContainText('no field for entering an actual result')
  for (const s of SIZES) {
    await expect(r.locator('tbody tr', { hasText: s })).toContainText('NOT AVAILABLE')
  }
  await expect(r.locator('tbody tr', { hasText: '$100,000' })).toContainText('NOT EXECUTABLE')
})

test('existing pre-registration remains authoritative and unregistered', async ({ page }) => {
  await open(page)
  const c = await fillAll(page)
  await c.getByLabel('confirm approval').check()
  await c.getByRole('button', { name: 'Approve & Lock Thresholds' }).click()
  await page.getByRole('button', { name: 'Pre-Registration', exact: true }).click()
  await expect(page.locator('.tile').filter({ hasText: 'Awaiting human entry' })).toContainText('4')
  await expect(page.locator('.tile').filter({ hasText: 'Registration complete' })).toContainText('NO')
})

test('no overflow at mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page)
  const scrolls = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  expect(scrolls).toBe(false)
  await expect(page.locator('.card', { hasText: 'Business Decision Input' })).toBeVisible()
})
