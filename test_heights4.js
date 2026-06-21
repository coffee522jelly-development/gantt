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

  const wrapperRects = await page.evaluate(() => {
     const wrappers = document.querySelectorAll('.task-wrapper');
     return Array.from(wrappers).map(w => w.getBoundingClientRect());
  });
  console.log("Wrapper Rects:", wrapperRects);

  const barRects = await page.evaluate(() => {
     const bars = document.querySelectorAll('.gantt-bar');
     return Array.from(bars).map(b => b.getBoundingClientRect());
  });
  console.log("Bar Rects:", barRects);

  await browser.close();
})();
