/**
 * Sidebar layout: the navigation list is the only scroll region, and the
 * footer (research status + attribution) stays visible at all times.
 */
import { test, expect, type Page } from '@playwright/test'

const FOOTER = 'Created & Idea by Magha Ram'

/** Box geometry plus scroll metrics for the sidebar's parts. */
async function sidebarMetrics(page: Page) {
  return page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>('.nav')!
    const scroller = document.querySelector<HTMLElement>('.nav-scroll')!
    const freeze = document.querySelector<HTMLElement>('.nav .freeze')!
    const attribution = document.querySelector<HTMLElement>('.nav .attribution')!
    const box = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height }
    }
    return {
      viewport: { w: document.documentElement.clientWidth, h: document.documentElement.clientHeight },
      nav: { ...box(nav), scrollHeight: nav.scrollHeight, clientHeight: nav.clientHeight, overflowY: getComputedStyle(nav).overflowY },
      scroller: {
        ...box(scroller), scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight,
        scrollTop: scroller.scrollTop, overflowY: getComputedStyle(scroller).overflowY,
      },
      freeze: box(freeze),
      attribution: box(attribution),
    }
  })
}

const inViewport = (b: { top: number; bottom: number }, vh: number) => b.top >= 0 && b.bottom <= vh + 1

test('the footer text exists and the navigation list is the scroll region', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.nav .freeze')).toContainText('Research frozen 2026-09-30')
  await expect(page.locator('.nav .freeze')).toContainText('Mechanism supported; initiating catalyst unresolved')
  await expect(page.locator('.nav .attribution')).toHaveText(FOOTER)

  const m = await sidebarMetrics(page)
  // the list overflows and scrolls…
  expect(m.scroller.overflowY).toBe('auto')
  expect(m.scroller.scrollHeight).toBeGreaterThan(m.scroller.clientHeight)
  // …while the sidebar itself does not scroll at all
  expect(m.nav.overflowY).toBe('hidden')
  expect(m.nav.scrollHeight).toBeLessThanOrEqual(m.nav.clientHeight + 1)
})

test('the scroll region ends before the footer and never overlaps it', async ({ page }) => {
  await page.goto('/')
  const m = await sidebarMetrics(page)
  expect(m.scroller.bottom).toBeLessThanOrEqual(m.freeze.top + 1)
  expect(m.freeze.bottom).toBeLessThanOrEqual(m.nav.bottom + 1)
  expect(inViewport(m.attribution, m.viewport.h)).toBe(true)
})

for (const vp of [
  { name: 'desktop normal height', width: 1440, height: 900 },
  { name: 'desktop short viewport', width: 1440, height: 520 },
  { name: 'very short viewport (zoomed)', width: 1280, height: 380 },
  { name: 'tablet', width: 1024, height: 700 },
]) {
  test(`footer stays visible while the navigation scrolls @ ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/')

    const before = await sidebarMetrics(page)
    expect(inViewport(before.attribution, before.viewport.h), 'footer visible before scrolling').toBe(true)

    // scroll the navigation list to its end
    await page.locator('.nav-scroll').evaluate((el) => { el.scrollTop = el.scrollHeight })
    const after = await sidebarMetrics(page)

    expect(after.scroller.scrollTop, 'the list actually scrolled').toBeGreaterThan(0)
    await expect(page.locator('.nav .attribution')).toHaveText(FOOTER)
    expect(inViewport(after.attribution, after.viewport.h), 'footer still visible after scrolling').toBe(true)
    // the footer did not move with the scroll
    expect(Math.abs(after.freeze.top - before.freeze.top)).toBeLessThanOrEqual(1)
    expect(after.scroller.bottom).toBeLessThanOrEqual(after.freeze.top + 1)

    // the last navigation item is reachable
    const settings = page.getByRole('button', { name: 'Settings', exact: true })
    await expect(settings).toBeVisible()
    const box = (await settings.boundingBox())!
    expect(box.y + box.height).toBeLessThanOrEqual(after.freeze.top + 1)
    await settings.click()
    await expect(page.getByRole('heading', { level: 2 })).toContainText('Settings')
    await expect(page.locator('.nav .attribution')).toBeVisible()
  })
}

test('every navigation item remains reachable and clickable after the change', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 520 })
  await page.goto('/')
  const buttons = page.locator('.nav button')
  const count = await buttons.count()
  // the exact roster is asserted in app.spec; here the point is that every one
  // of them stays reachable once the list scrolls inside its own container
  expect(count).toBeGreaterThan(10)
  for (let i = 0; i < count; i++) {
    await buttons.nth(i).scrollIntoViewIfNeeded()
    await buttons.nth(i).click()
    await expect(page.locator('.nav button').nth(i)).toHaveAttribute('aria-current', 'true')
    await expect(page.locator('.nav .attribution')).toBeVisible()
  }
})

test('no horizontal overflow and no second sidebar scrollbar', async ({ page }) => {
  for (const vp of [{ width: 1440, height: 900 }, { width: 1440, height: 420 }, { width: 1024, height: 700 }]) {
    await page.setViewportSize(vp)
    await page.goto('/')
    const m = await sidebarMetrics(page)
    // the sidebar is not itself scrollable in either axis
    expect(m.nav.scrollHeight, `nav scrolls @ ${vp.height}`).toBeLessThanOrEqual(m.nav.clientHeight + 1)
    const horizontal = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      nav: (() => {
        const el = document.querySelector<HTMLElement>('.nav-scroll')!
        return el.scrollWidth > el.clientWidth + 1
      })(),
    }))
    expect(horizontal.page, `page scrolls horizontally @ ${vp.width}x${vp.height}`).toBe(false)
    expect(horizontal.nav, `nav list scrolls horizontally @ ${vp.width}x${vp.height}`).toBe(false)
  }
})

test('the stacked mobile layout keeps the footer and needs no inner scroller', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const m = await sidebarMetrics(page)
  // below 900px the page scrolls, so the sidebar has no inner scroll region
  expect(m.scroller.overflowY).toBe('visible')
  expect(m.nav.overflowY).toBe('visible')
  await expect(page.locator('.nav .attribution')).toHaveText(FOOTER)
  await expect(page.locator('.nav .freeze')).toContainText('Research frozen 2026-09-30')
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible()
  const scrolls = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  expect(scrolls).toBe(false)
})
