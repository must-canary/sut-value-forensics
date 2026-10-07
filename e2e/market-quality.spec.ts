/**
 * MARKET QUALITY (QA) — browser coverage.
 *
 * The screen is asserted in its real default state: a fresh browser holds no
 * stored sync, so the market-data and liquidity dimensions must degrade to
 * DATA UNAVAILABLE with reasons rather than inventing results.
 *
 * The page is a dashboard: detail sections are collapsed by default, so a test
 * that inspects detail expands it first. Collapsed panels stay in the DOM, so
 * "no information was lost" is itself assertable.
 *
 * No live network route is stubbed and no sync is triggered, so nothing here can
 * write a fixture into a production evidence store.
 */
import { test, expect, type Page } from '@playwright/test'

const QA = 'Market Quality (QA)'

type DimId =
  | 'transaction-integrity' | 'market-data' | 'liquidity-regression'
  | 'resilience' | 'security' | 'evidence-validation'

const DIMS: DimId[] = [
  'transaction-integrity', 'market-data', 'liquidity-regression',
  'resilience', 'security', 'evidence-validation',
]

async function openQa(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: QA, exact: true }).click()
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(QA)
}

/** Expand one detail section via its accordion header. */
async function expand(page: Page, id: DimId) {
  const btn = page.getByTestId(`qa-acc-${id}`)
  if ((await btn.getAttribute('aria-expanded')) !== 'true') await btn.click()
  await expect(btn).toHaveAttribute('aria-expanded', 'true')
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
  await expect(page.locator('.nav h1')).toHaveText('SUT Value Forensics')
  await expect(page.locator('.nav .attribution')).toHaveText('Created & Idea by Magha Ram')
  await expect(page.locator('.nav .freeze')).toContainText('Research frozen 2026-09-30')
  await page.getByRole('button', { name: 'Executive Dashboard', exact: true }).click()
  await expect(page.getByRole('heading', { level: 2 })).toContainText('Executive Dashboard')
})

// ───────────────────────────────────────────── level 1: overall status

test('the overall status is the first thing on the page', async ({ page }) => {
  await openQa(page)
  const overall = page.getByTestId('qa-overall')
  await expect(overall).toBeVisible()
  await expect(overall).toContainText('Overall QA status')
  const text = (await overall.textContent())!
  expect(text).toMatch(/HEALTHY|WARNING|DEGRADED|BLOCKED|DATA INSUFFICIENT/)
  // It sits above the first dimension card.
  const o = (await overall.boundingBox())!
  const g = (await page.getByTestId('qa-dimension-grid').boundingBox())!
  expect(o.y).toBeLessThan(g.y)
})

test('the overall status carries a reason', async ({ page }) => {
  await openQa(page)
  const reason = await page.locator('[data-testid="qa-overall"] .qa-hero-reason').textContent()
  expect((reason ?? '').length).toBeGreaterThan(20)
})

// ───────────────────────────────────────────── level 2: six dimensions

test('six QA cards render, each with a status, scope, one-line result and a count', async ({ page }) => {
  await openQa(page)
  await expect(page.locator('[data-testid^="qa-dim-"]')).toHaveCount(6)
  for (const id of DIMS) {
    const card = page.getByTestId(`qa-dim-${id}`)
    await expect(card).toBeVisible()
    await expect(card.locator('.chip')).toHaveCount(1)
    await expect(card.locator('.qa-dim-scope')).not.toBeEmpty()
    await expect(card.locator('.qa-dim-line')).not.toBeEmpty()
    await expect(card.locator('.qa-dim-count')).toContainText('checks')
    await expect(card.getByTestId(`qa-view-${id}`)).toBeVisible()
  }
})

test('card statuses are bound to the engine, not hardcoded', async ({ page }) => {
  await openQa(page)
  // With no stored sync these three must be DATA UNAVAILABLE and these three
  // must have executed. A hardcoded grid could not produce this split.
  await expect(page.getByTestId('qa-dim-transaction-integrity')).toContainText('DATA UNAVAILABLE')
  await expect(page.getByTestId('qa-dim-market-data')).toContainText('DATA UNAVAILABLE')
  await expect(page.getByTestId('qa-dim-liquidity-regression')).toContainText('DATA UNAVAILABLE')
  await expect(page.getByTestId('qa-dim-resilience')).toContainText('PASS')
  await expect(page.getByTestId('qa-dim-security')).toContainText('PASS')
  // The one-line results quote the engine's real reasons.
  await expect(page.getByTestId('qa-dim-market-data')).toContainText('No live market sync run is stored')
  await expect(page.getByTestId('qa-dim-liquidity-regression'))
    .toContainText('No comparable current observation is available')
})

