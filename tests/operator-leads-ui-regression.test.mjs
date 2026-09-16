import assert from 'node:assert/strict';
import fs from 'node:fs';

const config=fs.readFileSync(new URL('../staging/operator-leads/config.js',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../staging/operator-leads/leads.js',import.meta.url),'utf8');

assert.match(config,/DV_OPERATOR_LEADS_ENDPOINT/,'Operator config must expose the lead lifecycle endpoint');
assert.match(js,/action:'create_lead'/,'UI must support lightweight manual lead creation');
assert.match(js,/action:'link_family'/,'UI must support explicit family linking');
assert.match(js,/usage_occasions/,'UI must display usage occasions rather than treating drive count as retention');
assert.match(js,/attention_flags/,'UI must render lifecycle signals, including backend-provided historical backfill flags');
assert.doesNotMatch(js,/sendMessage|campaign|reengage/i,'UI must not add campaign or automated re-engagement behavior');
console.log('operator leads UI regression checks passed');
assert.doesNotMatch(fs.readFileSync(new URL('../operator/config.js',import.meta.url),'utf8'), /operator-leads/, 'Normal Operator must not load staged leads');
