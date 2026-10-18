import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const script=readFileSync(new URL('../assets/js/log-drive-detail-v4.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/css/log-drive-detail-v4.css',import.meta.url),'utf8');
test('shared Trip Detail has revision-bound certifier, two edit actions, and responsive details',()=>{
 assert.match(script,/drive\.certification_status==='CERTIFIED'&&!!drive\.certified_by_person_id/);
 assert.match(script,/detail\.certified_by\?\.display_name/);
 assert.match(script,/\$\{editAction\}[\s\S]*\$\{editAction\}/);
 assert.match(script,/drive-detail-main-duration/);
 assert.match(script,/drive-detail-notes/);
 assert.match(script,/drive-detail-rules/);
 assert.match(css,/grid-template-areas:"duration weather"/);
 assert.match(css,/@media\(max-width:560px\)/);
});
test('weather never treats missing observation as confirmed clear',()=>{
 assert.match(script,/weather_classification_status==='CLASSIFIED'&&!!conditions/);
 assert.match(script,/actualObservation\?conditions:'Unavailable'/);
 assert.match(script,/get_drive_weather_status_v1/);
});
