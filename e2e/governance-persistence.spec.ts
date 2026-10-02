/**
 * End-to-end persistence of the governance chain, proven with real browser
 * reloads (page.reload()), not with in-memory state.
 *
 * Nothing in this suite fabricates measured data: no intervention is recorded
 * as having happened, no comparison measurement is entered and no experiment
 * result is produced. Where a stage cannot proceed, the test asserts the gate.
 */
import { test, expect, type Page } from '@playwright/test'

const GOV_KEY = 'sut-value-forensics:exp-001:governance:v1'
const SIZES = ['$10,000 buy', '$10,000 sell', '$50,000 buy', '$50,000 sell']

async function goTo(page: Page, screen: string) {
  await page.getByRole('button', { name: screen, exact: true }).click()
  await expect(page.getByRole('heading', { level: 2 })).toContainText(screen)
}

/** STEP 1–2: a business owner saves and approves thresholds. */
async function businessApprove(page: Page, value = '8') {
  await goTo(page, 'Proposed Thresholds')
  const c = page.locator('.card', { hasText: 'Business Decision Input' })
  for (const s of SIZES) {
    await c.getByLabel(`business threshold for ${s}`).fill(value)
    await c.getByLabel(`business rationale for ${s}`).fill('within business tolerance')
  }
  await c.getByTestId('bd-reviewer').fill('B. Owner')
  await c.getByTestId('bd-note').fill('approved at EOD review')
  await c.getByLabel('confirm approval').check()
  await c.getByRole('button', { name: 'Approve & Lock Thresholds' }).click()
  await expect(c).toContainText('BUSINESS APPROVED & LOCKED')
}

const regCard = (page: Page) => page.locator('.card', { hasText: 'Threshold registration handoff' })

/** STEP 6–7: a named human registers one threshold. */
async function registerOne(page: Page, size: string, value?: string, author = 'A. Human') {
  const form = regCard(page)
  await form.getByTestId('author-name').fill(author)
  if (value !== undefined) await form.getByLabel(`threshold for ${size}`).fill(value)
  await form.getByLabel(`independence confirmation for ${size}`).check()
  await form.getByLabel(`rationale for ${size}`).fill('set from peer depth targets before any comparison run')
  await form.getByTestId(`register-${size}`).click()
}

test('STEP 1-5: an approved business threshold survives reload and pre-fills registration without registering it', async ({ page }) => {
  await page.goto('/')
  await businessApprove(page)

  await page.reload()                                   // STEP 3
  await goTo(page, 'Proposed Thresholds')               // STEP 4
  await expect(page.locator('.card', { hasText: 'Business Decision Input' }))
    .toContainText('Approval record (auditable)')
  await expect(page.getByTestId('bd-locked')).toContainText('YES')

  await goTo(page, 'Pre-Registration')                  // STEP 5
  const form = regCard(page)
  await expect(form.getByTestId('business-ref')).toContainText('approved by B. Owner')
  for (const s of SIZES) {
    await expect(form.getByTestId(`business-value-${s}`)).toHaveText('8.00%')
    await expect(form.getByLabel(`threshold for ${s}`)).toHaveValue('8')
    await expect(form.getByTestId(`slot-${s}`)).toContainText('AWAITING HUMAN ENTRY')
  }
  // prefill is NOT registration
  await expect(page.getByTestId('nra-registered')).toHaveText('0 of 4')
  await expect(page.locator('.tile').filter({ hasText: 'Registration complete' })).toContainText('NO')
  await expect(form).toContainText('A business approval is not a registration')
})

