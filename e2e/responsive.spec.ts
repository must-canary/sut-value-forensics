import { test, expect, type Page } from '@playwright/test'

const SCREENS = [
  'Executive Dashboard', 'Crash Investigations', 'Market Analysis', 'On-Chain Forensics',
  'Exchange & Liquidity', 'Hypothesis Lab', 'Evidence', 'Improvement Backlog',
  'Improvement Opportunities', 'Experiment Execution', 'Baseline Operations',
  'Proposed Thresholds', 'Pre-Registration', 'Baseline History',
  'Experiment Guide', 'Daily Market Sync', 'Value Improvement Lab', 'Reports', 'Settings',
] as const

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'tablet-1024', width: 1024, height: 900 },
  { name: 'mobile-390', width: 390, height: 844 },
] as const

/** Report elements that spill past the document width, ignoring intentional scrollers. */
async function overflowReport(page: Page) {
  return page.evaluate(() => {
    const docW = document.documentElement.clientWidth
    const bad: string[] = []
    document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.width <= 0 || r.right <= docW + 1) return
      let p: HTMLElement | null = el
      while (p) {
        const cs = getComputedStyle(p)
        if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return
        p = p.parentElement
      }
      if (getComputedStyle(el).position === 'fixed') return
      bad.push(`${el.tagName}.${(el.className || '').toString().split(' ')[0] || '(none)'} right=${Math.round(r.right)}>${docW}`)
    })
    return { bad: bad.slice(0, 8), scrollW: document.documentElement.scrollWidth, clientW: docW }
  })
}

/** Detect text clipped by a fixed-height ancestor. */
async function clippedReport(page: Page) {
  return page.evaluate(() => {
    const bad: string[] = []
    document.querySelectorAll<HTMLElement>('.tile, .chip, .card > h3, .main h2').forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === 'hidden') {
        bad.push(`${el.tagName}.${(el.className || '').toString().split(' ')[0]} clipped`)
      }
    })
    return bad.slice(0, 8)
  })
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    test(`all screens render with no overflow or clipping @ ${vp.name}`, async ({ page }) => {
      const errs: string[] = []
      page.on('pageerror', (e) => errs.push(e.message))
      page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })

      await page.goto('/')
      for (const s of SCREENS) {
        await page.getByRole('button', { name: s, exact: true }).click()
        await expect(page.getByRole('heading', { level: 2 })).toContainText(s)
        await expect(page.locator('.card').first()).toBeVisible()

        const o = await overflowReport(page)
        expect(o.bad, `${vp.name} / ${s}: overflowing -> ${o.bad.join(' | ')}`).toHaveLength(0)
        expect(o.scrollW, `${vp.name} / ${s}: horizontal page scroll`).toBeLessThanOrEqual(o.clientW + 1)

        const c = await clippedReport(page)
        expect(c, `${vp.name} / ${s}: clipped -> ${c.join(' | ')}`).toHaveLength(0)

        await page.screenshot({
          path: `e2e/screenshots/${vp.name}/${s.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`,
          fullPage: false,
        })
      }
      expect(errs, errs.join('\n')).toHaveLength(0)
    })

    test(`navigation is reachable and usable @ ${vp.name}`, async ({ page }) => {
      await page.goto('/')
      const nav = page.locator('.nav button')
      await expect(nav).toHaveCount(SCREENS.length)
      // every nav control must be visible and large enough to tap
      for (let i = 0; i < SCREENS.length; i++) {
        const b = nav.nth(i)
        await expect(b).toBeVisible()
        const box = (await b.boundingBox())!
        expect(box.height, `${vp.name}: nav item ${i} too short to tap`).toBeGreaterThanOrEqual(28)
      }
      await page.getByRole('button', { name: 'Reports', exact: true }).click()
      await expect(page.getByRole('heading', { level: 2, name: 'Reports' })).toBeVisible()
    })

    test(`charts stay inside their container @ ${vp.name}`, async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Market Analysis', exact: true }).click()
      const cards = page.locator('.card', { has: page.locator('svg') })
      const n = await cards.count()
      expect(n).toBeGreaterThan(0)
      for (let i = 0; i < n; i++) {
        const card = cards.nth(i)
        const cb = (await card.boundingBox())!
        const sb = (await card.locator('svg').boundingBox())!
        expect(sb.x + sb.width, `${vp.name}: chart ${i} spills past its card`).toBeLessThanOrEqual(cb.x + cb.width + 1)
      }
    })
  })
}

test.describe('mobile-specific behaviour', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('wide tables scroll inside their own container, not the page @ mobile-390', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Evidence', exact: true }).click()
    const scroller = page.locator('.scroll').first()
    await expect(scroller).toBeVisible()
    const canScroll = await scroller.evaluate((el) => el.scrollWidth > el.clientWidth)
    expect(canScroll, 'the evidence table should scroll inside .scroll on mobile').toBe(true)
    const pageScrolls = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    expect(pageScrolls, 'the page itself must not scroll horizontally').toBe(false)
  })

  test('DATA UNAVAILABLE and conflict states stay visible @ mobile-390', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Exchange & Liquidity', exact: true }).click()
    await expect(page.locator('.na-box')).toContainText('DATA UNAVAILABLE')
    await page.getByRole('button', { name: 'Evidence', exact: true }).click()
    await expect(page.locator('.card', { hasText: 'Data conflicts' })).toContainText('C14')
  })

  test('report causal guard holds @ mobile-390', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Reports', exact: true }).click()
    await expect(page.locator('.warn')).toContainText('No human reviewer has recorded a causal conclusion')
    const text = await page.locator('.main').innerText()
    expect(text.toLowerCase()).not.toContain('crashed because')
  })
})

// ═══════════════════════════════════════════════════ chart label collisions

const CHART_SCREENS = ['Market Analysis', 'On-Chain Forensics', 'Exchange & Liquidity'] as const

for (const vp of VIEWPORTS) {
  test.describe(`chart label collisions @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    test(`no overlapping SVG text labels @ ${vp.name}`, async ({ page }) => {
      await page.goto('/')
      for (const screen of CHART_SCREENS) {
        await page.getByRole('button', { name: screen, exact: true }).click()
        await expect(page.getByRole('heading', { level: 2 })).toContainText(screen)
        const collisions = await page.evaluate(() => {
          const out: string[] = []
          document.querySelectorAll('svg').forEach((svg, si) => {
            const texts = Array.from(svg.querySelectorAll('text'))
            for (let i = 0; i < texts.length; i++) {
              for (let j = i + 1; j < texts.length; j++) {
                const a = texts[i]!.getBoundingClientRect()
                const b = texts[j]!.getBoundingClientRect()
                if (a.width === 0 || b.width === 0) continue
                const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left)
                const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
                if (overlapX > 1 && overlapY > 1) {
                  out.push(`svg#${si}: "${texts[i]!.textContent}" x "${texts[j]!.textContent}"`)
                }
              }
            }
          })
          return out.slice(0, 6)
        })
        expect(collisions, `${vp.name} / ${screen}: overlapping labels -> ${collisions.join(' | ')}`).toHaveLength(0)
      }
    })
  })
}
