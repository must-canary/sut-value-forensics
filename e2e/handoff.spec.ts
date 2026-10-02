import { test, expect, type Page } from '@playwright/test'

async function goTo(page: Page, screen: string) {
  await page.getByRole('button', { name: screen, exact: true }).click()
  await expect(page.getByRole('heading', { level: 2 })).toContainText(screen)
}

const SIZES = ['$10,000 buy', '$10,000 sell', '$50,000 buy', '$50,000 sell']

test('NEXT REQUIRED ACTION panel states the exact wording', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Pre-Registration')
  const panel = page.locator('.card', { hasText: 'NEXT REQUIRED ACTION' }).first()
  await expect(panel).toContainText('Register four thresholds and approve the baseline before intervention.')
  await expect(panel).toContainText(
    'No intervention or comparison run may proceed until all four thresholds are registered and approved.')
  await expect(panel).toContainText('0 of 4')
  await expect(panel).toContainText('0 of 3')
  await expect(panel).toContainText('Intervention permitted')
})

test('all four registration slots are exposed with their required fields', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Pre-Registration')
  const form = page.locator('.card', { hasText: 'Threshold registration handoff' })
  await expect(form).toContainText('Human author')
  for (const s of SIZES) {
    const row = form.locator('div').filter({ hasText: new RegExp(`^${s.replace(/[$,]/g, '\\$&')}`) }).first()
    await expect(form).toContainText(s)
    void row
  }
  await expect(form.locator('input[type=number]')).toHaveCount(4)
  await expect(form.locator('input[type=checkbox]')).toHaveCount(4)
  await expect(form).toContainText('EXP-001/v1')
})

test('$100K is shown NOT REGISTERABLE with the required wording', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Pre-Registration')
  const form = page.locator('.card', { hasText: 'Threshold registration handoff' })
  await expect(form).toContainText('NOT REGISTERABLE')
  await expect(form).toContainText('current pool cannot execute the standardized size')
  // no numeric input is offered for the unexecutable size
  await expect(form.locator('input[type=number]')).toHaveCount(4)
})

test('registration is refused without author, threshold and independence confirmation', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Pre-Registration')
  const form = page.locator('.card', { hasText: 'Threshold registration handoff' })
  await form.getByRole('button', { name: 'Validate registration' }).first().click()
  await expect(form).toContainText('REFUSED')
  await expect(form).toContainText('a numeric threshold is required')
  await expect(form).toContainText('a named human author is required')
  await expect(form).toContainText('selected independently of RUN-001, RUN-002 and RUN-003')
})

test('a threshold read off a baseline run is refused', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Pre-Registration')
  const form = page.locator('.card', { hasText: 'Threshold registration handoff' })
  await form.getByTestId('author-name').fill('A. Human')
  await form.locator('input[type=number]').first().fill('10.59')   // RUN-001 observed
  await form.locator('input[type=checkbox]').first().check()
  await form.getByRole('button', { name: 'Validate registration' }).first().click()
  await expect(form).toContainText('REFUSED')
  await expect(form).toContainText('matches an observed baseline value')
})

test('registration is refused without a written rationale', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Pre-Registration')
  const form = page.locator('.card', { hasText: 'Threshold registration handoff' })
  await form.getByTestId('author-name').fill('A. Human')
  await form.locator('input[type=number]').first().fill('4')
  await form.locator('input[type=checkbox]').first().check()
  await form.getByRole('button', { name: 'Validate registration' }).first().click()
  await expect(form).toContainText('written rationale is required')
})

test('a complete, independent proposal is admissible but NOT committed', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Pre-Registration')
  const form = page.locator('.card', { hasText: 'Threshold registration handoff' })
  await form.getByTestId('author-name').fill('A. Human')
  await form.locator('input[type=number]').first().fill('4')
  await form.locator('input[type=checkbox]').first().check()
  await form.getByLabel('rationale for $10,000 buy').fill('Set from peer depth targets before any comparison run.')
  await form.getByRole('button', { name: 'Validate registration' }).first().click()
  await expect(form).toContainText('ADMISSIBLE — not yet committed')
  await expect(form).toContainText('A. Human')
  await expect(form).toContainText('EXP-001/v1')
  await expect(form).toContainText('Independence confirmed')
  // the stored slot is unchanged
  await expect(form).toContainText('AWAITING HUMAN ENTRY')
  const panel = page.locator('.card', { hasText: 'NEXT REQUIRED ACTION' }).first()
  await expect(panel).toContainText('0 of 4')
})

test('baseline review actions exist for RUN-001, RUN-002 and RUN-003', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline History')
  const rev = page.locator('.card', { hasText: 'Baseline review handoff' })
  for (const r of ['RUN-001', 'RUN-002', 'RUN-003']) await expect(rev).toContainText(r)
  await expect(rev.getByRole('button', { name: 'ACCEPT baseline' })).toHaveCount(3)
  await expect(rev.getByRole('button', { name: 'REJECT baseline' })).toHaveCount(3)
})

test('approval is refused without a named reviewer', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline History')
  const rev = page.locator('.card', { hasText: 'Baseline review handoff' })
  await rev.getByRole('button', { name: 'ACCEPT baseline' }).first().click()
  await expect(rev).toContainText('REFUSED')
  await expect(rev).toContainText('approval is never automatic')
})

test('a rejection without a reason is refused', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline History')
  const rev = page.locator('.card', { hasText: 'Baseline review handoff' })
  await rev.getByTestId('reviewer-name').fill('A. Human')
  await rev.getByRole('button', { name: 'REJECT baseline' }).first().click()
  await expect(rev).toContainText('rejection requires a stated reason')
})

test('a named accept is admissible but leaves the run PENDING', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline History')
  const rev = page.locator('.card', { hasText: 'Baseline review handoff' })
  await rev.getByTestId('reviewer-name').fill('A. Human')
  await rev.getByRole('button', { name: 'ACCEPT baseline' }).first().click()
  await expect(rev).toContainText('ADMISSIBLE — not yet committed')
  await expect(rev).toContainText('A. Human')
  await expect(rev).toContainText('stays PENDING in this build')
  await expect(page.locator('.tile').filter({ hasText: 'Approved' })).toContainText('0')
})

test('experiment stage and attribution are preserved', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Baseline History')
  await expect(page.locator('.card', { hasText: 'Experiment timeline' }))
    .toContainText('Current stage: BASELINE COLLECTION')
  await expect(page.locator('.nav .attribution')).toHaveText('Created & Idea by Magha Ram')
  const text = (await page.locator('.main').innerText()).toLowerCase()
  expect(text).not.toContain('experiment succeeded')
  expect(text).not.toContain('experiment failed')
})

for (const vp of [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'tablet-1024', width: 1024, height: 900 },
  { name: 'mobile-390', width: 390, height: 844 },
]) {
  test(`handoff surfaces have no overflow @ ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/')
    for (const s of ['Pre-Registration', 'Baseline History']) {
      await goTo(page, s)
      const scrolls = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
      expect(scrolls, `${s} scrolls horizontally @ ${vp.name}`).toBe(false)
      await expect(page.locator('.card', { hasText: 'NEXT REQUIRED ACTION' }).first()).toBeVisible()
      await expect(page.locator('.nav .attribution')).toBeVisible()
    }
  })
}
