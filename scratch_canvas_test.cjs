const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });

  await page.goto('https://wedding-cam-eight.vercel.app/folder/bc8d0636-41d9-4b65-b482-873beaf87b81');
  await page.waitForSelector('.media-grid-item', { timeout: 8000 });
  await page.locator('.media-grid-item').first().click();
  await page.waitForSelector('.media-viewer', { timeout: 3000 });
  await page.waitForTimeout(1500); // let prepareFile (canvas path) finish

  // Inspect whether the cache actually got a real File via canvas (can't access React internals directly,
  // but we can at least confirm no errors were thrown and the button is clickable without exceptions)
  await page.locator('.media-viewer-action[aria-label="שתף"]').click();
  await page.waitForTimeout(1000);
  console.log('No crash after clicking share');

  await browser.close();
  console.log('DONE');
})().catch((err) => { console.error('ERROR:', err); process.exit(1); });
