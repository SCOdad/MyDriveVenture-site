import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('assets/js/family-license-stages.js','utf8');

function harness(initialZip='') {
  const events={};
  const zip={value:initialZip,setCustomValidity(){},addEventListener(name,fn){events[name]=fn}};
  const stage={value:'',innerHTML:''};
  const date={required:false};
  const labels={
    'family-license-stage-label':{innerHTML:''},
    'family-stage-date-label':{innerHTML:''},
  };
  const form={
    elements:{home_zip:zip,license_stage:stage,license_stage_start_date:date},
    addEventListener(){},
  };
  const document={
    getElementById(id){return id==='add-driver-form'?form:labels[id]??null},
    querySelectorAll(){return[]},
  };
  vm.runInNewContext(source,{document,setTimeout}, {timeout:1000});
  return {
    select(value){zip.value=value;events.input();return {markup:stage.innerHTML,value:stage.value,dateRequired:date.required,trackingLabel:labels['family-license-stage-label'].innerHTML}},
  };
}

test('PA ZIP selects learner, junior, full with mandatory start date',()=>{
  const result=harness().select('17101');
  assert.match(result.markup,/Learner permit/);
  assert.match(result.markup,/Junior driver license/);
  assert.match(result.markup,/Unrestricted driver license/);
  assert.doesNotMatch(result.markup,/State-neutral/);
  assert.equal(result.dateRequired,true);
  assert.match(result.trackingLabel,/License stage/);
});
test('MI and KS retain state-specific stages',()=>{
  assert.match(harness().select('48933').markup,/Level 1 permit/);
  assert.match(harness().select('66603').markup,/Instruction permit/);
});
test('unsupported valid ZIP stays neutral, invalid ZIP requests input',()=>{
  const neutral=harness().select('85001');
  assert.equal(neutral.value,'STATE_NEUTRAL');
  assert.equal(neutral.dateRequired,false);
  const incomplete=harness().select('1710');
  assert.equal(incomplete.value,'');
  assert.match(incomplete.markup,/Enter ZIP/);
});
test('switching states clears incompatible prior selection',()=>{
  const h=harness();
  const pa=h.select('17101');
  assert.match(pa.markup,/JUNIOR/);
  const mi=h.select('48933');
  assert.doesNotMatch(mi.markup,/JUNIOR/);
  assert.equal(mi.value,'');
});