test('STEP 6-9: a committed registration survives reload with all its metadata', async ({ page }) => {
  await page.goto('/')
  await businessApprove(page)
  await goTo(page, 'Pre-Registration')
  await registerOne(page, '$10,000 buy')

  const before = regCard(page)
  await expect(before.getByTestId('registered-at-$10,000 buy')).not.toBeEmpty()
  const at = await before.getByTestId('registered-at-$10,000 buy').innerText()

  await page.reload()                                   // STEP 8
  await goTo(page, 'Pre-Registration')
  const form = regCard(page)                            // STEP 9
  await expect(form.getByTestId('slot-$10,000 buy')).toContainText('REGISTERED')
  await expect(form.getByTestId('registered-threshold-$10,000 buy')).toHaveText('8 percent')
  await expect(form.getByTestId('registered-author-$10,000 buy')).toHaveText('A. Human')
  await expect(form.getByTestId('registered-at-$10,000 buy')).toHaveText(at)
  await expect(form.getByTestId('slot-$10,000 buy')).toContainText('EXP-001/v1')
  await expect(form.getByTestId('slot-$10,000 buy')).toContainText('Independence confirmed')

  // the slot cannot silently revert, and cannot be edited
  await expect(form.getByLabel('threshold for $10,000 buy')).toHaveCount(0)
  await expect(form.getByTestId('register-$10,000 buy')).toHaveCount(0)
  await expect(page.locator('.tile').filter({ hasText: 'Registered' })).toContainText('1')
  await expect(page.getByTestId('nra-registered')).toHaveText('1 of 4')

  // audit history carries the record
  const hist = page.locator('.card', { hasText: 'Registration audit history' })
  await expect(hist.locator('tbody tr')).toHaveCount(1)
  await expect(hist.locator('tbody tr').nth(0)).toContainText('EXP-001/v1')
  await expect(hist.locator('tbody tr').nth(0)).toContainText('A. Human')
  await expect(hist.locator('tbody tr').nth(0)).toContainText('OK')
  await expect(hist.locator('tbody tr').nth(0)).toContainText('REGISTERED')

  // and the screen's own summary fields are derived, not hard-coded
  const fields = page.locator('.card', { hasText: 'Registration record fields' })
  await expect(fields.getByTestId('record-reviewer')).toHaveText('A. Human')
  await expect(fields.getByTestId('record-threshold')).toContainText('$10,000 buy: 8%')
})

test('registration is refused without the human requirements, and nothing is persisted', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Pre-Registration')
  const form = regCard(page)
  await form.getByLabel('threshold for $10,000 buy').fill('4')
  await form.getByTestId('register-$10,000 buy').click()
  await expect(form.getByTestId('slot-$10,000 buy')).toContainText('REGISTRATION REFUSED')
  await expect(form.getByTestId('slot-$10,000 buy')).toContainText('a named human author is required')
  await expect(form.getByTestId('slot-$10,000 buy')).toContainText('a written rationale is required')
  await expect(form.getByTestId('slot-$10,000 buy')).toContainText('selected independently')

  // a value read off a baseline run is refused too
  await form.getByTestId('author-name').fill('A. Human')
  await form.getByLabel('threshold for $10,000 buy').fill('10.59')
  await form.getByLabel('independence confirmation for $10,000 buy').check()
  await form.getByLabel('rationale for $10,000 buy').fill('r')
  await form.getByTestId('register-$10,000 buy').click()
  await expect(form.getByTestId('slot-$10,000 buy')).toContainText('matches an observed baseline value')

  await page.reload()
  await goTo(page, 'Pre-Registration')
  await expect(regCard(page).getByTestId('slot-$10,000 buy')).toContainText('AWAITING HUMAN ENTRY')
  await expect(page.getByTestId('nra-registered')).toHaveText('0 of 4')
  await expect(page.locator('.card', { hasText: 'Registration audit history' }))
    .toContainText('NO REGISTRATION RECORDED')
})

test('STEP 10: all four registered + an approved baseline open the intervention gate, and it survives reload', async ({ page }) => {
  await page.goto('/')
  await businessApprove(page)
  await goTo(page, 'Pre-Registration')
  for (const s of SIZES) await registerOne(page, s)

  await expect(page.getByTestId('nra-registered')).toHaveText('4 of 4')
  await expect(page.locator('.tile').filter({ hasText: 'Registration complete' })).toContainText('YES')
  // registration alone does not open the intervention gate
  await expect(page.getByTestId('nra-intervention')).toContainText('NO')
  await expect(page.getByTestId('intervention-status')).toHaveText('BLOCKED')
  await expect(page.getByTestId('gate-action')).toContainText('approve one of the captured baseline runs')

  // a named human approves one captured baseline run
  await goTo(page, 'Baseline History')
  const rev = page.locator('.card', { hasText: 'Baseline review handoff' })
  await rev.getByTestId('reviewer-name').fill('B. Reviewer')
  await rev.locator('[data-testid="run-RUN-001"]').getByRole('button', { name: 'ACCEPT baseline' }).click()
  await expect(rev).toContainText('ADMISSIBLE — not yet committed')
  await expect(page.locator('.tile').filter({ hasText: 'Approved' })).toContainText('0')  // still not committed
  await rev.getByTestId('commit-review-RUN-001').click()

  await page.reload()
  await goTo(page, 'Baseline History')
  const rev2 = page.locator('.card', { hasText: 'Baseline review handoff' })
  await expect(rev2.getByTestId('review-action-RUN-001')).toHaveText('APPROVE')
  await expect(rev2.getByTestId('review-reviewer-RUN-001')).toHaveText('B. Reviewer')
  await expect(rev2.getByTestId('review-at-RUN-001')).not.toBeEmpty()
  await expect(page.locator('.tile').filter({ hasText: 'Approved' })).toContainText('1')
  await expect(page.locator('tbody tr', { hasText: 'RUN-001' }).first()).toContainText('APPROVED')
  await expect(page.locator('tbody tr', { hasText: 'RUN-002' }).first()).toContainText('PENDING')
  await expect(page.getByTestId('nra-approved')).toHaveText('1 of 3')
  await expect(page.getByTestId('nra-intervention')).toContainText('AWAITING HUMAN RECORD')

  // a committed review is immutable
  await expect(rev2.getByTestId('commit-review-RUN-001')).toHaveCount(0)
})

