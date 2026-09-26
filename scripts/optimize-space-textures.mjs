// Reoptimización one-shot de texturas de /space: webp + downscale.
// Cero dependencias: usa Chrome headless (playwright-core) para reencodar vía
// canvas.toDataURL('image/webp'). Uso: node scripts/optimize-space-textures.mjs
import { chromium } from 'playwright-core'
import { readFileSync, writeFileSync, statSync, unlinkSync, renameSync } from 'node:fs'

const dir = 'public/space'
// [origen, destino, ancho, calidad]
const jobs = [
  ['sun.jpg', 'sun.webp', 1024, 78],
  ['earth_atmos_2048.jpg', 'earth_atmos.webp', 2048, 80],
  ['earth_normal_2048.jpg', 'earth_normal.webp', 1024, 85],
  ['earth_specular_2048.jpg', 'earth_specular.webp', 1024, 80],
  ['earth_clouds_1024.png', 'earth_clouds.webp', 1024, 85],
  ['nebula.jpg', 'nebula.webp', 1280, 75],
  ['moon.webp', 'moon.webp', 512, 80],
  ['venus.webp', 'venus.webp', 512, 80],
  ['mars.webp', 'mars.webp', 512, 80],
]

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
})
const page = await browser.newPage()

let before = 0
let after = 0
for (const [from, to, width, q] of jobs) {
  const src = `${dir}/${from}`
  before += statSync(src).size
  const b64 = readFileSync(src).toString('base64')
  const dataUrl = await page.evaluate(
    async ({ b64, width, q }) => {
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = () => reject(new Error('decode failed'))
        img.src = `data:image/any;base64,${b64}`
      })
      const scale = Math.min(1, width / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const context = canvas.getContext('2d')
      context.drawImage(img, 0, 0, canvas.width, canvas.height)
      return canvas.toDataURL('image/webp', q / 100)
    },
    { b64, width, q },
  )
  // Los in-place (mismo nombre) pasan por un .tmp para no pisar el original.
  const tmp = to === from ? `${to}.tmp` : to
  writeFileSync(`${dir}/${tmp}`, Buffer.from(dataUrl.split(',')[1], 'base64'))
  if (to === from) {
    unlinkSync(src)
    renameSync(`${dir}/${tmp}`, `${dir}/${to}`)
  }
  const outSize = statSync(`${dir}/${to}`).size
  after += outSize
  console.log(`${from} -> ${to}: ${Math.round(outSize / 1024)}KB (${width}px, q${q})`)
}
await browser.close()
console.log(`TOTAL: ${Math.round(before / 1024)}KB -> ${Math.round(after / 1024)}KB`)
