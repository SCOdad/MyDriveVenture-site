(()=>{
  const cfg=window.DV_APP_CONFIG||{},app=document.getElementById('family-app');
  if(!app||!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase)return;
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let activePersonId='',activeName='this grown-up',enhancing=false;
  const dynamicPanels=()=>[...app.querySelectorAll(':scope > .family-panel')].filter(p=>p.id!=='grownup-panel'&&p.id!=='driver-panel');
  function normalizePanels(){
    const panels=dynamicPanels();
    if(!panels.length)return null;
    const keep=panels[panels.length-1];
    panels.slice(0,-1).forEach(p=>p.remove());
    keep.id='guardian-access-panel';
    return keep;
  }
  async function removeFromFamily(personId,name,button,panel){
    if(!confirm(`Remove ${name} from this family? This removes all of their access to drivers in this family. It does not delete their Drive Venture account or affect any other families.`))return;
    const status=panel.querySelector('.family-remove-status');
    button.disabled=true;if(status)status.textContent='Removing…';
    try{
      const session=(await client.auth.getSession()).data.session;
      if(!session?.access_token)throw new Error('Please sign in again.');
      const r=await fetch(`${cfg.supabaseUrl}/functions/v1/family-remove-api`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${session.access_token}`,apikey:cfg.publishableKey},body:JSON.stringify({guardian_person_id:personId})});
      const body=await r.json().catch(()=>({}));
      const err=typeof body.error==='string'?body.error:(body.error?.message||'Could not remove this grown-up.');
      if(!r.ok||body.ok!==true)throw new Error(err);
      if(status)status.textContent='Removed from family.';
      location.reload();
    }catch(e){if(status)status.textContent=e?.message||String(e);button.disabled=false;}
  }
  function enhanceLatest(){
    if(enhancing)return;
    enhancing=true;
    try{
      const panel=normalizePanels();
      if(!panel||!activePersonId)return;
      panel.dataset.person=activePersonId;
      const old=panel.querySelector('.family-remove-zone');if(old)old.remove();
      const form=panel.querySelector('form');if(!form)return;
      const wrap=document.createElement('div');wrap.className='family-remove-zone';
      const safeName=String(activeName||'this grown-up');
      wrap.innerHTML=`<hr class="family-rule"><div class="family-remove-status form-message" role="status" aria-live="polite"></div><button class="button secondary remove-grownup-from-family" type="button"></button><p class="meta family-remove-note">This does not affect any other families this grown-up may belong to.</p>`;
      const remove=wrap.querySelector('.remove-grownup-from-family');
      remove.textContent=`Remove ${safeName} from family`;
      remove.addEventListener('click',()=>removeFromFamily(activePersonId,safeName,remove,panel));
      form.appendChild(wrap);
    } finally {enhancing=false;}
  }
  document.addEventListener('click',e=>{
    const button=e.target.closest?.('.manage-access');if(!button)return;
    activePersonId=String(button.dataset.person||'');
    const strong=button.closest('.family-person')?.querySelector('strong');
    activeName=(strong?.textContent||'this grown-up').replace(/\s*\(you\)\s*$/,'').trim()||'this grown-up';
    dynamicPanels().forEach(p=>p.remove());
    queueMicrotask(enhanceLatest);setTimeout(enhanceLatest,0);setTimeout(enhanceLatest,50);
  },true);
  const observer=new MutationObserver(()=>{if(dynamicPanels().length){normalizePanels();if(activePersonId)queueMicrotask(enhanceLatest)}});
  observer.observe(app,{childList:true});
})();