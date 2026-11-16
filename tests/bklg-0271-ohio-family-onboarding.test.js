const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('assets/js/family-license-stages.js','utf8');

function render(zipValue){
  const listeners={};
  const zip={value:zipValue,setCustomValidity(){},addEventListener(n,fn){listeners['zip:'+n]=fn}};
  const stage={value:'',innerHTML:''},date={required:false};
  const labels={'family-license-stage-label':{innerHTML:''},'family-stage-date-label':{innerHTML:''}};
  const form={elements:{home_zip:zip,license_stage:stage,license_stage_start_date:date},addEventListener(){}};
  const document={getElementById(n){return n==='add-driver-form'?form:labels[n]},querySelectorAll(){return[]}};
  const window={DV_FL_LAUNCH_STATUS:false,DV_OH_LAUNCH_STATUS:false,addEventListener(n,fn){listeners[n]=fn}};
  vm.runInNewContext(source,{document,window,setTimeout(){}});
  return {zip,stage,date,labels,
    ohio(enabled){listeners['dv:oh-launch-status']({detail:{enabled}})},
    florida(enabled){listeners['dv:fl-launch-status']({detail:{enabled}})},
    change(next){zip.value=next;listeners['zip:input']()}
  };
}

test('Ohio defaults to state-neutral until authenticated release confirmation',()=>{
  const ui=render('43015');
  assert.equal(ui.stage.value,'STATE_NEUTRAL');
  assert.doesNotMatch(ui.stage.innerHTML,/TIPIC|PROBATIONARY/);
  assert.equal(ui.date.required,false);
  ui.ohio(true);
  assert.match(ui.stage.innerHTML,/value="TIPIC"/);
  assert.match(ui.stage.innerHTML,/value="PROBATIONARY"/);
  assert.match(ui.stage.innerHTML,/value="FULL"/);
  assert.equal(ui.date.required,true);
});
test('Ohio release revocation fails closed and cannot leave a selected stage',()=>{
  const ui=render('44114');ui.ohio(true);ui.stage.value='TIPIC';ui.ohio(false);
  assert.equal(ui.stage.value,'STATE_NEUTRAL');assert.equal(ui.date.required,false);
});
test('Ohio support does not activate Florida or other unsupported ZIPs',()=>{
  const ui=render('44114');ui.ohio(true);ui.change('32801');
  assert.equal(ui.stage.value,'STATE_NEUTRAL');ui.florida(true);
  assert.match(ui.stage.innerHTML,/INTERMEDIATE/);
  ui.change('90210');assert.equal(ui.stage.value,'STATE_NEUTRAL');
});
test('MI Kansas Pennsylvania selectors remain visible and independent of Ohio gate',()=>{
  for(const [zip,stage] of [['48346','LEVEL_1'],['66002','INSTRUCTION'],['15213','JUNIOR']]){
    const ui=render(zip);assert.ok(ui.stage.innerHTML.includes('value="'+stage+'"'));assert.equal(ui.date.required,true);
  }
});
test('Invalid ZIP cannot select Ohio licensing',()=>{
  const ui=render('4301');ui.ohio(true);assert.doesNotMatch(ui.stage.innerHTML,/TIPIC/);
});
