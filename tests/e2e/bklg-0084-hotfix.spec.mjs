import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('long driver name wraps without pushing the dashboard out of view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setContent('<main class="dash-shell"><div class="app-topline"><div><p class="eyebrow">Driver console</p><h1 id="driver-heading">BKLG0084CreditDriverNameThatKeepsGoing</h1></div></div><section class="dashboard-console">Dashboard</section></main>');
  await page.addStyleTag({ path: path.join(root, 'assets/css/log-dashboard-v3.css') });

  const heading = await page.locator('#driver-heading').boundingBox();
  const dashboard = await page.locator('.dashboard-console').boundingBox();
  expect(heading).not.toBeNull();
  expect(dashboard).not.toBeNull();
  expect(heading.x + heading.width).toBeLessThanOrEqual(390);
  expect(dashboard.y).toBeLessThan(844);
});

test('failed drive save leaves logging state and restores the submit button', async ({ page }) => {
  await page.setContent(`
    <form id="drive-form">
      <input id="drive-date" value="2026-02-25">
      <input id="drive-start" value="10:00">
      <input id="drive-end" value="10:30">
      <select id="drive-vehicle"><option value="vehicle-1" selected>Vehicle</option></select>
      <input id="drive-lesson-notes">
      <select id="drive-supervisor"><option value="person-1" selected>Supervisor</option></select>
      <input id="drive-supervisor-other">
      <input id="drive-destination">
      <textarea id="drive-notes"></textarea>
      <button type="submit">Save drive</button>
      <div id="drive-status" class="app-status"></div>
    </form>
  `);
  await page.evaluate(() => {
    Object.defineProperty(window.crypto, 'randomUUID', { value: () => '00000000-0000-4000-8000-000000000084' });
    window.DV_DRIVING_LOG = { getSelectedLessonIds: () => [], updateNoteCount: () => {} };
    window.DV_LOG_APP = {
      client: { functions: { invoke: async () => ({ data: null, error: new Error('Drive date is before the permit date') }) } },
      getDriverId: () => 'driver-1',
      getRenderGeneration: () => 1,
    };
  });
  await page.addScriptTag({ path: path.join(root, 'assets/js/log-drive-rpc.js') });
  await page.locator('#drive-form button[type=submit]').click();

  await expect(page.locator('#drive-status')).toHaveClass(/error/);
  await expect(page.locator('#drive-status')).toContainText('Drive date is before the permit date');
  await expect(page.locator('#drive-status')).not.toContainText('Logging drive');
  await expect(page.locator('#drive-form button[type=submit]')).toBeEnabled();
  await expect(page.locator('#drive-form')).toHaveAttribute('aria-busy', 'false');
});
