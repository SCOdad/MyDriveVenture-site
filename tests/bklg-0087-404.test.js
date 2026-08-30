const fs=require('node:fs');
const test=require('node:test');
const assert=require('node:assert/strict');

test('branded 404 offers the approved recovery routes and Parker detour treatment',()=>{
  const html=fs.readFileSync('404.html','utf8');
  assert.ok(html.includes('dv-char-parker-guide.webp'));
  assert.ok(html.includes('Detour<br>ahead'));
  for(const href of ['href="/"','href="/log/game/"','href="/help/"','href="/feedback/"']) assert.ok(html.includes(href),href);
  assert.ok(html.includes('404 · ROUTE NOT FOUND'));
});

test('404 construction styling is isolated from the rest of the site',()=>{
  const html=fs.readFileSync('404.html','utf8');
  assert.ok(html.includes('/assets/css/404.css'));
  const css=fs.readFileSync('assets/css/404.css','utf8');
  assert.match(css,/repeating-linear-gradient/);
  assert.match(css,/\.detour-shell/);
});
