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

test('driver palette system exposes ten readable canonical families',()=>{
  const api=loadPalettes();
  assert.deepEqual(Array.from(api.palettes,p=>p.id),['RED','ORANGE','YELLOW','GREEN','TEAL','BLUE','PURPLE','PINK','BROWN','WHITE']);
  assert.deepEqual(Array.from(api.palettes,p=>p.label),['Red','Orange','Yellow','Green','Teal','Blue','Purple','Pink','Brown','White']);
  api.palettes.forEach(palette=>{
    assert.match(palette.description,new RegExp(`^${palette.label} palette swatch`));
    assert.match(api.swatchMarkup(palette),new RegExp(`aria-label="${palette.label} palette swatch`));
  });
});

test('legacy favorite-color text normalizes without changing the stored source value',()=>{
  const api=loadPalettes();
  assert.equal(api.normalize('forest green'),'GREEN');
  assert.equal(api.normalize('Seafoam'),'TEAL');
  assert.equal(api.normalize('navy blue'),'BLUE');
  assert.equal(api.normalize('lavender'),'PURPLE');
  assert.equal(api.normalize('grey'),null);
  assert.equal(api.normalize('black'),null);
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

test('game v2 includes scene-only DEV harness below the windshield',()=>{
  const v2=fs.readFileSync('log/game-v2/index.html','utf8');
  const source=fs.readFileSync('assets/js/log-game-v2.js','utf8');
  assert.ok(v2.includes('DV-02 / DRIVER CONSOLE V2 · DEV'));
  assert.ok(v2.includes('id="dv-palette-preview"'));
  assert.ok(v2.includes('/assets/js/driver-palettes.js'));
  assert.ok(v2.includes('/assets/js/log-game-v2.js'));
  assert.ok(v2.includes('class="dv-scene-base"'));
  assert.match(source,/setAttribute\('aria-label','DEV scene preview'\)/);
  assert.match(source,/querySelector\('\.dash-status'\)\?\.before\(host\)/);
  assert.doesNotMatch(source,/DEV COLOR/);
  assert.doesNotMatch(source,/data-dv-palette-auto/);
});

test('game v2 mounts an accessible in-console palette with production persistence safeguards',()=>{
  const source=fs.readFileSync('assets/js/log-game-v2.js','utf8');
  const css=fs.readFileSync('assets/css/log-game-v2.css','utf8');
  assert.match(source,/id='dv-palette-toggle'/);
  assert.match(source,/aria-label','Color palette settings'/);
  assert.match(source,/aria-label="Close color palette">X/);
  assert.match(source,/action:'update_basic'/);
  assert.match(source,/name:lastDetail\.driver\.display_name/);
  assert.match(source,/home_zip:lastDetail\.driver\.home_zip/);
  assert.match(source,/favorite_color:id/);
  assert.match(source,/mock_preview===true/);
  assert.match(source,/access!=='VIEW'/);
  assert.match(source,/event\.key==='Escape'/);
  assert.match(source,/document\.addEventListener\('pointerdown'/);
  assert.match(source,/dv\.game-v2\.palette-coachmark/);
  assert.match(source,/MAKE IT YOURS/);
  assert.match(css,/\.game-v2 \.dv-palette-close/);
  assert.match(css,/color:#f8ba20/);
});

test('v2 scenery registry starts with Park and Construction without quest schema coupling',()=>{
  const source=fs.readFileSync('assets/js/log-game-v2.js','utf8');
  assert.match(source,/Q000035:'PARK'/);
  assert.match(source,/Q000012:'CONSTRUCTION'/);
  assert.match(source,/SCENE_RECENCY_DAYS=14/);
});

test('registration omits favorite color while Profile retains the reusable palette UI',()=>{
  const join=fs.readFileSync('join/index.html','utf8');
  const joinJs=fs.readFileSync('assets/js/join.js','utf8');
  const profile=fs.readFileSync('profile/index.html','utf8');
  const copy='Customize your driver’s experience with their favorite color. Don’t worry—they can change it at any time.';
  assert.ok(profile.includes(copy));
  assert.ok(!join.includes('favoriteColor'));
  assert.ok(!join.includes('/assets/js/driver-palettes.js'));
  assert.ok(!join.includes('/assets/css/driver-palettes.css'));
  assert.ok(!joinJs.includes('favoriteColor'));
  assert.ok(!joinJs.includes('favorite_color'));
  assert.ok(profile.includes('id="profile-favorite-color" data-dv-palette-value'));
});

test('migration guards preserve Night XP and true full gauge fill',()=>{
  const polish=fs.readFileSync('assets/js/log-game-polish.js','utf8');
  const dashboard=fs.readFileSync('assets/js/log-dashboard-entry-v5.js','utf8');
  const css=fs.readFileSync('assets/css/log-game-v2.css','utf8');
  assert.match(polish,/NIGHT XP BEGINS <b id="night-xp-start">Loading…<\/b>/);
  assert.match(polish,/functions\.invoke\('night-xp-start'/);
  assert.match(polish,/Math\.min\(100,Number\(progress\?\.total_minutes/);
  assert.match(polish,/Math\.min\(100,Number\(progress\?\.night_minutes/);
  assert.match(dashboard,/Math\.min\(100,Math\.max\(0,Number\(progress\.total_minutes/);
  assert.match(dashboard,/Math\.min\(100,Math\.max\(0,Number\(progress\.night_minutes/);
  assert.match(css,/calc\(var\(--practice-p\)\*1\.8deg\)/);
  assert.match(css,/calc\(var\(--night-p\)\*1\.8deg\)/);
});

test('v2 preserves semantic road-sign and Night treatments',()=>{
  const css=fs.readFileSync('assets/css/log-game-v2.css','utf8');
  assert.ok(!/\.hours-sign\s*\{[^}]*color:/s.test(css));
  assert.match(css,/\.game-v2 \.night-gauge \.gauge-core strong\{color:var\(--blue\)\}/);
  assert.match(css,/\.game-v2 \.radio-display\{/);
  assert.match(css,/var\(--dv-driver-highlight\)/);
  assert.match(css,/\.game-v2 \.dashboard-workbench \.panel-label\{color:var\(--dv-driver-highlight\)\}/);
  assert.match(css,/\.game-v2 \.dashboard-workbench \.app-card\{border-top-color:var\(--dv-driver-base\)\}/);
  assert.match(css,/\.game-v2 \.dashboard-workbench \.button\.primary\{background:var\(--dv-driver-highlight\)/);
});
