const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const EXPECTED_SHA='d0d6ca0bfb3d52f3467032b010033d286ebc6c58bca094575b82e2f9cbc02f90';

test('BKLG-0289 favicon uses supplied standalone speedometer art, not full wordmark',()=>{
  const svg=fs.readFileSync('favicon.svg','utf8');
  assert.equal(svg,fs.readFileSync('staging/favicon.svg','utf8'));
  assert.match(svg,/viewBox="0 0 128 128"/);
  assert.match(svg,/x="0" y="28" width="128" height="72"/);
  assert.match(svg,/fill="#191e1e"/);
  const match=svg.match(/href="data:image\/png;base64,([A-Za-z0-9+/=]+)"/);
  assert.ok(match,'self-contained favicon PNG missing');
  const png=Buffer.from(match[1],'base64');
  assert.equal(crypto.createHash('sha256').update(png).digest('hex'),EXPECTED_SHA);
  assert.equal(png.subarray(1,4).toString('ascii'),'PNG');
  assert.equal(png.readUInt32BE(16),128);
  assert.equal(png.readUInt32BE(20),72);
  assert.ok(png.length<15000,'favicon must remain lightweight');
  assert.doesNotMatch(svg,/<path|<text|M3 32 13 20h7/,'no invented geometry/wordmark');
});

test('BKLG-0289 favicon revalidates after logo cutover',()=>{
  const headers=fs.readFileSync('_headers','utf8');
  for(const route of ['/favicon.svg','/staging/favicon.svg'])assert.ok(headers.includes(route+'\n  Cache-Control: no-cache, must-revalidate'));
});
test('BKLG-0289 active HTML pages share favicon',()=>{
  let count=0;
  function scan(dir){
    for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
      if(ent.isDirectory()){if(!['.git','node_modules','archive','staging','test-results','playwright-report'].includes(ent.name))scan(path.join(dir,ent.name));continue}
      if(!ent.name.endsWith('.html'))continue;
      const html=fs.readFileSync(path.join(dir,ent.name),'utf8');
      const icons=[...html.matchAll(/<link\b[^>]*\brel=["'](?:shortcut )?icon["'][^>]*>/gi)].map(m=>m[0]);
      for(const link of icons){count++;assert.match(link,/href=["']\/favicon\.svg["']/i,ent.name)}
    }
  }
  scan('.');assert.ok(count>=10)
});