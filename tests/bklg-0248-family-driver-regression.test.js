const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('BKLG-0248 Family Hub exposes optional prior-practice fields',()=>{
  const html=read('family/index.html');
  assert.match(html,/name="prior_total_hours"/);
  assert.match(html,/name="prior_night_hours"/);
  assert.match(html,/Starting practice balance/);
  assert.match(html,/not a drive and does not award quests by itself/);
});

test('BKLG-0248 Family Hub validates prior night hours before submission',()=>{
  const js=read('assets/js/family.js');
  assert.doesNotThrow(()=>new Function(js));
  assert.match(js,/function validatePriorPractice/);
  assert.match(js,/Night hours cannot exceed total prior practice hours/);
  assert.match(js,/if\(!validatePriorPractice\(f\)\)\{f\.reportValidity\(\);return\}/);
});

test('BKLG-0240 Add Driver revalidates prior practice live and supplies explicit family context',()=>{
  const html=read('family/index.html'),js=read('assets/js/family.js');
  assert.match(html,/id="driver-family-context"/);
  assert.match(js,/function syncDriverFamilyContext/);
  assert.match(js,/name="family_id"/);
  assert.match(js,/Choose a family/);
  assert.match(js,/function wirePriorPracticeValidation/);
  assert.match(js,/addEventListener\('input',\(\)=>validatePriorPractice\(form\)\)/);
});
