const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const staging=read('assets/js/bklg-0128-dv03-staging.js');
const gallery=read('assets/js/bklg-0128-gallery.js');
const uatHtml=read('log/DV03/staging/BKLG-0128/index.html');
const galleryHtml=read('log/DV03/staging/BKLG-0128/gallery/index.html');

const drafts=[
  ['SCHOOL','DV03-L2-SCHOOL-BACKGROUND-DRAFT-v1.png'],
  ['GROCERY-STORE','DV03-L4-GROCERY-STORE-BACKGROUND-DRAFT-v1.png'],
  ['LIBRARY','DV03-L5-LIBRARY-BACKGROUND-DRAFT-v1.png'],
  ['SNACK-RUN','DV03-L6-SNACK-RUN-BACKGROUND-DRAFT-v1.png'],
  ['CAR-WASH','DV03-L7-CAR-WASH-BACKGROUND-DRAFT-v1.png'],
  ['GAS-STATION','DV03-L8-GAS-STATION-BACKGROUND-DRAFT-v1.png']
];

test('BKLG-0128 harness exposes all six current background drafts on layer 03',()=>{
  for(const [key,file] of drafts){
    assert.match(staging,new RegExp(`03-BACKGROUND-${key}`));
    assert.match(staging,new RegExp(file.replaceAll('.','\\.')));
    assert.ok(fs.existsSync(path.join(root,'assets/images/dv03/layers',file)),`missing ${file}`);
  }
  assert.match(staging,/03-BACKGROUND-PARK/);
  assert.match(staging,/selectedBackground=backgroundValue==='base'\|\|backgroundValue==='off'\?null:optionFor\('background',backgroundValue\)/);
});

test('BKLG-0128 gallery includes all six drafts with explicit draft status on layer 03',()=>{
  for(const [key,file] of drafts){
    assert.match(gallery,new RegExp(`03-BACKGROUND-${key}`));
    assert.match(gallery,new RegExp(file.replaceAll('.','\\.')));
  }
  assert.equal((gallery.match(/status:'Draft \/ UAT'/g)||[]).length,6);
  assert.match(gallery,/03-BACKGROUND-PARK/);
});

test('BKLG-0128 UAT and gallery cache keys are bumped together',()=>{
  assert.match(uatHtml,/20260910-composition1/);
  assert.match(galleryHtml,/20260910-composition1/);
});
