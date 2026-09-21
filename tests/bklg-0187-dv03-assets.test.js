const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function loadPresentationRules(){
  const sandbox={window:{},module:{exports:{}}};
  vm.runInNewContext(read('assets/js/dv03-presentation-rules.js'),sandbox,{filename:'dv03-presentation-rules.js'});
  return sandbox.module.exports;
}

const readyAssets=[
  ['Q000086','shopping-center','Shopping Center','DV03-L10-SHOPPING-CENTER-BACKGROUND.png'],
  ['Q000087','coffee-shop','Coffee Shop','DV03-L11-COFFEE-SHOP-BACKGROUND.png'],
  ['Q000088','salon-barber','Salon / Barber','DV03-L12-SALON-BARBER.png'],
  ['Q000089','salon-barber','Salon / Barber','DV03-L12-SALON-BARBER.png'],
  ['Q000090','movie-theater','Movie Theater','DV03-L13-MOVIE-THEATER-BACKGROUND.png']
];

test('BKLG-0187 moves the DV03 milestone card out of the windshield artwork',()=>{
  const html=read('log/index.html');
  const css=read('assets/css/log-game-dv03.css');
  const windshieldStart=html.indexOf('<div class="windshield dv03-windshield"');
  const windshieldEnd=html.indexOf('<div class="dv03-milestone-strip"');
  assert.ok(windshieldStart>=0);
  assert.ok(windshieldEnd>windshieldStart);
  assert.doesNotMatch(html.slice(windshieldStart,windshieldEnd),/class="hours-sign"/);
  assert.match(html,/class="dv03-milestone-strip"><div class="hours-sign"><span>NEXT LICENSE MILESTONE<\/span><strong id="hours-sign">Loading…<\/strong><\/div><\/div>/);
  assert.match(css,/\.dv03-milestone-strip\{[^}]*display:flex/);
  assert.match(css,/\.dv03-milestone-strip \.hours-sign\{[^}]*width:min\(420px,100%\)/);
  assert.doesNotMatch(css,/\.dv03-windshield \.hours-sign\{/);
});

test('BKLG-0183 ready assets render independently from the authoritative sky phase',()=>{
  const rules=loadPresentationRules();
  for(const [questKey,scene,label,file] of readyAssets){
    const scenery=rules.SCENERY_BY_QUEST[questKey];
    assert.equal(scenery.scene,scene,questKey);
    assert.equal(scenery.label,label,questKey);
    assert.equal(scenery.nightOnly,undefined,questKey);
    assert.match(scenery.src,new RegExp(file.replaceAll('.','\\.')),questKey);
    assert.ok(fs.existsSync(path.join(root,'assets/images/dv03/layers',file)),`missing ${file}`);
    const award={id:`award-${questKey}`,driver_id:'driver-1',quest_key:questKey,awarded_at:'2026-09-16T12:00:00Z'};
    const dayPresentation=rules.resolvePresentation({awards:[award],driverId:'driver-1',skyMode:'day'});
    assert.equal(dayPresentation.activeScenery.scene,scene,`${questKey} should remain visible with daytime sky`);
    const nightPresentation=rules.resolvePresentation({awards:[award],driverId:'driver-1',skyMode:'night'});
    assert.equal(nightPresentation.activeScenery.scene,scene,questKey);
    assert.equal(rules.sceneryAvailableForSky(scenery,'day'),true,`${questKey} should render with daytime sky`);
    assert.equal(rules.sceneryAvailableForSky(scenery,'night'),true,`${questKey} should render with nighttime sky`);
  }
});

test('BKLG-0187 keeps the most recent earned scenery while day and night sky change independently',()=>{
  const rules=loadPresentationRules();
  for(const questKey of ['Q000017','Q000043','Q000044','Q000046']){
    const scenery=rules.SCENERY_BY_QUEST[questKey];
    const award={id:`award-${questKey}`,driver_id:'driver-1',quest_key:questKey,awarded_at:'2026-09-16T12:00:00Z'};
    assert.equal(scenery.nightOnly,undefined,questKey);
    assert.equal(rules.sceneryAvailableForSky(scenery,'day'),true,questKey);
    assert.equal(rules.sceneryAvailableForSky(scenery,'night'),true,questKey);
    assert.equal(rules.resolvePresentation({awards:[award],driverId:'driver-1',skyMode:'day'}).activeScenery.scene,scenery.scene,questKey);
    assert.equal(rules.resolvePresentation({awards:[award],driverId:'driver-1',skyMode:'night'}).activeScenery.scene,scenery.scene,questKey);
  }
  assert.equal(rules.sceneryAvailableForSky(rules.SCENERY_BY_QUEST.Q000035,'day'),true,'day-safe scenery should remain available');
});

test('BKLG-0183 ready assets are exposed in the UAT harness and gallery',()=>{
  const current=read('assets/js/bklg-0128-scenery-current.js');
  const staging=read('assets/js/bklg-0128-dv03-staging.js');
  const gallery=read('assets/js/bklg-0128-gallery.js');
  for(const [,value,label,file] of readyAssets){
    assert.match(current,new RegExp(`value:'${value}'`));
    assert.match(staging,new RegExp(`value:'${value}'`));
    assert.match(gallery,new RegExp(label.replace(/[\/]/g,'\\$&')));
    assert.match(current,new RegExp(file.replaceAll('.','\\.')));
    assert.match(staging,new RegExp(file.replaceAll('.','\\.')));
    assert.match(gallery,new RegExp(file.replaceAll('.','\\.')));
  }
});

test('BKLG-0187 cache keys load the updated DV03 presentation files',()=>{
  const html=read('log/index.html');
  const dv03=read('assets/js/log-game-dv03.js');
  assert.match(html,/log-game-dv03\\.css\\?v=202609(?:18-0187-layout2|21-0005-overlap1)/);
  assert.match(html,/log-game-polish\.js\?v=20260918-0187-phase2/);
  assert.match(html,/log-game-dv03\.js\?v=20260918-0187-scenery3/);
  assert.match(dv03,/dv03-presentation-rules\.js\?v=20260918-0187-scenery3/);
  assert.match(dv03,/skyMode/);
  assert.match(dv03,/return 'day'/);
});
