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
for(const id of ['calendar','week-hour','month-hour','age-experience','night','inactivity','cohorts'])assert.match(patternsPage,new RegExp('id="'+id+'"'),'missing analytics panel '+id);
assert.match(patternsClient,/action:'driving_patterns'/,'analytics must call operator-scoped aggregate action');

assert.match(patternsPage,/id="analytics-login"/,'unauthenticated preview must offer a login prompt');
assert.match(patternsPage,/href="\/log\/"[^>]*>Sign in with email/,'login action must use existing driver console sign-in flow');
assert.match(patternsClient,/if\(!session\?\.access_token\)\{document\.getElementById\('analytics-login'\)\.hidden=false/,'missing session must display login prompt');

assert.match(patternsPage,/\.analytics-panel h2,\.analytics-panel h3\{color:var\(--dv-yellow\)/,'analytics headings must use approved DV color tokens');
assert.match(patternsPage,/id="environment-note"/,'DEV preview must distinguish synthetic data from actual adoption');

assert.doesNotMatch(patternsPage,/<div class="analytics-grid"><section class="analytics-panel"><h2>Weekday × hour/,'hourly heatmaps must not share a half-width grid');
assert.match(patternsPage,/<section class="analytics-panel"><h2>Weekday × hour<\/h2>/,'weekday × hour chart should have a full-width panel');
assert.match(patternsPage,/<section class="analytics-panel"><h2>Month × hour<\/h2>/,'month × hour chart should have a full-width panel');

assert.match(patternsPage,/data-calendar-mode="weekly"/,'calendar weekly view must be selectable');
assert.match(patternsPage,/data-calendar-mode="monthly"/,'calendar monthly view must be selectable');
assert.match(patternsClient,/calendarMode==='monthly'/,'monthly calendar must aggregate records locally');
assert.match(patternsClient,/groups\.get\(month\)\.occurrences\[slot\]\+\+/,'weekday occurrence denominators must count calendar days');
assert.match(patternsClient,/count\/Math\.max\(1,groups\.get\(key\)\.occurrences\[i\]\)/,'monthly shading must normalize by occurrence count');
assert.match(patternsClient,/aria-pressed/,'toggle must update accessibility state');

assert.match(patternsPage,/id="age-experience"/,'development matrix must be present');
assert.match(patternsPage,/id="development-metric"/,'development metric selector must be present');
assert.match(patternsClient,/function renderAgeExperience/,'development matrix must render');

const familiesScript=fs.readFileSync(new URL('../operator/families/operator.js',import.meta.url),'utf8');
assert.match(patternsPage,/id="include-test-drivers"/,'Operator Analytics must offer a test-driver inclusion toggle');
assert.match(patternsClient,/include_test_drivers:document\.getElementById\('include-test-drivers'\)\.checked/,'toggle must affect backend query');
assert.match(familiesScript,/data-test-driver-id/,'operator family roster must allow test-driver classification');
assert.match(familiesScript,/action:'set_driver_test_status'/,'operator family roster must submit classification securely');
assert.doesNotMatch(patternsClient,/'white':'#222'/,'low-intensity cells must retain contrast');

assert.match(patternsPage,/id="lifecycle-buckets"/,'lifecycle horizon section must be visible');
assert.match(patternsPage,/id="lifecycle-milestones"/,'observed milestones must be displayed');
assert.match(patternsClient,/renderLifecycle\(d.driver_lifecycle\)/,'lifecycle response must render');
