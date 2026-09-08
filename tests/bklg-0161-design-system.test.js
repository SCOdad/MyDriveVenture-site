const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const tokens=JSON.parse(read('assets/design-system/tokens.json'));
const css=read('assets/css/design-system.css');
const header=read('assets/css/canonical-header.css');
const docs=read('docs/design-system-foundation.md');

const canonicalPalette={
  asphalt:'#111820',
  nightRoad:'#17324D',
  driveVentureYellow:'#F4B820',
  warmWhite:'#F7F3E8',
  silver:'#AEB8C2',
  highwayGreen:'#2F7D4A',
  panelCharcoal:'#202B35',
  trueBlack:'#080B0E'
};

test('BKLG-0161 preserves the authoritative WebsitePalette values',()=>{
  assert.equal(tokens.backlog,'BKLG-0161');
  assert.deepEqual(tokens.primitives.color,canonicalPalette);
  for(const value of Object.values(canonicalPalette))assert.match(css,new RegExp(value.replace('#','\\#'),'i'));
});

test('design system separates primitives from semantic tokens',()=>{
  assert.ok(tokens.primitives.color);
  assert.ok(tokens.primitives.fontFamily);
  assert.ok(tokens.primitives.space);
  assert.ok(tokens.primitives.radius);
  assert.ok(tokens.primitives.borderWidth);
  assert.ok(tokens.primitives.shadow);
  assert.ok(tokens.primitives.motion);
  assert.ok(tokens.primitives.layout);
  assert.equal(tokens.semantic.color['background.canvas'],'{primitives.color.asphalt}');
  assert.equal(tokens.semantic.color['accent.primary'],'{primitives.color.driveVentureYellow}');
  assert.equal(tokens.semantic.color['status.success'],'{primitives.color.highwayGreen}');
});

test('web mapping exposes semantic variables and reduced-motion behavior',()=>{
  for(const variable of [
    '--dv-bg-canvas','--dv-surface-default','--dv-text-primary','--dv-text-secondary',
    '--dv-accent-primary','--dv-status-success','--dv-border-strong','--dv-font-display',
    '--dv-font-body','--dv-touch-target-min'
  ])assert.match(css,new RegExp(variable));
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css,/--dv-motion-fast:\s*0ms/);
});

test('shared header is the low-risk semantic-token adoption canary',()=>{
  assert.match(header,/^@import url\("\.\/design-system\.css"\);/);
  for(const variable of ['--dv-text-primary','--dv-accent-primary','--dv-surface-default','--dv-text-secondary','--dv-font-display','--dv-font-body'])assert.match(header,new RegExp(`var\\(${variable}\\)`));
  assert.match(header,/background:#21894a!important/);
  assert.match(header,/background:#2a9a55!important/);
});

test('foundation documents platform boundary, accessibility, and DV03 skin rule',()=>{
  assert.match(docs,/Design semantics → platform mapping → experience skin/);
  assert.match(docs,/WebsitePalette.*canonical website palette/i);
  assert.match(docs,/Accessibility baseline/);
  assert.match(docs,/44px touch target/);
  assert.match(docs,/reduced-motion/i);
  assert.match(docs,/DV03 is explicitly a reference consumer/);
  assert.match(docs,/DD-WEB-005/);
  assert.match(docs,/ADR-040/);
});
