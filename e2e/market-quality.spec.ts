/**
 * MARKET QUALITY (QA) — browser coverage.
 *
 * The screen is asserted in its real default state: a fresh browser holds no
 * stored sync, so the market-data and liquidity dimensions must degrade to
 * DATA UNAVAILABLE with reasons rather than inventing results.
 *
 * No live network route is stubbed and no sync is triggered, so nothing here can
 * write a fixture into a production evidence store.
 */
import { test, expect, type Page } from '@playwright/test'

const QA = 'Market Quality (QA)'

async function openQa(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: QA, exact: true }).click()
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(QA)
}

// ───────────────────────────────────────────── navigation

test('the module is reachable from the existing navigation', async ({ page }) => {
  await page.goto('/')
  const btn = page.getByRole('button', { name: QA, exact: true })
  await expect(btn).toBeVisible()
  await btn.click()
  await expect(btn).toHaveAttribute('aria-current', 'true')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(QA)
})

test('it sits inside the existing product, not beside it', async ({ page }) => {
  await openQa(page)
  // The host chrome is still the same application.
  await expect(page.locator('.nav h1')).toHaveText('SUT Value Forensics')
  await expect(page.locator('.nav .attribution')).toHaveText('Created & Idea by Magha Ram')
  await expect(page.locator('.nav .freeze')).toContainText('Research frozen 2026-09-30')
  // And the existing screens are still reachable afterwards.
  await page.getByRole('button', { name: 'Executive Dashboard', exact: true }).click()
  await expect(page.getByRole('heading', { level: 2 })).toContainText('Executive Dashboard')
})

// ───────────────────────────────────────────── rendering + summary

test('the page renders all six QA dimensions with a status each', async ({ page }) => {
  await openQa(page)
  const cards = page.locator('[data-testid^="qa-dim-"]')
  await expect(cards).toHaveCount(6)
  for (const id of [
    'transaction-integrity', 'market-data', 'liquidity-regression',
    'resilience', 'security', 'evidence-validation',
  ]) {
    const card = page.locator(`[data-testid="qa-dim-${id}"]`)
    await expect(card).toBeVisible()
    await expect(card.locator('.chip')).toHaveCount(1)
    await expect(card.locator('.chip')).not.toHaveText('')
  }
})

test('the summary states an overall status and never a numeric score', async ({ page }) => {
  await openQa(page)
  const overall = page.locator('[data-testid="qa-overall"]')
  await expect(overall).toBeVisible()
  const text = (await overall.textContent())!
  expect(text).toMatch(/HEALTHY|WARNING|DEGRADED|BLOCKED|DATA INSUFFICIENT/)
  // The reference image's illustrative figures must not appear as product facts.
  const body = (await page.locator('.main').textContent())!
  expect(body).not.toMatch(/81\s*\/\s*100/)
  expect(body).not.toContain('14.2%')
  expect(body).not.toContain('+47.9%')
})

test('the daily workflow is shown as five ordered steps', async ({ page }) => {
  await openQa(page)
  const steps = page.locator('[data-testid="qa-workflow"] li')
  await expect(steps).toHaveCount(5)
  await expect(steps.nth(0)).toContainText('Sync data')
  await expect(steps.nth(4)).toContainText('Track trends')
})

// ───────────────────────────────────────────── the six sections

test('Market Data QA degrades to DATA UNAVAILABLE with reasons when no sync is stored', async ({ page }) => {
  await openQa(page)
  const table = page.locator('[data-testid="qa-market-data-table"]')
  await expect(table).toBeVisible()
  const freshness = page.locator('[data-testid="qa-check-md-freshness"]')
  await expect(freshness).toContainText('DATA UNAVAILABLE')
  await expect(freshness).toContainText('No stored sync run')
  // Cross-source deviation must not claim agreement in the absence of data.
  await expect(page.locator('[data-testid="qa-check-md-cross-source"]'))
    .toContainText('DATA UNAVAILABLE')
})

