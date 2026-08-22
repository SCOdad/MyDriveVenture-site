(()=>{
  const cfg=window.DV_APP_CONFIG||{}
  const loading=document.getElementById('family-loading'), app=document.getElementById('family-app'), authNeeded=document.getElementById('family-auth-needed')
  if(!cfg.supabaseUrl||!cfg.publishableKey){loading.innerHTML='<p>Family management is not configured.</p>';return}
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})
  let session=null, overview=null
  const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
  const prettyRel=(r)=>({PARENT:'Parent',GUARDIAN:'Guardian',GRANDPARENT:'Grandparent',TRUSTED_ADULT:'Trusted adult'}[String(r||'').toUpperCase()]||'Grown-up')
  async function call(action,payload={}){
    const token=session?.access_token
    if(!token) throw new Error('Please sign in again.')
    const r=await fetch(`${cfg.supabaseUrl}/functions/v1/family-api`,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${token}`,'apikey':cfg.publishableKey},body:JSON.stringify({action,...payload})})
    const body=await r.json().catch(()=>({}))
    if(!r.ok||body.ok!==true) throw new Error(body.error||'Family update failed')
    return body
  }
  function setStatus(id,message,type=''){
    const el=document.getElementById(id); if(!el)return
    el.textContent=message||'';el.classList.toggle('family-success',type==='success');el.classList.toggle('family-error',type==='error')
  }
  function render(){
    const drivers=overview?.drivers||[], grownups=overview?.grownups||[]
    document.getElementById('family-drivers').innerHTML=drivers.length?drivers.map(d=>`<div class="family-person"><div><strong>${esc(d.display_name||'Driver')}</strong><div class="meta">${esc(String(d.license_stage||'').replaceAll('_',' '))}${d.home_zip?` · ZIP ${esc(d.home_zip)}`:''}</div></div><div class="family-chip-row"><span class="family-chip">Driver</span></div></div>`).join(''):'<p class="family-empty">No drivers are available to this account.</p>'
    const byId=new Map(drivers.map(d=>[String(d.id),d.display_name||'Driver']))
    document.getElementById('family-grownups').innerHTML=grownups.length?grownups.map(g=>`<div class="family-person"><div><strong>${esc(g.display_name||'Grown-up')}${String(g.person_id)===String(overview.current_person_id)?' (you)':''}</strong><div class="meta">${esc(g.email||'No email shown')} · ${esc(prettyRel(g.relationship))}</div></div><div class="family-chip-row">${(g.driver_ids||[]).map(id=>`<span class="family-chip">${esc(byId.get(String(id))||'Driver')}</span>`).join('')}</div></div>`).join(''):'<p class="family-empty">No grown-ups are linked to these drivers.</p>'
    document.getElementById('grownup-driver-scope').innerHTML=drivers.map(d=>`<label class="scope-option"><input type="checkbox" name="driver_id" value="${esc(d.id)}"><span><strong>${esc(d.display_name||'Driver')}</strong><br><span class="meta">Grant access to this driver</span></span></label>`).join('')
  }
  async function refresh(){overview=await call('overview');render()}
  async function init(){
    const result=await client.auth.getSession();session=result.data.session
    if(!session){loading.hidden=true;authNeeded.hidden=false;return}
    try{await refresh();loading.hidden=true;app.hidden=false}catch(e){loading.innerHTML=`<p>${esc(e.message||e)}</p>`}
  }
  document.querySelectorAll('[data-open-panel]').forEach(b=>b.addEventListener('click',()=>{
    const which=b.dataset.openPanel
    document.getElementById('grownup-panel').hidden=which!=='grownup';document.getElementById('driver-panel').hidden=which!=='driver'
    document.getElementById(`${which==='grownup'?'grownup':'driver'}-panel`).scrollIntoView({behavior:'smooth',block:'start'})
  }))
  document.querySelectorAll('[data-close-panel]').forEach(b=>b.addEventListener('click',()=>b.closest('.family-panel').hidden=true))
  document.getElementById('add-grownup-form')?.addEventListener('submit',async e=>{
    e.preventDefault();const form=e.currentTarget,fd=new FormData(form),driverIds=fd.getAll('driver_id').map(String)
    if(!driverIds.length){setStatus('grownup-status','Choose at least one driver.','error');return}
    const button=form.querySelector('button[type="submit"]');button.disabled=true;setStatus('grownup-status','Adding grown-up…')
    try{
      const result=await call('add_guardian',{name:fd.get('name'),email:fd.get('email'),mobile:fd.get('mobile'),relationship:fd.get('relationship'),driver_ids:driverIds})
      const invite=result.invitation?.status==='SENT'?' Invitation sent.':' They can sign in using their email at Drive Venture.'
      setStatus('grownup-status',`Grown-up added.${invite}`,'success');form.reset();await refresh()
    }catch(err){setStatus('grownup-status',err.message||String(err),'error')}finally{button.disabled=false}
  })
  document.getElementById('add-driver-form')?.addEventListener('submit',async e=>{
    e.preventDefault();const form=e.currentTarget,fd=new FormData(form),button=form.querySelector('button[type="submit"]');button.disabled=true;setStatus('driver-status','Adding driver…')
    try{
      const payload={};for(const [k,v] of fd.entries())payload[k]=v
      const result=await call('add_driver',payload)
      const invite=result.invitation?.status==='SENT'?' Their Drive Venture invitation was sent.':' Their account is ready for passwordless sign-in.'
      setStatus('driver-status',`Driver added.${invite}`,'success');form.reset();await refresh()
    }catch(err){setStatus('driver-status',err.message||String(err),'error')}finally{button.disabled=false}
  })
  document.getElementById('family-sign-out')?.addEventListener('click',async()=>{await client.auth.signOut();location.replace('/log/')})
  client.auth.onAuthStateChange((_event,next)=>{session=next})
  init()
})()
