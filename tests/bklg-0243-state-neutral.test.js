import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');

test('BKLG-0243 retires public waitlist acquisition', async () => {
  const [redirects, waitlistPage, home] = await Promise.all([
    read('_redirects'),
    read('waitlist/index.html'),
    read('index.html'),
  ]);
  assert.match(redirects, /\/waitlist\/\s+\/join\/\s+301/);
  assert.match(waitlistPage, /location\.replace\('\/join\//);
  assert.doesNotMatch(home, /href="\/waitlist\//);
  assert.match(home, /Drive logging is available nationwide/);
});

test('BKLG-0243 removes waitlist operations from Operator Home', async () => {
  const [operatorHtml, dashboard] = await Promise.all([
    read('operator/index.html'),
    read('operator/dashboard.js'),
  ]);
  assert.doesNotMatch(operatorHtml, /id="waitlist"/);
  assert.doesNotMatch(operatorHtml, /waitlist_additions/);
  assert.doesNotMatch(dashboard, /renderWaitlist|saveEligibility|waitlist_additions|Waitlist communication failures/);
});

test('BKLG-0243 keeps Operator links in the canonical dropdown', async () => {
  const header = await read('assets/js/canonical-header.js');
  for (const path of [
    '/operator/',
    '/operator/feedback/',
    '/operator/backlog/',
    '/operator/dictionary/',
    '/operator/quests/',
    '/operator/classification/',
    '/operator/themes/',
    '/operator/visual-assets/',
    '/operator/nudge/',
  ]) assert.match(header, new RegExp(path.replaceAll('/', '\\/')));
  assert.doesNotMatch(header, /operator\/waitlist/i);
});

test('BKLG-0243 state-neutral cockpit uses product goals, not license claims', async () => {
  const [entry, log] = await Promise.all([
    read('assets/js/log-dashboard-entry-v5.js'),
    read('log/index.html'),
  ]);
  assert.match(entry, /STATE_NEUTRAL_PRACTICE_GOAL_HOURS=50/);
  assert.match(entry, /STATE_NEUTRAL_NIGHT_GOAL_HOURS=10/);
  assert.match(entry, /State-neutral/);
  assert.match(entry, /Check your state rules/);
  assert.match(entry, /if\(neutral\|\|hasLicense\)return true/);
  assert.match(log, /id="hours-sign-label"/);
  assert.match(log, /id="night-goal-label"/);
});
