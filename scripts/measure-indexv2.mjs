import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const [url, output, count = '3'] = process.argv.slice(2);
if (!url || !output) throw new Error('Usage: node scripts/measure-indexv2.mjs URL output.json [runs]');
const browser = await chromium.launch({ channel: 'chrome' });
const runs = [];
for (let i = 0; i < Number(count); i++) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750, connectionType: 'cellular4g' });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let bytes = 0; const failures = [];
  cdp.on('Network.loadingFinished', e => bytes += e.encodedDataLength);
  page.on('requestfailed', r => failures.push({url:r.url(),error:r.failure()?.errorText}));
  await page.addInitScript(() => {
    window.metrics = { lcp: 0, cls: 0 };
    new PerformanceObserver(list => { for (const e of list.getEntries()) { window.metrics.lcp = e.startTime; window.metrics.lcpElement = e.element?.outerHTML?.slice(0,250); } }).observe({type:'largest-contentful-paint',buffered:true});
    new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.metrics.cls += e.value; }).observe({type:'layout-shift',buffered:true});
  });
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(5000);
  runs.push(await page.evaluate(() => ({ ...window.metrics, fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime, resources: performance.getEntriesByType('resource').map(r => ({name:r.name,duration:r.duration,bytes:r.transferSize})) })));
  Object.assign(runs.at(-1), {bytes, failures});
  console.log(JSON.stringify({run:i+1,lcp:runs.at(-1).lcp,cls:runs.at(-1).cls,bytes,failures}));
  await context.close();
}
const result = {url, browser:browser.version(), conditions:{viewport:'390x844',dpr:1,coldCache:true,latencyMs:150,downloadBytesPerSecond:200000,uploadBytesPerSecond:93750,cpuSlowdown:4,settleAfterLoadMs:5000}, runs};
writeFileSync(output,JSON.stringify(result,null,2));
await browser.close();
