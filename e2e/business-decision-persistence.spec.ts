import { test, expect, type Page } from '@playwright/test'

const KEY = 'sut-value-forensics:exp-001:business-decision:v1'
const SIZES = ['$10,000 buy', '$10,000 sell', '$50,000 buy', '$50,000 sell']

async function open(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Proposed Thresholds', exact: true }).click()
  await expect(page.getByRole('heading', { level: 2 })).toContainText('Proposed Thresholds')
  return page.locator('.card', { hasText: 'Business Decision Input' })
}

async function reopen(page: Page) {
  await page.reload()
  return open(page)
}

async function fillAll(page: Page, value = '8') {
  const c = page.locator('.card', { hasText: 'Business Decision Input' })
  for (const s of SIZES) {
    await c.getByLabel(`business threshold for ${s}`).fill(value)
    await c.getByLabel(`business rationale for ${s}`).fill(`tolerance ${s}`)
  }
  await c.getByTestId('bd-reviewer').fill('B. Owner')
  await c.getByTestId('bd-note').fill('approved at EOD review')
  return c
}

test('saved business input survives a browser refresh', async ({ page }) => {
  let c = await open(page)
  await fillAll(page, '7.5')
  await c.getByRole('button', { name: 'Save Business Proposal' }).click()
  await expect(c).toContainText('BUSINESS INPUT SAVED')

  c = await reopen(page)
  for (const s of SIZES) {
    await expect(c.getByLabel(`business threshold for ${s}`)).toHaveValue('7.5')
    await expect(c.getByLabel(`business rationale for ${s}`)).toHaveValue(`tolerance ${s}`)
  }
  await expect(c.getByTestId('bd-reviewer')).toHaveValue('B. Owner')
  await expect(c.getByTestId('bd-note')).toHaveValue('approved at EOD review')

  // saved is still NOT approved, and nothing is unlocked
  const p = page.locator('.card', { hasText: 'EXP-001 — governance status' })
  await expect(p.locator('tbody tr').nth(2)).toContainText('SAVED')
  await expect(p.locator('tbody tr').nth(3)).toContainText('PENDING')
  await expect(p.locator('tbody tr').nth(6)).toContainText('BLOCKED')
  await expect(page.getByTestId('bd-version')).toHaveText('EXP-001/v1')
  await expect(c.getByLabel('business threshold for $10,000 buy')).toBeEnabled()
})

test('approval, reviewer, timestamp and fingerprint survive a refresh and stay locked', async ({ page }) => {
  let c = await open(page)
  await fillAll(page)
  await c.getByLabel('confirm approval').check()
  await c.getByRole('button', { name: 'Approve & Lock Thresholds' }).click()
  const fp = await c.locator('tr', { hasText: 'Fingerprint' }).locator('td').nth(1).innerText()
  const at = await page.getByTestId('bd-approved-at').innerText()
  expect(fp).toMatch(/^BA-EXP-001\/v1-[0-9a-f]{8}$/)

  c = await reopen(page)
  const p = page.locator('.card', { hasText: 'EXP-001 — governance status' })
  await expect(p.locator('tbody tr').nth(3)).toContainText('APPROVED')
  await expect(page.getByTestId('bd-reviewer-value')).toHaveText('B. Owner')
  await expect(page.getByTestId('bd-approved-at')).toHaveText(at)
  await expect(page.getByTestId('bd-locked')).toContainText('YES')
  await expect(c.locator('tr', { hasText: 'Fingerprint' }).locator('td').nth(1)).toHaveText(fp)

  // restored values are exact, and every field stays locked
  for (const s of SIZES) {
    await expect(c.getByLabel(`business threshold for ${s}`)).toHaveValue('8')
    await expect(c.getByLabel(`business threshold for ${s}`)).toBeDisabled()
    await expect(c.getByLabel(`business rationale for ${s}`)).toBeDisabled()
  }
  await expect(c.getByTestId('bd-reviewer')).toBeDisabled()
  await expect(c.getByTestId('bd-note')).toBeDisabled()
  await expect(c.getByRole('button', { name: 'Save Business Proposal' })).toBeDisabled()
  await expect(c.getByRole('button', { name: 'Approve & Lock Thresholds' })).toBeDisabled()

  // and governance is untouched by the restored approval
  await expect(p.locator('tbody tr').nth(4)).toContainText('PENDING')
  await expect(p.locator('tbody tr').nth(5)).toContainText('PENDING')
  await expect(p.locator('tbody tr').nth(6)).toContainText('BLOCKED')
  await expect(p.locator('tbody tr').nth(7)).toContainText('NOT AVAILABLE')
})

