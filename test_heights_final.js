const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });

  // Add task 1
  await page.fill('#new-task-name', 'Task 1');
  await page.click('#add-task-btn');

  // Add task 2
  await page.fill('#new-task-name', 'Task 2');
  await page.click('#add-task-btn');

  // Add subtask to Task 1
  await page.fill('.task-wrapper[data-id] input[placeholder="新しいサブタスク"]', 'Sub 1');
  await page.click('.task-wrapper[data-id] button:has-text("追加")');

  // Take screenshot to see alignment
  await page.screenshot({ path: '/home/jules/verification/heights-aligned.png', fullPage: true });

  await browser.close();
  console.log("Screenshot generated.");
})();
