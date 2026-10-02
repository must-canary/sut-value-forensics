import { test, expect, type Page } from '@playwright/test'

async function goTo(page: Page, screen: string) {
  await page.getByRole('button', { name: screen, exact: true }).click()
  await expect(page.getByRole('heading', { level: 2 })).toContainText(screen)
}

test('improvement backlog renders all eight opportunities', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })

  await page.goto('/')
  await goTo(page, 'Improvement Backlog')
  await expect(page.locator('tbody tr')).toHaveCount(8)
  for (const id of ['OPP-01', 'OPP-02', 'OPP-03', 'OPP-04', 'OPP-05', 'OPP-06', 'OPP-07', 'OPP-08']) {
    await expect(page.locator('tbody')).toContainText(id)
  }
  expect(errs, errs.join('\n')).toHaveLength(0)
})

test('backlog shows the required executive columns', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Improvement Backlog')
  const head = page.locator('thead').first()
  for (const col of ['Opportunity', 'Evidence strength', 'Data readiness', 'Experiment readiness', 'Primary KPI', 'Status']) {
    await expect(head).toContainText(col)
  }
})

test('backlog counters reflect the frozen split and no completed experiments', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Improvement Backlog')
  const tiles = page.locator('.tile')
  await expect(tiles.filter({ hasText: 'Opportunities' })).toContainText('8')
  await expect(tiles.filter({ hasText: 'Completed' })).toContainText('0')
  // OPP-01 moved to RUNNING once baseline collection actually started
  await expect(tiles.filter({ hasText: 'Running' })).toContainText('1')
  await expect(tiles.filter({ hasText: 'Running' })).toContainText('baseline collection started')
  // RUNNING must still not imply a completed experiment
  await expect(tiles.filter({ hasText: 'Completed' })).toContainText('none measured yet')
})

test('backlog states the scope rule: no price or rank promise', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Improvement Backlog')
  await expect(page.locator('.warn')).toContainText('No opportunity below claims that an intervention will raise')
  await expect(page.locator('.warn')).toContainText('No experiment is marked successful before it has been measured')
})

test('no screen promises a price or market-rank outcome', async ({ page }) => {
  await page.goto('/')
  for (const s of ['Improvement Backlog', 'Improvement Opportunities']) {
    await goTo(page, s)
    const text = (await page.locator('.main').innerText()).toLowerCase()
    for (const phrase of ['will increase the price', 'will raise the price', 'higher market rank', 'guaranteed to']) {
      expect(text, `${s} must not contain "${phrase}"`).not.toContain(phrase)
    }
  }
})

test('clicking a backlog row opens that opportunity', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Improvement Backlog')
  await page.locator('tbody tr', { hasText: 'OPP-01' }).click()
  await expect(page.getByRole('heading', { level: 2 })).toContainText('OPP-01')
  await expect(page.locator('.main')).toContainText('Liquidity / market depth')
})

test('opportunity overview shows all 16 required sections', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Improvement Opportunities')
  await page.locator('.card', { hasText: 'OPP-01' }).getByRole('button', { name: 'Open' }).click()
  for (const heading of [
    '1. Opportunity / problem',
    '2. Evidence supporting investigation',
    '3. Current baseline',
    '4. What is missing or weak',
    '5. Proposed intervention',
    '6–9. KPIs, baseline and success criteria',
    '10–11. Experiment period and control',
    '12–13. Required data and dependencies',
    '14. Risks and limitations',
    '15. Evidence required before execution',
  ]) {
    await expect(page.locator('.card h3', { hasText: heading })).toBeVisible()
  }
})

