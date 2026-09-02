import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../operator/index.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../operator/dashboard.js',import.meta.url),'utf8');

assert.match(html,/id="chart-tabs"/,'chart tabs should replace the metric dropdown');
assert.doesNotMatch(html,/id="trend-metric"/,'legacy metric dropdown should be absent');
for(const metric of ['drives','minutes','active_drivers','logging_delay','registrations','waitlist_additions','feedback_flow','backlog_flow','signals_observed']) assert.match(html,new RegExp(`data-metric="${metric}"`),`missing ${metric} tab`);
assert.match(html,/data-basis="occurred"/);
assert.match(html,/data-basis="entered"/);
assert.match(js,/dv\.operator\.range/,'selected range should persist in localStorage');
assert.match(js,/localStorage\.setItem\(RANGE_KEY,range\)/);
assert.match(js,/drive_trends\?\.\[basis\]/,'drive trend should honor time basis');
assert.match(js,/channel_trends_by_basis\?\.\[basis\]/,'channel chart should honor time basis');
assert.match(js,/metric==='logging_delay'/,'logging delay tab should render scatter');
assert.match(js,/delay-reference/,'scatter should render a 1:1 reference line');
assert.match(js,/Timestamp anomalies/,'scatter should expose timestamp anomalies rather than silently scaling around them');
console.log('operator analytics UI regression checks passed');
