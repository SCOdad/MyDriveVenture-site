import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../operator/nudge/index.html',import.meta.url),'utf8');
const config=fs.readFileSync(new URL('../operator/nudge/config.js',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../operator/nudge/nudge.js',import.meta.url),'utf8');

assert.match(config,/\/operator\/nudge\//);
assert.match(config,/DV_LIFECYCLE_NUDGE_ENDPOINT/);
assert.match(html,/What would Drive Venture send next\?/);
assert.match(html,/earlier-sequence message/,'Operator copy must describe sequence rather than higher\/lower priority');
assert.match(js,/eligible_superseded/,'Nudge UI must distinguish eligible-but-superseded recipients');
assert.match(js,/selected/);
assert.match(js,/suppressed/);
assert.match(js,/action:'save_template'/,'Nudge UI must save immutable message versions through the backend');
assert.match(js,/\[\[\$\{esc\(token\)\}\]\]/,'Nudge editor must surface distinctive token chips');
assert.match(js,/Resolved email/,'Nudge UI must show recipient-specific resolved previews');
assert.match(js,/resolved-email-frame/,'Resolved email must render the actual outbound HTML in a sandboxed preview frame');
assert.match(js,/set_runtime_enabled/,'Operator must expose the server-enforced lifecycle pause\/active control');
assert.match(html,/nudge-runtime-enabled/,'Operator must render the global lifecycle delivery state control');
assert.match(js,/key:'COACHING'/,'Operator sequence model must expose the 300–699 coaching class');
assert.match(js,/action:'update_rule'/,'Nudge UI must expose safe enabled-state changes');
assert.match(js,/action:'reorder_rules'/,'Nudge UI must reorder through the server sequence contract');
assert.match(js,/SEQUENCE_CLASSES/,'Nudge UI must present the approved sequence classes');
assert.match(js,/nudge-drag-handle/,'Nudge UI must expose drag-to-reorder controls');
assert.match(js,/Another message selected/,'Nudge UI must use recipient-friendly supersession language');
assert.match(js,/WEEKLY_COMMUNICATION_CAP_USED/,'Operator must explain weekly-cap suppression');
assert.match(js,/Weekly Certification/,'Certification suppression copy must identify the weekly certification workflow');
assert.match(js,/system-managed-badge/,'Sequence 10 must be visibly system-managed');
assert.match(js,/data-reorderable="\$\{managed\?'false':'true'\}"/,'System communications must be excluded from reorder persistence');
assert.match(js,/Rule controls/,'System communication rule controls must be presented read-only');
assert.match(js,/Monday · 3 PM local/,'Certification schedule must be visible in Operator');
assert.doesNotMatch(js,/rule-priority/,'Nudge UI must not require raw priority-number editing');
assert.doesNotMatch(js,/send_live|send_test|recipient_person_ids/,'Operator Nudge UI must not expose delivery controls');
assert.match(html,/id="nudge-signin-email"/,'Dedicated Nudge surface must provide its own Operator email sign-in field');
assert.match(js,/persistSession:false/,'OTP request must use a session-independent auth client');
assert.match(js,/emailRedirectTo:location\.origin\+'\/log\/\?return='\+encodeURIComponent\('\/operator\/nudge\/'\)/,'Nudge magic link must use the proven log auth handoff before returning to the dedicated surface');
assert.doesNotMatch(js,/Promise\.race\(\[request/,'Nudge sign-in must not manufacture a client timeout while Supabase may still accept the request');
assert.match(js,/startOtpCooldown/,'Nudge sign-in must enforce a visible resend cooldown');
assert.match(js,/status\)===429/,'Nudge sign-in must handle Supabase magic-link rate limiting');

const authReturn=fs.readFileSync(new URL('../assets/js/log-auth-return.js',import.meta.url),'utf8');
assert.match(authReturn,/\/operator\/nudge\//,'Drive Venture login must allow return to canonical Nudge Operator');
console.log('BKLG-0130 dedicated Nudge Operator UI regression checks passed');

const operatorHome=fs.readFileSync(new URL('../operator/index.html',import.meta.url),'utf8');
assert.match(operatorHome,/href="\/operator\/nudge\/"/,'Operator home must link to the canonical Nudge Manager');
