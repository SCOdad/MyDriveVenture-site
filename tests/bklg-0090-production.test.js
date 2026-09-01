const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('DV-02 production route and isolated DV-01 route are present',()=>{
  const v2=read('log/game/index.html'),v1=read('log/game/DV01/index.html');
  assert.match(v2,/DV-02 \/ DRIVER CONSOLE/);
  assert.match(v2,/log-game-v2-color\.js/);
  assert.match(v2,/href="\/log\/game\/DV01\/"/);
  assert.match(v1,/DV-01 \/ DRIVER CONSOLE/);
  assert.doesNotMatch(v1,/log-game-v2-color|driver-palettes/);
});

test('production palette is accessible, persistent, and contains only ten approved colors',()=>{
  const palette=read('assets/js/driver-palettes.js'),consoleJs=read('assets/js/log-game-v2-color.js');
  for(const color of ['RED','ORANGE','YELLOW','GREEN','TEAL','BLUE','PURPLE','PINK','BROWN','WHITE'])assert.match(palette,new RegExp(`id:'${color}'`));
  assert.doesNotMatch(palette,/id:'(?:GRAY|BLACK)'/);
  assert.match(palette,/aria-label="\$\{p\.description\}"/);
  assert.match(consoleJs,/favorite_color:id/);
  assert.match(consoleJs,/Color palette settings/);
  assert.match(consoleJs,/Close color palette/);
  assert.match(consoleJs,/event\.key==='Escape'/);
  assert.match(consoleJs,/pointerdown/);
  assert.match(consoleJs,/localStorage\.setItem\(coachKey/);
  assert.doesNotMatch(consoleJs,/model\?\.is_operator\|\|!canSave/);
  assert.match(consoleJs,/dv-palette-anchor/);
  assert.doesNotMatch(consoleJs,/positionCoach|getBoundingClientRect/);
});

test('registration no longer asks or submits favorite color',()=>{
  assert.doesNotMatch(read('join/index.html'),/favoriteColor|Favorite color/i);
  assert.doesNotMatch(read('assets/js/join.js'),/favoriteColor|favorite_color/);
});

test('semantic gauge behavior remains canonical',()=>{
  const css=read('assets/css/log-game-v2-color.css'),entry=read('assets/js/log-dashboard-entry-v5.js'),polish=read('assets/js/log-game-polish.js');
  assert.match(css,/night-gauge[^}]+var\(--blue\)/);
  assert.match(entry,/Math\.min\(100/);
  assert.match(entry,/--night-p/);
  assert.match(polish,/renderNightXpWindow\(driver\)/);
  assert.match(polish,/endLocalTime/);
  assert.match(css,/--practice-p\)\*1\.8deg/);
  assert.match(css,/--night-p\)\*1\.8deg/);
  assert.match(css,/conic-gradient\(from 270deg at 50% 100%,var\(--dv-driver-bright\)/);
  assert.match(css,/180deg,transparent 180deg\)!important/);
  assert.match(css,/radio-display/);
  assert.match(css,/radio-display \.mission-progress i\{background:var\(--dv-driver-bright\)\}/);
});

test('Profile applies the driver palette to confirmation controls and progress bars',()=>{
  const css=read('assets/css/driver-palettes.css'),profile=read('assets/js/profile.js');
  assert.match(css,/\.license-confirm/);
  assert.match(css,/\.license-progress>span/);
  assert.match(css,/\.button\.secondary/);
  assert.match(css,/\.step-label\{border-bottom-color/);
  assert.match(profile,/DV_DRIVER_PALETTES\?\.apply\(document\.body/);
});

test('production release excludes DEV scene and mock-preview code',()=>{
  const html=read('log/game/index.html'),js=read('assets/js/log-game-v2-color.js');
  assert.doesNotMatch(html+js,/dv-scene-layer|mock.preview|DEV SCENE|data-dv-scene-preview/);
});
