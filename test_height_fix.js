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

  // Force re-render which happens naturally after adding subtasks
  await page.evaluate(() => {
     renderGantt();
  });

  const rowHeights = await page.evaluate(() => {
     const wrappers = document.querySelectorAll('.task-wrapper');
     return Array.from(wrappers).map(w => w.offsetHeight);
  });
  console.log("Wrapper Heights:", rowHeights);

  const barTops = await page.evaluate(() => {
     const bars = document.querySelectorAll('.gantt-bar');
     return Array.from(bars).map(b => b.style.top);
  });
  console.log("Bar Tops:", barTops);

  // Test expected fix
  const expectedTops = await page.evaluate(() => {
        const wrappers = document.querySelectorAll('.task-wrapper');
        const heights = Array.from(wrappers).map(w => w.offsetHeight);
        const HEADER_HEIGHT = 32;
        const ROW_HEIGHT = 48;

        let accumulatedHeight = HEADER_HEIGHT;
        let expected = [];
        for (let i = 0; i < heights.length; i++) {
            expected.push(`${accumulatedHeight + (ROW_HEIGHT - 32)/2}px`);
            accumulatedHeight += heights[i];
        }
        return expected;
  });
  console.log("Expected Tops:", expectedTops);

  await browser.close();
})();
