const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('log/DV03/staging/BKLG-0128/index.html');
const js=read('assets/js/bklg-0128-composition-uat.js');

test('BKLG-0128 composition experiment is staging-only and loaded after the base harness',()=>{
  assert.match(html,/bklg-0128-composition-uat\.js/);
  assert.ok(html.indexOf('bklg-0128-dv03-staging.js')<html.indexOf('bklg-0128-composition-uat.js'));
  assert.match(js,/data\.dvRoute!=='bklg0128uat'/);
});

test('BKLG-0128 UAT defaults the generic road off',()=>{
  assert.match(js,/api\.state\.road='off'/);
});

test('BKLG-0128 UAT exposes billboard and scenery composition choices',()=>{
  for(const label of ['Scenery Only','Billboard Only','Both'])assert.match(js,new RegExp(label));
  assert.match(js,/api\.state\.sign='off'/);
  assert.match(js,/api\.state\.background='off'/);
});
