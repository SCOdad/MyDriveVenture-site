const fs=require('node:fs');
const test=require('node:test');
const assert=require('node:assert/strict');

test('DV03 is an unauthenticated synthetic visual study with an isolated layered cockpit',()=>{
  const html=fs.readFileSync('log/game/DV03/index.html','utf8');
  const css=fs.readFileSync('assets/css/log-game-dv03.css','utf8');

  assert.match(html,/DV03 VISUAL STUDY/);
  assert.match(html,/log-dashboard-v3\.css/);
  assert.match(html,/log-game-v2\.css/);
  assert.match(html,/class="dashboard-console"/);
  assert.match(html,/class="cockpit-title"/);
  assert.match(html,/class="windshield dv03-windshield"/);
  assert.match(html,/class="cockpit-controls"/);
  assert.match(html,/Unauthenticated · synthetic data · read-only/);
  assert.ok(!html.includes('@supabase/supabase-js'));
  assert.ok(!html.includes('/log/config.js'));
  assert.ok(!html.includes('login-form'));
  assert.ok(!html.includes('drive-form'));
  assert.ok(!html.includes('vehicle-form'));

  assert.match(html,/class="dv03-layer dv03-sky"/);
  assert.match(html,/class="dv03-layer dv03-landscape"/);
  assert.match(html,/class="dv03-layer dv03-hero-layer"/);
  assert.match(html,/class="dv03-layer dv03-cockpit-mask"/);
  assert.match(html,/class="hours-sign"/);

  assert.match(html,/src="\/assets\/images\/dv03\/hero\/parker-seated\.png"/);
  assert.ok(fs.statSync('assets/images/dv03/hero/parker-seated.png').size>250000);
  assert.ok(!html.includes('data-dv03-hero-parts'));
  assert.ok(!html.includes('/assets/images/dv03/hero/part-'));

  assert.match(css,/\.dv03-sky\{z-index:0/);
  assert.match(css,/\.dv03-landscape\{z-index:1/);
  assert.match(css,/\.dv03-hero-layer\{z-index:4;overflow:hidden\}/);
  assert.match(css,/\.dv03-hero\{position:absolute;display:block;height:72%;/);
  assert.match(css,/image-rendering:auto/);
  assert.match(css,/\.dv03-cockpit-mask\{z-index:5/);
  assert.match(css,/\.dv03-windshield \.hours-sign\{z-index:7/);
});

test('DV03 does not alter authenticated Game v1 or DV02 entry points',()=>{
  const v1=fs.readFileSync('log/game/index.html','utf8');
  const v2=fs.readFileSync('log/game-v2/index.html','utf8');
  assert.ok(!v1.includes('log-game-dv03.css'));
  assert.ok(!v2.includes('log-game-dv03.css'));
  assert.ok(!v1.includes('/log/game/DV03/'));
  assert.ok(!v2.includes('/log/game/DV03/'));
});
