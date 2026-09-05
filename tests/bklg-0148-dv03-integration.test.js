const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('DV03 is the default, supported experiences stay stable, and DV01 redirects',()=>{
  const defaultConsole=read('log/index.html');
  assert.match(defaultConsole,/DV03 \/ DRIVER CONSOLE/);
  assert.match(defaultConsole,/href="\/log\/DV02\/">DV02/);
  assert.match(read('log/DV00/index.html'),/data-dv-route="dv00"/);
  const dv01=read('log/DV01/index.html');
  assert.match(dv01,/Opening Default Experience/);
  assert.match(dv01,/location\.replace\('\/log\/' \+ location\.search \+ location\.hash\)/);
  assert.doesNotMatch(dv01,/data-dv-route="dv01"/);
  assert.match(read('log/DV02/index.html'),/data-dv-route="dv02"/);
  assert.match(read('log/DV03/index.html'),/location\.replace\('\/log\//);
  assert.match(read('log/game/index.html'),/location\.replace\('\/log\//);
  assert.match(read('log/game/DV01/index.html'),/\/log\/DV01\//);
  assert.match(read('log/game/DV03/index.html'),/\/log\/DV03\//);
});

test('DV03 uses the shared authenticated console contract',()=>{
  const html=read('log/index.html');
  assert.match(html,/<html[^>]+data-experience="game"[^>]+data-dv-route="dv03"/);
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
  assert.match(source,/functions\.invoke\('driver-hero-url'/);
  assert.ok(listeners['dv:driver-changing']);
  assert.ok(listeners['dv:dashboard-rendered']);
});

test('DV03 mock mode is DEV-only and disables write controls',()=>{
  const preview=read('assets/js/log-game-dv03-preview.js');
  const html=read('log/index.html');
  const css=read('assets/css/log-game-dv03.css');
  assert.match(preview,/DV_ENVIRONMENT_CONFIG\?\.name!=='dev'/);
  assert.match(preview,/entry\.hidden=false/);
  assert.match(html,/class="dv-mock-entry" hidden/);
  assert.match(css,/\.dv-mock-entry\[hidden\]\{display:none!important\}/);
  assert.match(html,/log-game-dv03\.css\?v=20260901-acceptance3/);
  assert.match(html,/log-game-dv03-preview\.js\?v=20260901-acceptance2/);
  assert.match(preview,/querySelectorAll\('#app-main form input,#app-main form select,#app-main form textarea,#app-main form button'\)/);
  assert.match(preview,/el\.disabled=true/);
});

test('magic-link return preserves each explicit console route',()=>{
  const entry=read('assets/js/log-dashboard-entry-v5.js');
  assert.match(entry,/dv00:'\/log\/DV00\//);
  assert.match(entry,/dv01:'\/log\/DV01\//);
  assert.match(entry,/dv02:'\/log\/DV02\//);
  assert.match(entry,/dv03:'\/log\//);
});

test('DV03 reuses the proven DV02 palette, gauge, clock, and night XP runtime',()=>{
  const html=read('log/index.html');
  const polish=read('assets/js/log-game-polish.js');
  const shared=read('assets/js/log-shared-actions.js');
  assert.match(html,/data-experience="game"/);
  assert.match(polish,/\['game','dv03'\]\.includes/);
  assert.match(polish,/id="night-time-phase"/);
  assert.match(polish,/night\?'ENDS':'BEGINS'/);
  assert.match(polish,/threshold\?\.endLocalTime/);
  assert.match(html,/class="dash-status-meta"/);
  assert.match(html,/NEXT TIME<br>MILESTONE/);
  assert.match(shared,/!\['game','dv03'\]\.includes/);
});

test('DV03 Hero validator keeps candidate art private and checks the locked contract',()=>{
  const validator=read('scripts/validate-dv03-hero.mjs');
  const contract=read('assets/images/dv03/hero/README.md');
  assert.match(validator,/width!==1536\|\|height!==1024/);
  assert.match(validator,/colorType!==6/);
  assert.match(validator,/alphaThreshold:8/);
  assert.match(contract,/Candidate masters remain outside the public repository/);
  assert.match(contract,/separate required outputs derived from one private submitted photograph/);
  assert.match(contract,/compact canonical headshot/);
  assert.match(contract,/driver switch must update both the headshot and seated Hero/);
  assert.match(contract,/validate:dv03-hero/);
});

test('DV03 keeps the canonical headshot while coloring only Local Time with the driver palette',()=>{
  const html=read('log/index.html');
  const avatar=read('assets/js/log-avatar.js');
  const css=read('assets/css/log-game-dv03.css');
  assert.match(html,/log-avatar\.js/);
  assert.match(avatar,/image\.id = 'driver-avatar'/);
  assert.match(avatar,/assignment\.storage_path/);
  assert.match(avatar,/functions\.invoke\('driver-hero-url'/);
  assert.match(avatar,/headshot_signed_url/);
  assert.match(css,/\.local-time-status b\{color:var\(--dv-driver-highlight/);
  assert.match(css,/\.night-xp-status b\{color:var\(--blue\)\}/);
});

test('DV03 production Playwright is separately authorized and read-only scoped',()=>{
  const config=read('playwright.production.config.mjs');
  const spec=read('tests/e2e/bklg-0148-dv03-production.spec.mjs');
  assert.match(config,/DV_E2E_PRODUCTION!==['"]1['"]/);
  assert.match(config,/baseURL:['"]https:\/\/mydriveventure\.com['"]/);
  assert.match(config,/testMatch:['"]bklg-0148-dv03-production\.spec\.mjs['"]/);
  assert.doesNotMatch(spec,/\.click\(|\.fill\(|\.type\(|\.check\(|\.selectOption\(/);
});
