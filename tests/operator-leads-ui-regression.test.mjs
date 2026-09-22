import assert from 'node:assert/strict';
import fs from 'node:fs';

const config=fs.readFileSync(new URL('../staging/operator-leads/config.js',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../staging/operator-leads/leads.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../staging/operator-leads/index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../staging/operator-leads/leads.css',import.meta.url),'utf8');

assert.match(config,/DV_OPERATOR_LEADS_ENDPOINT/);
assert.doesNotMatch(config,/DV_LIFECYCLE_NUDGE_ENDPOINT/,'Leads page must remain separate from nudge management');
assert.doesNotMatch(js,/save_template|update_rule|nudge-groups|nudge-preview/,'Leads page must not contain BKLG-0130 management UI');
assert.match(html,/id="lead-signin"><a class="button button-primary"/,'Operator sign-in control must remain visible while browser session state is being checked');
assert.match(js,/signOut\(\{scope:'local'\}\)/,'Operator sign-in must clear a stale/non-operator browser session before navigating');
assert.match(css,/\.lead-summary span\{background:#202b35;color:#f7f3e8/,'lead summary pills must remain readable on dark Operator background');
assert.match(css,/\.lead-stage\{background:#26333e;color:#f7f3e8/,'lead lifecycle badges must remain readable on dark Operator background');
console.log('operator leads separation/readability regression checks passed');
