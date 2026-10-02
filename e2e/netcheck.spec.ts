import { test, expect } from '@playwright/test'
test('no failed network requests caused by the app (favicon 404 fixed)', async ({ page }) => {
  const bad: string[] = []
  page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`) })
  page.on('requestfailed', (r) => bad.push(`FAILED ${r.url()}`))
  await page.goto('/')
  for (const s of ['Crash Investigations', 'Market Analysis', 'Evidence', 'Reports']) {
    await page.getByRole('button', { name: s, exact: true }).click()
  }
  await page.waitForTimeout(800)
  expect(bad, bad.join('\n')).toHaveLength(0)
})
