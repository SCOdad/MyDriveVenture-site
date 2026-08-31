import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const asset = relative => path.join(root, relative);

async function loadConsoleFixture(page, practiceValues = [1, 3, 50, 100]) {
  await page.setContent(`<!doctype html><html data-experience="game"><body class="game-v2" style="margin:0;background:#101719">
    <main class="dashboard-console" style="--dv-driver-shadow:#5f1b1b;--dv-driver-base:#a43a3a;--dv-driver-bright:#e45b5b;--dv-driver-highlight:#ff9a8b;width:760px;margin:180px auto 20px">
      <article class="radio-panel" style="width:520px;margin:auto">
        <div class="radio-head"><span>GPS / INFOTAINMENT</span><b>MISSION CONTROL</b></div>
        <div class="radio-display">TEST ROUTE<div class="mission-progress"><i style="width:50%"></i></div></div>
        <div class="radio-controls"><i></i><i></i><i></i><em>DV 50.0</em></div>
      </article>
    </main>
    <section id="gauge-fixtures" style="display:grid;grid-template-columns:repeat(4,240px);gap:12px;padding:20px">
      ${practiceValues.map(value => `<article class="gauge journey-gauge" data-value="${value}" style="--practice-p:${value}"><div class="gauge-arc"><div class="gauge-core"><span>JOURNEY</span><strong>${value}%</strong><small>HOURS</small></div></div></article>`).join('')}
    </section>
  </body></html>`);
  await page.addStyleTag({ path: asset('assets/css/log-dashboard-v3.css') });
  await page.addStyleTag({ path: asset('assets/css/driver-palettes.css') });
  await page.addStyleTag({ path: asset('assets/css/log-game-v2-color.css') });
}

test.describe('BKLG-0090 deterministic visual regression', () => {
  test('tutorial arrow remains centered on the palette gear', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1000, height: 760 });
    await loadConsoleFixture(page);
    await page.addScriptTag({ path: asset('assets/js/driver-palettes.js') });
    await page.addScriptTag({ path: asset('assets/js/log-game-v2-color.js') });
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('dv:dashboard-rendered', { detail: {
      driverId: 'visual-fixture',
      driver: { person_id: 'person-fixture', display_name: 'Visual Fixture', favorite_color: 'GREEN' },
      model: { driver_access: [{ driver_id: 'visual-fixture', mode: 'MANAGE' }] }
    }})));

    const gear = page.locator('#dv-palette-toggle');
    const arrow = page.locator('#dv-palette-coachmark i');
    await expect(gear).toBeVisible();
    await expect(arrow).toBeVisible();
    const [gearBox, arrowBox] = await Promise.all([gear.boundingBox(), arrow.boundingBox()]);
    expect(gearBox).not.toBeNull();
    expect(arrowBox).not.toBeNull();
    const gearCenter = gearBox.x + gearBox.width / 2;
    const arrowCenter = arrowBox.x + arrowBox.width / 2;
    expect(Math.abs(gearCenter - arrowCenter)).toBeLessThanOrEqual(2);
    expect(arrowBox.y + arrowBox.height).toBeLessThanOrEqual(gearBox.y + 3);
    await testInfo.attach('palette-tutorial-desktop', { body: await page.locator('.radio-panel').screenshot(), contentType: 'image/png' });
  });

  test('Journey gauge stays proportional at low, middle, and full values', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1100, height: 440 });
    await loadConsoleFixture(page);
    const backgrounds = await page.locator('.journey-gauge .gauge-arc').evaluateAll(arcs => arcs.map(arc => getComputedStyle(arc).backgroundImage));
    for (const background of backgrounds) {
      expect(background).toContain('from 270deg at 50% 100%');
      expect(background).toContain('180deg');
    }
    const stops = await page.locator('.journey-gauge .gauge-arc').evaluateAll(arcs => arcs.map(arc => {
      const value = Number(arc.closest('[data-value]').dataset.value);
      return { value, expectedDegrees: value * 1.8, background: getComputedStyle(arc).backgroundImage };
    }));
    expect(stops.map(stop => stop.expectedDegrees)).toEqual([1.8, 5.4, 90, 180]);
    for (const stop of stops) expect(stop.background).toContain(`${stop.expectedDegrees}deg`);
    const progressColor = await page.locator('.radio-display .mission-progress i').evaluate(element => getComputedStyle(element).backgroundColor);
    expect(progressColor).toBe('rgb(228, 91, 91)');
    const gaugeEvidence = testInfo.outputPath('journey-gauge-1-3-50-100.png');
    await page.locator('#gauge-fixtures').screenshot({ path: gaugeEvidence });
    await testInfo.attach('journey-gauge-1-3-50-100', { path: gaugeEvidence, contentType: 'image/png' });
  });

  test('Profile secondary actions, progress, and section rule use the driver palette', async ({ page }) => {
    await page.setContent(`<!doctype html><body data-dv-driver-color="red" style="--dv-driver-highlight:#ff9a8b;--dv-driver-base:#a43a3a;--dv-driver-shadow:#5f1b1b;background:#202d38">
      <main class="profile-shell"><section class="form-card"><p class="step-label">SIGN-IN &amp; MESSAGING</p><button class="button primary">Save profile</button><button class="button secondary">Change email</button><button class="button license-confirm">Confirm</button><div class="license-progress"><span style="width:50%"></span></div></section></main>
    </body>`);
    await page.addStyleTag({ path: asset('assets/css/site.css') });
    await page.addStyleTag({ path: asset('assets/css/profile.css') });
    await page.addStyleTag({ path: asset('assets/css/driver-palettes.css') });
    const colors = await page.evaluate(() => {
      const read = selector => getComputedStyle(document.querySelector(selector));
      return {
        primary: read('.button.primary').backgroundColor,
        secondary: read('.button.secondary').backgroundColor,
        confirm: read('.license-confirm').backgroundColor,
        progress: read('.license-progress span').backgroundColor,
        rule: read('.step-label').borderBottomColor
      };
    });
    expect(new Set(Object.values(colors))).toEqual(new Set(['rgb(255, 154, 139)', 'rgb(164, 58, 58)']));
    expect(colors.primary).toBe(colors.secondary);
    expect(colors.secondary).toBe(colors.confirm);
    expect(colors.confirm).toBe(colors.progress);
  });
});
