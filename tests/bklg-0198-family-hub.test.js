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
  assert.match(js,/DVFamilyAvatarMap\?\.load/);
  assert.match(js,/DV_DRIVER_PALETTES/);
  assert.match(js,/total_minutes/);
  assert.match(js,/night_minutes/);
});

test('Family Hub preserves Family API progress when dashboard progress is absent',()=>{
  const js=read('assets/js/family.js');
  assert.match(js,/progress:d\.progress\|\|pMap\.get\(String\(d\.id\)\)\|\|null/);
});

test('Family Hub bounds owned driver summary to three plus See all',()=>{
  const js=read('assets/js/family.js'),html=read('family/index.html');
  assert.match(js,/index>=3&&!showAllDrivers/);
  assert.match(js,/See all \$\{ownedDrivers\.length\} drivers/);
  assert.match(js,/Show less/);
  assert.match(html,/id="family-see-all-drivers"/);
  assert.match(html,/aria-controls="family-drivers"/);
  assert.match(html,/aria-expanded="false"/);
});

test('Family Hub supports grown-up-first owned Family and scoped other-account access',()=>{
  const js=read('assets/js/family.js');
  assert.match(js,/No grown-ups have been added yet/);
  assert.match(js,/Add your driver/);
  assert.match(js,/No drivers yet\. You can invite this grown-up now/);
  assert.match(js,/family-other-account-group/);
  assert.match(js,/Only a License Holder can invite or manage grown-ups/);
});

test('driver cards expose accepted profile/contact controls while preserving scoped grown-up access UI',()=>{
  const js=read('assets/js/family.js');
  const cardSource=js.slice(js.indexOf('function driverCard'),js.indexOf('function grownupCard'));
  assert.doesNotMatch(cardSource,/birth_date/i);
  assert.match(cardSource,/data-card-value="email"/);
  assert.match(cardSource,/data-card-value="mobile"/);
  assert.match(cardSource,/data-inline-edit="home_zip"/);
  assert.match(js,/Manage access/);
  assert.match(js,/license_holder_family_ids/);
  assert.match(js,/family-chip/);
});

test('Family Hub uses canonical palette helper and Parker-style silhouette fallback',()=>{
  const html=read('family/index.html'),js=read('assets/js/family.js'),css=read('assets/css/family.css');
  assert.match(html,/driver-palettes\.js/);
  assert.match(js,/DV_DRIVER_PALETTES/);
  assert.match(css,/family-parker-silhouette/);
  assert.match(css,/family-driver-accent/);
});
