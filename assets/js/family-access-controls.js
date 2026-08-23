(()=>{
  const cfg=window.DV_APP_CONFIG||{},app=document.getElementById('family-app');
  if(!app||!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase)return;
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const dynamicPanels=()=>[...app.querySelectorAll(':scope > .family-panel')].filter(p=>p.id!=='grownup-panel'&&p.id!=='driver-panel');
  function keepOnly(panel){dynamicPanels().forEach(p=>{if(p!==panel)p.remove()});}
  async function removeFromFamily(personId,button,panel){
    if(!confirm('Remove this grown-up from your family? This removes all of their access to drivers in this family. It does not delete their Drive Venture account or affect other families.'))return;
    const status=panel.querySelector('.family-remove-status');
    button.disabled=true;if(status)status.textContent='Removing…';
    try{
      const session=(await client.auth.getSession()).data.session;
      if(!session?.access_token)throw new Error('Please sign in again.');
      const r=await fetch(`${cfg.supabaseUrl}/functions/v1/family-remove-api`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${session.access_token}`,apikey:cfg.publishableKey},body:JSON.stringify({guardian_person_id:personId})});
      const body=await r.json().catch(()=>({}));
      if(!r.ok||body.ok!==true)throw new Error(body.error||'Could not remove this grown-up.');
      if(status)status.textContent='Removed from family.';
      location.reload();
    }catch(e){if(status)status.textContent=e?.message||String(e);button.disabled=false;}
  }
  function enhanceLatest(personId){
    const panels=dynamicPanels();
    const panel=panels[panels.length-1];
    if(!panel)return;
    keepOnly(panel);
    panel.id='guardian-access-panel';
    panel.dataset.person=personId;
    if(panel.querySelector('.remove-grownup-from-family'))return;
    const form=panel.querySelector('form');
    if(!form)return;
    const wrap=document.createElement('div');
    wrap.className='family-remove-zone';
    wrap.innerHTML='<hr class="family-rule"><p class="meta">Removing a grown-up is separate from changing driver access.</p><div class="family-remove-status form-message" role="status" aria-live="polite"></div><button class="button secondary remove-grownup-from-family" type="button">Remove from family</button>';
    form.appendChild(wrap);
    const remove=wrap.querySelector('.remove-grownup-from-family');
    remove.addEventListener('click',()=>removeFromFamily(personId,remove,panel));
  }
  document.addEventListener('click',e=>{
    const button=e.target.closest?.('.manage-access');
    if(!button)return;
    dynamicPanels().forEach(p=>p.remove());
    const personId=String(button.dataset.person||'');
    queueMicrotask(()=>enhanceLatest(personId));
    setTimeout(()=>enhanceLatest(personId),0);
  },true);
  const observer=new MutationObserver(()=>{
    const panels=dynamicPanels();
    if(panels.length>1)keepOnly(panels[panels.length-1]);
  });
  observer.observe(app,{childList:true});
})();