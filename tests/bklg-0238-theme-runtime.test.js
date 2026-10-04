const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')

const path=require('node:path')
const read=file=>fs.readFileSync(path.join(__dirname,file),'utf8')
const registrySource=read('../assets/js/dv03-visual-asset-registry.js')
const calendarSource=read('../assets/js/dv03-theme-calendar.js')
const lunarSource=read('../assets/js/dv03-lunar-phase.js')
const presentationSource=read('../assets/js/dv03-presentation-rules.js')
const runtimeSource=read('../assets/js/log-game-dv03.js')
const operatorSource=read('../assets/js/operator-visual-assets.js')
const operatorHtml=read('../operator/visual-assets/index.html')
const calendar=(year,month,day,startOffset,endOffset,baseEnd=0)=>({
  anchor:{kind:'FIXED_DATE',month,day},
  start_offset_days:startOffset,
  base_end_offset_days:baseEnd,
  end_offset_days:endOffset
})
function harness(){
  const context={window:{},console,Intl,Date,Map,Set,Promise,Object,Array,Number,String,Math,JSON,Error};
  context.window.window=context.window;
  vm.runInNewContext(registrySource,context);
  vm.runInNewContext(calendarSource,context);
  vm.runInNewContext(lunarSource,context);
  vm.runInNewContext(presentationSource,context);
  return context.window.DV03_PRESENTATION_RULES;
}
const season={id:'autumn',theme:'autumn',label:'Autumn',enabled:true,rule:calendar(2026,9,23,0,0,68)}
const holiday={id:'halloween',theme:'halloween',label:'Halloween',enabled:true,rule:calendar(2026,10,31,-14,0,0)}
const parkAward={id:'award-park',driver_id:'driver-a',quest_key:'Q000035',awarded_at:'2026-09-01T12:00:00Z'}
const homeAward={id:'award-home',driver_id:'driver-a',quest_key:'Q000037',awarded_at:'2026-10-02T12:00:00Z'}

test('BKLG-0238 uses the driver local date with America/Detroit fallback at date boundaries',()=>{
  const rules=harness();rules.setThemeCalendar({ok:true,exists:true,version:1,rules:[season,holiday]});
  assert.equal(rules.resolveTheme('America/Detroit',new Date('2026-09-23T03:30:00Z')),'normal');
  assert.equal(rules.resolveTheme('America/Detroit',new Date('2026-09-23T04:30:00Z')),'autumn');
  assert.equal(rules.resolveTheme(null,new Date('2026-09-23T04:30:00Z')),'autumn');
})

test('BKLG-0238 applies Halloween override and restores Autumn afterward for an existing Park scenery',()=>{
  const rules=harness();rules.setThemeCalendar({ok:true,exists:true,version:2,rules:[season,holiday]});
  const halloween=rules.resolvePresentation({awards:[parkAward],driverId:'driver-a',timeZone:'America/Detroit',now:new Date('2026-10-20T16:00:00Z')});
  const autumn=rules.resolvePresentation({awards:[parkAward],driverId:'driver-a',timeZone:'America/Detroit',now:new Date('2026-11-01T16:00:00Z')});
  assert.equal(halloween.theme,'halloween');
  assert.match(halloween.activeScenery.src,/BACKGROUND-HALLOWEEN-L01-PARK\.png/);
  assert.equal(autumn.theme,'autumn');
  assert.match(autumn.activeScenery.src,/BACKGROUND-AUTUMN-L01-PARK\.png/);
})

test('BKLG-0183 resolves Home to L03 and applies Autumn/Halloween variants',()=>{
  const rules=harness();rules.setThemeCalendar({ok:true,exists:true,version:4,rules:[season,holiday]});
  const halloween=rules.resolvePresentation({awards:[homeAward],driverId:'driver-a',timeZone:'America/Detroit',now:new Date('2026-10-20T16:00:00Z')});
  const autumn=rules.resolvePresentation({awards:[homeAward],driverId:'driver-a',timeZone:'America/Detroit',now:new Date('2026-11-01T16:00:00Z')});
  assert.match(halloween.activeScenery.src,/BACKGROUND-HALLOWEEN-L03-HOME\.png/);
  assert.match(autumn.activeScenery.src,/BACKGROUND-AUTUMN-L03-HOME\.png/);
})

test('BKLG-0238 uses BASE when a themed destination variant is missing',()=>{
  const rules=harness();rules.setThemeCalendar({ok:true,exists:true,version:3,rules:[{id:'winter',theme:'winter',label:'Winter',enabled:true,rule:calendar(2026,1,1,0,0,365)}]});
  const result=rules.resolvePresentation({awards:[parkAward],driverId:'driver-a',timeZone:'America/Detroit',now:new Date('2026-02-01T16:00:00Z')});
  assert.equal(result.theme,'winter');
  assert.match(result.activeScenery.src,/BACKGROUND-BASE-L01-PARK\.png/);
})

test('BKLG-0238 falls back to BASE for absent or invalid shared configuration',()=>{
  const rules=harness();
  rules.setThemeCalendar({ok:false,exists:false,rules:[]});
  const absent=rules.resolvePresentation({awards:[parkAward],driverId:'driver-a',now:new Date('2026-10-20T16:00:00Z')});
  assert.equal(absent.theme,'normal');
  assert.match(absent.activeScenery.src,/BACKGROUND-BASE-L01-PARK\.png/);
  rules.setThemeCalendar({ok:true,exists:true,rules:[season,{...holiday,theme:'winter'}]});
  const invalid=rules.resolvePresentation({awards:[parkAward],driverId:'driver-a',now:new Date('2026-10-20T16:00:00Z')});
  assert.equal(invalid.theme,'normal');
})

test('BKLG-0238 selects only registered holiday night skies and preserves the BASE sky fallback',()=>{
  const rules=harness();
  assert.match(rules.nightSkyForTheme('halloween'),/DV03-SKY-HALLOWEEN-NIGHT-WITCH\.png/);
  assert.match(rules.nightSkyForTheme('christmas'),/DV03-SKY-CHRISTMAS-NIGHT-SANTA\.png/);
  assert.match(rules.nightSkyForTheme('autumn',new Date('2026-10-26T04:12:00Z')),/DV03-SKY-BASE-NIGHT-MOON-FULL\.png/);
})

test('BKLG-0238 runtime loads shared calendar and canonical asset registry before resolving scenery',()=>{
  assert.match(runtimeSource,/dv03-theme-calendar\.js\?v=20260928-bklg0238/);
  assert.match(runtimeSource,/dv03-lunar-phase\.js\?v=20261003-bklg0234/);
  assert.match(runtimeSource,/dv03-visual-asset-registry\.js\?v=20261003-destinations2/);
  assert.match(runtimeSource,/loadThemeCalendar\(window\.DV_LOG_APP\?\.client\)/);
  assert.match(presentationSource,/functions\.invoke\('dv03-theme-calendar'/);
})

test('BKLG-0238 operator calendar preserves drafts and saves only through version-checked shared API',()=>{
  assert.match(operatorSource,/localStorage\.setItem\(CAL_KEY,JSON\.stringify\(calendarRules\)\)/);
  assert.match(operatorSource,/expectedVersion:calendarVersion/);
  assert.match(operatorSource,/functions\.invoke\('dv03-theme-calendar'/);
  assert.match(operatorSource,/Publish Shared Calendar/);
  assert.match(operatorHtml,/Restore Browser Draft/);
  assert.match(operatorSource,/calendarHasShared=true;calendarDirty=false/);
  assert.match(operatorSource,/No shared changes were made/)
  assert.match(operatorSource,/error\.context\.clone\(\)/);
})
