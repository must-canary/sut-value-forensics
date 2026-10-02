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

test('Experiment Execution screen renders both experiments', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })

  await page.goto('/')
  await goTo(page, 'Experiment Execution')
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await expect(page.locator('tbody')).toContainText('EXP-001')
  await expect(page.locator('tbody')).toContainText('EXP-002')
  expect(errs, errs.join('\n')).toHaveLength(0)
})

test('execution screen shows the required executive columns', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Experiment Execution')
  const head = page.locator('thead').first()
  for (const col of ['Experiment', 'Stage', 'Opportunity', 'Primary KPI', 'Baseline', 'Latest measurement', 'Evidence', 'Human review']) {
    await expect(head).toContainText(col)
  }
})

test('stage and review state are visible without scrolling the row away', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Experiment Execution')
  const row = page.locator('tbody tr', { hasText: 'EXP-001' })
  await expect(row).toContainText('REVIEW')
  await expect(row).toContainText('AWAITING HUMAN REVIEW')
  await expect(page.locator('tbody tr', { hasText: 'EXP-002' })).toContainText('NOT YET MEASURED')
})

test('opening OPP-01 experiment shows the full 8-section detail', async ({ page }) => {
  await page.goto('/')
  await openExp1(page)
  for (const h of [
    '1. Why this experiment exists', '2. Baseline', '3. Procedure', '4. Measurement',
    '5. Evidence', '6. Interpretation', '7. Limitations', '8. Next action',
  ]) {
    await expect(page.locator('.card h3', { hasText: h })).toBeVisible()
  }
})

test('lifecycle track shows all five stages', async ({ page }) => {
  await page.goto('/')
  await openExp1(page)
  for (const s of ['PLANNED', 'BASELINE CAPTURE', 'MEASUREMENT', 'REVIEW', 'RESULT']) {
    await expect(page.locator('.chip', { hasText: s }).first()).toBeVisible()
  }
})

test('baseline renders real measured values with provenance', async ({ page }) => {
  await page.goto('/')
  await openExp1(page)
  const b = page.locator('.card', { hasText: '2. Baseline' })
  await expect(b).toContainText('94,711,694')            // block
  await expect(b).toContainText('2026-09-30T12:51:21Z')  // observation time
  await expect(b).toContainText('0.416396')              // spot price
  await expect(b).toContainText('10.59')                 // $10K buy impact
  await expect(b).toContainText('EV-100')
  await expect(b.locator('thead')).toContainText('Provenance')
})

test('measurement record renders with run id, block and reviewer state', async ({ page }) => {
  await page.goto('/')
  await openExp1(page)
  const m = page.locator('.card', { hasText: '4. Measurement' })
  await expect(m).toContainText('RUN-001')
  await expect(m).toContainText('94,711,694')
  await expect(m).toContainText('Baseline run')
  await expect(m).toContainText('awaiting a named human reviewer')
})

test('modelled readings are labelled as models, not observations', async ({ page }) => {
  await page.goto('/')
  await openExp1(page)
  const b = page.locator('.card', { hasText: '2. Baseline' })
  await expect(b.locator('.chip', { hasText: 'MODELLED' }).first()).toBeVisible()
  await expect(b).toContainText('MODEL output')
  await expect(b).toContainText('not a direct observation')
})

test('the $100K size renders NOT EXECUTABLE and never a percentage', async ({ page }) => {
  await page.goto('/')
  await openExp1(page)
  const b = page.locator('.card', { hasText: '2. Baseline' })
  const row = b.locator('tr', { hasText: '$100,000' })
  await expect(row).toContainText('NOT EXECUTABLE')
  await expect(row).toContainText('EXCEEDS POOL INVENTORY')
  await expect(row).toContainText('deliberately withheld')
  // the modelled figure that was computed must not leak into the UI
  await expect(row).not.toContainText('129.84')
})

test('DATA UNAVAILABLE states render and are not substituted', async ({ page }) => {
  await page.goto('/')
  await openExp1(page)
  const b = page.locator('.card', { hasText: '2. Baseline' })
  await expect(b.locator('tr').filter({ has: page.locator('td strong', { hasText: 'Bid/ask spread' }) })).toContainText('DATA UNAVAILABLE')
  const vd = b.locator('tr', { hasText: 'Volume / depth relationship' })
  await expect(vd).toContainText('DATA UNAVAILABLE')
  await expect(vd).toContainText('NOT a substitute')
})

