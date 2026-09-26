// Medición de jank durante el primer scroll de /space: cuenta frames largos
// (>50ms), peor frame y percentil 95. Uso: node scripts/measure-scroll-jank.mjs [url]
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:4174/space'

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto(url, { waitUntil: 'load', timeout: 60000 })
// Esperar boot completo de la escena (texturas + build por etapas).
await page.waitForTimeout(8000)

const stats = await page.evaluate(async () => {
  const deltas = []
  let last = performance.now()
  let raf = 0
  const loop = (t) => {
    deltas.push(t - last)
    last = t
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
  const start = performance.now()
  let y = 0
  while (performance.now() - start < 8000) {
    y += 45
    window.scrollTo({ top: y, behavior: 'instant' })
    await new Promise((r) => setTimeout(r, 16))
  }
  cancelAnimationFrame(raf)
  deltas.shift()
  const sorted = [...deltas].sort((a, b) => a - b)
  const longFrames = deltas.filter((d) => d > 50).length
  return {
    frames: deltas.length,
    avgMs: Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length),
    longFrames,
    longPct: Math.round((longFrames / deltas.length) * 100),
    worstMs: Math.round(sorted[sorted.length - 1]),
    p95Ms: Math.round(sorted[Math.floor(sorted.length * 0.95)]),
  }
})
console.log(JSON.stringify(stats))
await browser.close()
