const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const routes = ['log/index.html', 'log/DV00/index.html', 'log/DV02/index.html'];

for (const route of routes) {
  const html = fs.readFileSync(path.join(root, route), 'utf8');
  const entitlementIndex = html.indexOf('/assets/js/log-entitlements.js?v=20260922-0201-ui1');
  const recoveryIndex = html.indexOf('/assets/js/drive-save-recovery.js');
  const rpcIndex = html.indexOf('/assets/js/log-drive-rpc.js');

  assert(entitlementIndex > -1, `${route} must load the BKLG-0201 entitlement adapter`);
  assert(recoveryIndex > -1, `${route} must load drive-save recovery`);
  assert(rpcIndex > -1, `${route} must load drive RPC`);
  assert(recoveryIndex < entitlementIndex, `${route} must load entitlement adapter after recovery so it can patch ambiguity classification`);
  assert(entitlementIndex < rpcIndex, `${route} must load entitlement adapter before drive RPC binds submit handling`);
}

const wrapper = fs.readFileSync(path.join(root, 'assets/js/log-entitlements.js'), 'utf8');
const safePath = path.join(root, 'assets/js/log-entitlements-safe.js');
const usesSafeWrapper = wrapper.includes('/assets/js/log-entitlements-safe.js?v=20260922-0201-safe1');
const source = usesSafeWrapper && fs.existsSync(safePath) ? fs.readFileSync(safePath, 'utf8') : wrapper;
assert(source.includes('Drive Venture could not load family entitlement status'), 'entitlement adapter must fail visibly if entitlement status cannot load');
assert(source.includes("const EXHAUSTED_CODE = 'DV_FREE_DRIVE_LIMIT_REACHED'"), 'entitlement adapter must recognize canonical exhausted-family code');
assert(source.includes('recovery.isAmbiguous = patched'), 'entitlement adapter must patch save-recovery ambiguity classification');
assert(source.includes("client.rpc('get_family_entitlement_status_v1'"), 'entitlement adapter must use canonical entitlement status RPC');
assert(source.includes("getForm()?.querySelector('button[type=\"submit\"]')") || source.includes("form()?.querySelector('button[type=\"submit\"]')"), 'entitlement adapter must locate the visible save/submit control');
assert(source.includes('function setFieldsBlocked(unavailable)'), 'exhausted new-drive mode must disable the new-drive input controls, not only intercept submit');
assert(source.includes('function setActionControlsBlocked(unavailable)'), 'exhausted new-drive mode must manage save/delete affordances');
assert(source.includes("f.dataset.dvEntitlementBlocked = unavailable ? 'true' : 'false'"), 'drive form must expose entitlement-blocked state for UAT/debugging');
assert(source.includes('originalControlState = new WeakMap()'), 'entitlement block must preserve prior disabled/read-only state before disabling controls');
assert(source.includes("el.style.setProperty('display', 'none', 'important')") || source.includes("b.style.setProperty('display', 'none', 'important')"), 'exhausted new-drive mode must force-hide blocked action controls even if CSS overrides hidden');
assert(source.includes("document.getElementById('drive-delete')"), 'exhausted new-drive mode must hide stale delete controls outside real edit mode');
assert(source.includes('function writeDriveStatus()'), 'blocked click/submit must show entitlement copy, not fail silently');
assert(source.includes('new MutationObserver'), 'entitlement adapter must resync if another script re-renders or re-enables the form');
assert(source.includes("document.addEventListener('submit'"), 'entitlement adapter must capture blocked new-drive submits before the RPC handler');
assert(source.includes("document.addEventListener('click'"), 'entitlement adapter must also intercept exhausted submit/delete clicks in capture phase');
assert(source.includes("window.addEventListener('dv:drive-edit-mode'"), 'entitlement adapter must resync the submit affordance when edit mode changes');
assert(source.includes("window.addEventListener('dv:dashboard-rendered'"), 'entitlement adapter must resync after dashboard/form scripts render');
assert(source.includes("name === 'drive-ops'"), 'entitlement adapter must normalize drive-ops entitlement denial responses');

console.log('BKLG-0201 entitlement UI source contract passed');
