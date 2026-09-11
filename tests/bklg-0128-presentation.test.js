const test=require('node:test');
const assert=require('node:assert/strict');
const p=require('../assets/js/dv03-presentation.js');
const award=(key,order,xp,date='2020-01-01T00:00:00Z',driver='one')=>({quest_key:key,driver_id:driver,awarded_at:date,xp_awarded:xp,quest:{display_order:order}});
test('featured precedence is ascending display_order, descending XP, ascending key',()=>{
  const resolve=awards=>p.resolve({driverId:'one',newAwards:awards}).featured.quest_key;
  assert.equal(resolve([award('Q000039',39,900),award('Q000006',4,1)]),'Q000006');
  assert.equal(resolve([award('Q000039',4,900),award('Q000006',4,1)]),'Q000039');
  assert.equal(resolve([award('Q000039',4,900),award('Q000006',4,900)]),'Q000006');
  assert.equal(resolve([award('Q000039',null,900),award('Q000006',4,1)]),'Q000006');
});
test('durable scenery has no expiry, filters drivers and invalid dates, replaces only with newer scenery',()=>{
  const park=award('Q000035',35,400),library=award('Q000039',39,300,'2021-01-01T00:00:00Z');
  assert.equal(p.resolve({awards:[park],driverId:'one'}).scenery.key,'park');
  const awards=[park,library,award('Q000006',4,500,'2025-01-01T00:00:00Z'),award('Q000044',44,500,'2026-01-01T00:00:00Z','two'),award('Q000046',44,500,'bad')];
  assert.equal(p.resolve({awards,driverId:'one'}).scenery.key,'library');
  assert.equal(p.resolve({awards,driverId:'one'}).showBillboard,false);
  assert.equal(p.resolve({awards,driverId:'missing'}).showBillboard,true);
});
test('featured billboard covers new scenery temporarily, then durable scenery is restored',()=>{
  const awards=[award('Q000039',39,300),award('Q000006',4,500)];
  const featured=p.resolve({awards,driverId:'one',newAwards:awards});
  assert.equal(featured.showBillboard,true);assert.equal(featured.persistent.quest_key,'Q000039');
  const resting=p.resolve({awards,driverId:'one'});assert.equal(resting.showBillboard,false);assert.equal(resting.scenery.key,'library');
  assert.equal(p.resolve({awards,driverId:'one',newAwards:[awards[0]]}).showBillboard,false);
});
test('simultaneous scenery is deterministic without mutating input',()=>{
  const awards=[award('Q000046',44,500),award('Q000044',44,500)];
  assert.equal(p.persistentAward(awards,'one').quest_key,'Q000044');
  assert.equal(p.persistentAward([...awards].reverse(),'one').quest_key,'Q000044');
  assert.equal(awards[0].quest_key,'Q000046');
});
test('sky uses current driver timezone, including day/night boundaries and DST',()=>{
  for(const [time,sky] of [['05:59','night'],['06:00','day'],['17:59','day'],['18:00','night']])assert.equal(p.skyAt(new Date(`2026-09-11T${time}:00Z`),'UTC'),sky);
  const now=new Date('2026-09-11T12:00:00Z');assert.equal(p.skyAt(now,'America/Detroit'),'day');assert.equal(p.skyAt(now,'America/Los_Angeles'),'night');
  assert.equal(p.skyAt(new Date('2026-03-08T10:00:00Z'),'America/Detroit'),'day');
  assert.doesNotThrow(()=>p.skyAt(now,'invalid-zone'));
});
