import { test, type Page } from '@playwright/test'

/** Deliberate screenshot capture for the QA report. Not an assertion suite. */

const DESKTOP = ['Executive Dashboard', 'Crash Investigations', 'Hypothesis Lab', 'Evidence'] as const
const MOBILE = ['Executive Dashboard', 'Crash Investigations', 'Hypothesis Lab'] as const

const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase()

async function shoot(page: Page, screen: string, dir: string) {
  await page.getByRole('button', { name: screen, exact: true }).click()
  await page.waitForTimeout(250)
  await page.screenshot({ path: `e2e/screenshots/${dir}/${slug(screen)}.png`, fullPage: true })
}

test.describe('desktop screenshots', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test('capture desktop screens', async ({ page }) => {
    await page.goto('/')
    for (const s of DESKTOP) await shoot(page, s, 'desktop-1440')
    // the fixed defect area, after fix
    await page.getByRole('button', { name: 'Exchange & Liquidity', exact: true }).click()
    await page.screenshot({ path: 'e2e/screenshots/desktop-1440/exchange-liquidity.png', fullPage: true })
  })
})

test.describe('mobile screenshots', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('capture mobile screens', async ({ page }) => {
    await page.goto('/')
    for (const s of MOBILE) await shoot(page, s, 'mobile-390')
    // AFTER-fix evidence for the two layout defects
    await page.getByRole('button', { name: 'Crash Investigations', exact: true }).click()
    await page.screenshot({ path: 'e2e/screenshots/defects/AFTER-mobile-crash-investigations.png', fullPage: false })
    await page.getByRole('button', { name: 'Evidence', exact: true }).click()
    await page.screenshot({ path: 'e2e/screenshots/defects/AFTER-mobile-evidence-tables.png', fullPage: false })
  })
})

test.describe('tablet screenshots', () => {
  test.use({ viewport: { width: 1024, height: 900 } })
  test('capture tablet defect area after fix', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Crash Investigations', exact: true }).click()
    await page.screenshot({ path: 'e2e/screenshots/defects/AFTER-tablet-crash-investigations.png', fullPage: false })
  })
})
