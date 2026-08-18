(() => {
  if (!document.querySelector('link[data-dv-shared-log-fixes]')) {
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/assets/css/log-shared-fixes.css?v=20260818-0755';
    link.dataset.dvSharedLogFixes='true';
    document.head.appendChild(link);
  }

  if (!window.supabase) return;
  const cfg = window.DV_APP_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.publishableKey) return;

  const client = window.DV_SUPABASE_CLIENT || window.supabase.createClient(cfg.supabaseUrl, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.DV_SUPABASE_CLIENT = client;

  const driverSelect = () => document.getElementById('driver-select');
  const vehicleStatus = () => document.getElementById('vehicle-status');
  const setStatus = (text, kind='') => {
    const el = vehicleStatus(); if (!el) return;
    el.textContent = text || '';
    el.className = `app-status${kind ? ` ${kind}` : ''}`;
  };

  const oldForm = document.getElementById('vehicle-form');
  if (oldForm) {
    const form = oldForm.cloneNode(true);
    oldForm.replaceWith(form);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const driverId=driverSelect()?.value||'';
      if(!driverId)return setStatus('No active driver is selected.','error');
      setStatus('Adding vehicle…');
      const {data,error}=await client.rpc('add_authenticated_vehicle_v1',{
        p_driver_id:driverId,
        p_name:document.getElementById('vehicle-name').value.trim(),
        p_vehicle_class:document.getElementById('vehicle-class').value,
        p_color:document.getElementById('vehicle-color').value.trim()||null,
        p_is_primary:false
      });
      if(error||!data?.ok)return setStatus(`Garage: ${error?.message||data?.error||'Unable to add vehicle.'}`,'error');
      setStatus('Vehicle added. Refresh to see it in Garage.','success');
      form.reset();
    });
  }

  const oldList=document.getElementById('vehicle-list');
  if(oldList){
    const list=oldList.cloneNode(true);
    oldList.replaceWith(list);
    list.addEventListener('click',async event=>{
      const button=event.target.closest('[data-archive-vehicle]');
      if(!button)return;
      const driverId=driverSelect()?.value||'';
      setStatus('Updating Garage…');
      const {data,error}=await client.rpc('archive_authenticated_vehicle_v1',{p_driver_id:driverId,p_vehicle_id:button.dataset.archiveVehicle});
      if(error||!data?.ok)return setStatus(`Garage: ${error?.message||data?.error||'Unable to archive vehicle.'}`,'error');
      setStatus('Vehicle archived. Refresh to update Garage.','success');
    });
  }

  let helpByName=new Map();
  function annotateQuests(){
    if(!helpByName.size)return;
    document.querySelectorAll('#quest-list .quest-item, #radio-quest-list li').forEach(item=>{
      const nameEl=item.querySelector('strong')||item;
      const visible=(nameEl.textContent||'').trim();
      const normalized=visible.replace(/^\d+\.\s*/,'').trim();
      const match=[...helpByName.entries()].find(([name])=>normalized===name||normalized.endsWith(name));
      if(!match)return;
      const [,q]=match;
      nameEl.classList.add('quest-help-target');
      nameEl.setAttribute('tabindex','0');
      nameEl.setAttribute('title',q.description);
      nameEl.setAttribute('aria-label',`${q.name}. ${q.description}`);
      item.dataset.questHelp=q.description;
    });
  }

  async function loadQuestHelp(){
    const {data,error}=await client.rpc('get_authenticated_quest_help_v1');
    if(error||!data?.ok)return;
    helpByName=new Map((data.quests||[]).map(q=>[q.name,q]));
    annotateQuests();
    const observer=new MutationObserver(annotateQuests);
    ['quest-list','radio-quest-list'].forEach(id=>{const el=document.getElementById(id);if(el)observer.observe(el,{childList:true,subtree:true})});
  }

  client.auth.getSession().then(({data})=>{if(data.session)loadQuestHelp()});
})();