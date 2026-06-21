const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });

  // Add tasks
  await page.fill('#project-start', '2026-06-21');
  await page.fill('#project-end', '2026-07-21');
  await page.fill('#new-task-name', 'Accent Task');
  await page.click('#add-task-btn');

  // Create a subtask
  await page.fill('.task-wrapper input[placeholder="新しいサブタスク"]', 'Sub 1');
  await page.click('.task-wrapper button:has-text("追加")');

  // Mark subtask complete
  await page.check('.task-wrapper input[type="checkbox"]');

  // Set accent color to green (#10b981)
  await page.evaluate(() => {
    const picker = document.getElementById('accent-color-picker');
    picker.value = '#10b981';
    picker.dispatchEvent(new Event('input'));
  });

  await page.waitForTimeout(500);

  // Switch to Burnup
  await page.click('#tab-burnup');
  await page.waitForTimeout(500);

  // Take screenshot of burnup
  await page.screenshot({ path: 'accent-burnup2.png' });

  await browser.close();
})();
