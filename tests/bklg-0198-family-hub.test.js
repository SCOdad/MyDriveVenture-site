const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('Family Hub renders structured API failures as readable text',()=>{
  const js=read('assets/js/family.js');
  assert.match(js,/function errorText/);
  assert.match(js,/\['message','details','hint','code'\]/);
  assert.match(js,/new Error\(errorText\(b\.error\)\)/);
  assert.doesNotMatch(js,/new Error\(b\.error\|\|'Family update failed'\)/);
});

test('Family Hub client parses and uses canonical supported contracts',()=>{
  const js=read('assets/js/family.js');
  assert.doesNotThrow(()=>new Function(js));
  assert.match(js,/api\('driver-api','dashboard'\)/);
  assert.match(js,/api\('driver-hero-url','headshot'/);
  assert.match(js,/\[r\.signed_url,r\.headshot_signed_url\]/);
  assert.match(js,/img\.onerror=\(\)=>resolve\(false\)/);
  assert.match(js,/avatarUrlCache\.set\(id,url\)/);
  assert.match(js,/No usable headshot/);
  assert.match(js,/DV_DRIVER_PALETTES/);
  assert.match(js,/total_minutes/);
  assert.match(js,/night_minutes/);
});

test('Family Hub preserves Family API progress when dashboard progress is absent',()=>{
  const js=read('assets/js/family.js');
  assert.match(js,/progress:d\.progress\|\|pMap\.get\(String\(d\.id\)\)\|\|null/);
});

test('Family Hub bounds driver summary to three plus See all',()=>{
  const js=read('assets/js/family.js'),html=read('family/index.html');
  assert.match(js,/index>=3&&!showAllDrivers/);
  assert.match(js,/See all \$\{drivers\.length\} drivers/);
  assert.match(js,/Show less/);
  assert.match(html,/id="family-see-all-drivers"/);
  assert.match(html,/aria-controls="family-drivers"/);
  assert.match(html,/aria-expanded="false"/);
});

test('Family Hub includes true-zero and scoped no-driver states',()=>{
  const js=read('assets/js/family.js');
  assert.match(js,/family_driver_count/);
  assert.match(js,/trueZeroFamily/);
  assert.match(js,/Add your first driver/);
  assert.match(js,/No drivers are currently shared with you/);
  assert.match(js,/addGrown\.disabled=primary\.size===0/);
  assert.match(js,/Add your first driver before inviting another grown-up/);
});

test('driver cards avoid sensitive identity fields and preserve scoped grown-up access UI',()=>{
  const js=read('assets/js/family.js');
  const cardSource=js.slice(js.indexOf('function driverCard'),js.indexOf('function grownupCard'));
  assert.doesNotMatch(cardSource,/birth_date|home_zip|email|mobile/i);
  assert.match(js,/Manage access/);
  assert.match(js,/primary_driver_ids/);
  assert.match(js,/family-chip/);
});

test('Family Hub uses canonical palette helper and Parker-style silhouette fallback',()=>{
  const html=read('family/index.html'),js=read('assets/js/family.js'),css=read('assets/css/family.css');
  assert.match(html,/driver-palettes\.js/);
  assert.match(js,/DV_DRIVER_PALETTES/);
  assert.match(css,/family-parker-silhouette/);
  assert.match(css,/family-driver-accent/);
});
