import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const detail=readFileSync(new URL('../assets/js/log-drive-detail-v4.js',import.meta.url),'utf8');
const loader=readFileSync(new URL('../assets/js/log-dashboard-entry-v5.js',import.meta.url),'utf8');
test('PA parent weather review uses guarded RPCs and revision',()=>{
 assert.match(detail,/String\(driver\?\.home_state\|\|''\)\.toUpperCase\(\)!=='PA'/);
 assert.match(detail,/app\.client\.rpc\('get_pa_drive_weather_reviews_v1'/);
 assert.match(detail,/app\.client\.rpc\('review_pa_drive_weather_v1'/);
 assert.match(detail,/p_expected_drive_revision:Number\(section\.dataset\.revision\)/);
 assert.match(detail,/reason\|\|null/);
 assert.match(detail,/data\?\.outcome==='STALE_DRIVE'/);
 assert.doesNotMatch(detail,/\.from\('pa_drive_weather_decisions'\)/);
});
test('dashboard loader requests PA version of detail script',()=>{
 assert.match(loader,/log-drive-detail-v4\.js\?v=20261017-bklg0263-pa1/);
});
