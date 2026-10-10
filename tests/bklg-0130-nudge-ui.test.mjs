import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../operator/nudge/index.html',import.meta.url),'utf8');
const config=fs.readFileSync(new URL('../operator/nudge/config.js',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../operator/nudge/nudge.js',import.meta.url),'utf8');

assert.match(config,/\/operator\/nudge\//);
assert.match(config,/DV_LIFECYCLE_NUDGE_ENDPOINT/);
assert.match(html,/What would Drive Venture send next\?/);
assert.doesNotMatch(html,/higher-priority|lower-priority/i,'Operator copy must use sequence terminology rather than priority terminology');
assert.match(js,/group\.upcoming/,'Nudge UI must distinguish upcoming recipients');
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
assert.match(js,/WEEKLY_COMMUNICATION_CAP_USED/,'Nudge UI must explain when the shared weekly communication slot is already used');
assert.match(js,/Weekly Certification/,'Nudge UI must identify certification as a system communication');
assert.match(js,/data-system-managed/,'System communications must be marked read-only in the Operator UI');
assert.match(js,/system communications are fixed/,'Sequence help must explain that system communications cannot be reordered');
assert.match(js,/not\(\[data-system-managed="true"\]\)/,'Reorder payload must exclude fixed system communications');
assert.match(html,/Monday at 3 PM local/,'Operator copy must state the certification cadence');
assert.match(html,/Thursday lifecycle nudges/,'Operator copy must distinguish lifecycle cadence and pause semantics');
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

assert.match(js,/rule-grownup-audience/,'Canonical Operator rule editor must offer grown-up targeting');
assert.match(js,/rule-include-driver/,'Canonical Operator rule editor must offer independent driver targeting');
assert.match(js,/if\(grownup_audience==='NONE'&&!include_driver\)/,'Canonical Operator UI must reject no-recipient policy');
assert.match(js,/grownup_audience,include_driver/,'Canonical Operator must persist both recipient settings');

assert.match(js,/rule-delivery-timing/,'Canonical Operator must expose configurable milestone timing');
assert.match(js,/value="IMMEDIATE"/,'Immediate progress timing must be selectable');

assert.match(js,/Save Delivery Settings/,'Delivery configuration has its own save');
assert.match(js,/Save \${driver\?'Driver':'Grown-up'\} Message/,'Each role has a distinct template-save button');
assert.match(js,/data-audience="\${audience}"/,'Template save declares recipient audience');
assert.match(js,/snapshotEditors/,'Independent saves preserve unsaved other panels');
assert.match(js,/restoreEditors/,'Expanded card and unsaved changes are restored after a save');
assert.match(js,/DRIVER_TEMPLATE_NOT_CONFIGURED|driver_template_version/,'Operator must surface dedicated driver version');

const nudgeCss=fs.readFileSync(new URL('../operator/nudge/nudge.css',import.meta.url),'utf8');
assert.match(js,/nudge-record-flow/,'All four panels must share a parent record flow');
assert.match(js,/nudge-recipient-panel nudge-settings-panel/,'Recipient preview must be a fourth linked section');
assert.match(js,/data-sequence-class/,'Record must retain its existing sequence class');
assert.match(nudgeCss,/\.nudge-record-flow::before/,'Connected rail must be visible');
assert.match(nudgeCss,/\.nudge-record-flow>\.nudge-settings-panel::before/,'Panels must connect to the shared rail');
for(const key of ['CRITICAL_ACTIVATION','JOURNEY_PROGRESS','COACHING','FEATURE_ADOPTION','COMMUNITY_PRODUCT','REENGAGEMENT']){
  assert.ok(nudgeCss.includes('data-sequence-class="'+key+'"'),'Shared accent missing for '+key);
}
assert.match(nudgeCss,/max-width:540px/,'Record grouping must adapt to narrow screens');
assert.match(nudgeCss,/\.nudge-settings-panel \.button-primary,\.nudge-settings-panel \.rule-save/,'Save buttons retain standard yellow style');

assert.match(html,/id="nudge-asof"/,'Operator must accept a local as-of date/time');
assert.match(html,/nudge-asof-reset/,'Operator can return to current evaluation');
assert.match(js,/previewAsOf\?\{as_of:previewAsOf\}/,'As-of preview must explicitly send an ISO clock');
assert.match(js,/Ready \/ Selected/,'Ready group is explicit');
assert.match(js,/Upcoming \(\$\{upcoming.length\}\)/,'Unmet triggers are informative');
assert.match(js,/Blocked \/ Suppressed/,'Actual policy blocks have separate presentation');
assert.match(js,/preview_trigger_condition/,'Upcoming rows explain the specific trigger');
assert.match(js,/recipientList\(upcoming,'upcoming'\)/,'Upcoming messages retain recipient-specific previews');
assert.doesNotMatch(js,/send_live|send_test|recipient_person_ids/,'Operator must not expose sending controls');

assert.match(js,/nudge-not-applicable/,'Not Applicable must be collapsible');
assert.match(js,/recipientList\(notApplicable,'not_applicable'\)/,'Not Applicable must list recipients');
assert.match(js,/notApplicable\.length/,'Not Applicable must appear on each record');
assert.doesNotMatch(js,/Timezone not recorded; using America\/Detroit/,'Routine fallback warning must be absent throughout Operator Nudges');
assert.match(nudgeCss,/\.nudge-not-applicable>summary/,'Not Applicable must be expandable');
