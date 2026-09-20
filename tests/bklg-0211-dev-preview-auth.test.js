const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const envSource = fs.readFileSync('assets/js/environment-config.js','utf8');
const dashboardSource = fs.readFileSync('assets/js/log-dashboard-entry-v5.js','utf8');
const authReturnSource = fs.readFileSync('assets/js/log-auth-return.js','utf8');

function loadEnvironment(hostname) {
  const window = { location: { hostname } };
  vm.runInNewContext(envSource, { window, URL, Set, Object, Error, String });
  return window.DV_ENVIRONMENT_CONFIG;
}

test('BKLG-0211 Cloudflare branch previews are pinned to the DEV Supabase project', () => {
  for (const host of [
    'mydriveventure-dev.pages.dev',
    'bklg-0211-dev-preview-auth.mydriveventure-dev.pages.dev',
    'abcdef12.mydriveventure-dev.pages.dev'
  ]) {
    const config = loadEnvironment(host);
    assert.equal(config.name,'dev');
    assert.equal(config.projectRef,'safwylxxhywbsfxpmchd');
  }
});

test('BKLG-0211 production hosts remain pinned to PROD', () => {
  for (const host of ['mydriveventure.com','www.mydriveventure.com','log.mydriveventure.com']) {
    const config = loadEnvironment(host);
    assert.equal(config.name,'prod');
    assert.equal(config.projectRef,'cayoyqwrmouxuttloemc');
  }
});

test('BKLG-0211 unknown hosts remain fail-closed', () => {
  assert.throws(() => loadEnvironment('preview.attacker.example'), /refuses unknown deployment host/);
});

test('BKLG-0211 ordinary magic links request the current preview origin', () => {
  assert.match(
    dashboardSource,
    /emailRedirectTo:\`\$\{window\.location\.origin\}\$\{redirectPath\}\`/
  );
  assert.match(dashboardSource,/shouldCreateUser:false/);
});

test('BKLG-0211 authenticated return links stay on the current origin', () => {
  assert.match(
    authReturnSource,
    /const redirect=\`\$\{location\.origin\}\/log\/\?return=\$\{encodeURIComponent\(target\)\}\`/
  );
  assert.match(authReturnSource,/u\.origin===location\.origin/);
  assert.match(authReturnSource,/familyReturn/);
  assert.match(authReturnSource,/operatorLeadsReturn/);
});

test('BKLG-0211 source does not introduce a client-side DEV auth bypass', () => {
  const joined = envSource + '\n' + dashboardSource + '\n' + authReturnSource;
  assert.doesNotMatch(joined,/service[_-]?role/i);
  assert.doesNotMatch(joined,/pretend.*auth|bypass.*auth|dev.*password/i);
});
