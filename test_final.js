const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });

  // 1. Check Light Mode with Custom Color
  await page.fill('#project-start', '2026-06-21');
  await page.fill('#project-end', '2026-07-21');
  await page.fill('#new-task-name', 'Task Light');
  await page.click('#add-task-btn');

  await page.evaluate(() => {
    const picker = document.getElementById('accent-color-picker');
    picker.value = '#eab308'; // Yellow
    picker.dispatchEvent(new Event('input'));
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'final-light.png' });

  // 2. Check Dark Mode with another Custom Color
  await page.click('#theme-toggle-btn');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const picker = document.getElementById('accent-color-picker');
    picker.value = '#ec4899'; // Pink
    picker.dispatchEvent(new Event('input'));
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'final-dark.png' });

  // 3. Check Burn-up chart in dark mode
  await page.click('#tab-burnup');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'final-dark-burnup.png' });

  await browser.close();
})();