test('experiment detail follows Baseline → Intervention → Measurement → Interpretation', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Improvement Backlog')
  await page.locator('tbody tr', { hasText: 'OPP-01' }).click()
  await page.getByRole('button', { name: 'Experiment detail' }).click()
  await expect(page.locator('.card h3', { hasText: '① BASELINE' })).toBeVisible()
  await expect(page.locator('.card h3', { hasText: '② INTERVENTION' })).toBeVisible()
  await expect(page.locator('.card h3', { hasText: '③ MEASUREMENT' })).toBeVisible()
  await expect(page.locator('.card h3', { hasText: '④ INTERPRETATION' })).toBeVisible()
})

test('interpretation rules are fixed and no result is recorded', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Improvement Backlog')
  await page.locator('tbody tr', { hasText: 'OPP-01' }).click()
  await page.getByRole('button', { name: 'Experiment detail' }).click()
  const card = page.locator('.card', { hasText: '④ INTERPRETATION' })
  await expect(card).toContainText('SUPPORTED if')
  await expect(card).toContainText('REJECTED if')
  await expect(card).toContainText('INCONCLUSIVE if')
  await expect(card).toContainText('NOT YET MEASURED')
  await expect(card).toContainText('a result requires a named human recorder')
})

test('every opportunity shows NOT YET MEASURED in its experiment detail', async ({ page }) => {
  await page.goto('/')
  for (const id of ['OPP-01', 'OPP-05', 'OPP-06', 'OPP-07']) {
    await goTo(page, 'Improvement Backlog')
    await page.locator('tbody tr', { hasText: id }).click()
    await page.getByRole('button', { name: 'Experiment detail' }).click()
    await expect(page.locator('.card', { hasText: '④ INTERPRETATION' })).toContainText('NOT YET MEASURED')
  }
})

test('DATA UNAVAILABLE baselines render and are not fabricated', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Improvement Backlog')
  await page.locator('tbody tr', { hasText: 'OPP-08' }).click()
  const baseline = page.locator('.card', { hasText: '3. Current baseline' })
  await expect(baseline).toContainText('DATA UNAVAILABLE')
  await expect(baseline).toContainText('no access')
})

test('period-mismatched figures are flagged, not substituted', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Improvement Backlog')
  await page.locator('tbody tr', { hasText: 'OPP-01' }).click()
  const baseline = page.locator('.card', { hasText: '3. Current baseline' })
  await expect(baseline).toContainText('Period mismatch')
  await expect(baseline).toContainText('is not a substitute')
  // the missing May TVL stays unavailable rather than borrowing the September figure
  await expect(baseline).toContainText('DATA UNAVAILABLE')
  await expect(baseline).toContainText('May 2026 pool TVL')
})

test('every baseline number carries provenance', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Improvement Backlog')
  await page.locator('tbody tr', { hasText: 'OPP-06' }).click()
  const baseline = page.locator('.card', { hasText: '3. Current baseline' })
  await expect(baseline.locator('thead')).toContainText('Provenance')
  await expect(baseline).toContainText('EV-051')
  await expect(baseline).toContainText('2026-09-29')
})

test('blocked opportunities declare unmeasurable KPIs', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Improvement Backlog')
  const blocked = page.locator('tbody tr', { hasText: 'DATA REQUIRED' })
  expect(await blocked.count()).toBeGreaterThanOrEqual(3)
  await expect(blocked.first()).toContainText('not measurable today')
})

test('opportunity statuses use only the allowed vocabulary', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Improvement Backlog')
  const allowed = ['IDENTIFIED', 'READY FOR EXPERIMENT', 'DATA REQUIRED', 'RUNNING', 'COMPLETED', 'INCONCLUSIVE']
  const cells = await page.locator('tbody tr td:nth-child(2) .chip').allInnerTexts()
  expect(cells).toHaveLength(8)
  for (const c of cells) expect(allowed, `unexpected status "${c}"`).toContain(c.trim())
})

test('mobile: improvement screens render without overflow @ 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  for (const s of ['Improvement Backlog', 'Improvement Opportunities']) {
    await goTo(page, s)
    const scrolls = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )
    expect(scrolls, `${s} must not scroll horizontally at 390px`).toBe(false)
  }
})
