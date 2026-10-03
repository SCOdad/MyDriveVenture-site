const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
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


test('DV03 newer destination quests resolve to their governed BASE scenery',()=>{
  const expected=[
    ['Q000091','wrestling-training-center','Wrestling Training Center','DV03-BACKGROUND-BASE-L14-WRESTLING-TRAINING-CENTER.png'],
    ['Q000092','karate-dojo','Karate Dojo','DV03-BACKGROUND-BASE-L15-KARATE-DOJO.png'],
    ['Q000093','pizzeria','Pizzeria','DV03-BACKGROUND-BASE-L16-PIZZERIA.png'],
    ['Q000094','sushi-restaurant','Sushi Restaurant','DV03-BACKGROUND-BASE-L17-SUSHI-RESTAURANT.png'],
    ['Q000095','ice-cream-shop','Ice Cream Shop','DV03-BACKGROUND-BASE-L18-ICE-CREAM-SHOP.png'],
    ['Q000097','airport','Airport','DV03-BACKGROUND-BASE-L20-AIRPORT.png']
  ];
  for(const [questKey,scene,label,file] of expected){
    const scenery=rules.sceneryFor(award(questKey,Number(questKey.slice(1)),100));
    assert.equal(scenery.scene,scene,questKey);
    assert.equal(scenery.label,label,questKey);
    assert.match(scenery.src,new RegExp(file.replaceAll('.','\\.')),questKey);
  }
});

test('DV03 Pizza quest Q000093 presents Pizzeria scenery for the production failure case',()=>{
  const pizza=award('Q000093',93,100,'2026-10-03T22:56:58Z');
  const result=rules.resolvePresentation({awards:[pizza],driverId:'driver-1',skyMode:'day',themeOverride:'normal'});
  assert.equal(result.persistentAward.quest_key,'Q000093');
  assert.equal(result.activeScenery.scene,'pizzeria');
  assert.match(result.activeScenery.src,/DV03-BACKGROUND-BASE-L16-PIZZERIA\.png$/);
  assert.equal(result.showBillboard,false);
});

test('DV03 Taco Q000096 remains unmapped until a governed BASE Taco asset exists',()=>{
  assert.equal(rules.SCENERY_BY_QUEST.Q000096,undefined);
});

test('DV03 resting scenery suppresses billboard while featured billboard temporarily wins',()=>{
  const scenery=award('Q000039',39,300,'2026-09-10T12:00:00Z');
  const resting=rules.resolvePresentation({awards:[scenery],driverId:'driver-1',timeZone:'America/Detroit',now:new Date('2026-09-11T16:00:00Z'),skyMode:'day'});
  assert.equal(resting.persistentScenery.scene,'library');
  assert.equal(resting.activeScenery.scene,'library');
  assert.equal(resting.showBillboard,false);

  const milestone=award('Q000009',9,2500,'2026-09-11T12:00:00Z');
  const featured=rules.resolvePresentation({awards:[scenery],driverId:'driver-1',featuredAwards:[scenery,milestone],timeZone:'America/Detroit',now:new Date('2026-09-11T16:00:00Z'),skyMode:'day'});
  assert.equal(featured.featuredAward.quest_key,'Q000009');
  assert.equal(featured.featuredMode,'billboard');
  assert.equal(featured.persistentScenery.scene,'library');
  assert.equal(featured.showBillboard,true);
});

test('DV03 scenery references ship final existing assets',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','assets','js','dv03-presentation-rules.js'),'utf8');
  assert.doesNotMatch(source,/DRAFT/);
  for(const scenery of Object.values(rules.SCENERY_BY_QUEST)){
    const [assetPath]=scenery.src.replace(/^\//,'').split('?');
    assert.equal(fs.existsSync(path.join(__dirname,'..',assetPath)),true,`${scenery.scene} asset is present`);
  }
  assert.equal(rules.DEFAULT_SCENERY,null);
});

test('DV03 drivers without mapped scenery use the base landscape layer during the day',()=>{
  const resting=rules.resolvePresentation({awards:[],driverId:'driver-1',skyMode:'day'});
  assert.equal(resting.activeScenery,null);
  assert.equal(resting.showBillboard,true);

  const milestone=award('Q000085',85,0,'2026-09-12T12:00:00Z');
  const featured=rules.resolvePresentation({awards:[],driverId:'driver-1',featuredAwards:[milestone],skyMode:'day'});
  assert.equal(featured.featuredMode,'billboard');
  assert.equal(featured.activeScenery,null);
  assert.equal(featured.showBillboard,true);
});

test('DV03 drivers without mapped scenery keep base landscape even at night',()=>{
  const resting=rules.resolvePresentation({awards:[],driverId:'driver-1',skyMode:'night'});
  assert.equal(resting.activeScenery,null);
  assert.equal(resting.showBillboard,true);
});

test('DV03 featured scenery wins without billboard when its display order outranks alternatives at night',()=>{
  const scenery=award('Q000017',17,250,'2026-09-11T12:00:00Z');
  const laterOrderBillboard=award('Q000080',80,400,'2026-09-11T12:00:00Z');
  const result=rules.resolvePresentation({awards:[scenery],driverId:'driver-1',featuredAwards:[laterOrderBillboard,scenery],skyMode:'night'});
  assert.equal(result.featuredAward.quest_key,'Q000017');
  assert.equal(result.featuredMode,'scenery');
  assert.equal(result.activeScenery.scene,'snack-run');
  assert.equal(result.showBillboard,false);
});

test('DV03 featured scenery remains active with daytime sky',()=>{
  const scenery=award('Q000017',17,250,'2026-09-11T12:00:00Z');
  const laterOrderBillboard=award('Q000080',80,400,'2026-09-11T12:00:00Z');
  const result=rules.resolvePresentation({awards:[scenery],driverId:'driver-1',featuredAwards:[laterOrderBillboard,scenery],skyMode:'day'});
  assert.equal(result.featuredAward.quest_key,'Q000017');
  assert.equal(result.featuredMode,'scenery');
  assert.equal(result.activeScenery.scene,'snack-run');
  assert.equal(result.showBillboard,false);
});

test('DV03 sky follows driver-local day/night boundaries',()=>{
  assert.equal(rules.skyFor('America/Detroit',new Date('2026-09-11T16:00:00Z')),'day');
  assert.equal(rules.skyFor('America/Detroit',new Date('2026-09-12T02:00:00Z')),'night');
});
