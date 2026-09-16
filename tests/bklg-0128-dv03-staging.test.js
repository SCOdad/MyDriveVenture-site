const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('log/DV03/staging/BKLG-0128/index.html');
const js=read('assets/js/bklg-0128-dv03-staging.js');
const css=read('assets/css/bklg-0128-dv03-staging.css');

test('BKLG-0128 UAT route is non-discoverable and operator-gated',()=>{
  assert.match(html,/noindex,nofollow/);
  assert.match(html,/Operator access only/);
  assert.match(js,/data\.is_operator!==true/);
  assert.match(js,/frame\.src='\/log\/'/);
  assert.ok(js.indexOf("data.is_operator!==true")<js.indexOf("frame.src='/log/'"));
});

test('BKLG-0128 exposes the seven canonical layer rows with OFF controls',()=>{
  for(const label of ['Sky / Atmosphere','Road / Ground','Background','Sign','Cockpit','HUD','Hero'])assert.match(js,new RegExp(label.replace('/','\\/')));
  assert.equal((js.match(/value:'off'/g)||[]).length,7);
  assert.match(js,/01-SKY-NIGHT/);
  assert.match(js,/02-ROAD-GROUND-BASE/);
  assert.match(js,/03-BACKGROUND-PARK/);
  assert.match(js,/DV-UX-DV03-SKY-NIGHT/);
  assert.match(js,/DV-UX-DV03-BACKGROUND-PARK/);
});

test('BKLG-0128 canonical layers use simple same-origin runtime aliases',()=>{
  assert.match(js,/\/assets\/images\/dv03\/layers\/night\.png/);
  assert.match(js,/\/assets\/images\/dv03\/layers\/park\.png/);
  assert.doesNotMatch(js,/drive\.google\.com/);
});

test('BKLG-0128 canonical sky and background render as layer backgrounds, not windshield img elements',()=>{
  assert.match(js,/function setLayerBackground/);
  assert.match(js,/container\.style\.backgroundImage/);
  assert.doesNotMatch(js,/doc\.createElement\('img'\)/);
  assert.match(js,/background-size:100% 100%/);
});

test('BKLG-0128 layer harness is anchored to the DV03 windshield UX',()=>{
  assert.match(html,/LAYER HARNESS/);
  assert.match(html,/Reset to Base/);
  assert.match(html,/Driver \/ Live/);
  assert.match(css,/position:fixed/);
  assert.match(css,/\.uat-harness\.is-ux-anchored\{visibility:visible\}/);
  assert.doesNotMatch(css,/\.uat-harness\{[^}]*top:116px/);
  assert.doesNotMatch(css,/\.uat-harness\{[^}]*right:12px/);
  assert.match(js,/function syncHarnessToUX/);
  assert.match(js,/querySelector\('\.dv03-windshield'\)/);
  assert.match(js,/uxRect=windshield\.getBoundingClientRect\(\)/);
  assert.match(js,/win\.addEventListener\('scroll',syncHarnessToUX/);
  assert.match(js,/ResizeObserver/);
  assert.match(js,/ensureRoadLayer/);
  assert.match(js,/state\.sky/);
  assert.match(js,/state\.road/);
  assert.match(js,/state\.background/);
});

test('BKLG-0128 UAT wrapper uses current DV03 and blocks production writes',()=>{
  assert.match(js,/frame\.src='\/log\/'/);
  assert.match(js,/addEventListener\('submit'.*preventDefault/s);
  assert.match(js,/Destructive actions are disabled/);
  assert.doesNotMatch(html,/game-v2|dv03v2/i);
});
