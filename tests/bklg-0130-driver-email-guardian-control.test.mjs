import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../family/index.html',import.meta.url),'utf8');
const family=fs.readFileSync(new URL('../assets/js/family.js',import.meta.url),'utf8');
const cards=fs.readFileSync(new URL('../assets/js/family-card-profile.js',import.meta.url),'utf8');
const nudge=fs.readFileSync(new URL('../operator/nudge/nudge.js',import.meta.url),'utf8');

assert.match(html,/name="driver_lifecycle_email_enabled"[^>]*checked/,'new-driver flow must disclose and capture guardian-controlled lifecycle email preference');
assert.match(html,/you control this optional setting/i,'new-driver disclosure must explain guardian control');
assert.match(family,/driver_lifecycle_email_enabled=fd\.get\('driver_lifecycle_email_enabled'\)==='on'/,'family submit must send explicit boolean authorization');
assert.match(family,/data-card-email-pref-action/,'driver card must expose lifecycle email control');
assert.match(cards,/driver_email_preference/,'family cards must load driver lifecycle email preference');
assert.match(cards,/set_driver_email_preference/,'family cards must update driver lifecycle email preference');
assert.match(cards,/family grown-up can turn these messages back on/i,'driver opt-out state must explain guardian control');
assert.match(nudge,/Guardian setting:/,'Operator diagnostics must show the guardian-managed setting');
assert.match(nudge,/Driver opt-out:/,'Operator diagnostics must show driver opt-out state');
assert.doesNotMatch(nudge,/Driver consent:/,'Operator must not present affirmative driver consent as a current requirement');

console.log('BKLG-0130 guardian-managed driver email UI checks passed');