test('audit history is persisted and a new proposal does not overwrite the old approval', async ({ page }) => {
  let c = await open(page)
  await fillAll(page)
  await c.getByLabel('confirm approval').check()
  await c.getByRole('button', { name: 'Approve & Lock Thresholds' }).click()
  const fp = await c.locator('tr', { hasText: 'Fingerprint' }).locator('td').nth(1).innerText()

  c = await reopen(page)
  const h = page.locator('.card', { hasText: 'Decision audit history' })
  await expect(h.locator('tbody tr')).toHaveCount(1)
  await expect(h.locator('tbody tr').nth(0)).toContainText('BUSINESS_APPROVED')
  await expect(h.locator('tbody tr').nth(0)).toContainText(fp)
  await expect(h.locator('tbody tr').nth(0)).toContainText('OK')

  await c.getByRole('button', { name: 'Create New Proposal' }).click()
  await expect(h.locator('tbody tr')).toHaveCount(2)
  await expect(h.locator('tbody tr').nth(0)).toContainText('BUSINESS_APPROVED')
  await expect(h.locator('tbody tr').nth(0)).toContainText(fp)       // v1 untouched
  await expect(h.locator('tbody tr').nth(1)).toContainText('PROPOSED')

  // v2 is editable, unapproved, and must be approved on its own
  c = await reopen(page)
  await expect(page.getByTestId('bd-version')).toHaveText('EXP-001/v2')
  await expect(page.getByTestId('bd-locked')).toContainText('NO')
  await expect(c.getByLabel('business threshold for $10,000 buy')).toBeEnabled()
  await expect(c.getByLabel('business threshold for $10,000 buy')).toHaveValue('')
  await c.getByRole('button', { name: 'Approve & Lock Thresholds' }).click()
  await expect(c).toContainText('REFUSED')
  await expect(c).toContainText('a threshold value is required')

  await fillAll(page, '9')
  await c.getByLabel('confirm approval').check()
  await c.getByRole('button', { name: 'Approve & Lock Thresholds' }).click()
  await expect(c.locator('tr', { hasText: 'Fingerprint' }).locator('td').nth(1))
    .not.toHaveText(fp)
  await expect(page.locator('.card', { hasText: 'Decision audit history' }).locator('tbody tr').nth(0))
    .toContainText(fp)
})

test('locally manipulated storage is rejected, never accepted as approval', async ({ page }) => {
  const c = await open(page)
  await fillAll(page)
  await c.getByLabel('confirm approval').check()
  await c.getByRole('button', { name: 'Approve & Lock Thresholds' }).click()
  await expect(c).toContainText('BUSINESS APPROVED & LOCKED')

  await page.evaluate((key) => {
    const l = JSON.parse(localStorage.getItem(key)!)
    l.versions[0].thresholds[0].value = 99
    localStorage.setItem(key, JSON.stringify(l))
  }, KEY)

  const c2 = await reopen(page)
  const p = page.locator('.card', { hasText: 'EXP-001 — governance status' })
  await expect(p).toContainText('INTEGRITY FAILURE')
  await expect(page.getByTestId('bd-locked')).toContainText('NO')
  await expect(p.locator('tbody tr').nth(3)).toContainText('PENDING')
  await expect(p.locator('tbody tr').nth(6)).toContainText('BLOCKED')
  await expect(c2).not.toContainText('Approval record (auditable)')
  await expect(page.locator('.card', { hasText: 'Decision audit history' }).locator('tbody tr').nth(0))
    .toContainText('TAMPERED')
})

test('an injected $100K threshold is stripped on load', async ({ page }) => {
  const c = await open(page)
  await fillAll(page)
  await c.getByRole('button', { name: 'Save Business Proposal' }).click()
  await page.evaluate((key) => {
    const l = JSON.parse(localStorage.getItem(key)!)
    l.versions[0].thresholds.push({
      size: '$100,000 (both sides)', value: 50, rationale: 'injected',
      metric: 'm', direction: 'LOWER_IS_BETTER',
    })
    localStorage.setItem(key, JSON.stringify(l))
  }, KEY)

  const c2 = await reopen(page)
  await expect(c2.locator('input[type=number]')).toHaveCount(4)
  await expect(c2).not.toContainText('injected')
  await expect(c2.locator('tbody tr', { hasText: '$100,000' })).toContainText('NOT EXECUTABLE')
  const r = page.locator('.card', { hasText: 'Run Experiment' })
  await expect(r.locator('tbody tr', { hasText: '$100,000' })).toContainText('NOT EXECUTABLE')
})

test('a restored approval registers nothing in pre-registration or governance', async ({ page }) => {
  const c = await open(page)
  await fillAll(page)
  await c.getByLabel('confirm approval').check()
  await c.getByRole('button', { name: 'Approve & Lock Thresholds' }).click()
  await reopen(page)

  await page.getByRole('button', { name: 'Pre-Registration', exact: true }).click()
  await expect(page.locator('.tile').filter({ hasText: 'Awaiting human entry' })).toContainText('4')
  await expect(page.locator('.tile').filter({ hasText: 'Registration complete' })).toContainText('NO')

  // the timeline card also names NEXT REQUIRED ACTION; scope by a row unique to the handoff card
  const next = page.locator('.card', { hasText: 'Intervention permitted' })
  await expect(next.locator('tr', { hasText: 'Intervention permitted' })).toContainText('NO')
  await expect(next).toContainText('both gates outstanding')
})
