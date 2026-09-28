const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function read(path){return fs.readFileSync(path,'utf8')}

test('BKLG-0183 operator visual asset harness is operator-gated and noindex',()=>{
  const html=read('operator/visual-assets/index.html');
  const js=read('assets/js/operator-visual-assets.js');
  assert.match(html,/noindex,nofollow/);
  assert.match(html,/dv03-visual-asset-registry\.js/);
  assert.match(html,/operator-visual-assets\.js/);
  assert.match(js,/get_authenticated_dashboard_v1/);
  assert.match(js,/data\.is_operator!==true/);
  assert.match(js,/composer-stage/);
});

test('BKLG-0183 registry carries canonical layer order and seasonal precedence',()=>{
  const source=read('assets/js/dv03-visual-asset-registry.js');
  const context={window:{}};
  vm.runInNewContext(source,context);
  const registry=context.window.DV03_VISUAL_ASSET_REGISTRY;
  assert.ok(registry);
  assert.deepEqual(Array.from(registry.precedence),['holiday','season','fallback']);
  assert.deepEqual(Array.from(registry.layers).map(x=>x.id),['sky','background','road','precipitation','sign','cockpit','hud','hero']);
  assert.ok(registry.assets.filter(x=>x.layer==='background'&&x.status.includes('Locked')).length>=11);
  assert.equal(registry.themes.find(x=>x.id==='autumn').future,undefined);
});

