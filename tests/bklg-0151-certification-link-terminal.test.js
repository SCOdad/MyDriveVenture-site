const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'certification-link/index.html'),'utf8');

test('BKLG-0151 first-party certification outcome page renders safe terminal states',()=>{
  assert.match(html,/DELETED:\['Drive no longer active'/);
  assert.match(html,/NOT_FOUND:\['Drive unavailable'/);
  assert.match(html,/ALREADY_USED:\['Link already used'/);
  assert.match(html,/Nothing will be recreated or certified from this link/);
  assert.match(html,/textContent=title/);
  assert.match(html,/textContent=message/);
  assert.doesNotMatch(html,/innerHTML\s*=/);
  assert.match(html,/href="\/log\/"/);
});
