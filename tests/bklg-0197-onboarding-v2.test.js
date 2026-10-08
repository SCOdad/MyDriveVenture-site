const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('canonical /join asks only for grown-up name and email',()=>{
  const html=read('join/index.html');
  assert.match(html,/name="name"/);
  assert.match(html,/name="email"/);
  assert.doesNotMatch(html,/driverName|driverBirthDate|homeZip|licenseStage|vehicleName/);
  assert.match(html,/noindex,nofollow/);
  assert.match(html,/meta-pixel\.js/);
});

test('legacy V1 remains available as rollback at /join/v1',()=>{
  const html=read('join/v1/index.html');
  assert.match(html,/id="dv-onboarding-form"/);
  assert.match(html,/name="guardianName"/);
  assert.match(html,/name="driverName"/);
  assert.match(html,/name="vehicleName"/);
});

test('/join/v2 remains a temporary alias for canonical /join and preserves URL context',()=>{
  const html=read('join/v2/index.html');
  assert.match(html,/location\.replace\('\/join\/'\+location\.search\+location\.hash\)/);
});

test('canonical join records view and submits to the acquisition endpoint',()=>{
  const js=read('assets/js/join-v2.js');
  assert.match(js,/public-acquisition-v2/);
  assert.match(js,/action:'view'/);
  assert.match(js,/action:'submit'/);
  assert.match(js,/crypto\.randomUUID/);
  assert.match(js,/form\.dataset\.acquisitionSource\|\|'JOIN_V2'/);
  assert.match(js,/action:'view',flow_id:flowId,source/);
  assert.match(js,/action:'submit',flow_id:flowId,source,\.\.\.attribution,name,email,website/);
});

test('paid recruitment route reuses the canonical acquisition client with explicit source attribution',()=>{
  const html=read('join/recruit/index.html');
  assert.match(html,/id="dv-acquisition-v2-form"/);
  assert.match(html,/data-acquisition-source="PAID_RECRUITMENT"/);
  assert.match(html,/assets\/js\/join-v2\.js/);
  assert.doesNotMatch(html,/<nav\b/i);
});

test('welcome handoff persists acquisition flow before returning to Family Hub',()=>{
  const js=read('assets/js/auth-welcome-handoff.js');
  assert.match(js,/\/family\//);
  assert.match(js,/public-acquisition-v2/);
  assert.match(js,/action:'authenticated'/);
  assert.match(js,/pending-family-flow/);
  assert.match(js,/sessionStorage\.setItem/);
});

test('Family Hub records acquisition arrival with durable storage fallback',()=>{
  const js=read('assets/js/family.js');
  const bootstrap=read('assets/js/family-bootstrap.js');
  const html=read('family/index.html');
  assert.match(js,/acq_flow/);
  assert.match(js,/pending-family-flow/);
  assert.match(js,/sessionStorage\.getItem/);
  assert.match(js,/sessionStorage\.removeItem/);
  assert.match(js,/family_reached/);
  assert.match(js,/public-acquisition-v2/);
  assert.match(bootstrap,/family\.js\?v=20261008-uat-family-profile2/);
  assert.match(html,/family-bootstrap\.js\?v=20261008-uat-family-profile2/);
});

test('canonical signup success clearly confirms grown-up registration and next steps',()=>{
  const html=read('join/index.html');
  const js=read('assets/js/join-v2.js');
  assert.match(html,/Registration complete/);
  assert.match(html,/You’re registered with Drive Venture/);
  assert.match(html,/registered grown-up for your Drive Venture family/);
  assert.match(html,/Check your email/);
  assert.match(html,/Open your secure link/);
  assert.match(html,/Add your first driver/);
  assert.match(html,/You do not need to fill out this form again/);
  assert.match(html,/id="acquisition-v2-name"/);
  assert.match(html,/id="acquisition-v2-email"/);
  assert.match(js,/nameTarget\.textContent=name/);
  assert.match(js,/emailTarget\.textContent=email/);
});


test('signup success hides intake shell and explains spam and passwordless access',()=>{
  const html=read('join/index.html');
  const js=read('assets/js/join-v2.js');
  const css=read('assets/css/join.css');
  assert.match(html,/data-acquisition-pre-success/);
  assert.match(js,/querySelectorAll\('\[data-acquisition-pre-success\]'\)/);
  assert.match(js,/el\.hidden=true/);
  assert.match(css,/\[data-acquisition-pre-success\]\[hidden\]\{display:none!important\}/);
  assert.match(html,/check spam or promotions/i);
  assert.match(html,/Drive Venture is passwordless/i);
  assert.match(html,/no password to create or remember/i);
  assert.match(css,/\.success-card::before\{[^}]*#57c879/);
  assert.match(css,/\.success-step-number\{background:#57c879/);
});

test('canonical join keeps Meta PageView loader without treating organic signup as paid conversion',()=>{
  const html=read('join/index.html');
  const pixel=read('assets/js/meta-pixel.js');
  const js=read('assets/js/join-v2.js');
  assert.match(html,/meta-pixel\.js/);
  assert.match(pixel,/productionHosts = new Set\(\['mydriveventure\.com', 'www\.mydriveventure\.com'\]\)/);
  assert.match(pixel,/fbq\('track', 'PageView'\)/);
  assert.match(js,/if\(source!=='PAID_RECRUITMENT'\|\|typeof window\.fbq!=='function'\)return/);
  assert.doesNotMatch(js,/fbq\([^\n]*(name|email)/i);
});
