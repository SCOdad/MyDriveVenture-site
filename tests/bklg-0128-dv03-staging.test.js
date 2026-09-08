const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('log/DV03/staging/BKLG-0128/index.html');
const js=read('assets/js/bklg-0128-dv03-staging.js');

test('BKLG-0128 UAT route is non-discoverable and operator-gated',()=>{
  assert.match(html,/noindex,nofollow/);
  assert.match(html,/Operator access only/);
  assert.match(js,/data\.is_operator!==true/);
  assert.match(js,/frame\.src='\/log\/'/);
  assert.ok(js.indexOf("data.is_operator!==true")<js.indexOf("frame.src='/log/'"));
});

test('BKLG-0128 stages only Park and Construction major scenes',()=>{
  assert.match(js,/Q000035/);
  assert.match(js,/Q000012/);
  assert.doesNotMatch(js,/Q000036|Q000037|Q000038|Q000039|Q000043|Q000044|Q000046/);
  assert.match(js,/RECENCY_MS=14\*86400000/);
  assert.match(js,/layer\.replaceChildren\(\)/);
});

test('BKLG-0128 UAT wrapper uses current DV03 and blocks production writes',()=>{
  assert.match(html,/LIVE-DATA UAT/);
  assert.match(js,/frame\.src='\/log\/'/);
  assert.match(js,/addEventListener\('submit'.*preventDefault/s);
  assert.match(js,/Destructive actions are disabled/);
  assert.doesNotMatch(html,/game-v2|dv03v2/i);
});
