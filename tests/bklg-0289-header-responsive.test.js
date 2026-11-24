const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
test('BKLG-0289 mobile has exactly three visible quick actions and correct destinations',()=>{
  for(const file of ['index.html','indexV2.html']){
    const html=read(file);
    const actions=html.match(/<div class="mobile-actions"[^>]*>([\s\S]*?)<\/div>/);
    assert.ok(actions,file+' mobile actions');
    assert.equal((actions[1].match(/<a /g)||[]).length,2);
    assert.equal((actions[1].match(/<button /g)||[]).length,1);
    assert.match(actions[1],/class="mobile-log" href="\/log\/"[^>]*>Log Drive<\/a>/);
    assert.match(actions[1],/class="mobile-join" href="\/join\/"[^>]*>Join Now<\/a>/);
    assert.match(actions[1],/aria-expanded="false" aria-controls="primary-nav"/);
    assert.match(html,/<nav id="primary-nav"[^>]*>.*class="existing-user" href="\/log\/"[^>]*>Log Your Drive<\/a>/);
  }
});
test('BKLG-0289 responsive CSS provides mobile action row and hides duplicate links',()=>{
  const css=read('assets/css/indexv2.css');
  assert.match(css,/\.mobile-actions\{display:none\}/);
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/>nav\[hidden\]\{display:none!important\}/);
  assert.match(css,/>nav \.existing-user\{display:none\}/);
  assert.match(css,/>\.header-join\{display:none\}/);
  assert.match(css,/@media\(max-width:360px\)/);
  assert.match(css,/\.nav-shell nav a\{display:inline-flex;align-items:center;min-height:48px;font-size:1rem/);
});
test('BKLG-0289 menu is keyboard accessible and resets at viewport changes',()=>{
  const events={},attrs={};
  const button={hidden:true,setAttribute(k,v){attrs[k]=v},getAttribute(k){return attrs[k]},addEventListener(k,f){events['button:'+k]=f},focus(){events.focused=true}};
  const nav={hidden:false,addEventListener(k,f){events['nav:'+k]=f}};
  const mobile={matches:true,addEventListener(k,f){events['media:'+k]=f}};
  const doc={querySelector:()=>button,getElementById:()=>nav,addEventListener(k,f){events['document:'+k]=f}};
  const source=read('assets/js/indexv2.js').split('// Manual product previews.')[0];
  vm.runInNewContext(source,{window:{matchMedia:()=>mobile},document:doc});
  assert.equal(button.hidden,false);
  assert.equal(nav.hidden,true);
  assert.equal(attrs['aria-expanded'],'false');
  events['button:click']();
  assert.equal(nav.hidden,false);
  assert.equal(attrs['aria-expanded'],'true');
  assert.equal(attrs['aria-label'],'Close menu');
  events['document:keydown']({key:'Escape'});
  assert.equal(nav.hidden,true);
  assert.equal(attrs['aria-expanded'],'false');
  assert.equal(events.focused,true);
  events['button:click']();
  events['nav:click']({target:{closest:()=>({})}});
  assert.equal(nav.hidden,true);
  mobile.matches=false;
  events['media:change']();
  assert.equal(button.hidden,true);
  assert.equal(nav.hidden,false);
  mobile.matches=true;
  events['media:change']();
  assert.equal(button.hidden,false);
  assert.equal(nav.hidden,true);
});

test('BKLG-0289 portrait logo centers and landscape uses single row with floating menu',()=>{
  const css=read('assets/css/indexv2.css');
  const js=read('assets/js/indexv2.js');
  assert.match(css,/\.nav-shell>\.brand\{grid-row:1;min-height:104px;margin:0;justify-self:center\}/);
  assert.match(css,/@media\(orientation:landscape\) and \(max-height:600px\) and \(max-width:1050px\)/);
  assert.match(css,/grid-template-columns:minmax\(115px,175px\) minmax\(0,1fr\)/);
  assert.match(css,/\.mobile-actions\{\s*grid-column:2;\s*grid-row:1;\s*display:grid;/);
  assert.match(css,/nav\{\s*position:absolute;/);
  assert.match(css,/nav\[hidden\]\{display:none!important\}/);
  assert.ok(js.includes('(orientation: landscape) and (max-height: 600px) and (max-width: 1050px)'));
});
