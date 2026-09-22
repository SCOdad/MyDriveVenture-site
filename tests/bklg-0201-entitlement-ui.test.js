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

const source = fs.readFileSync(path.join(root, 'assets/js/log-entitlements.js'), 'utf8');
assert(source.includes("const EXHAUSTED_CODE = 'DV_FREE_DRIVE_LIMIT_REACHED'"), 'entitlement adapter must recognize canonical exhausted-family code');
assert(source.includes('recovery.isAmbiguous = patched'), 'entitlement adapter must patch save-recovery ambiguity classification');
assert(source.includes('document.addEventListener(\'submit\', guardSubmit, true)'), 'entitlement adapter must capture blocked new-drive submits before the RPC handler');
assert(source.includes('document.addEventListener(\'click\''), 'entitlement adapter must also intercept exhausted submit clicks in capture phase');
assert(source.includes('function setDriveFormBlocked(blocked)'), 'exhausted new-drive mode must disable the new-drive input controls, not only intercept submit');
assert(source.includes("form.dataset.dvEntitlementBlocked = unavailable ? 'true' : 'false'"), 'drive form must expose entitlement-blocked state for UAT/debugging');
assert(source.includes("el.dataset.dvEntitlementOriginalDisabled"), 'entitlement block must preserve prior disabled state before disabling controls');
assert(source.includes("submit.style.setProperty('display', unavailable ? 'none' : '', unavailable ? 'important' : '')"), 'exhausted new-drive mode must force-hide the submit affordance even if CSS overrides hidden');
assert(source.includes('function isEditMode()'), 'submit affordance blocking must distinguish new-drive mode from edit mode');
assert(source.includes('function showEntitlementStatusMessage()'), 'blocked click/submit must show entitlement copy, not fail silently');
assert(source.includes('new MutationObserver'), 'entitlement adapter must resync if another script re-renders or re-enables the form');
assert(source.includes("attributeFilter: ['hidden', 'disabled', 'style', 'data-edit-drive']"), 'entitlement observer must watch affordance/edit-mode attributes');
assert(source.includes("window.addEventListener('dv:drive-edit-mode'"), 'entitlement adapter must resync the submit affordance when edit mode changes');
assert(source.includes("window.addEventListener('dv:dashboard-rendered'"), 'entitlement adapter must resync after dashboard/form scripts render');
assert(source.includes("client.rpc('get_family_entitlement_status_v1'"), 'entitlement adapter must use canonical entitlement status RPC');
assert(source.includes("normalizeInvokeResult(name, await original(name, options))"), 'entitlement adapter must normalize drive-ops entitlement denial responses');
assert(source.includes('function patchPdfFetch()'), 'entitlement adapter must normalize structured PDF/export errors before existing export UI renders them');
assert(source.includes("url.includes('/functions/v1/driving-log-renderer')"), 'PDF/export error normalizer must be scoped to the driving-log renderer');
assert(source.includes("headers.set('content-type', 'application/json')"), 'PDF/export error normalizer must return a JSON response for existing export error handling');

console.log('BKLG-0201 entitlement UI source contract passed');
