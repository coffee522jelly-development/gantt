const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });

  // input dates
  await page.fill('#project-start', '2026-06-21');
  await page.fill('#project-end', '2026-07-21');

  // click toggle
  await page.click('#theme-toggle-btn');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'dark-mode-dates.png' });
  await browser.close();
})();
