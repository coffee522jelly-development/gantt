const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://127.0.0.1:4173/');

  // Add task 1
  await page.fill('input[placeholder="新しいタスク名"]', 'Task 1');
  await page.click('button:has-text("タスク追加")');

  // Set dates
  await page.fill('#project-start', '2026-06-21');
  await page.fill('#project-end', '2026-07-21');

  await page.waitForTimeout(500);

  // Take screenshot to see alignment
  await page.screenshot({ path: '/home/jules/verification/gantt-final-test.png', fullPage: true });

  await browser.close();
  console.log("Screenshot generated.");
})();
