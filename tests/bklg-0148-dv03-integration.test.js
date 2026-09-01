const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('DV02 remains the default while DV03 is an explicit preview route',()=>{
  const defaultConsole=read('log/game/index.html');
  const dv03=read('log/game/DV03/index.html');
  assert.match(defaultConsole,/DV-02 \/ DRIVER CONSOLE/);
  assert.doesNotMatch(defaultConsole,/location\.replace\(['"]\/log\/game\/DV03/);
  assert.match(dv03,/DV02 remains default/);
  assert.match(dv03,/href="\/log\/game\/">DV02/);
});

test('DV03 uses the shared authenticated console contract',()=>{
  const html=read('log/game/DV03/index.html');
  for(const id of ['app-login','app-main','driver-heading','driver-select','hours-sign','drive-form','vehicle-form','quest-list','drive-list','dv03-hero'])assert.match(html,new RegExp(`id="${id}"`));
  for(const script of ['log-dashboard-entry-v5.js','log-prepilot-v2.js','log-avatar.js','log-drive-rpc.js','log-shared-actions.js','log-game-polish.js','log-operator-support.js','log-game-dv03.js'])assert.match(html,new RegExp(script.replaceAll('.','\\.')));
});

test('DV03 Hero resolver uses a private sibling derivative and Parker fallback',()=>{
  const source=read('assets/js/log-game-dv03.js');
  const listeners={};
  const context={window:{addEventListener:(name,fn)=>{listeners[name]=fn}},document:{getElementById:()=>null}};
  vm.runInNewContext(source,context,{filename:'log-game-dv03.js'});
  const api=context.window.DV_GAME_DV03;
  assert.equal(api.DERIVATIVE_FILENAME,'avatar-dv03.png');
  assert.equal(api.derivativePath({storage_path:'driver-id/request-id/avatar.png'}),'driver-id/request-id/avatar-dv03.png');
  assert.equal(api.derivativePath({storage_path:'avatar.png'}),'avatar-dv03.png');
  assert.equal(api.derivativePath({storage_path:'old.png',dv03_storage_path:'custom/dv03.png'}),'custom/dv03.png');
  assert.equal(api.FALLBACK_URL,'/assets/images/dv03/hero/parker-seated.png');
  assert.ok(listeners['dv:driver-changing']);
  assert.ok(listeners['dv:dashboard-rendered']);
});

test('DV03 mock mode is DEV-only and disables write controls',()=>{
  const preview=read('assets/js/log-game-dv03-preview.js');
  assert.match(preview,/DV_ENVIRONMENT_CONFIG\?\.name!=='dev'/);
  assert.match(preview,/querySelectorAll\('#app-main form input,#app-main form select,#app-main form textarea,#app-main form button'\)/);
  assert.match(preview,/el\.disabled=true/);
});

test('magic-link return preserves the explicit DV03 route',()=>{
  const entry=read('assets/js/log-dashboard-entry-v5.js');
  assert.match(entry,/experience==='dv03'\?'\/log\/game\/DV03\/'/);
  assert.match(entry,/experience==='game'\?'\/log\/game\/'/);
});

test('DV03 Hero validator keeps candidate art private and checks the locked contract',()=>{
  const validator=read('scripts/validate-dv03-hero.mjs');
  const contract=read('assets/images/dv03/hero/README.md');
  assert.match(validator,/width!==1536\|\|height!==1024/);
  assert.match(validator,/colorType!==6/);
  assert.match(validator,/alphaThreshold:8/);
  assert.match(contract,/Candidate masters remain outside the public repository/);
  assert.match(contract,/validate:dv03-hero/);
});