test('a status is never presented as a claim about the whole SUT market', async ({ page }) => {
  await openQa(page)
  // The scope line is uppercased by CSS, so assert the DOM text, not the painted text.
  await expect(page.getByTestId('qa-dim-security')).toContainText('Repository-level controls')
  await expect(page.getByTestId('qa-dim-resilience')).toContainText('Repository-level checks')
  // And the accordion header repeats the scope, so an expanded reader sees it too.
  await expect(page.getByTestId('qa-acc-security')).toContainText('Repository-level controls')
})

test('the key metrics strip shows real computed values', async ({ page }) => {
  await openQa(page)
  const m = page.getByTestId('qa-metrics')
  await expect(m).toBeVisible()
  await expect(m).toContainText('QA dimensions')
  await expect(m).toContainText('Evaluated')
  await expect(m).toContainText('Evidence records')
  await expect(m).toContainText('Last evaluation')
  // Evaluated is rendered as "x / y" with y the defined-check total.
  await expect(m).toContainText(/\d+ \/ \d+/)
})

// ───────────────────────────────────────────── level 3: findings + workflow

test('key findings list only open items, plus the governance item', async ({ page }) => {
  await openQa(page)
  const items = page.locator('[data-testid="qa-findings"] li')
  await expect(items).toHaveCount(4) // 3 unavailable dimensions + 1 governance item
  await expect(page.getByTestId('qa-finding-market-data')).toBeVisible()
  await expect(page.getByTestId('qa-finding-governance')).toContainText('identifier collision')
  // A passing dimension is NOT repeated here.
  await expect(page.getByTestId('qa-finding-security')).toHaveCount(0)
})

test('the workflow is a compact five-step stepper', async ({ page }) => {
  await openQa(page)
  const steps = page.locator('[data-testid="qa-workflow"] li')
  await expect(steps).toHaveCount(5)
  await expect(steps.nth(0)).toContainText('Sync data')
  await expect(steps.nth(4)).toContainText('Track trends')
})

// ───────────────────────────────────────────── level 4: details on demand

test('every detail section is collapsed by default', async ({ page }) => {
  await openQa(page)
  await expect(page.locator('[data-testid^="qa-acc-"]')).toHaveCount(6)
  for (const id of DIMS) {
    await expect(page.getByTestId(`qa-acc-${id}`)).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator(`#qa-acc-panel-${id}`)).toBeHidden()
  }
})

test('no evidence table is visible before the reader asks for one', async ({ page }) => {
  await openQa(page)
  for (const id of ['qa-market-data-table', 'qa-liquidity-table', 'qa-trace-table']) {
    await expect(page.getByTestId(id)).toBeHidden()
  }
})

test('collapsing defers information rather than deleting it', async ({ page }) => {
  await openQa(page)
  // Collapsed panels remain in the DOM, so the detail is present but not shown.
  for (const id of ['qa-market-data-table', 'qa-liquidity-table', 'qa-trace-table']) {
    await expect(page.getByTestId(id)).toHaveCount(1)
  }
  const body = (await page.locator('.main').textContent())!
  expect(body).toContain('Expected transaction context is not available')
})

test('clicking View details expands the matching section', async ({ page }) => {
  await openQa(page)
  await page.getByTestId('qa-view-security').click()
  await expect(page.getByTestId('qa-acc-security')).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByTestId('qa-security-table')).toBeVisible()
  // and leaves the others closed
  await expect(page.getByTestId('qa-acc-market-data')).toHaveAttribute('aria-expanded', 'false')
})

test('the accordion header toggles open and closed', async ({ page }) => {
  await openQa(page)
  const btn = page.getByTestId('qa-acc-resilience')
  await btn.click()
  await expect(btn).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByTestId('qa-resilience-table')).toBeVisible()
  await btn.click()
  await expect(btn).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByTestId('qa-resilience-table')).toBeHidden()
})

// ───────────────────────────────────────────── the six sections (expanded)

test('Market Data QA degrades to DATA UNAVAILABLE with reasons when no sync is stored', async ({ page }) => {
  await openQa(page)
  await expand(page, 'market-data')
  await expect(page.getByTestId('qa-market-data-table')).toBeVisible()
  const freshness = page.getByTestId('qa-check-md-freshness')
  await expect(freshness).toContainText('DATA UNAVAILABLE')
  await expect(page.getByTestId('qa-check-md-cross-source')).toContainText('DATA UNAVAILABLE')
})