test('Liquidity Regression shows the frozen baseline and refuses to invent a current value', async ({ page }) => {
  await openQa(page)
  const table = page.locator('[data-testid="qa-liquidity-table"]')
  await expect(table).toBeVisible()
  // The frozen EXP-001 magnitudes are displayed unchanged.
  const body = (await table.textContent())!
  expect(body).toContain('10.6%')
  expect(body).toContain('9.6%')
  expect(body).toContain('58.6%')
  expect(body).toContain('36.9%')
  expect(body).toContain('NOT EXECUTABLE / NOT REGISTERABLE')
  // And no current value is fabricated.
  expect(body).toContain('DATA UNAVAILABLE')
  expect(body).toContain('identical EXP-001 method')
})

test('Liquidity Regression states that a baseline is not a threshold', async ({ page }) => {
  await openQa(page)
  const note = page.locator('[data-testid="qa-baseline-not-threshold"]')
  await expect(note).toBeVisible()
  await expect(note).toContainText('Observed baseline — not a target')
  await expect(note).toContainText('0 of 4 REGISTERED')
})

test('Transaction Integrity reports the real reason it cannot be evaluated', async ({ page }) => {
  await openQa(page)
  const main = page.locator('.main')
  await expect(main).toContainText('Expected transaction context is not available')
  await expect(main).toContainText('no product telemetry is connected')
})

test('Resilience reports executed scenarios and never passes an external one', async ({ page }) => {
  await openQa(page)
  const table = page.locator('[data-testid="qa-resilience-table"]')
  await expect(table).toBeVisible()
  // Real in-memory degradation paths execute and pass.
  await expect(page.locator('[data-testid="qa-res-res-malformed-payload"]')).toContainText('PASS')
  await expect(page.locator('[data-testid="qa-res-res-storage-unavailable"]')).toContainText('PASS')
  // External scenarios are NOT EXECUTED with a reason, never PASS.
  const api = page.locator('[data-testid="qa-res-res-api-timeout"]')
  await expect(api).toContainText('NOT EXECUTED')
  await expect(api).toContainText('external dependency')
  await expect(api).not.toContainText('PASS')
})

test('Security QA reports executed controls and never passes an unexecuted one', async ({ page }) => {
  await openQa(page)
  await expect(page.locator('[data-testid="qa-security-table"]')).toBeVisible()
  await expect(page.locator('[data-testid="qa-sec-sec-address-validation"]')).toContainText('PASS')
  await expect(page.locator('[data-testid="qa-sec-sec-input-validation"]')).toContainText('PASS')
  const rate = page.locator('[data-testid="qa-sec-sec-rate-limiting"]')
  await expect(rate).toContainText('NOT EXECUTED')
  await expect(rate).not.toContainText('PASS')
})

test('the Evidence panel exposes traceability fields for a real result', async ({ page }) => {
  await openQa(page)
  await expect(page.locator('[data-testid="qa-evidence-table"]')).toBeVisible()
  await expect(page.locator('[data-testid="qa-trace-table"]')).toBeVisible()
  // Expand one evidence disclosure and confirm the provenance fields are present.
  const first = page.locator('[data-testid="qa-trace-table"] details.qa-ev').first()
  await first.locator('summary').click()
  const body = first.locator('.qa-ev-body')
  await expect(body).toBeVisible()
  await expect(body).toContainText('Source')
  await expect(body).toContainText('Provenance')
  await expect(body).toContainText('Metric')
})

test('an absent evidence field prints DATA UNAVAILABLE rather than a blank', async ({ page }) => {
  await openQa(page)
  const d = page.locator('[data-testid="qa-trace-table"] details.qa-ev').first()
  await d.locator('summary').click()
  await expect(d.locator('.qa-ev-body')).toContainText('DATA UNAVAILABLE')
})

// ───────────────────────────────────────────── governance guarantees

test('the module renders no control that could approve, register or execute', async ({ page }) => {
  await openQa(page)
  // Only disclosure toggles may exist; no buttons, inputs, selects or textareas.
  await expect(page.locator('.main button')).toHaveCount(0)
  await expect(page.locator('.main input')).toHaveCount(0)
  await expect(page.locator('.main select')).toHaveCount(0)
  await expect(page.locator('.main textarea')).toHaveCount(0)
})

