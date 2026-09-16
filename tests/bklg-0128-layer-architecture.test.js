const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const staging=fs.readFileSync(path.join(root,'assets/js/bklg-0128-dv03-staging.js'),'utf8');
const uatHtml=fs.readFileSync(path.join(root,'log/DV03/staging/BKLG-0128/index.html'),'utf8');

const expectedOrder=[
  "{key:'01',id:'sky',label:'Sky / Atmosphere'",
  "{key:'02',id:'road',label:'Road / Ground'",
  "{key:'03',id:'background',label:'Background'",
  "{key:'04',id:'sign',label:'Sign'",
  "{key:'05',id:'cockpit',label:'Cockpit'",
  "{key:'06',id:'hud',label:'HUD'",
  "{key:'07',id:'hero',label:'Hero'"
];

test('BKLG-0128 UAT registry uses Sky, Road/Ground, Background compositing order',()=>{
  let previous=-1;
  for(const marker of expectedOrder){
    const index=staging.indexOf(marker);
    assert.ok(index>previous,`layer marker out of order: ${marker}`);
    previous=index;
  }
  assert.match(staging,/02-ROAD-GROUND-BASE/);
  assert.match(staging,/Base Ground \/ Approach/);
  assert.match(staging,/03-BACKGROUND-PARK/);
});

test('BKLG-0128 UAT explicitly paints road below destination background',()=>{
  assert.match(staging,/\.dv03-sky\{z-index:1!important\}/);
  assert.match(staging,/\.bklg0128-road-layer\{position:absolute;inset:0;z-index:2!important/);
  assert.match(staging,/\.dv03-landscape,\.dv03-scene-layer\{z-index:3!important/);
  assert.match(staging,/\.dv03-sign-layer\{z-index:4!important\}/);
  assert.match(staging,/\.dv03-cockpit-frame-layer\{z-index:5!important\}/);
  assert.match(staging,/\.dv03-hero-layer\{z-index:7!important\}/);
  assert.match(staging,/windshield\.insertBefore\(layer,scene\|\|landscape\|\|null\)/);
});

test('BKLG-0128 remains operator-only, noindex, and staging-scoped',()=>{
  assert.match(uatHtml,/meta name="robots" content="noindex,nofollow"/);
  assert.match(staging,/data\.is_operator!==true/);
  assert.match(staging,/frame\.src='\/log\/'/);
  assert.doesNotMatch(staging,/quest_definitions|quest_awards|update\(|insert\(|delete\(/);
});
