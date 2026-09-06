const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('BKLG-0089 all supported experiences seed the deep-link driver before dashboard load',()=>{
  for(const page of ['log/DV00/index.html','log/DV02/index.html','log/index.html']){
    const html=read(page);
    const configAt=html.indexOf('/log/config.js');
    const dashboardAt=html.indexOf('log-dashboard-entry-v5.js');
    assert.ok(configAt>=0,`${page} loads log/config.js`);
    assert.ok(dashboardAt>configAt,`${page} loads config before dashboard entry`);
  }
  const config=read('log/config.js');
  assert.match(config,/new URLSearchParams\(window\.location\.search\)\.get\('driver'\)/);
  assert.match(config,/localStorage\.setItem\('dv\.log\.driver', requested\)/);
});

test('BKLG-0089 later manual switches keep the driver query parameter synchronized',()=>{
  const config=read('log/config.js');
  assert.match(config,/dv:driver-changing/);
  assert.match(config,/url\.searchParams\.set\('driver', driverId\)/);
  assert.match(config,/history\.replaceState/);
  assert.doesNotMatch(config,/searchParams\.delete\('editDrive'\)/);
});

test('BKLG-0089 shared synchronizer remains a late-load defense in depth',()=>{
  const rpc=read('assets/js/log-drive-rpc.js');
  const presenter=read('assets/js/log-skin-presenter.js');
  const js=read('assets/js/log-driver-switch-sync.js');
  assert.match(rpc,/log-skin-presenter\.js/);
  assert.match(presenter,/log-driver-switch-sync\.js/);
  assert.match(js,/app\.selectDriver\(requested/);
  assert.match(js,/dv:driver-changing/);
});

test('BKLG-0089 existing presentation reset hooks remain active for avatar and DV03 hero',()=>{
  const avatar=read('assets/js/log-avatar.js');
  const hero=read('assets/js/log-game-dv03.js');
  assert.match(avatar,/dv:driver-changing/);
  assert.match(avatar,/clearAvatar\(\)/);
  assert.match(hero,/dv:driver-changing/);
  assert.match(hero,/showFallback/);
  assert.match(hero,/app\?\.getDriverId\?\.\(\)!==driverId/);
});
