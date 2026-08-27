(() => {
  const app=window.DV_LOG_APP;
  if(!app?.client)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let model=null;

  function accessMode(driverId){return (model?.driver_access||[]).find(x=>x.driver_id===driverId)?.mode||'VIEW'}
  function searchText(driver){
    const contact=(model?.operator_contacts||[]).find(x=>x.driver_id===driver.id)||{};
    return [driver.display_name,driver.id,driver.person_id,contact.driver?.name,contact.driver?.email,contact.driver?.mobile,contact.grown_up?.name,contact.grown_up?.email,contact.grown_up?.mobile,contact.grown_up?.id,contact.grown_up?.uuid].filter(Boolean).join(' ').toLowerCase();
  }
  function ensureSearch(){
    const switcher=document.getElementById('driver-switcher'),select=document.getElementById('driver-select');
    if(!switcher||!select||!model?.is_operator)return;
    switcher.hidden=false;
    let wrap=document.getElementById('operator-driver-search-wrap');
    if(!wrap){
      wrap=document.createElement('div');wrap.id='operator-driver-search-wrap';wrap.className='operator-driver-search';
      wrap.innerHTML='<label for="operator-driver-search"><span>Find driver</span><input id="operator-driver-search" type="search" placeholder="Name, email, phone, or ID" autocomplete="off"></label><div id="operator-driver-search-status" class="meta"></div>';
      switcher.prepend(wrap);
      const style=document.createElement('style');style.textContent='.operator-driver-search{min-width:min(28rem,75vw);margin-right:.65rem}.operator-driver-search label{display:grid;gap:.2rem}.operator-driver-search span{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em}.operator-driver-search input{width:100%;box-sizing:border-box;padding:.55rem .65rem;border:1px solid #b9b9b9;border-radius:.35rem;background:#fff;color:#111}.operator-driver-search .meta{font-size:.72rem;margin-top:.2rem}';document.head.appendChild(style);
      wrap.querySelector('input').addEventListener('input',e=>filterDrivers(e.target.value));
    }
  }
  function filterDrivers(value){
    const select=document.getElementById('driver-select');if(!select||!model)return;
    const q=String(value||'').trim().toLowerCase(),current=app.getDriverId?.();
    const matches=(model.drivers||[]).filter(d=>!q||searchText(d).includes(q));
    select.innerHTML=matches.map(d=>`<option value="${esc(d.id)}">${esc(d.display_name||'Driver')}</option>`).join('');
    if(matches.some(d=>d.id===current))select.value=current;
    else if(matches.length===1){select.value=matches[0].id;select.dispatchEvent(new Event('change',{bubbles:true}))}
    const status=document.getElementById('operator-driver-search-status');if(status)status.textContent=q?`${matches.length} match${matches.length===1?'':'es'}`:'';
  }

  const originalInvoke=app.client.functions.invoke.bind(app.client.functions);
  app.client.functions.invoke=async(name,options={})=>{
    const body=options?.body||{};
    if(name==='drive-ops'&&body.action==='edit_drive'&&model?.is_operator&&accessMode(body.driver_id)==='VIEW'){
      const reason=window.prompt('Administrator edit: enter a brief reason for this change.');
      if(!reason?.trim())return {data:{ok:false,error:'Administrator edit cancelled: a reason is required.'},error:null};
      const driver=(model.drivers||[]).find(d=>d.id===body.driver_id);
      if(!window.confirm(`Modify ${driver?.display_name||'this driver'}’s drive as an administrator?\n\nReason: ${reason.trim()}`))return {data:{ok:false,error:'Administrator edit cancelled.'},error:null};
      options={...options,body:{...body,reason:reason.trim()}};
    }
    return originalInvoke(name,options);
  };

  window.addEventListener('dv:dashboard-rendered',e=>{model=e.detail?.model||app.getModel?.();if(!model?.is_operator)return;ensureSearch()});
})();
