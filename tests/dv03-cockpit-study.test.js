const fs=require('node:fs');
const test=require('node:test');
const assert=require('node:assert/strict');

test('DV03 is an unauthenticated synthetic visual study with an isolated layered cockpit',()=>{
  const html=fs.readFileSync('log/game/DV03/index.html','utf8');
  const css=fs.readFileSync('assets/css/log-game-dv03.css','utf8');

  assert.match(html,/DV03 VISUAL STUDY/);
  assert.match(html,/log-dashboard-v3\.css/);
  assert.match(html,/log-game-v2\.css/);
  assert.match(html,/class="dashboard-console dv03-console"/);
  assert.match(html,/class="cockpit-title dv03-console-head"/);
  assert.match(html,/class="windshield dv03-windshield"/);
  assert.match(html,/class="cockpit-controls dv03-controls"/);
  assert.match(html,/Unauthenticated · synthetic data · read-only/);
  assert.ok(!html.includes('@supabase/supabase-js'));
  assert.ok(!html.includes('/log/config.js'));
  assert.ok(!html.includes('login-form'));
  assert.ok(!html.includes('drive-form'));
  assert.ok(!html.includes('vehicle-form'));

  assert.match(html,/class="dv03-layer dv03-sky"/);
  assert.match(html,/class="dv03-layer dv03-landscape"/);
  assert.match(html,/class="dv03-layer dv03-hero-layer"/);
  assert.match(html,/class="dv03-hero-canvas"/);
  assert.match(html,/class="dv03-layer dv03-cockpit-mask"/);
  assert.match(html,/class="dv03-milestone-sign"/);

  assert.match(html,/data-dv03-hero-parts="3"/);
  assert.match(html,/data:image\/png;base64/);
  assert.match(html,/\/assets\/images\/dv03\/hero\/part-\$\{i\}\.txt/);

  for(let i=0;i<3;i++){
    const part=fs.readFileSync(`assets/images/dv03/hero/part-${i}.txt`,'utf8').trim();
    assert.match(part,/^[A-Za-z0-9+/=]+$/);
    assert.ok(part.length>2500);
  }

  assert.match(css,/\.dv03-sky\{z-index:1/);
  assert.match(css,/\.dv03-landscape\{z-index:2/);
  assert.match(css,/\.dv03-hero-layer\{z-index:5/);
  assert.match(css,/\.dv03-hero-canvas\{position:absolute;left:0;bottom:-2%;height:132%;aspect-ratio:2\/3/);
  assert.match(css,/\.dv03-windshield img\.dv03-hero\{position:absolute;left:2%;top:40%;width:68%;height:auto/);
  assert.match(css,/\.dv03-windshield\{position:relative;isolation:isolate;height:clamp\(220px,32vw,375px\)/);
  assert.match(css,/@media \(max-width:760px\)[\s\S]*\.dv03-windshield\{height:190px/);
  assert.match(css,/\.dv03-cockpit-mask\{z-index:6/);
  assert.match(css,/\.dv03-milestone-sign\{position:absolute;z-index:7/);
  assert.match(css,/image-rendering:pixelated/);
});

test('DV03 does not alter authenticated Game v1 or DV02 entry points',()=>{
  const v1=fs.readFileSync('log/game/index.html','utf8');
  const v2=fs.readFileSync('log/game-v2/index.html','utf8');
  assert.ok(!v1.includes('log-game-dv03.css'));
  assert.ok(!v2.includes('log-game-dv03.css'));
  assert.ok(!v1.includes('/log/game/DV03/'));
  assert.ok(!v2.includes('/log/game/DV03/'));
});