test('premature result is blocked and the human-review gate is stated', async ({ page }) => {
  await page.goto('/')
  await openExp1(page)
  const i = page.locator('.card', { hasText: '6. Interpretation' })
  await expect(i).toContainText('NO RESULT')
  await expect(i).toContainText('requires measurement data AND a named human reviewer')
  await expect(i).toContainText('no named reviewer')
  await expect(i).toContainText('AWAITING HUMAN REVIEW')
})

test('no experiment screen promises a price or rank outcome', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Experiment Execution')
  let text = (await page.locator('.main').innerText()).toLowerCase()
  for (const p of ['will increase the price', 'will raise the price', 'higher market rank', 'guaranteed']) {
    expect(text, `execution list must not contain "${p}"`).not.toContain(p)
  }
  await openExp1(page)
  text = (await page.locator('.main').innerText()).toLowerCase()
  for (const p of ['will increase the price', 'price prediction', 'higher market rank', 'guaranteed']) {
    expect(text, `EXP-001 detail must not contain "${p}"`).not.toContain(p)
  }
  expect(text).toContain('not a forecast')
})

test('EXP-002 shows PLANNED with no fabricated baseline or measurement', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Experiment Execution')
  await page.locator('tbody tr', { hasText: 'EXP-002' }).click()
  await expect(page.locator('.card', { hasText: '2. Baseline' })).toContainText('NO BASELINE CAPTURED')
  await expect(page.locator('.card', { hasText: '4. Measurement' })).toContainText('NO MEASUREMENT RECORDED')
  await expect(page.locator('.card', { hasText: '6. Interpretation' })).toContainText('NO RESULT')
})

test('EXP-002 defines its methodology and exclusion rules up front', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Experiment Execution')
  await page.locator('tbody tr', { hasText: 'EXP-002' }).click()
  const proc = page.locator('.card', { hasText: '3. Procedure' })
  await expect(proc).toContainText('EXCLUDE')
  await expect(proc).toContainText('fan-out distribution')
  await expect(proc).toContainText('ISO weeks')
})

test('evidence section links every measurement reference', async ({ page }) => {
  await page.goto('/')
  await openExp1(page)
  const e = page.locator('.card', { hasText: '5. Evidence' })
  for (const id of ['EV-100', 'EV-104', 'EV-108', 'EV-110']) await expect(e).toContainText(id)
  await expect(e.locator('tr', { hasText: 'EV-108' })).toContainText('DATA UNAVAILABLE')
})

// ───────────────────────────────────────────────────────── attribution

test('attribution is visible in the sidebar on every screen', async ({ page }) => {
  await page.goto('/')
  const attr = page.locator('.nav .attribution')
  await expect(attr).toBeVisible()
  await expect(attr).toHaveText('Created & Idea by Magha Ram')
  await goTo(page, 'Experiment Execution')
  await expect(attr).toBeVisible()
  await goTo(page, 'Evidence')
  await expect(attr).toBeVisible()
})

test('attribution is also in the Settings About section', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Settings')
  const about = page.locator('.card', { hasText: 'About' }).first()
  await expect(about).toContainText('Created & Idea by')
  await expect(about).toContainText('Magha Ram')
  await expect(about).toContainText('SUT Value Forensics')
})

test('attribution does not overlap or crowd the executive content', async ({ page }) => {
  await page.goto('/')
  const attr = page.locator('.nav .attribution')
  const main = page.locator('.main')
  const a = (await attr.boundingBox())!
  const m = (await main.boundingBox())!
  expect(a.x + a.width, 'attribution must stay inside the sidebar').toBeLessThanOrEqual(m.x + 1)
})

// ───────────────────────────────────────────────────────── responsive

for (const vp of [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'tablet-1024', width: 1024, height: 900 },
  { name: 'mobile-390', width: 390, height: 844 },
]) {
  test(`experiment screens have no horizontal overflow @ ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/')
    await goTo(page, 'Experiment Execution')
    let scrolls = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    expect(scrolls, `execution list scrolls horizontally @ ${vp.name}`).toBe(false)

    await page.locator('tbody tr', { hasText: 'EXP-001' }).click()
    await expect(page.getByRole('heading', { level: 2 })).toContainText('EXP-001')
    scrolls = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    expect(scrolls, `EXP-001 detail scrolls horizontally @ ${vp.name}`).toBe(false)

    // primary KPI and DATA UNAVAILABLE must remain visible at every size
    await expect(page.locator('.card', { hasText: '2. Baseline' })).toContainText('Price impact')
    await expect(page.locator('.card', { hasText: '2. Baseline' })).toContainText('NOT EXECUTABLE')
    await expect(page.locator('.nav .attribution')).toBeVisible()

    await page.screenshot({
      path: `e2e/screenshots/${vp.name}/experiment-detail-exp-001.png`, fullPage: false,
    })
  })
}
