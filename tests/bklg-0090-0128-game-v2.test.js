const fs=require('node:fs');
const vm=require('node:vm');
const test=require('node:test');
const assert=require('node:assert/strict');

function loadPalettes(){
  const source=fs.readFileSync('assets/js/driver-palettes.js','utf8');
  const window={};
  const document={readyState:'loading',addEventListener(){},querySelectorAll(){return[]}};
  vm.runInNewContext(source,{window,document,Object,Map,Set,String,CustomEvent:function(){}});
  return window.DV_DRIVER_PALETTES;
}

test('driver palette system exposes twelve canonical families',()=>{
  const api=loadPalettes();
  assert.deepEqual(Array.from(api.palettes,p=>p.id),['RED','ORANGE','YELLOW','GREEN','TEAL','BLUE','PURPLE','PINK','BROWN','GRAY','BLACK','WHITE']);
});

test('legacy favorite-color text normalizes without changing the stored source value',()=>{
  const api=loadPalettes();
  assert.equal(api.normalize('forest green'),'GREEN');
  assert.equal(api.normalize('Seafoam'),'TEAL');
  assert.equal(api.normalize('navy blue'),'BLUE');
  assert.equal(api.normalize('lavender'),'PURPLE');
  assert.equal(api.normalize('grey'),'GRAY');
  assert.equal(api.normalize('unknown cosmic color'),null);
});

test('game v1 remains isolated from v2 assets',()=>{
  const v1=fs.readFileSync('log/game/index.html','utf8');
  assert.ok(!v1.includes('log-game-v2'));
  assert.ok(!v1.includes('driver-palettes'));
  assert.ok(!v1.includes('dv-palette-preview'));
});

test('game v2 includes DEV-only unauthenticated mock preview entry point',()=>{
  const v2=fs.readFileSync('log/game-v2/index.html','utf8');
  const preview=fs.readFileSync('assets/js/log-game-v2-preview.js','utf8');
  assert.ok(v2.includes('id="dv-mock-preview"'));
  assert.ok(v2.includes('id="dv-mock-banner"'));
  assert.ok(v2.includes('/assets/js/log-game-v2-preview.js'));
  assert.match(preview,/env\?\.name!=='dev'/);
  assert.match(preview,/mock_preview:true/);
  assert.match(preview,/Mock preview — saving is disabled/);
  assert.ok(!preview.includes('client.rpc('));
  assert.ok(!preview.includes('functions.invoke('));
  assert.ok(!preview.includes('fetch('));
});

test('game v2 includes DEV palette harness and scenery controller',()=>{
  const v2=fs.readFileSync('log/game-v2/index.html','utf8');
  assert.ok(v2.includes('DV-02 / DRIVER CONSOLE V2 · DEV'));
  assert.ok(v2.includes('id="dv-palette-preview"'));
  assert.ok(v2.includes('/assets/js/driver-palettes.js'));
  assert.ok(v2.includes('/assets/js/log-game-v2.js'));
  assert.ok(v2.includes('class="dv-scene-base"'));
});

test('v2 scenery registry starts with Park and Construction without quest schema coupling',()=>{
  const source=fs.readFileSync('assets/js/log-game-v2.js','utf8');
  assert.match(source,/Q000035:'PARK'/);
  assert.match(source,/Q000012:'CONSTRUCTION'/);
  assert.match(source,/SCENE_RECENCY_DAYS=14/);
});

test('onboarding and Profile use the approved reusable palette UI',()=>{
  const join=fs.readFileSync('join/index.html','utf8');
  const profile=fs.readFileSync('profile/index.html','utf8');
  const copy='Customize your driver’s experience with their favorite color. Don’t worry—they can change it at any time.';
  assert.ok(join.includes(copy));
  assert.ok(profile.includes(copy));
  assert.ok(join.includes('name="favoriteColor" data-dv-palette-value'));
  assert.ok(profile.includes('id="profile-favorite-color" data-dv-palette-value'));
});

test('v2 preserves semantic road-sign and Night treatments',()=>{
  const css=fs.readFileSync('assets/css/log-game-v2.css','utf8');
  assert.ok(!/\.hours-sign\s*\{[^}]*color:/s.test(css));
  assert.match(css,/\.game-v2 \.night-gauge \.gauge-core strong\{color:var\(--blue\)\}/);
  assert.match(css,/\.game-v2 \.radio-display\{/);
  assert.match(css,/var\(--dv-driver-highlight\)/);
});
