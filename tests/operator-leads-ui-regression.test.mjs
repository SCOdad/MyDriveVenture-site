import assert from 'node:assert/strict';
import fs from 'node:fs';

const config=fs.readFileSync(new URL('../staging/operator-leads/config.js',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../staging/operator-leads/leads.js',import.meta.url),'utf8');

assert.match(config,/DV_OPERATOR_LEADS_ENDPOINT/);
assert.match(config,/DV_LIFECYCLE_NUDGE_ENDPOINT/);
assert.match(js,/action:'preview'/,'Operator UI must load the nudge engine in preview mode');
assert.match(js,/action:'update_rule'/,'Operator UI must support safe rule updates');
assert.match(js,/nudge-priority/,'Operator UI must expose priority');
assert.match(js,/nudge-enabled/,'Operator UI must expose enabled state');
assert.doesNotMatch(js,/send_live|send_test|recipient_person_ids/,'Operator leads UI must not expose send controls');
assert.match(js,/suppression_reason/,'Preview must expose why a candidate is suppressed');
assert.match(js,/message_preview/,'Operator preview must show the exact lifecycle email copy before any send');
console.log('operator leads + nudge UI regression checks passed');
