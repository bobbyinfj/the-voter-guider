// Render given URLs directly (no link following); save innerText + image alts
import { chromium } from 'playwright'
import fs from 'node:fs'
const [sitesJson, outDir] = process.argv.slice(2)
const sites = JSON.parse(fs.readFileSync(sitesJson, 'utf8'))
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
const today = new Date().toISOString().slice(0, 10)
for (const [id, url] of Object.entries(sites)) {
  const page = await ctx.newPage()
  try {
    const r = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2500)
    for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 4000); await page.waitForTimeout(250) }
    const text = await page.evaluate(() => document.body.innerText)
    const imgs = await page.$$eval('img[alt]', (is) => is.map((i) => i.alt.trim()).filter(Boolean))
    const status = r ? r.status() : 0
    if (status >= 400 || /not found|404/i.test(text.slice(0, 600))) { console.log(id, 'MISSING', status); await page.close(); continue }
    fs.writeFileSync(`${outDir}/${id}.direct.txt`, `URL ${page.url()}\nHOME ${url}\nRETRIEVED ${today}\n${text}\n\n=== IMAGE ALT TEXT\n${imgs.join('\n')}\n`)
    console.log(id, 'OK', page.url(), text.length, (text.match(/endors/gi) || []).length)
  } catch (e) { console.log(id, 'ERROR', String(e).slice(0, 80)) }
  await page.close()
}
await browser.close()