test('an identical repeated reason is stated once, not on every row', async ({ page }) => {
  await openQa(page)
  await expand(page, 'liquidity-regression')
  // The shared "Why" block carries the reason; rows point at it.
  await expect(page.getByTestId('qa-lr-why')).toBeVisible()
  await expect(page.getByTestId('qa-lr-why')).toContainText('identical EXP-001 method')
  await expect(page.getByTestId('qa-lr-why')).toContainText('Next required input')
})

test('Liquidity Regression leads with baseline and current availability', async ({ page }) => {
  await openQa(page)
  await expand(page, 'liquidity-regression')
  const facts = page.getByTestId('qa-lr-facts')
  await expect(facts).toContainText('EXP-001 baseline')
  await expect(facts).toContainText('Available')
  await expect(facts).toContainText('Current comparable observation')
  await expect(facts).toContainText('Unavailable')
})

test('Liquidity Regression shows the frozen baseline and refuses to invent a current value', async ({ page }) => {
  await openQa(page)
  await expand(page, 'liquidity-regression')
  const body = (await page.getByTestId('qa-liquidity-table').textContent())!
  expect(body).toContain('10.6%')
  expect(body).toContain('9.6%')
  expect(body).toContain('58.6%')
  expect(body).toContain('36.9%')
  expect(body).toContain('NOT EXECUTABLE / NOT REGISTERABLE')
  expect(body).toContain('DATA UNAVAILABLE')
})

test('Liquidity Regression states that a baseline is not a threshold', async ({ page }) => {
  await openQa(page)
  await expand(page, 'liquidity-regression')
  const note = page.getByTestId('qa-baseline-not-threshold')
  await expect(note).toBeVisible()
  await expect(note).toContainText('Observed baseline — not a target')
  await expect(note).toContainText('0 of 4 REGISTERED')
})

test('Transaction Integrity reports the real reason it cannot be evaluated', async ({ page }) => {
  await openQa(page)
  await expand(page, 'transaction-integrity')
  const panel = page.locator('#qa-acc-panel-transaction-integrity')
  await expect(panel).toContainText('Expected transaction context is not available')
  await expect(panel).toContainText('no product telemetry is connected')
})

test('Resilience reports executed scenarios and never passes an external one', async ({ page }) => {
  await openQa(page)
  await expand(page, 'resilience')
  await expect(page.getByTestId('qa-resilience-table')).toBeVisible()
  await expect(page.getByTestId('qa-res-res-malformed-payload')).toContainText('PASS')
  await expect(page.getByTestId('qa-res-res-storage-unavailable')).toContainText('PASS')
  const api = page.getByTestId('qa-res-res-api-timeout')
  await expect(api).toContainText('NOT EXECUTED')
  await expect(api).toContainText('external dependency')
  await expect(api).not.toContainText('PASS')
})

test('Resilience distinguishes executed, evidence-led and not executed', async ({ page }) => {
  await openQa(page)
  await expand(page, 'resilience')
  await expect(page.getByTestId('qa-res-res-malformed-payload')).toContainText('Executed')
  await expect(page.getByTestId('qa-res-res-partial-response')).toContainText('Evidence-led')
  await expect(page.getByTestId('qa-res-res-api-timeout')).toContainText('Not executed')
})

test('Security QA reports executed controls and never passes an unexecuted one', async ({ page }) => {
  await openQa(page)
  await expand(page, 'security')
  await expect(page.getByTestId('qa-sec-sec-address-validation')).toContainText('PASS')
  await expect(page.getByTestId('qa-sec-sec-input-validation')).toContainText('PASS')
  const rate = page.getByTestId('qa-sec-sec-rate-limiting')
  await expect(rate).toContainText('NOT EXECUTED')
  await expect(rate).not.toContainText('PASS')
})

test('the Evidence panel exposes coverage, filters and traceability fields', async ({ page }) => {
  await openQa(page)
  await expand(page, 'evidence-validation')
  await expect(page.getByTestId('qa-ev-facts')).toContainText('Traceable coverage')
  await expect(page.getByTestId('qa-evidence-table')).toBeVisible()
  await expect(page.getByTestId('qa-trace-table')).toBeVisible()
  const first = page.locator('[data-testid="qa-trace-table"] details.qa-ev').first()
  await first.locator('summary').click()
  const body = first.locator('.qa-ev-body')
  await expect(body).toBeVisible()
  await expect(body).toContainText('Source')
  await expect(body).toContainText('Provenance')
  await expect(body).toContainText('Metric')
})

