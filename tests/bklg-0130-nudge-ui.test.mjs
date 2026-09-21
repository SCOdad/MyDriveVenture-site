import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../staging/nudge/index.html',import.meta.url),'utf8');
const config=fs.readFileSync(new URL('../staging/nudge/config.js',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../staging/nudge/nudge.js',import.meta.url),'utf8');

assert.match(config,/\/staging\/nudge\//);
assert.match(config,/DV_LIFECYCLE_NUDGE_ENDPOINT/);
assert.match(html,/What would Drive Venture send next\?/);
assert.match(js,/eligible_superseded/,'Nudge UI must distinguish eligible-but-superseded recipients');
assert.match(js,/selected/);
assert.match(js,/suppressed/);
assert.match(js,/action:'save_template'/,'Nudge UI must save immutable message versions through the backend');
assert.match(js,/\[\[\$\{esc\(token\)\}\]\]/,'Nudge editor must surface distinctive token chips');
assert.match(js,/Resolved email/,'Nudge UI must show recipient-specific resolved previews');
assert.match(js,/action:'update_rule'/,'Nudge UI must expose safe priority/enabled changes');
assert.doesNotMatch(js,/send_live|send_test|recipient_person_ids/,'Staged Nudge UI must not expose delivery controls');
assert.match(html,/id="nudge-signin-email"/,'Dedicated Nudge surface must provide its own Operator email sign-in field');
assert.match(js,/persistSession:false/,'OTP request must use a session-independent auth client');
assert.match(js,/emailRedirectTo:location\.origin\+'\/staging\/nudge\/'/,'Nudge magic link must return directly to the dedicated surface');
assert.match(js,/Sign-in request timed out/,'Nudge sign-in request must fail visibly instead of hanging indefinitely');

const authReturn=fs.readFileSync(new URL('../assets/js/log-auth-return.js',import.meta.url),'utf8');
assert.match(authReturn,/\/staging\/nudge\//,'Drive Venture login must allow return to staged Nudge Operator');
console.log('BKLG-0130 dedicated Nudge Operator UI regression checks passed');