test('STEP 11-14: downstream stages stay blocked and no result can be entered', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Pre-Registration')
  for (const s of SIZES) await registerOne(page, s, '8')
  await goTo(page, 'Baseline History')
  const rev = page.locator('.card', { hasText: 'Baseline review handoff' })
  await rev.getByTestId('reviewer-name').fill('B. Reviewer')
  await rev.locator('[data-testid="run-RUN-001"]').getByRole('button', { name: 'ACCEPT baseline' }).click()
  await rev.getByTestId('commit-review-RUN-001').click()

  await page.reload()
  await goTo(page, 'Pre-Registration')
  // the real experiment mechanism is NOT executable: no intervention has happened
  await expect(page.getByTestId('intervention-status')).toHaveText('AWAITING HUMAN RECORD')
  await expect(page.getByTestId('comparison-status')).toHaveText('BLOCKED')
  await expect(page.getByTestId('result-status')).toHaveText('NOT AVAILABLE')
  await expect(page.getByTestId('final-review-status')).toHaveText('BLOCKED')

  const cmp = page.locator('.card', { hasText: 'A post-intervention measurement' })
  await expect(cmp).toContainText('No measurement can be typed here')
  await expect(cmp).toContainText('There is no field for entering an actual result')
  await expect(cmp.locator('input')).toHaveCount(0)
  const res = page.locator('.card', { hasText: 'Derived from the registered thresholds' })
  await expect(res).toContainText('NOT AVAILABLE')
  await expect(res.locator('input')).toHaveCount(0)
})

test('an intervention citing evidence that does not exist is refused and nothing is persisted', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Pre-Registration')
  for (const s of SIZES) await registerOne(page, s, '8')
  await goTo(page, 'Baseline History')
  const rev = page.locator('.card', { hasText: 'Baseline review handoff' })
  await rev.getByTestId('reviewer-name').fill('B. Reviewer')
  await rev.locator('[data-testid="run-RUN-001"]').getByRole('button', { name: 'ACCEPT baseline' }).click()
  await rev.getByTestId('commit-review-RUN-001').click()

  await goTo(page, 'Pre-Registration')
  const iv = page.locator('.card', { hasText: 'A record of something a named human asserts' })
  await iv.getByLabel('intervention description').fill('claimed depth addition')
  await iv.getByLabel('baseline reference run').selectOption('RUN-001')
  await iv.getByLabel('intervention start').fill('2026-10-03T00:00:00Z')
  await iv.getByLabel('intervention recorded by').fill('E. Operator')
  await iv.getByLabel('intervention evidence').fill('EV-999999')
  await iv.getByLabel('method unchanged').check()
  await iv.getByTestId('record-intervention').click()
  await expect(iv).toContainText('unknown evidence reference')

  await page.reload()
  await goTo(page, 'Pre-Registration')
  await expect(page.getByTestId('intervention-status')).toHaveText('AWAITING HUMAN RECORD')
  await expect(page.getByTestId('comparison-status')).toHaveText('BLOCKED')
  const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}'), GOV_KEY)
  expect(stored.intervention ?? null).toBeNull()
})

