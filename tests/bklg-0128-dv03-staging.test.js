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
  for(const label of ['Sky / Atmosphere','Background','Road','Sign','Cockpit','HUD','Hero'])assert.match(js,new RegExp(label.replace('/','\\/')));
  assert.equal((js.match(/value:'off'/g)||[]).length,7);
  assert.match(js,/01-SKY-NIGHT/);
  assert.match(js,/02-BACKGROUND-PARK/);
  assert.match(js,/DV-UX-DV03-SKY-NIGHT/);
  assert.match(js,/DV-UX-DV03-BACKGROUND-PARK/);
});

test('BKLG-0128 canonical layer images are same-origin runtime assets',()=>{
  assert.match(js,/\/assets\/images\/dv03\/layers\/DV-UX-DV03-SKY-NIGHT\.png/);
  assert.match(js,/\/assets\/images\/dv03\/layers\/DV-UX-DV03-BACKGROUND-PARK\.png/);
  assert.doesNotMatch(js,/drive\.google\.com/);
});

test('BKLG-0128 layer harness is floating over the live DV03 wrapper',()=>{
  assert.match(html,/LAYER HARNESS/);
  assert.match(html,/Reset to Base/);
  assert.match(html,/Driver \/ Live/);
  assert.match(css,/position:fixed/);
  assert.match(css,/z-index:50/);
  assert.match(js,/ensureRoadLayer/);
  assert.match(js,/state\.sky/);
  assert.match(js,/state\.background/);
});

test('BKLG-0128 UAT wrapper uses current DV03 and blocks production writes',()=>{
  assert.match(js,/frame\.src='\/log\/'/);
  assert.match(js,/addEventListener\('submit'.*preventDefault/s);
  assert.match(js,/Destructive actions are disabled/);
  assert.doesNotMatch(html,/game-v2|dv03v2/i);
});
