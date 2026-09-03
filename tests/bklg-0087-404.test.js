const fs=require('node:fs');
const test=require('node:test');
const assert=require('node:assert/strict');

const html=fs.readFileSync('404.html','utf8');

test('BKLG-0087 uses the approved canonical Parker road-closed artwork',()=>{
  const asset='assets/images/DV-CHAR-PARKER-404-ROAD-CLOSED.png';
  assert.ok(html.includes('src="/assets/images/DV-CHAR-PARKER-404-ROAD-CLOSED.png"'));
  assert.ok(!html.includes('dv-char-parker-guide.webp'));
  assert.ok(fs.existsSync(asset),`${asset} must be published with the 404 page`);

  const png=fs.readFileSync(asset);
  assert.ok(png.length>24,`${asset} must contain a valid PNG header`);
  assert.equal(png.toString('ascii',1,4),'PNG',`${asset} must be a PNG`);
  assert.equal(png.readUInt32BE(16),1535,`${asset} must preserve the approved 1535px width`);
  assert.equal(png.readUInt32BE(20),1024,`${asset} must preserve the approved 1024px height`);
});

test('BKLG-0087 exposes semantic 404 copy and all approved recovery routes',()=>{
  assert.match(html,/Route not found · 404/);
  assert.match(html,/This route couldn't be found\./);
  assert.match(html,/404 · ROUTE NOT FOUND/);

  const routes=[
    ['Home','href="/"'],
    ['Log Drive Venture','href="/log/"'],
    ['Help','href="/help/"'],
    ['Feedback','href="/feedback/"']
  ];

  for(const [label,href] of routes){
    assert.ok(html.includes(`>${label}</a>`),label);
    assert.ok(html.includes(href),href);
  }
});

test('BKLG-0087 keeps 404 styling isolated and responsive',()=>{
  assert.ok(html.includes('/assets/css/404.css?v=20260902-bklg0087'));
  const css=fs.readFileSync('assets/css/404.css','utf8');
  assert.match(css,/\.detour-card/);
  assert.match(css,/repeating-linear-gradient/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/@media\(max-width:430px\)/);
});
