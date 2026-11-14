const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const dashboard=fs.readFileSync('assets/js/log-dashboard-entry-v5.js','utf8');
const family=fs.readFileSync('assets/js/family-card-profile.js','utf8');
const profile=fs.readFileSync('assets/js/profile.js','utf8');

test('dashboard script parses and never substitutes recorded practice for qualifying credit',()=>{
  assert.doesNotThrow(()=>new vm.Script(dashboard));
  const start=dashboard.indexOf('  const currentDisplayProgress=');
  const end=dashboard.indexOf('  const activeVehicles=',start);
  assert.ok(start>=0&&end>start);
  const cache=new Map();
  const display=new Function('currentProgress','currentDriver','isStateNeutral','qualifyingProgressCache','currentDriverId',
    dashboard.slice(start,end)+';return currentDisplayProgress;')(
      ()=>({total_minutes:61,night_minutes:31,total_drives:2,xp:625}),
      ()=>({home_state:'FL',license_stage:'LEARNER'}), d=>d.home_state==='US',cache,'driver-1');
  const florida={home_state:'FL',license_stage:'LEARNER'};
  assert.equal(display(florida).total_minutes,null);
  assert.equal(display(florida).night_minutes,null);
  cache.set('driver-1',{total_minutes:45,night_minutes:15});
  assert.deepEqual([display(florida).total_minutes,display(florida).night_minutes],[45,15]);
  assert.equal(display(florida).xp,625);
  assert.deepEqual([display({home_state:'US'}).total_minutes,display({home_state:'US'}).night_minutes],[61,31]);
});

test('all licensing gauges use authenticated profile licensing requirements',()=>{
  assert.match(dashboard,/action:'license_overview',driver_id:driverId/);
  assert.match(dashboard,/qualifyingProgressCache\.set\(driverId,result\)/);
  assert.match(dashboard,/const progress=currentDisplayProgress\(driver\)/);
  assert.match(dashboard,/return \{\.\.\.raw,total_minutes:qualified\?\.total_minutes\?\?null,night_minutes:qualified\?\.night_minutes\?\?null\}/);
  assert.match(dashboard,/progress\.total_minutes==null\?'QUALIFYING CREDIT PENDING'/);
  assert.match(dashboard,/qualifyingProgressCache\.clear\(\)/);
  assert.doesNotMatch(dashboard,/const progress=currentProgress\(\),license=currentLicenseStatus\(\)/);
});

test('Family Hub, Profile and Driver Console expose identical two-decimal qualifying hours',()=>{
  assert.match(dashboard,/const hours=m=>m==null\?'—':\(Number\(m\)\/60\)\.toFixed\(2\)/);
  assert.match(family,/row\.querySelector\('strong'\)\.textContent=\x60\$\{Number\(n\.actual\.toFixed\(2\)\)\}/);
  assert.match(profile,/maximumFractionDigits:2/);
  assert.equal((45/60).toFixed(2),'0.75');
  assert.equal((15/60).toFixed(2),'0.25');
});