test('it makes no market, price, adoption or ranking claim', async ({ page }) => {
  await openQa(page)
  const body = ((await page.locator('.main').textContent()) ?? '').toLowerCase()
  for (const phrase of [
    'will rise', 'will increase', 'price target', 'guaranteed', 'target achieved',
    'liquidity improved', 'adoption increased', 'adoption proven', 'proves demand',
    'the intervention succeeded', 'sut market is healthy', 'sut is ready',
    'utility is proven', 'reach the top 100',
  ]) {
    expect(body, `forbidden phrase: ${phrase}`).not.toContain(phrase)
  }
})

test('it records the EXP-002 identifier collision instead of resolving it silently', async ({ page }) => {
  await openQa(page)
  const note = page.locator('[data-testid="qa-id-collision"]')
  await expect(note).toBeVisible()
  await expect(note).toContainText('Reproducible weekly active addresses')
  await expect(note).toContainText('governance decision')
})

test('EXP-001 and the frozen EXP-002 are untouched after visiting the module', async ({ page }) => {
  await openQa(page)
  // Baseline Operations still shows both experiments and the frozen EXP-002 card.
  await page.getByRole('button', { name: 'Baseline Operations', exact: true }).click()
  await expect(page.locator('.main')).toContainText('EXP-001, EXP-002')
  await expect(page.locator('.main')).toContainText('EXP-002 — weekly active addresses')
  // Proposed thresholds are still proposed, not approved.
  await page.getByRole('button', { name: 'Proposed Thresholds', exact: true }).click()
  await expect(page.locator('.main')).toContainText('PENDING BUSINESS APPROVAL')
})

// ───────────────────────────────────────────── trends

test('no trend is manufactured without enough stored runs', async ({ page }) => {
  await openQa(page)
  await expect(page.locator('.main')).toContainText('INSUFFICIENT DATA FOR TREND')
  await expect(page.locator('[data-testid="qa-trend-table"]')).toHaveCount(0)
})

// ───────────────────────────────────────────── responsive

for (const vp of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`layout holds with no horizontal overflow and no clipping @ ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await openQa(page)

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(overflow.scrollWidth, `${vp.name} horizontal overflow`)
      .toBeLessThanOrEqual(overflow.clientWidth + 1)

    // Every dimension card stays inside the viewport horizontally.
    const spill = await page.evaluate(() => {
      const w = document.documentElement.clientWidth
      return [...document.querySelectorAll<HTMLElement>('[data-testid^="qa-dim-"]')]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.left < -1 || r.right > w + 1
        }).length
    })
    expect(spill, `${vp.name} cards spilling outside the viewport`).toBe(0)

    // Wide tables scroll inside their own container rather than the page.
    const tables = await page.evaluate(() => {
      const out: Array<{ id: string; scrollable: boolean }> = []
      for (const t of document.querySelectorAll<HTMLElement>('table[data-testid^="qa-"]')) {
        const holder = t.closest<HTMLElement>('.scroll')
        out.push({
          id: t.dataset.testid ?? '?',
          scrollable: !!holder && getComputedStyle(holder).overflowX !== 'visible',
        })
      }
      return out
    })
    expect(tables.length).toBeGreaterThan(0)
    for (const t of tables) {
      expect(t.scrollable, `${t.id} must scroll inside its own container`).toBe(true)
    }

    // No dimension card is collapsed to an unreadable height.
    const tooShort = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[data-testid^="qa-dim-"]')]
        .filter((el) => el.getBoundingClientRect().height < 40).length)
    expect(tooShort, `${vp.name} clipped cards`).toBe(0)
  })
}

// ───────────────────────────────────────────── console + network hygiene

test('the module raises no console error and no failed request', async ({ page }) => {
  const errors: string[] = []
  const failed: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => failed.push(`${r.url()} :: ${r.failure()?.errorText ?? ''}`))

  await openQa(page)
  // Exercise every disclosure, which is the only interactive surface.
  const count = await page.locator('.main details.qa-ev summary').count()
  for (let i = 0; i < Math.min(count, 12); i++) {
    await page.locator('.main details.qa-ev summary').nth(i).click()
  }
  await page.waitForTimeout(250)

  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([])
  expect(failed, `failed requests: ${failed.join(' | ')}`).toEqual([])
})
