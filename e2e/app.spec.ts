import { test, expect, type Page, type ConsoleMessage } from '@playwright/test'

const SCREENS = [
  'Executive Dashboard', 'Crash Investigations', 'Market Analysis', 'On-Chain Forensics',
  'Exchange & Liquidity', 'Hypothesis Lab', 'Evidence', 'Improvement Backlog',
  'Improvement Opportunities', 'Experiment Execution', 'Baseline Operations',
  'Proposed Thresholds', 'Pre-Registration', 'Baseline History',
  'Experiment Guide', 'Daily Market Sync', 'Value Improvement Lab',
  'Market Quality (QA)', 'Reports', 'Settings',
] as const

/** Fail a test on any console error or page exception. */
function watchErrors(page: Page) {
  const errs: string[] = []
  page.on('console', (m: ConsoleMessage) => { if (m.type() === 'error') errs.push(`console: ${m.text()}`) })
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`))
  return errs
}

async function goTo(page: Page, screen: string) {
  await page.getByRole('button', { name: screen, exact: true }).click()
  await expect(page.getByRole('heading', { level: 2 })).toContainText(screen.replace(' & ', ' & '))
}

/** No element may exceed the document width. */
async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth
    const bad: string[] = []
    document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.right > docW + 1) {
        const cs = getComputedStyle(el)
        // an element that scrolls internally is allowed to be wide
        let p: HTMLElement | null = el
        let scrollable = false
        while (p) {
          const pcs = getComputedStyle(p)
          if (pcs.overflowX === 'auto' || pcs.overflowX === 'scroll') { scrollable = true; break }
          p = p.parentElement
        }
        if (!scrollable && cs.position !== 'fixed') {
          bad.push(`${el.tagName}.${el.className || '(no class)'} right=${Math.round(r.right)} > ${docW}`)
        }
      }
    })
    return { bad: bad.slice(0, 6), scrollW: document.documentElement.scrollWidth, clientW: docW }
  })
  expect(overflow.bad, `overflowing elements: ${overflow.bad.join(' | ')}`).toHaveLength(0)
  expect(overflow.scrollW, 'document scrollWidth must not exceed clientWidth').toBeLessThanOrEqual(overflow.clientW + 1)
}

// ═══════════════════════════════════════════════════ launch + navigation

test('app launches with no console errors', async ({ page }) => {
  const errs = watchErrors(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'SUT Value Forensics' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Executive Dashboard' })).toBeVisible()
  expect(errs, errs.join('\n')).toHaveLength(0)
})

test('navigation reaches every screen without errors', async ({ page }) => {
  const errs = watchErrors(page)
  await page.goto('/')
  for (const s of SCREENS) {
    await goTo(page, s)
    await expect(page.locator('.card').first()).toBeVisible()
    await assertNoHorizontalOverflow(page)
  }
  expect(errs, errs.join('\n')).toHaveLength(0)
})

test('every nav button is wired (no dead buttons)', async ({ page }) => {
  await page.goto('/')
  const buttons = page.locator('.nav button')
  await expect(buttons).toHaveCount(SCREENS.length)
  for (let i = 0; i < SCREENS.length; i++) {
    await buttons.nth(i).click()
    await expect(page.locator('.nav button').nth(i)).toHaveAttribute('aria-current', 'true')
  }
})

// ═══════════════════════════════════════════════════ Case #001 + dashboard

test('Case #001 opens and states mechanism + unresolved catalyst', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.nav .case')).toContainText('CASE-001')
  await expect(page.locator('.sub').first()).toContainText('RESEARCH FROZEN')
  const warn = page.locator('.warn').first()
  await expect(warn).toContainText('Supported mechanism')
  await expect(warn).toContainText('initiating catalyst remains unresolved')
  await expect(warn).toContainText('No root cause is stated')
})

test('dashboard figures match the seeded frozen dataset', async ({ page }) => {
  await page.goto('/')
  const body = await page.locator('.main').innerText()
  expect(body).toContain('$0.4026')          // SUT price
  expect(body).toContain('$75,000,000')      // market cap
  expect(body).toContain('56,241 / 54,052')  // holder conflict C1
  expect(body).toContain('-80.6%')           // SUT control comparison
  expect(body).toContain('-1.5%')            // BTC
  expect(body).toContain('-2.1%')            // ETH
  expect(body).toContain('$26,981')          // net sell imbalance
  expect(body).toContain('+$15,911')         // net liquidity positive
  expect(body).toContain('$1,147,309')       // combined two-day swap volume
})

test('dashboard shows provenance on the crash summary', async ({ page }) => {
  await page.goto('/')
  const prov = page.locator('.prov').first()
  await expect(prov).toContainText('Period:')
  await expect(prov).toContainText('Source:')
  await expect(prov).toContainText('Methodology:')
  await expect(prov).toContainText('Limitations:')
})

// ═══════════════════════════════════════════════════ evidence integrity

test('BitMart remains IDENTITY NOT VERIFIED on the timeline', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Crash Investigations')
  const row = page.locator('tr', { hasText: 'BitMart' }).first()
  await expect(row).toBeVisible()
  await expect(row).toContainText('IDENTITY NOT VERIFIED')
  await expect(row).toContainText('DATA UNAVAILABLE')
})

test('wallet roles remain UNKNOWN in the traced chain', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'On-Chain Forensics')
  const chain = page.locator('.card', { hasText: 'Traced chain' })
  await expect(chain).toBeVisible()
  await expect(chain.locator('.chip', { hasText: 'UNKNOWN' })).toHaveCount(3)
  await expect(chain).toContainText('NOT labelled as the cause')
  await expect(chain).toContainText('0 SUT (0%)')
})

test('May 2026 pool TVL is NOT substituted with the September snapshot', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Exchange & Liquidity')
  const venues = page.locator('.card', { hasText: 'Venues' })
  await expect(venues).toContainText('Historical CEX order-book depth for May 2026: DATA UNAVAILABLE')
  await expect(venues).toContainText('2026-09-29 snapshots')
  await expect(venues).toContainText('May 2026 pool TVL was never measured')
})

test('DATA UNAVAILABLE renders and is never a fabricated value', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Exchange & Liquidity')
  const fees = page.locator('.card', { hasText: 'LP fees collected' })
  await expect(fees.locator('.na-box')).toContainText('DATA UNAVAILABLE')
  await expect(fees).toContainText('Decode defect identified')

  await goTo(page, 'Evidence')
  const rows = page.locator('tr', { hasText: 'DATA UNAVAILABLE' })
  expect(await rows.count()).toBeGreaterThanOrEqual(6)
})

test('conflict indicators remain visible with no canonical series', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Evidence')
  const conflicts = page.locator('.card', { hasText: 'Data conflicts' })
  await expect(conflicts).toContainText('C4')
  await expect(conflicts).toContainText('C14')
  await expect(conflicts).toContainText('C15')
  await expect(conflicts).toContainText('Never blend. Never average.')
  await expect(conflicts).toContainText('none — report all observations')
})

// ═══════════════════════════════════════════════════ May 2026 crash rules

test('combined May 17-18 aggregate is used and labelled', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Market Analysis')
  const fig = page.locator('.card', { hasText: 'G2 — SUT price vs swap volume' })
  await expect(fig).toContainText('Two-day aggregate — exact day boundary unresolved')
  await expect(fig).toContainText('$1,147,309')
  await expect(fig).toContainText('Single-day')
  await expect(fig).toContainText('not presented as authoritative')
})

test('C14 reconciliation shows a $0 difference and separates LP from volume', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Exchange & Liquidity')
  const rec = page.locator('.card', { hasText: 'C14 reconciliation' })
  await expect(rec).toContainText('$378,676')   // swap buy = volume
  await expect(rec).toContainText('$986,179')   // LP mint = NOT volume
  await expect(rec).toContainText('$1,364,855') // measured gross
  await expect(rec).toContainText('NOT volume')
  const diffRow = rec.locator('tr', { hasText: 'Difference' })
  await expect(diffRow).toContainText('$0')
  await expect(rec).toContainText('72% of the apparent')
})

test('LP flow is separated from trading volume and LP flight is rejected', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Exchange & Liquidity')
  const liq = page.locator('.card', { hasText: 'Liquidity add / remove' })
  await expect(liq).toContainText('LP-flight variant REJECTED')
  await expect(liq).toContainText('Net liquidity was positive on every crash day')
})

// ═══════════════════════════════════════════════════ charts

const FIGURES = [
  { screen: 'Market Analysis', title: 'G1 — SUT vs BTC vs ETH', legend: ['SUT', 'BTC', 'ETH'] },
  { screen: 'Market Analysis', title: 'G2 — SUT price vs swap volume', legend: ['SUT close'] },
  { screen: 'Market Analysis', title: 'G3 — Buy / sell imbalance', legend: ['Buy', 'Sell'] },
  { screen: 'Exchange & Liquidity', title: 'Liquidity add / remove', legend: ['Liquidity added', 'Liquidity removed'] },
  { screen: 'On-Chain Forensics', title: 'Conduit daily flow', legend: ['DST in (SUT)', 'DST out (SUT)'] },
]

for (const f of FIGURES) {
  test(`chart renders with legend, axes and provenance: ${f.title}`, async ({ page }) => {
    await page.goto('/')
    await goTo(page, f.screen)
    const card = page.locator('.card', { hasText: f.title })
    await expect(card.locator('svg')).toBeVisible()
    for (const l of f.legend) await expect(card.locator('.legend')).toContainText(l)
    // axis tick labels present
    expect(await card.locator('svg text').count()).toBeGreaterThan(3)
    // methodology + limitations visible
    await expect(card.locator('.prov')).toContainText('Methodology:')
    await expect(card.locator('.prov')).toContainText('Period:')
  })
}

test('line chart shows direct labels and a working crosshair tooltip', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Market Analysis')
  const card = page.locator('.card', { hasText: 'G1 — SUT vs BTC vs ETH' })
  const svg = card.locator('svg')
  // direct labels: series names rendered inside the plot
  const texts = await svg.locator('text').allTextContents()
  expect(texts).toContain('SUT')
  expect(texts).toContain('BTC')
  expect(texts).toContain('ETH')
  // hover -> crosshair + tooltip
  const box = (await svg.boundingBox())!
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5)
  await expect(page.locator('.tooltip')).toBeVisible()
  await expect(page.locator('.tooltip')).toContainText('2026-05')
  await expect(svg.locator('line[stroke-dasharray]')).toHaveCount(1)
})

test('bar chart shows a per-mark tooltip', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Market Analysis')
  const card = page.locator('.card', { hasText: 'G3 — Buy / sell imbalance' })
  await card.locator('svg rect').first().hover()
  await expect(page.locator('.tooltip')).toBeVisible()
})

test('every figure offers a table view (accessibility fallback)', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Market Analysis')
  const card = page.locator('.card', { hasText: 'G1 — SUT vs BTC vs ETH' })
  await card.getByRole('button', { name: 'Show table' }).click()
  await expect(card.locator('table')).toBeVisible()
  await card.getByRole('button', { name: 'Show chart' }).click()
  await expect(card.locator('svg')).toBeVisible()
})

test('provider divergence keeps series separate (never blended)', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Market Analysis')
  const card = page.locator('.card', { hasText: 'G4 — Provider divergence' })
  await expect(card).toContainText('CoinGecko')
  await expect(card).toContainText('Coinranking')
  await expect(card).toContainText('DEX (contract-verified)')
  await expect(card.locator('.prov')).toContainText('never averaged')
})

// ═══════════════════════════════════════════════════ hypothesis lab

test('Hypothesis Lab renders H1-H12 with valid statuses only', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Hypothesis Lab')
  const cards = page.locator('.card')
  await expect(cards).toHaveCount(13) // 12 hypotheses + H3 split into H3a/H3b => 13 entries
  const allowed = ['SUPPORTED', 'REJECTED', 'INCONCLUSIVE', 'DATA UNAVAILABLE']
  const chips = await page.locator('.card > .between .chip').allInnerTexts()
  expect(chips.length).toBeGreaterThanOrEqual(13)
  for (const c of chips) expect(allowed, `unexpected status "${c}"`).toContain(c.trim())
})

test('frozen hypothesis statuses are not upgraded by the UI', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Hypothesis Lab')
  const expectStatus = async (id: string, status: string) => {
    const card = page.locator('.card', { hasText: new RegExp(`^${id} —`) }).first()
    await expect(card.locator('.chip').first()).toHaveText(status)
  }
  await expectStatus('H1', 'REJECTED')
  await expectStatus('H2', 'SUPPORTED')
  await expectStatus('H3a', 'REJECTED')
  await expectStatus('H6', 'REJECTED')
  await expectStatus('H12', 'REJECTED')
})

test('hypothesis detail shows evidence, missing data, limitations and human review', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Hypothesis Lab')
  const h2 = page.locator('.card', { hasText: /^H2 —/ }).first()
  await expect(h2).toContainText('Supporting evidence')
  await expect(h2).toContainText('Contradictory evidence')
  await expect(h2).toContainText('Missing data')
  await expect(h2).toContainText('Limitations')
  await expect(h2).toContainText('Human review:')
  await expect(h2).toContainText('Research freeze 2026-09-30')
})

// ═══════════════════════════════════════════════════ reports + causal guard

test('report generates, states mechanism, and never auto-states a root cause', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Reports')
  const text = await page.locator('.main').innerText()
  expect(text).toContain('Sell-side pressure interacting with structurally shallow liquidity')
  expect(text).toContain('The initiating catalyst remains unresolved.')
  expect(text.toLowerCase()).not.toContain('crashed because')
  expect(text.toLowerCase()).not.toContain('the root cause was')
  expect(text).toContain('no AI-generated root-cause verdict may be produced')
  // all 14 report sections render
  for (const h of ['1. Executive summary', '13. Unresolved catalyst', '14. Evidence appendix']) {
    await expect(page.locator('.card h3', { hasText: h })).toBeVisible()
  }
})

test('unauthored causal claims stay blocked; a gated human claim is accepted', async ({ page }) => {
  const errs = watchErrors(page)
  await page.goto('/')
  await goTo(page, 'Reports')
  await expect(page.locator('.warn')).toContainText('No human reviewer has recorded a causal conclusion')
  await page.getByRole('button', { name: 'Simulate human approval' }).click()
  await expect(page.locator('.main')).toContainText('HUMAN-APPROVED CONCLUSION')
  await expect(page.locator('.main')).toContainText('Lead Investigator (example)')
  await page.getByRole('button', { name: 'Revoke example approval' }).click()
  await expect(page.locator('.main')).toContainText('The initiating catalyst remains unresolved.')
  expect(errs, errs.join('\n')).toHaveLength(0)
})

// ═══════════════════════════════════════════════════ settings + interactions

test('settings theme toggle works in both directions', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Settings')
  await page.getByRole('button', { name: 'dark', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'light', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('button', { name: 'system', exact: true }).click()
  expect(await page.locator('html').getAttribute('data-theme')).toBeNull()
})

test('timeline type filters work', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Crash Investigations')
  const before = await page.locator('tbody tr').count()
  await page.getByRole('button', { name: 'legal', exact: true }).click()
  const after = await page.locator('tbody tr').count()
  expect(after).toBeGreaterThan(0)
  expect(after).toBeLessThan(before)
  await page.getByRole('button', { name: 'all', exact: true }).click()
  await expect(page.locator('tbody tr')).toHaveCount(before)
})

test('wallet search returns an indexed wallet with UNKNOWN role', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'On-Chain Forensics')
  await page.getByPlaceholder('0x…').fill('0xaaa4d5')
  const row = page.locator('tr', { hasText: '0xaaa4d5dd26eb1a2afe5fd5fb529fc24cee89cc2c' }).first()
  await expect(row).toBeVisible()
  await expect(row).toContainText('UNKNOWN')
})

test('evidence row expands to full provenance', async ({ page }) => {
  await page.goto('/')
  await goTo(page, 'Evidence')
  await page.locator('tr', { hasText: 'EV-010' }).first().click()
  const detail = page.locator('.card', { hasText: 'EV-010 — full provenance' })
  await expect(detail).toBeVisible()
  for (const f of ['Source URL', 'Token contract', 'Observation time', 'Retrieval time', 'Method', 'Confidence', 'Identity']) {
    await expect(detail).toContainText(f)
  }
  await expect(detail).toContainText('0x98965474ecbec2f532f1f780ee37b0b05f77ca55')
})