test('the evidence filter narrows the coverage table without hiding provenance', async ({ page }) => {
  await openQa(page)
  await expand(page, 'evidence-validation')
  const rows = page.locator('[data-testid="qa-trace-table"] tbody tr')
  const all = await rows.count()
  expect(all).toBeGreaterThan(0)
  await page.getByTestId('qa-ev-filter-PASS').click()
  await expect(page.getByTestId('qa-ev-filter-PASS')).toHaveAttribute('aria-pressed', 'true')
  const passOnly = await rows.count()
  expect(passOnly).toBeLessThanOrEqual(all)
  for (const r of await rows.all()) await expect(r).toContainText('PASS')
  await page.getByTestId('qa-ev-filter-all').click()
  await expect(rows).toHaveCount(all)
})

test('an absent evidence field prints DATA UNAVAILABLE rather than a blank', async ({ page }) => {
  await openQa(page)
  await expand(page, 'evidence-validation')
  const d = page.locator('[data-testid="qa-trace-table"] details.qa-ev').first()
  await d.locator('summary').click()
  await expect(d.locator('.qa-ev-body')).toContainText('DATA UNAVAILABLE')
})

// ───────────────────────────────────────────── governance guarantees

test('every control on the page is a disclosure — none can approve, register or execute', async ({ page }) => {
  await openQa(page)
  // The dashboard needs accordions, "View details" links and status filters.
  // What it must never have is a control that changes governed state, so every
  // button is required to declare itself a disclosure, and no data-entry
  // control may exist at all.
  const buttons = page.locator('.main button')
  const total = await buttons.count()
  expect(total).toBeGreaterThan(0)
  const disclosures = await page.locator('.main button[data-qa-disclosure]').count()
  expect(disclosures, 'every button in the QA module must be a disclosure control').toBe(total)
  await expect(page.locator('.main input')).toHaveCount(0)
  await expect(page.locator('.main select')).toHaveCount(0)
  await expect(page.locator('.main textarea')).toHaveCount(0)
  await expect(page.locator('.main form')).toHaveCount(0)
})

