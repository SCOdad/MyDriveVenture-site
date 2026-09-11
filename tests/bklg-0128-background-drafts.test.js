const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const current=read('assets/js/bklg-0128-scenery-current.js');
const staging=read('assets/js/bklg-0128-dv03-staging.js');
const gallery=read('assets/js/bklg-0128-gallery.js');
const uatHtml=read('log/DV03/staging/BKLG-0128/index.html');
const galleryHtml=read('log/DV03/staging/BKLG-0128/gallery/index.html');

const drafts=[
  ['SCHOOL','DV03-L2-SCHOOL-BACKGROUND-DRAFT.png'],
  ['GROCERY-STORE','DV03-L4-GROCERY-STORE-BACKGROUND-DRAFT.png'],
  ['LIBRARY','DV03-L5-LIBRARY-BACKGROUND-DRAFT.png'],
  ['SNACK-RUN','DV03-L6-SNACK-RUN-BACKGROUND-DRAFT.png'],
  ['DRIVE-THRU','DV03-L7-DRIVE-THRU-BACKGROUND-DRAFT.png'],
  ['CAR-WASH','DV03-L7-CAR-WASH-BACKGROUND-DRAFT.png'],
  ['GAS-STATION','DV03-L8-GAS-STATION-BACKGROUND-DRAFT.png']
];

const retired=[
  'DV03-L2-SCHOOL-BACKGROUND-DRAFT-v1.png',
  'DV03-L4-GROCERY-STORE-BACKGROUND-DRAFT-v1.png',
  'DV03-L5-LIBRARY-BACKGROUND-DRAFT-v1.png',
  'DV03-L6-SNACK-RUN-BACKGROUND-DRAFT-v1.png',
  'DV03-L6-SNACK-RUN-BACKGROUND-DRAFT-v2.png',
  'DV03-L7-CAR-WASH-BACKGROUND-DRAFT-v1.png',
  'DV03-L7-CAR-WASH-BACKGROUND-DRAFT-v2.png',
  'DV03-L8-GAS-STATION-BACKGROUND-DRAFT-v1.png'
];

test('BKLG-0128 current scenery registry points all destination backgrounds at canonical draft files',()=>{
  for(const [key,file] of drafts){
    assert.match(current,new RegExp(`03-BACKGROUND-${key}`));
    assert.match(current,new RegExp(file.replaceAll('.','\\.')));
    assert.ok(fs.existsSync(path.join(root,'assets/images/dv03/layers',file)),`missing ${file}`);
  }
  assert.match(staging,/03-BACKGROUND-PARK/);
  assert.match(gallery,/03-BACKGROUND-PARK/);
});

test('BKLG-0128 Drive Thru is native to the authoritative Background harness',()=>{
  assert.match(staging,/value:'drive-thru',label:'Drive Thru'/);
  assert.match(staging,/03-BACKGROUND-DRIVE-THRU/);
  assert.doesNotMatch(current,/createElement\('button'\)/);
  assert.doesNotMatch(current,/insertBefore\(button/);
  assert.match(current,/721c2d7-library/);
  assert.match(current,/721c2d7-drive-thru/);
  assert.match(current,/e83616b-car-wash/);
});

test('BKLG-0128 retired versioned layer drafts are removed',()=>{
  for(const file of retired)assert.equal(fs.existsSync(path.join(root,'assets/images/dv03/layers',file)),false,`retired file remains: ${file}`);
  assert.doesNotMatch(uatHtml,/bklg-0128-scenery-v2\.js/);
  assert.doesNotMatch(galleryHtml,/bklg-0128-scenery-v2\.js/);
  assert.match(uatHtml,/bklg-0128-scenery-current\.js/);
  assert.match(galleryHtml,/bklg-0128-scenery-current\.js/);
});

test('BKLG-0128 UAT and gallery cache keys are bumped together',()=>{
  assert.match(uatHtml,/20260911-native-drive-thru1/);
  assert.match(galleryHtml,/20260911-native-drive-thru1/);
  assert.doesNotMatch(uatHtml,/20260910-composition2/);
  assert.doesNotMatch(galleryHtml,/20260910-composition2/);
});
