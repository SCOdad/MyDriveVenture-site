import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../operator/index.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../operator/dashboard.js',import.meta.url),'utf8');

assert.match(html,/id="chart-tabs"/,'chart tabs should replace the metric dropdown');
assert.doesNotMatch(html,/id="trend-metric"/,'legacy metric dropdown should be absent');
for(const metric of ['drives','minutes','active_drivers','logging_delay','registrations','feedback_flow','backlog_flow','signals_observed']) assert.match(html,new RegExp(`data-metric="${metric}"`),`missing ${metric} tab`);
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

const patternsPage=fs.readFileSync(new URL('../operator/analytics/index.html',import.meta.url),'utf8');
const patternsClient=fs.readFileSync(new URL('../operator/analytics/analytics.js',import.meta.url),'utf8');
const messagingClient=fs.readFileSync(new URL('../operator/messaging.js',import.meta.url),'utf8');
assert.match(html,/href="\/operator\/families\/"/,'Operator Home must link to Families roster');
assert.match(html,/href="\/operator\/analytics\/"/,'Operator Home must link to driving analytics');
assert.doesNotMatch(messagingClient,/Certification email canary|installCanary|drive-certification-canary/,'deprecated certification canary card must not be injected on Home');
for(const id of ['calendar','week-hour','month-hour','ages','experience','night','inactivity','cohorts'])assert.match(patternsPage,new RegExp('id="'+id+'"'),'missing analytics panel '+id);
assert.match(patternsClient,/action:'driving_patterns'/,'analytics must call operator-scoped aggregate action');

assert.match(patternsPage,/id="analytics-login"/,'unauthenticated preview must offer a login prompt');
assert.match(patternsPage,/href="\/log\/"[^>]*>Sign in with email/,'login action must use existing driver console sign-in flow');
assert.match(patternsClient,/if\(!session\?\.access_token\)\{document\.getElementById\('analytics-login'\)\.hidden=false/,'missing session must display login prompt');
