// Render each campaign site in the bundled Chromium, follow its endorsements link, save innerText
import { chromium } from 'playwright'
import fs from 'node:fs'
const [sitesJson, outDir] = process.argv.slice(2)
const sites = JSON.parse(fs.readFileSync(sitesJson, 'utf8'))
fs.mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
const today = new Date().toISOString().slice(0, 10)
const host = (u) => new URL(u).hostname.replace(/^www\./, '')
for (const [id, site] of Object.entries(sites)) {
  const page = await ctx.newPage()
  try {
    const home = site.startsWith('http') ? site : 'https://' + site
    await page.goto(home, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2500)
    const finalHome = page.url()
    const links = await page.$$eval('a[href]', (as) => as.map((a) => ({ href: a.href, text: a.innerText.trim() })))
    const sameSite = (u) => { try { return host(u) === host(finalHome) } catch { return false } }
    const cand = links.filter((l) => /endors/i.test(l.href + ' ' + l.text) && sameSite(l.href) && !/endorsed-candidates/i.test(l.href))
    let url = 'none', text
    const pick = cand.find((l) => /endorsements?\/?$/i.test(new URL(l.href).pathname)) ?? cand[0]
    if (pick) {
      await page.goto(pick.href.split('#')[0], { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(2500)
      // lazy-loaded lists
      for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 4000); await page.waitForTimeout(250) }
      url = page.url()
    }
    text = await page.evaluate(() => document.body.innerText)
    const imgs = await page.$$eval('img[alt]', (is) => is.map((i) => i.alt.trim()).filter(Boolean))
    fs.writeFileSync(`${outDir}/${id}.txt`, `URL ${url}\nHOME ${finalHome}\nRETRIEVED ${today}\n${text}\n\n=== IMAGE ALT TEXT\n${imgs.join('\n')}\n`)
    console.log(id, url === 'none' ? `NO PAGE (home ${finalHome}, endorse mentions ${(text.match(/endors/gi) || []).length})` : url, text.length)
  } catch (e) {
    console.log(id, 'ERROR', site, String(e).slice(0, 100))
  }
  await page.close()
}
await browser.close()