test('Hero remains canonical and normal assets resolve to real repository files',()=>{
  const source=read('assets/js/dv03-visual-asset-registry.js');
  const context={window:{}};
  vm.runInNewContext(source,context);
  const registry=context.window.DV03_VISUAL_ASSET_REGISTRY;
  const hero=registry.find('DV-CHAR-PARKER-DV03-HERO');
  assert.equal(hero.seasonal,false);
  assert.equal(hero.theme,'normal');
  const missing=registry.assets.filter(asset=>asset.kind==='image'&&asset.src).filter(asset=>!fs.existsSync(asset.src.replace(/^\//,''))).map(asset=>asset.src);
  assert.equal(missing.length,0,`Missing registered image paths: ${missing.join(', ')}`);
});

test('operator home exposes the durable visual asset tool',()=>{
  const html=read('operator/index.html');
  assert.match(html,/href="\/operator\/visual-assets\/"/);
  assert.match(html,/Visual Asset Gallery/);
});

test('BKLG-0183 composer renders Hero as an authored full-scene overlay',()=>{
  const css=read('assets/css/operator-visual-assets.css');
  assert.match(css,/\.stage-layer\.hero\{inset:0;width:100%;height:100%;object-fit:fill;object-position:center\}/);
});

test('BKLG-0183 harness uses cache-busted asset versions after Hero overlay repair',()=>{
  const html=read('operator/visual-assets/index.html');
  assert.match(html,/operator-visual-assets\.css\?v=20260928-dv03-registry/);
  assert.match(html,/operator-visual-assets\.js\?v=20260928-dv03-registry/);
});

test('BKLG-0183 registers Halloween Park canary without changing canonical Park or Hero',()=>{
  const source=read('assets/js/dv03-visual-asset-registry.js');
  const context={window:{}};
  vm.runInNewContext(source,context);
  const registry=context.window.DV03_VISUAL_ASSET_REGISTRY;
  const canonical=registry.find('DV-UX-DV03-BACKGROUND-PARK');
  const halloween=registry.find('DV-UX-DV03-BACKGROUND-PARK-HALLOWEEN');
  const hero=registry.find('DV-CHAR-PARKER-DV03-HERO');
  assert.ok(canonical);
  assert.ok(halloween);
  assert.equal(halloween.theme,'halloween');
  assert.equal(halloween.parentAssetId,canonical.assetId);
  assert.equal(hero.theme,'normal');
  assert.equal(hero.seasonal,false);
  assert.ok(fs.existsSync('assets/images/dv03/layers/DV03-BACKGROUND-HALLOWEEN-L01-PARK.png'));
});

test('DV03 registry covers deployed BASE Autumn Halloween backgrounds while preserving L03 gap',()=>{
  const source=read('assets/js/dv03-visual-asset-registry.js');
  const context={window:{}};
  vm.runInNewContext(source,context);
  const registry=context.window.DV03_VISUAL_ASSET_REGISTRY;
  const backgrounds=registry.assets.filter(x=>x.layer==='background');
  const themes=['normal','autumn','halloween'];
  const expectedSlots=['L01','L02','L04','L05','L06','L07','L08','L09','L10','L11','L12','L13','L14','L15','L16','L17','L18','L20'];
  for(const theme of themes)for(const slot of expectedSlots){
    assert.ok(backgrounds.some(x=>x.theme===theme&&x.slot===slot),`${theme} ${slot} should be registered`);
  }
  assert.equal(backgrounds.some(x=>x.slot==='L03'),false,'L03 gap should remain absent');
  assert.ok(backgrounds.some(x=>x.theme==='halloween'&&x.slot==='L19'),'Halloween L19 Taco Shop is deployed and registered');
  assert.ok(backgrounds.some(x=>x.theme==='autumn'&&x.slot==='L19'),'Autumn L19 Taco Shop is deployed and registered');
  assert.equal(backgrounds.some(x=>x.theme==='normal'&&x.slot==='L19'),false,'BASE L19 file is not deployed');
  const missing=backgrounds.filter(asset=>asset.kind==='image'&&asset.src).filter(asset=>!fs.existsSync(asset.src.replace(/^\//,''))).map(asset=>asset.src);
  assert.equal(missing.length,0,`Missing registered background paths: ${missing.join(', ')}`);
});

test('DV03 registry stores quest keys only and seasonal backgrounds inherit destination mappings',()=>{
  const source=read('assets/js/dv03-visual-asset-registry.js');
  const context={window:{}};
  vm.runInNewContext(source,context);
  const registry=context.window.DV03_VISUAL_ASSET_REGISTRY;
  const park=registry.find('DV-UX-DV03-BACKGROUND-PARK');
  const halloweenPark=registry.find('DV-UX-DV03-BACKGROUND-PARK-HALLOWEEN');
  const salon=registry.find('DV-UX-DV03-BACKGROUND-SALON-BARBER');
  assert.deepEqual(Array.from(park.questKeys),['Q000035']);
  assert.deepEqual(Array.from(halloweenPark.questKeys),['Q000035']);
  assert.equal(halloweenPark.parentAssetId,park.assetId);
  assert.deepEqual(Array.from(salon.questKeys),['Q000088','Q000089']);
  assert.equal('questName' in park,false);
  assert.equal('quest' in park,false);
});

test('DV03 registry marks only zero-mapped backgrounds as unconnected',()=>{
  const source=read('assets/js/dv03-visual-asset-registry.js');
  const context={window:{}};
  vm.runInNewContext(source,context);
  const registry=context.window.DV03_VISUAL_ASSET_REGISTRY;
  const unconnected=registry.assets.filter(x=>x.layer==='background'&&x.questKeys.length===0);
  const names=[...new Set(unconnected.map(x=>x.name))].sort();
  assert.deepEqual(names,[
    'Airport',
    'Ice Cream Shop',
    'Karate Dojo',
    'Pizzeria',
    'Sushi Restaurant',
    'Taco Shop',
    'Wrestling Training Center'
  ]);
  assert.ok(unconnected.every(x=>x.status==='Deployed / Not connected'));
  assert.ok(registry.assets.filter(x=>x.layer==='background'&&x.questKeys.length>0).every(x=>!x.status.includes('Not connected')));
});

test('DV03 registry includes deployed sky variants',()=>{
  const source=read('assets/js/dv03-visual-asset-registry.js');
  const context={window:{}};
  vm.runInNewContext(source,context);
  const registry=context.window.DV03_VISUAL_ASSET_REGISTRY;
  for(const file of ['DV03-SKY-BASE-NIGHT-MOON-FULL.png','DV03-SKY-BASE-NIGHT-MOON-CRESCENT.png','DV03-SKY-BASE-NIGHT-MOON-NEW.png','DV03-SKY-BASE-NIGHT-MOON-QUARTER.png','DV03-SKY-HALLOWEEN-NIGHT-WITCH.png','DV03-SKY-CHRISTMAS-NIGHT-SANTA.png']){
    const asset=registry.assets.find(x=>x.file===file);
    assert.ok(asset,`${file} should be registered`);
    assert.ok(fs.existsSync(asset.src.replace(/^\//,'')),`${file} should exist`);
  }
});

test('operator visual assets resolves current quest definitions at runtime and renders construction treatment',()=>{
  const js=read('assets/js/operator-visual-assets.js');
  const css=read('assets/css/operator-visual-assets.css');
  assert.match(js,/quest_definitions/);
  assert.match(js,/select\('quest_key,name,active'\)/);
  assert.match(js,/registry\.questKeys/);
  assert.match(js,/NOT CONNECTED TO A QUEST/);
  assert.match(js,/definition not found/);
  assert.match(js,/inactive/);
  assert.match(css,/\.badge\.construction/);
});

test('BKLG-0183 harness cache-busts the Halloween registry update',()=>{
  const html=read('operator/visual-assets/index.html');
  assert.match(html,/dv03-visual-asset-registry\.js\?v=20260928-dv03-registry/);
});

test('theme calendar partitions BASE around a fixed annual theme',()=>{
  const cal=require('../assets/js/dv03-theme-calendar.js');
  const halloween={id:'h',theme:'halloween',label:'Halloween',rule:cal.normalizeRule({mode:'fixed',startMonth:10,startDay:15,endMonth:10,endDay:31})};
  const result=cal.resolveCalendar(2026,[halloween]);
  assert.equal(result.valid,true);
  assert.deepEqual(result.rows.map(r=>[r.label,cal.iso(r.start),cal.iso(r.end)]),[
    ['BASE','2026-01-01','2026-10-14'],['Halloween','2026-10-15','2026-10-31'],['BASE','2026-11-01','2026-12-31']
  ]);
});

test('theme calendar UI accepts valid fixed MM-DD input and persists without overlap',()=>{
  const js=read('assets/js/operator-visual-assets.js');
  assert.match(js,/match\(\s*\/\^\(\\d\{2\}\)-\(\\d\{2\}\)\$\/\s*\)/);
  assert.match(js,/calendarRules\.push\(candidate\);saveCalendar\(\)/);
  assert.match(js,/Theme overlaps an existing range/);
  assert.doesNotMatch(js,/match\(\/\^\(\\\\d\{2\}\)-\(\\\\d\{2\}\)\$\/\)/);
});

test('theme calendar rejects overlap and defensively resolves invalid dates to BASE',()=>{
  const cal=require('../assets/js/dv03-theme-calendar.js');
  const fixed=(id,theme,sM,sD,eM,eD)=>({id,theme,label:theme,rule:cal.normalizeRule({mode:'fixed',startMonth:sM,startDay:sD,endMonth:eM,endDay:eD})});
  const rules=[fixed('a','autumn',9,15,10,20),fixed('h','halloween',10,15,10,31)];
  assert.equal(cal.resolveCalendar(2026,rules).valid,false);
  assert.equal(cal.themeForDate(2026,rules,'2026-10-18'),'normal');
  assert.throws(()=>cal.normalizeRule({mode:'fixed',startMonth:2,startDay:30,endMonth:3,endDay:1}),/Invalid fixed annual date/);
  assert.throws(()=>cal.normalizeRule({mode:'fixed',startMonth:10,startDay:15,endMonth:13,endDay:1}),/Invalid fixed annual date/);
});

test('theme calendar uses CalendarWindow-compatible NTH_WEEKDAY semantics for Thanksgiving',()=>{
  const cal=require('../assets/js/dv03-theme-calendar.js');
  const rule=cal.thanksgivingRule(0,0);
  assert.equal(cal.iso(cal.resolveRule(2026,rule).start),'2026-11-26');
  assert.equal(cal.iso(cal.resolveRule(2027,rule).start),'2027-11-25');
});

test('visual assets page exposes collapsible theme calendar and browser-draft warning',()=>{
  const html=read('operator/visual-assets/index.html');
  const js=read('assets/js/operator-visual-assets.js');
  assert.match(html,/Theme Calendar/);
  assert.match(html,/BASE automatically fills uncovered dates/);
  assert.match(html,/saved in this browser only/);
  assert.match(html,/dv03-theme-calendar\.js\?v=20260928-dv03-registry/);
  assert.match(js,/dv03-theme-calendar-v1/);
  assert.match(js,/Calendar preview/);
});
