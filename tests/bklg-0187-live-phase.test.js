const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function loadPolish(){
  const window={addEventListener(){},dispatchEvent(){}};
  const document={
    documentElement:{dataset:{experience:'game'}},
    getElementById(){return null},
    querySelector(){return null},
    createElement(){return{}},
  };
  const sandbox={window,document,Intl,Date,CustomEvent:class CustomEvent{},setInterval(){return 1}};
  vm.runInNewContext(read('assets/js/log-game-polish.js'),sandbox,{filename:'log-game-polish.js'});
  return window.DV_GAME_POLISH;
}

test('BKLG-0187 authoritative phase changes exactly at the driver-local night boundaries',()=>{
  const polish=loadPolish();
  const threshold={localTime:'19:30',endLocalTime:'06:49'};
  assert.equal(polish.nightMode(threshold,'America/Detroit',new Date('2026-09-18T10:48:00Z')),'night');
  assert.equal(polish.nightMode(threshold,'America/Detroit',new Date('2026-09-18T10:49:00Z')),'day');
  assert.equal(polish.nightMode(threshold,'America/Detroit',new Date('2026-09-18T23:29:00Z')),'day');
  assert.equal(polish.nightMode(threshold,'America/Detroit',new Date('2026-09-18T23:30:00Z')),'night');
  assert.equal(polish.nightMode({},'America/Detroit',new Date('2026-09-18T10:49:00Z')),null);
});

test('BKLG-0187 live phase updates notify DV03 for immediate repaint',()=>{
  const polish=read('assets/js/log-game-polish.js');
  const dv03=read('assets/js/log-game-dv03.js');
  assert.match(polish,/if\(currentNightThreshold\)renderNightPhase\(currentNightThreshold,currentTimezone,currentNightDriverId\)/);
  assert.match(polish,/new CustomEvent\('dv:night-phase-updated'/);
  assert.match(dv03,/addEventListener\('dv:night-phase-updated'/);
  assert.match(dv03,/event\.detail\.driverId===latestDetail\.driverId/);
});

test('BKLG-0187 cockpit, achievement scenery, and milestone card preserve intended layout',()=>{
  const css=read('assets/css/log-game-dv03.css');
  const dv03=read('assets/js/log-game-dv03.js');
  assert.match(css,/img\.dv03-cockpit-frame\{[^}]*object-fit:cover/);
  assert.doesNotMatch(css,/img\.dv03-cockpit-frame\{[^}]*object-fit:fill/);
  assert.match(dv03,/backgroundSize=scenery\?'cover'/);
  assert.match(css,/html\[data-experience="game"\] \.dv03-milestone-strip \.hours-sign\{[^}]*left:auto!important;[^}]*top:auto!important;[^}]*transform:none!important/);
  assert.match(css,/\.dv03-milestone-strip \.hours-sign:before\{display:none!important;content:none!important\}/);
});
