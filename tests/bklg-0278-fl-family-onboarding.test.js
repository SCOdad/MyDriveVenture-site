const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const script=fs.readFileSync('assets/js/family-license-stages.js','utf8');

function mount(zipValue){
 const listeners={};
 const zip={value:zipValue,validity:'',setCustomValidity(v){this.validity=v},
   addEventListener(event,handler){listeners[event]=handler}};
 const stage={value:'',innerHTML:''};
 const date={required:false};
 const labels={
  'family-license-stage-label':{innerHTML:''},
  'family-stage-date-label':{innerHTML:''},
 };
 const form={elements:{home_zip:zip,license_stage:stage,license_stage_start_date:date},
  addEventListener(){}};
 const document={
  getElementById(id){return id==='add-driver-form'?form:labels[id]},
  querySelectorAll(){return []}
 };
 const window={DV_FL_LAUNCH_STATUS:false,addEventListener(event,handler){listeners[event]=handler}};
 vm.runInNewContext(script,{document,window,setTimeout(){}});
 return {zip,stage,date,labels,render(){listeners.input()},setLaunch(enabled){window.DV_FL_LAUNCH_STATUS=enabled;listeners['dv:fl-launch-status']({detail:{enabled}})}};
}
test('Florida 32801 only offers stages after authenticated launch confirmation',()=>{
 const ui=mount('32801');
 assert.equal(ui.stage.value,'STATE_NEUTRAL');
 assert.doesNotMatch(ui.stage.innerHTML,/value="LEARNER"/);
 ui.setLaunch(true);
 assert.match(ui.stage.innerHTML,/value="LEARNER"/);
 assert.match(ui.stage.innerHTML,/value="INTERMEDIATE"/);
 assert.match(ui.stage.innerHTML,/value="FULL"/);
 assert.equal(ui.date.required,true);
 assert.match(ui.labels['family-license-stage-label'].innerHTML,/License stage/);
});
test('MI, KS, PA retain their configured licensing stages',()=>{
 for(const [zip,stage] of [['48346','LEVEL_1'],['66002','INSTRUCTION'],['15213','JUNIOR']]){
  const ui=mount(zip);
  assert.ok(ui.stage.innerHTML.includes('value="'+stage+'"'),zip);
  assert.equal(ui.date.required,true,zip);
 }
});
test('non-configured state remains state-neutral with optional date',()=>{
 const ui=mount('90210');
 assert.match(ui.stage.innerHTML,/value="STATE_NEUTRAL"/);
 assert.equal(ui.stage.value,'STATE_NEUTRAL');
 assert.equal(ui.date.required,false);
});
test('changing Florida to another jurisdiction clears incompatible stage',()=>{
 const ui=mount('32801');
 ui.setLaunch(true);
 ui.stage.value='INTERMEDIATE';
 ui.zip.value='90210';ui.render();
 assert.equal(ui.stage.value,'STATE_NEUTRAL');
 ui.zip.value='48346';ui.render();
 assert.equal(ui.stage.value,'');
 assert.equal(ui.date.required,true);
});
test('invalid ZIP requires ZIP entry and does not present FL stages',()=>{
 const ui=mount('3280');
 assert.doesNotMatch(ui.stage.innerHTML,/value="LEARNER"/);
 assert.equal(ui.date.required,true);
});

test('Florida release revocation returns stage selector to state-neutral',()=>{
 const ui=mount('32801');
 ui.setLaunch(true);
 assert.match(ui.stage.innerHTML,/value="LEARNER"/);
 ui.setLaunch(false);
 assert.equal(ui.stage.value,'STATE_NEUTRAL');
 assert.equal(ui.date.required,false);
});
