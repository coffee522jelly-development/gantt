const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Serve via python server to ensure proper execution
  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });

  // Take screenshot of light mode
  await page.screenshot({ path: 'light-mode.png' });

  // Toggle to dark mode
  await page.click('#theme-toggle-btn');
  await page.waitForTimeout(1000);

  // Take screenshot of dark mode
  await page.screenshot({ path: 'dark-mode.png' });

  await browser.close();
})();
