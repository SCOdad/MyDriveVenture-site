const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')

const lunar=require('../assets/js/dv03-lunar-phase.js')
const read=file=>fs.readFileSync(path.join(__dirname,file),'utf8')
const registrySource=read('../assets/js/dv03-visual-asset-registry.js')
const lunarSource=read('../assets/js/dv03-lunar-phase.js')
const presentationSource=read('../assets/js/dv03-presentation-rules.js')

function rulesHarness(){
  const context={window:{},console,Intl,Date,Map,Set,Promise,Object,Array,Number,String,Math,JSON,Error};
  context.window.window=context.window;
  vm.runInNewContext(registrySource,context);
  vm.runInNewContext(lunarSource,context);
  vm.runInNewContext(presentationSource,context);
  return context.window.DV03_PRESENTATION_RULES;
}

const primaryPhases=[
  ['2026-10-10T15:50:00Z','NEW',0],
  ['2026-10-18T16:12:00Z','QUARTER',0.5],
  ['2026-10-26T04:12:00Z','FULL',1],
  ['2026-11-01T20:28:00Z','QUARTER',0.5]
];

test('BKLG-0234 lunar calculation tracks USNO 2026 primary phase timestamps',()=>{
  for(const [timestamp,bucket,expectedIllumination] of primaryPhases){
    const result=lunar.phaseFor(new Date(timestamp));
    assert.equal(result.bucket,bucket,timestamp);
    assert.ok(Math.abs(result.illumination-expectedIllumination)<0.015,`${timestamp} illumination ${result.illumination}`);
  }
});

test('BKLG-0234 maps coarse illumination to the four governed DV03 sky buckets',()=>{
  assert.equal(lunar.bucketForIllumination(0.02),'NEW');
  assert.equal(lunar.bucketForIllumination(0.20),'CRESCENT');
  assert.equal(lunar.bucketForIllumination(0.50),'QUARTER');
  assert.equal(lunar.bucketForIllumination(0.90),'FULL');
});

test('BKLG-0234 resolves generic lunar sky assets from calculated phase',()=>{
  const rules=rulesHarness();
  assert.match(rules.nightSkyForTheme('normal',new Date('2026-10-10T15:50:00Z')),/MOON-NEW\.png/);
  assert.match(rules.nightSkyForTheme('normal',new Date('2026-10-14T15:50:00Z')),/MOON-CRESCENT\.png/);
  assert.match(rules.nightSkyForTheme('normal',new Date('2026-10-18T16:12:00Z')),/MOON-QUARTER\.png/);
  assert.match(rules.nightSkyForTheme('normal',new Date('2026-10-26T04:12:00Z')),/MOON-FULL\.png/);
});

test('BKLG-0234 keeps authored holiday skies above astronomical fallback',()=>{
  const rules=rulesHarness();
  const newMoon=new Date('2026-10-10T15:50:00Z');
  assert.match(rules.nightSkyForTheme('halloween',newMoon),/HALLOWEEN-NIGHT-WITCH\.png/);
  assert.match(rules.nightSkyForTheme('christmas',newMoon),/CHRISTMAS-NIGHT-SANTA\.png/);
});
