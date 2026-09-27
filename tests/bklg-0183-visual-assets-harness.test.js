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