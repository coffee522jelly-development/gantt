const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://127.0.0.1:4173/');

  // Wait for the app to initialize
  await page.waitForTimeout(1000);

  await page.screenshot({ path: '/home/jules/verification/svelte-main.png', fullPage: true });

  // Try adding a task
  const taskInput = await page.locator('input[placeholder="新しいタスク名"]');
  await taskInput.fill('My New Svelte Task');
  const addTaskBtn = await page.locator('button:has-text("タスク追加")');
  await addTaskBtn.click();

  await page.waitForTimeout(500);
  await page.screenshot({ path: '/home/jules/verification/svelte-task-added.png', fullPage: true });

  await browser.close();
  console.log("Screenshots generated.");
})();
