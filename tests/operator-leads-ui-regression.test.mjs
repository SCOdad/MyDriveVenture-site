import assert from 'node:assert/strict';
import fs from 'node:fs';

const config=fs.readFileSync(new URL('../staging/operator-leads/config.js',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../staging/operator-leads/leads.js',import.meta.url),'utf8');

assert.match(config,/DV_OPERATOR_LEADS_ENDPOINT/,'Operator config must expose the lead lifecycle endpoint');
assert.match(config,/DV_LIFECYCLE_NUDGE_ENDPOINT/,'Operator config must expose the lifecycle nudge preview endpoint');
assert.match(js,/action:'create_lead'/,'UI must support lightweight manual lead creation');
assert.match(js,/action:'link_family'/,'UI must support explicit family linking');
assert.match(js,/usage_occasions/,'UI must display usage occasions rather than treating drive count as retention');
assert.match(js,/attention_flags/,'UI must render lifecycle signals, including backend-provided historical backfill flags');
assert.match(js,/mode:'preview'/,'UI must load BKLG-0130 in preview mode');
assert.match(js,/recent_dispatches/,'UI must show recent grown-up communication audit history');
assert.doesNotMatch(js,/send_live|send_test|recipient_person_ids/,'Staged leads UI must not expose family/test send controls');
console.log('operator leads UI regression checks passed');
assert.doesNotMatch(fs.readFileSync(new URL('../operator/config.js',import.meta.url),'utf8'), /operator-leads/, 'Normal Operator must not load staged leads');
