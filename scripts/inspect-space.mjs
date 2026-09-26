// Inspección runtime de /space: mide transferencia de red, errores de consola
// y saca un screenshot. Uso: node scripts/inspect-space.mjs [url]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const url = process.argv[2] ?? 'http://localhost:4174/space'
mkdirSync('shots', { recursive: true })

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

const consoleErrors = []
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200))
})
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message.slice(0, 200)}`))

const responses = []
page.on('response', async (r) => {
  try {
    const headers = r.headers()
    let len = parseInt(headers['content-length'] ?? '0', 10)
    if (!len) {
      const body = await r.body().catch(() => null)
      len = body ? body.length : 0
    }
    responses.push({ url: r.url(), len, ct: headers['content-type'] ?? '?' })
  } catch {}
})

await page.goto(url, { waitUntil: 'load', timeout: 60000 })
await page.waitForTimeout(6000)
await page.mouse.wheel(0, 900)
await page.waitForTimeout(2500)
await page.screenshot({ path: 'shots/space-top.png' })
await page.mouse.wheel(0, 2600)
await page.waitForTimeout(2500)
await page.screenshot({ path: 'shots/space-mid.png' })

const title = await page.title()
const big = responses
  .filter((r) => r.len > 30_000)
  .sort((a, b) => b.len - a.len)
  .map((r) => ({ kb: Math.round(r.len / 1024), url: r.url.replace(/^https?:\/\/[^/]+/, ''), ct: r.ct }))
const totalKb = Math.round(responses.reduce((acc, r) => acc + r.len, 0) / 1024)
console.log(JSON.stringify({ title, totalKb, big, consoleErrors }, null, 2))
await browser.close()
