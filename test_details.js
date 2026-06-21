const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });

  // Add task
  await page.fill('#project-start', '2026-06-21');
  await page.fill('#project-end', '2026-07-21');
  await page.fill('#new-task-name', 'Double Click Me');
  await page.click('#add-task-btn');

  // Double click task to open panel
  await page.dblclick('.task-wrapper .group');
  await page.waitForTimeout(500); // Wait for slide animation

  // Take screenshot of panel opened
  await page.screenshot({ path: 'panel-open.png' });

  // Edit details
  await page.fill('#detail-task-name', 'Edited Task Name');
  await page.keyboard.press('Enter'); // Trigger change event if needed
  await page.evaluate(() => document.getElementById('detail-task-name').dispatchEvent(new Event('change'))); // explicitly dispatch change

  await page.fill('#detail-task-tag-input', 'Tag1');
  await page.keyboard.press('Enter');

  await page.fill('#detail-task-notes', 'Some notes about this task.');

  // Take screenshot with details edited
  await page.screenshot({ path: 'panel-edited.png' });

  // Close panel
  await page.click('#close-detail-panel-btn');
  await page.waitForTimeout(500);

  // Re-open to verify persistence
  await page.dblclick('.task-wrapper .group');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'panel-reopened.png' });

  await browser.close();
})();
