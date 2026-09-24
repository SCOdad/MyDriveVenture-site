const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('paid recruitment page is a focused grown-up-first conversion surface',()=>{
  const html=read('join/recruit/index.html');
  assert.match(html,/data-acquisition-source="PAID_RECRUITMENT"/);
  assert.match(html,/name="name"/);
  assert.match(html,/name="email" type="email" inputmode="email"/);
  assert.doesNotMatch(html,/<nav\b/i);
  assert.doesNotMatch(html,/href="\/#how-it-works"/);
  assert.match(html,/href="#how-it-works"/);
  assert.match(html,/Start free/);
  assert.match(html,/Your driver’s information stays out of this first step/);
  assert.match(html,/meta-pixel\.js/);
  assert.match(html,/join-v2\.js/);
});

test('shared acquisition client sends a bounded source with view and submit',()=>{
  const js=read('assets/js/join-v2.js');
  assert.match(js,/form\.dataset\.acquisitionSource\|\|'JOIN_V2'/);
  assert.match(js,/action:'view',flow_id:flowId,source/);
  assert.match(js,/action:'submit',flow_id:flowId,source,name,email,website/);
  assert.match(js,/source==='JOIN_V2'/);
});

test('paid landing CTA and inputs retain mobile tap/input requirements',()=>{
  const joinCss=read('assets/css/join.css');
  const recruitCss=read('assets/css/recruit.css');
  assert.match(joinCss,/min-height:48px/);
  assert.match(recruitCss,/\.recruit-submit\{[^}]*min-height:52px/);
  assert.match(recruitCss,/@media\(max-width:760px\)/);
  assert.match(recruitCss,/\.recruit-submit\{width:100%;min-height:52px\}/);
});
