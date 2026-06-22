const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });

  // Add task 1
  await page.fill('#new-task-name', 'Task 1');
  await page.click('#add-task-btn');

  // Add subtasks
  for(let i=0; i<5; i++) {
     await page.fill('.task-wrapper[data-id] input[placeholder="新しいサブタスク"]', `Sub ${i}`);
     await page.click('.task-wrapper[data-id] button:has-text("追加")');
  }

  // Go to burnup
  await page.click('#tab-burnup');
  await page.waitForTimeout(500);

  // Dump ideal data calculation
  const planData = await page.evaluate(() => {
     return calculateBurnUpData().planData;
  });
  console.log("Plan Data:", planData);

  await browser.close();
})();
