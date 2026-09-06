const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('BKLG-0089 all supported experiences load shared driver-switch synchronization',()=>{
  for(const page of ['log/DV00/index.html','log/DV02/index.html','log/index.html']){
    const html=read(page);
    assert.match(html,/log-drive-rpc\.js/);
  }
  const rpc=read('assets/js/log-drive-rpc.js');
  const presenter=read('assets/js/log-skin-presenter.js');
  assert.match(rpc,/log-skin-presenter\.js/);
  assert.match(presenter,/log-driver-switch-sync\.js/);
});

test('BKLG-0089 deep-link driver is selected once and later manual switches update the URL',()=>{
  const js=read('assets/js/log-driver-switch-sync.js');
  assert.match(js,/new URLSearchParams\(window\.location\.search\)/);
  assert.match(js,/params\(\)\.get\('driver'\)/);
  assert.match(js,/app\.selectDriver\(requested/);
  assert.match(js,/dv:driver-changing/);
  assert.match(js,/url\.searchParams\.set\('driver', driverId\)/);
  assert.match(js,/history\.replaceState/);
});

test('BKLG-0089 driver switching does not erase certification edit target parameters',()=>{
  const js=read('assets/js/log-driver-switch-sync.js');
  assert.doesNotMatch(js,/searchParams\.delete\('editDrive'\)/);
  assert.doesNotMatch(js,/searchParams\.delete\('driver'\)/);
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