test('a registered threshold is immutable; a correction requires a new experiment version', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Pre-Registration')
  await registerOne(page, '$10,000 buy', '8')
  const form = regCard(page)

  // a new version is refused while the current one is incomplete
  await form.getByTestId('new-experiment-version').click()
  await expect(form).toContainText('not fully registered')

  for (const s of SIZES.slice(1)) await registerOne(page, s, '8')
  await form.getByTestId('new-experiment-version').click()

  await page.reload()
  await goTo(page, 'Pre-Registration')
  const form2 = regCard(page)
  await expect(page.locator('.tile').filter({ hasText: 'Threshold slots' })).toContainText('EXP-001/v2')
  await expect(page.getByTestId('nra-registered')).toHaveText('0 of 4')
  for (const s of SIZES) await expect(form2.getByTestId(`slot-${s}`)).toContainText('AWAITING HUMAN ENTRY')

  // v1 is preserved verbatim
  const hist = page.locator('.card', { hasText: 'Registration audit history' })
  await expect(hist.locator('tbody tr')).toHaveCount(4)
  for (const row of await hist.locator('tbody tr').all()) {
    await expect(row).toContainText('EXP-001/v1')
    await expect(row).toContainText('SUPERSEDED VERSION')
    await expect(row).toContainText('A. Human')
  }

  // and the new version must be registered again before anything unlocks
  await expect(page.getByTestId('intervention-status')).toHaveText('BLOCKED')
  await registerOne(page, '$10,000 buy', '7')
  await page.reload()
  await goTo(page, 'Pre-Registration')
  await expect(page.locator('.card', { hasText: 'Registration audit history' }).locator('tbody tr')).toHaveCount(5)
  await expect(regCard(page).getByTestId('registered-threshold-$10,000 buy')).toHaveText('7 percent')
})

test('a locally edited registration is rejected, never accepted as registered', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Pre-Registration')
  for (const s of SIZES) await registerOne(page, s, '8')
  await expect(page.getByTestId('nra-registered')).toHaveText('4 of 4')

  await page.evaluate((k) => {
    const l = JSON.parse(localStorage.getItem(k)!)
    l.registrations[0].threshold = 99
    localStorage.setItem(k, JSON.stringify(l))
  }, GOV_KEY)

  await page.reload()
  await goTo(page, 'Pre-Registration')
  await expect(page.getByTestId('nra-registered')).toHaveText('3 of 4')
  await expect(regCard(page).getByTestId('slot-$10,000 buy')).toContainText('AWAITING HUMAN ENTRY')
  await expect(page.locator('.card', { hasText: 'Derived from the persisted governance records' }))
    .toContainText('INTEGRITY FAILURE')
  await expect(page.locator('.card', { hasText: 'Registration audit history' })).toContainText('TAMPERED')
  await expect(page.getByTestId('intervention-status')).toHaveText('BLOCKED')
  await expect(page.locator('.tile').filter({ hasText: 'Registration complete' })).toContainText('NO')
})

test('$100K stays NOT REGISTERABLE and an injected record is stripped on load', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Pre-Registration')
  for (const s of SIZES) await registerOne(page, s, '8')
  const form = regCard(page)
  await expect(form).toContainText('NOT REGISTERABLE')
  await expect(form.getByLabel('threshold for $100,000 (both sides)')).toHaveCount(0)

  await page.evaluate((k) => {
    const l = JSON.parse(localStorage.getItem(k)!)
    l.registrations.push({ ...l.registrations[0], standardisedSize: '$100,000 (both sides)', threshold: 50 })
    localStorage.setItem(k, JSON.stringify(l))
  }, GOV_KEY)

  await page.reload()
  await goTo(page, 'Pre-Registration')
  await expect(page.locator('.card', { hasText: 'Registration audit history' }).locator('tbody tr')).toHaveCount(4)
  const row = page.locator('tr', { hasText: '$100,000' }).first()
  await expect(row).toContainText('NOT REGISTERABLE')
  await expect(row).toContainText('Cannot be registered')
  await expect(page.locator('.tile').filter({ hasText: 'Not registerable' })).toContainText('1')
})

test('no overflow with registered records at mobile and tablet', async ({ page }) => {
  for (const vp of [{ width: 1024, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp)
    await page.goto('/')
    await goTo(page, 'Pre-Registration')
    if (vp.width === 1024) for (const s of SIZES) await registerOne(page, s, '8')
    const scrolls = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    expect(scrolls, `overflow @ ${vp.width}`).toBe(false)
  }
})
