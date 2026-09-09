const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('BKLG-0128 harness reserves space below the DV03 windshield',()=>{
  const html=read('log/DV03/staging/BKLG-0128/index.html');
  const js=read('assets/js/bklg-0128-harness-below-scene.js');
  assert.match(html,/bklg-0128-harness-below-scene\.js\?v=20260909-prod3/);
  assert.match(html,/bklg-0128-dv03-staging\.js\?v=20260909-prod3/);
  assert.match(js,/bklg0128-harness-slot/);
  assert.match(js,/windshield\.insertAdjacentElement\('afterend', slot\)/);
  assert.match(js,/slot\.style\.height/);
  assert.match(js,/slotRect = slot\.getBoundingClientRect\(\)/);
  assert.match(js,/frameRect\.top \+ slotRect\.top \+ margin/);
  assert.doesNotMatch(js,/frameRect\.top \+ windshieldRect\.top/);
});

test('BKLG-0128 harness follows UX scroll, resize, and collapse changes',()=>{
  const js=read('assets/js/bklg-0128-harness-below-scene.js');
  assert.match(js,/addEventListener\('scroll', placeHarnessBelowScene/);
  assert.match(js,/addEventListener\('resize', placeHarnessBelowScene/);
  assert.match(js,/dv:dashboard-rendered/);
  assert.match(js,/ResizeObserver/);
  assert.match(js,/MutationObserver/);
});
