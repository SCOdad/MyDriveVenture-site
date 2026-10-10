const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('assets/js/family-avatar-map.js','utf8');
function harness(){
 let now=0,seq=0;const timers=new Map(),events={},requests=[],images=[];
 const cards=[];let response={ok:true,avatars:{one:'https://example.test/avatar.png'}},imageMode='load';
 const fetch=async(url,init)=>{requests.push({url,init});if(response instanceof Error)throw response;return {ok:true,json:async()=>response}};
 const window={DV_APP_CONFIG:{supabaseUrl:'https://dev.test',publishableKey:'public'},supabase:{createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:'test'}}})}})},fetch,addEventListener:(n,cb)=>events[n]=cb};
 const context={window,fetch,console:{warn(){}},AbortController,Map,Set,Promise,Date:{now:()=>now},setTimeout:(cb,ms)=>{timers.set(++seq,{cb,at:now+ms});return seq},clearTimeout:id=>timers.delete(id),MutationObserver:class{observe(){}},document:{body:{},readyState:'complete',querySelectorAll:()=>cards.filter(c=>!c.hidden&&c.isConnected)},Image:class{constructor(){this.dataset={};this.style={};images.push(this)}set src(v){this._src=v;queueMicrotask(()=>{if(imageMode==='load')this.onload?.();if(imageMode==='error')this.onerror?.()})}get src(){return this._src}}};
 function add(id='one'){const host={image:null,dataset:{},classList:{add(){}},querySelector:()=>host.image,replaceChildren:img=>host.image=img};const card={dataset:{driverId:id},isConnected:true,host,querySelector:selector=>selector.includes(" img")?host.image:host};cards.push(card);return card}
 async function advance(ms){const end=now+ms;for(let i=0;i<200;i++){await new Promise(r=>setImmediate(r));const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due){now=end;return}now=due[1].at;timers.delete(due[0]);due[1].cb()}throw Error('timer loop')}
 vm.runInNewContext(source,context);
 return {window,fetch,requests,images,add,advance,events,set response(v){response=v},set imageMode(v){imageMode=v}};
}
test('one eager loader renders, leaves fetch intact, and skips repeated requests',async()=>{
 const h=harness(),card=h.add();await h.advance(200);
 assert.equal(card.dataset.avatarLoaded,'true');assert.equal(h.images[0].loading,'eager');assert.equal(h.window.fetch,h.fetch);
 h.window.DVFamilyAvatarMap.load();await h.advance(200);assert.equal(h.requests.length,1);
 assert.ok(h.requests.every(r=>r.url.endsWith('/family-avatar-map')));
});
test('missing assignment keeps fallback and later discovers a new assignment',async()=>{
 const h=harness(),card=h.add();h.response={ok:true,avatars:{}};await h.advance(200);assert.equal(card.dataset.avatarMapStatus,'no-avatar');assert.equal(card.host.image,null);
 h.response={ok:true,avatars:{one:'https://example.test/new.png'}};await h.advance(31000);assert.equal(card.host.image.src,'https://example.test/new.png');
});
test('network failure retries automatically without a new login',async()=>{
 const h=harness(),card=h.add();h.response=new Error('offline');await h.advance(200);assert.equal(card.dataset.avatarMapStatus,'exception');
 h.response={ok:true,avatars:{one:'https://example.test/recovered.png'}};await h.advance(2500);assert.equal(card.dataset.avatarLoaded,'true');assert.equal(h.requests.length,2);
});
test('failed signed image evicts URL and obtains a fresh one',async()=>{
 const h=harness(),card=h.add();h.imageMode='error';await h.advance(200);assert.equal(card.dataset.avatarMapStatus,'image-error');assert.notEqual(card.dataset.avatarLoaded,'true');
 h.imageMode='load';h.response={ok:true,avatars:{one:'https://example.test/fresh.png'}};await h.advance(2500);assert.equal(card.host.image.src,'https://example.test/fresh.png');
});
test('hung image settles and late completion cannot overwrite recovered image',async()=>{
 const h=harness(),card=h.add();h.imageMode='hang';await h.advance(10200);assert.equal(card.dataset.avatarMapStatus,'image-timeout');const old=h.images[0];assert.equal(old.onload,null);
 h.imageMode='load';await h.advance(2500);assert.equal(card.dataset.avatarLoaded,'true');assert.notEqual(card.host.image,old);
});
test('reload during preload discards stale result and services the queued reload',async()=>{
 const h=harness(),card=h.add();h.imageMode='hang';await h.advance(200);const old=h.images[0];h.window.DVFamilyAvatarMap.reload();h.response={ok:true,avatars:{one:'https://example.test/new.png'}};h.imageMode='load';old.onload();await h.advance(200);assert.equal(card.host.image.src,'https://example.test/new.png');
});
test('new cards and hidden cards revealed later reuse valid cached images',async()=>{
 const h=harness();h.add();await h.advance(200);const card=h.add();h.events['dv:family-rendered']();await h.advance(200);assert.equal(card.dataset.avatarLoaded,'true');assert.equal(h.requests.length,1);
});
test('Family and legacy finalizer delegate without competing image writes',()=>{
 const family=fs.readFileSync('assets/js/family.js','utf8'),finalizer=fs.readFileSync('assets/js/family-avatar-finalizer.js','utf8'),bootstrap=fs.readFileSync('assets/js/family-bootstrap.js','utf8');
 assert.doesNotMatch(family,/driver-hero-url|new Image/);assert.doesNotMatch(finalizer,/new Image|fetch\(/);assert.doesNotMatch(bootstrap,/family-avatar-finalizer/);
});

test('idle Family Hub does not poll; same card rerender reuses signed avatar before expiry',async()=>{
 const h=harness(),first=h.add();await h.advance(200);
 assert.equal(h.requests.length,1);
 await h.advance(3*60*1000);
 assert.equal(h.requests.length,1);
 first.isConnected=false;
 const replacement=h.add();
 h.events['dv:family-rendered']();
 await h.advance(200);
 assert.equal(replacement.dataset.avatarLoaded,'true');
 assert.equal(h.requests.length,1);
});
test('card rerender after signed URL expiry obtains a fresh URL once',async()=>{
 const h=harness(),first=h.add();await h.advance(200);
 first.isConnected=false;
 await h.advance(5*60*1000);
 const replacement=h.add();
 h.response={ok:true,avatars:{one:'https://example.test/refreshed.png'}};
 h.events['dv:family-rendered']();
 await h.advance(200);
 assert.equal(h.requests.length,2);
 assert.equal(replacement.host.image.src,'https://example.test/refreshed.png');
});
