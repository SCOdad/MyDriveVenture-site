const test=require('node:test');
const assert=require('node:assert/strict');
const rules=require('../assets/js/dv03-presentation-rules.js');

const award=(quest_key,display_order,xp_awarded,awarded_at='2026-09-11T12:00:00Z',driver_id='driver-1')=>({id:`${quest_key}-${awarded_at}`,driver_id,quest_key,xp_awarded,awarded_at,quest:{quest_key,display_order,name:quest_key}});

test('DV03 featured precedence is display_order, then higher XP, then quest_key',()=>{
  const displayWinner=rules.selectFeaturedAward([award('Q000090',20,500),award('Q000091',10,1)]);
  assert.equal(displayWinner.quest_key,'Q000091');

  const xpWinner=rules.selectFeaturedAward([award('Q000090',20,500),award('Q000091',20,700)]);
  assert.equal(xpWinner.quest_key,'Q000091');

  const keyWinner=rules.selectFeaturedAward([award('Q000091',20,500),award('Q000090',20,500)]);
  assert.equal(keyWinner.quest_key,'Q000090');
});

test('DV03 persistent scenery is the most recently earned scenery-qualified award',()=>{
  const older=award('Q000035',35,400,'2026-09-01T12:00:00Z');
  const newer=award('Q000039',39,300,'2026-09-10T12:00:00Z');
  const nonScenery=award('Q000009',9,2500,'2026-09-11T12:00:00Z');
  const selected=rules.selectPersistentSceneryAward([older,newer,nonScenery],'driver-1');
  assert.equal(selected.quest_key,'Q000039');
  assert.equal(rules.sceneryFor(selected).scene,'library');
});

test('DV03 resting scenery suppresses billboard while featured billboard temporarily wins',()=>{
  const scenery=award('Q000039',39,300,'2026-09-10T12:00:00Z');
  const resting=rules.resolvePresentation({awards:[scenery],driverId:'driver-1',timeZone:'America/Detroit',now:new Date('2026-09-11T16:00:00Z')});
  assert.equal(resting.persistentScenery.scene,'library');
  assert.equal(resting.showBillboard,false);

  const milestone=award('Q000009',9,2500,'2026-09-11T12:00:00Z');
  const featured=rules.resolvePresentation({awards:[scenery],driverId:'driver-1',featuredAwards:[scenery,milestone],timeZone:'America/Detroit',now:new Date('2026-09-11T16:00:00Z')});
  assert.equal(featured.featuredAward.quest_key,'Q000009');
  assert.equal(featured.featuredMode,'billboard');
  assert.equal(featured.persistentScenery.scene,'library');
  assert.equal(featured.showBillboard,true);
});

test('DV03 featured scenery wins without billboard when its display order outranks alternatives',()=>{
  const scenery=award('Q000017',17,250,'2026-09-11T12:00:00Z');
  const laterOrderBillboard=award('Q000080',80,400,'2026-09-11T12:00:00Z');
  const result=rules.resolvePresentation({awards:[scenery],driverId:'driver-1',featuredAwards:[laterOrderBillboard,scenery]});
  assert.equal(result.featuredAward.quest_key,'Q000017');
  assert.equal(result.featuredMode,'scenery');
  assert.equal(result.activeScenery.scene,'snack-run');
  assert.equal(result.showBillboard,false);
});

test('DV03 sky follows driver-local day/night boundaries',()=>{
  assert.equal(rules.skyFor('America/Detroit',new Date('2026-09-11T16:00:00Z')),'day');
  assert.equal(rules.skyFor('America/Detroit',new Date('2026-09-12T02:00:00Z')),'night');
});