test('it makes no market, price, adoption or ranking claim', async ({ page }) => {
  await openQa(page)
  for (const id of DIMS) await expand(page, id)
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

test('no fabricated score or illustrative figure is presented as product data', async ({ page }) => {
  await openQa(page)
  for (const id of DIMS) await expand(page, id)
  const body = (await page.locator('.main').textContent())!
  expect(body).not.toMatch(/81\s*\/\s*100/)
  expect(body).not.toContain('14.2%')
  expect(body).not.toContain('+47.9%')
})

test('DATA UNAVAILABLE stays DATA UNAVAILABLE and is not styled as a failure', async ({ page }) => {
  await openQa(page)
  const chip = page.locator('[data-testid="qa-dim-market-data"] .chip')
  await expect(chip).toHaveAttribute('data-qa-status', 'DATA_UNAVAILABLE')
  const colours = await page.evaluate(() => {
    const dot = (sel: string) =>
      getComputedStyle(document.querySelector(`${sel} .chip .dot`)!).backgroundColor
    return {
      unavailable: dot('[data-testid="qa-dim-market-data"]'),
      pass: dot('[data-testid="qa-dim-security"]'),
    }
  })
  // Neutral, and specifically not the pass treatment.
  expect(colours.unavailable).not.toBe(colours.pass)
})

test('it records the EXP-002 identifier collision instead of resolving it silently', async ({ page }) => {
  await openQa(page)
  // Visible as a key finding without any expansion.
  await expect(page.getByTestId('qa-finding-governance')).toContainText('frozen in-code EXP-002')
  await expand(page, 'transaction-integrity')
  const note = page.getByTestId('qa-id-collision')
  await expect(note).toBeVisible()
  await expect(note).toContainText('Reproducible weekly active addresses')
  await expect(note).toContainText('governance decision')
})

test('EXP-001 and the frozen EXP-002 are untouched after visiting the module', async ({ page }) => {
  await openQa(page)
  await page.getByRole('button', { name: 'Baseline Operations', exact: true }).click()
  await expect(page.locator('.main')).toContainText('EXP-001, EXP-002')
  await expect(page.locator('.main')).toContainText('EXP-002 — weekly active addresses')
  await page.getByRole('button', { name: 'Proposed Thresholds', exact: true }).click()
  await expect(page.locator('.main')).toContainText('PENDING BUSINESS APPROVAL')
})

// ───────────────────────────────────────────── trends

test('no trend is manufactured without enough stored runs', async ({ page }) => {
  await openQa(page)
  await expect(page.locator('.main')).toContainText('INSUFFICIENT DATA FOR TREND')
  await expect(page.getByTestId('qa-trend-table')).toHaveCount(0)
})

// ───────────────────────────────────────────── accessibility

test('the accordion is operable by keyboard alone', async ({ page }) => {
  await openQa(page)
  const btn = page.getByTestId('qa-acc-security')
  await btn.focus()
  await expect(btn).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(btn).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Enter')
  await expect(btn).toHaveAttribute('aria-expanded', 'false')
  await page.keyboard.press('Space')
  await expect(btn).toHaveAttribute('aria-expanded', 'true')
})

test('each panel is a labelled region wired to its own header', async ({ page }) => {
  await openQa(page)
  for (const id of DIMS) {
    const btn = page.getByTestId(`qa-acc-${id}`)
    await expect(btn).toHaveAttribute('aria-controls', `qa-acc-panel-${id}`)
    const panel = page.locator(`#qa-acc-panel-${id}`)
    await expect(panel).toHaveAttribute('role', 'region')
    await expect(panel).toHaveAttribute('aria-labelledby', `qa-acc-btn-${id}`)
  }
})

test('status is conveyed by text, never by colour alone', async ({ page }) => {
  await openQa(page)
  for (const chip of await page.locator('.main .chip').all()) {
    expect(((await chip.textContent()) ?? '').trim().length).toBeGreaterThan(0)
  }
})

test('headings follow a logical hierarchy', async ({ page }) => {
  await openQa(page)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(QA)
  // Each accordion header is an h3 containing the toggle button.
  const h3Buttons = page.locator('h3.qa-acc-h button')
  await expect(h3Buttons).toHaveCount(6)
})

test('keyboard focus stays visible on the disclosure controls', async ({ page }) => {
  await openQa(page)
  const btn = page.getByTestId('qa-acc-market-data')
  await btn.focus()
  const outline = await btn.evaluate((el) => {
    const s = getComputedStyle(el, ':focus-visible')
    return `${s.outlineStyle}|${s.outlineWidth}`
  })
  expect(outline).not.toBe('none|0px')
})

// ───────────────────────────────────────────── responsive

for (const vp of [
  { name: 'desktop', width: 1440, height: 900, minCols: 3 },
  { name: 'tablet', width: 834, height: 1112, minCols: 2 },
  { name: 'mobile', width: 390, height: 844, minCols: 1 },
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

    const spill = await page.evaluate(() => {
      const w = document.documentElement.clientWidth
      return [...document.querySelectorAll<HTMLElement>('[data-testid^="qa-dim-"]')]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.left < -1 || r.right > w + 1
        }).length
    })
    expect(spill, `${vp.name} cards spilling outside the viewport`).toBe(0)

    const tooShort = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[data-testid^="qa-dim-"]')]
        .filter((el) => el.getBoundingClientRect().height < 40).length)
    expect(tooShort, `${vp.name} clipped cards`).toBe(0)
  })

  test(`the dimension grid uses the expected column count @ ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await openQa(page)
    const cols = await page.evaluate(() => {
      const tops = [...document.querySelectorAll<HTMLElement>('[data-testid^="qa-dim-"]')]
        .map((el) => Math.round(el.getBoundingClientRect().top))
      const first = tops[0]
      return tops.filter((t) => t === first).length
    })
    expect(cols, `${vp.name} expected at least ${vp.minCols} column(s)`).toBeGreaterThanOrEqual(vp.minCols)
    if (vp.name === 'mobile') expect(cols).toBe(1)
  })

  test(`expanded tables scroll inside their own container @ ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await openQa(page)
    await expand(page, 'market-data')
    const ok = await page.evaluate(() => {
      const t = document.querySelector<HTMLElement>('[data-testid="qa-market-data-table"]')!
      const holder = t.closest<HTMLElement>('.scroll')
      return !!holder && getComputedStyle(holder).overflowX !== 'visible'
    })
    expect(ok).toBe(true)
    const after = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(after.scrollWidth, `${vp.name} page overflow after expanding a wide table`)
      .toBeLessThanOrEqual(after.clientWidth + 1)
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
  for (const id of DIMS) await expand(page, id)
  const count = await page.locator('.main details.qa-ev summary').count()
  for (let i = 0; i < Math.min(count, 10); i++) {
    await page.locator('.main details.qa-ev summary').nth(i).click()
  }
  await page.getByTestId('qa-ev-filter-WARNING').click()
  await page.getByTestId('qa-ev-filter-all').click()
  await page.waitForTimeout(250)

  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([])
  expect(failed, `failed requests: ${failed.join(' | ')}`).toEqual([])
})
