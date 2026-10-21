import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('assets/js/family-license-stages.js','utf8');
test('PA ZIP maps to PA learner, junior, full; unsupported still state-neutral',()=>{
 assert.match(src,/n>=15001&&n<=19640\)return'PA'/);
 assert.match(src,/PA:\[\['LEARNER','Learner permit'\],\['JUNIOR','Junior driver license'\],\['FULL','Unrestricted driver license'\]\]/);
 assert.match(src,/return'STATE_NEUTRAL'/);
 assert.match(src,/n>=48001&&n<=49971\)return'MI'/);
 assert.match(src,/n>=66002&&n<=67954\)return'KS'/);
});
