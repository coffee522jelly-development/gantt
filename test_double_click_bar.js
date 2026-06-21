const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });

  // Add task
  await page.fill('#project-start', '2026-06-21');
  await page.fill('#project-end', '2026-07-21');
  await page.fill('#new-task-name', 'Double Click Gantt Bar');
  await page.click('#add-task-btn');

  // Double click task bar to open panel
  await page.dblclick('.gantt-bar');
  await page.waitForTimeout(500); // Wait for slide animation

  // Take screenshot of panel opened
  await page.screenshot({ path: '/home/jules/verification/panel-open-from-bar.png' });

  await browser.close();
  console.log("Screenshot generated.");
})();
