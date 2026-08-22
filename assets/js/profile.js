(()=>{
  const cfg=window.DV_APP_CONFIG||{}
  const loading=document.getElementById('profile-loading'),app=document.getElementById('profile-app'),authNeeded=document.getElementById('profile-auth-needed')
  if(!cfg.supabaseUrl||!cfg.publishableKey){loading.innerHTML='<p>Profile settings are not configured.</p>';return}
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})
  let session=null,subjects=[]
  const subjectSelect=document.getElementById('profile-subject')
  const nameInput=document.getElementById('profile-name'),zipInput=document.getElementById('profile-zip')
  const emailEl=document.getElementById('profile-email'),mobileEl=document.getElementById('profile-mobile')
  const emailStatus=document.getElementById('profile-email-status'),mobileStatus=document.getElementById('profile-mobile-status')
  const scopeNote=document.getElementById('profile-scope-note')
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
  async function call(action,payload={}){const token=session?.access_token;if(!token)throw new Error('Please sign in again.');const r=await fetch(`${cfg.supabaseUrl}/functions/v1/profile-api`,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${token}`,'apikey':cfg.publishableKey},body:JSON.stringify({action,...payload})});const body=await r.json().catch(()=>({}));if(!r.ok||body.ok!==true)throw new Error(body.error||'Profile update failed');return body}
  function status(id,message,type=''){const el=document.getElementById(id);if(!el)return;el.textContent=message||'';el.classList.toggle('profile-success',type==='success');el.classList.toggle('profile-error',type==='error')}
  function selected(){return subjects.find(s=>String(s.person_id)===String(subjectSelect.value))||subjects[0]||null}
  function renderSubject(){const s=selected();if(!s)return;nameInput.value=s.name||'';zipInput.value=s.home_zip||'';emailEl.textContent=s.email||'Not set';mobileEl.textContent=s.mobile||'Not set';emailStatus.textContent=s.email?`${s.email_verified?'Verified':'Not verified'}`:'';mobileStatus.textContent=s.mobile?`${s.mobile_verified?'Verified':'Not verified'}`:'';scopeNote.textContent=s.relation==='SELF'?'You are editing your own profile.':'You are editing a driver profile you are authorized to manage.';status('profile-status','');status('contact-status','')}
  function render(){subjectSelect.innerHTML=subjects.map(s=>`<option value="${esc(s.person_id)}">${esc(s.name)}${s.relation==='SELF'?' (you)':''}</option>`).join('');renderSubject()}
  async function refresh(keepPersonId=null){const result=await call('overview');subjects=result.subjects||[];if(!subjects.length)throw new Error('No editable profiles are available to this account.');render();if(keepPersonId&&subjects.some(s=>String(s.person_id)===String(keepPersonId))){subjectSelect.value=String(keepPersonId);renderSubject()}}
  async function init(){const result=await client.auth.getSession();session=result.data.session;if(!session){loading.hidden=true;authNeeded.hidden=false;return}try{await refresh();loading.hidden=true;app.hidden=false}catch(e){loading.innerHTML=`<p>${esc(e.message||e)}</p>`}}
  subjectSelect?.addEventListener('change',renderSubject)
  document.getElementById('profile-form')?.addEventListener('submit',async e=>{e.preventDefault();const s=selected();if(!s)return;const button=e.currentTarget.querySelector('button[type="submit"]');button.disabled=true;status('profile-status','Saving…');try{await call('update_basic',{person_id:s.person_id,name:nameInput.value,home_zip:zipInput.value});await refresh(s.person_id);status('profile-status','Profile saved.','success')}catch(err){status('profile-status',err.message||String(err),'error')}finally{button.disabled=false}})
  async function contactChange(kind){status('contact-status',`Checking ${kind} change options…`);try{await call('request_contact_change',{person_id:selected()?.person_id,endpoint_type:kind.toUpperCase()})}catch(err){status('contact-status',err.message||'Verified contact changes are not available yet.','error')}}
  document.getElementById('change-email')?.addEventListener('click',()=>contactChange('email'))
  document.getElementById('change-mobile')?.addEventListener('click',()=>contactChange('mobile'))
  document.getElementById('profile-sign-out')?.addEventListener('click',async()=>{await client.auth.signOut();location.replace('/log/')})
  client.auth.onAuthStateChange((_event,next)=>{session=next})
  init()
})()
