(() => {
  if (window.__DV_OPERATOR_SUPPORT_INIT) return;
  window.__DV_OPERATOR_SUPPORT_INIT = true;
  const app=window.DV_LOG_APP;
  if(!app?.client)return;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let model=null;

  function accessMode(driverId){return app.getAccessMode?.(driverId)||(model?.driver_access||[]).find(x=>x.driver_id===driverId)?.mode||(model?.is_operator===true?'VIEW':'MANAGE')}
  function searchText(driver){const contact=(model?.operator_contacts||[]).find(x=>x.driver_id===driver.id)||{};return [driver.display_name,driver.id,driver.person_id,contact.driver?.name,contact.driver?.email,contact.driver?.mobile,contact.grown_up?.name,contact.grown_up?.email,contact.grown_up?.mobile,contact.grown_up?.id,contact.grown_up?.uuid].filter(Boolean).join(' ').toLowerCase()}

  function ensureStyle(){
    if(document.getElementById('operator-driver-search-style'))return;
    const style=document.createElement('style');
    style.id='operator-driver-search-style';
    style.textContent='.operator-driver-search{min-width:min(28rem,75vw);margin:.55rem 0}.operator-driver-search label{display:grid;gap:.2rem}.operator-driver-search span{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em}.operator-driver-search input{width:100%;box-sizing:border-box;padding:.55rem .65rem;border:1px solid #b9b9b9;border-radius:.35rem;background:#fff;color:#111}.operator-repair-row{display:flex;align-items:center;gap:.5rem;margin-top:.45rem;flex-wrap:wrap}.operator-driver-search .meta{font-size:.72rem}.operator-driver-results{display:grid;gap:.35rem;margin-top:.45rem}.operator-driver-result{width:100%;text-align:left}.operator-driver-results[hidden]{display:none}';
    document.head.appendChild(style);
  }

  function ensureSearch(){
    const host=document.getElementById('operator-support-host');
    if(!host||!model?.is_operator)return;
    ensureStyle();
    let wrap=document.getElementById('operator-driver-search-wrap');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.id='operator-driver-search-wrap';
      wrap.className='operator-driver-search';
      wrap.innerHTML='<label for="operator-driver-search"><span>Find driver</span><input id="operator-driver-search" type="search" placeholder="Name, email, phone, or ID" autocomplete="off"></label><div id="operator-driver-results" class="operator-driver-results" hidden></div><div class="operator-repair-row"><button id="operator-recompute-progress" class="button subtle-button button-small" type="button">Recompute progress</button><span id="operator-driver-search-status" class="meta"></span></div>';
      wrap.querySelector('#operator-driver-search').addEventListener('input',e=>filterDrivers(e.target.value));
      wrap.querySelector('#operator-driver-results').addEventListener('click',e=>{
        const button=e.target.closest?.('[data-operator-driver-id]');
        if(!button)return;
        app.selectDriver?.(button.dataset.operatorDriverId).catch?.(()=>{});
      });
      wrap.querySelector('#operator-recompute-progress').addEventListener('click',recomputeProgress);
    }
    if(wrap.parentElement!==host)host.appendChild(wrap);
  }

  function filterDrivers(value){
    if(!model)return;
    const q=String(value||'').trim().toLowerCase();
    const matches=(model.drivers||[]).filter(d=>!q||searchText(d).includes(q));
    const results=document.getElementById('operator-driver-results');
    const status=document.getElementById('operator-driver-search-status');
    if(status)status.textContent=q?`${matches.length} match${matches.length===1?'':'es'}`:'';
    if(!results)return;
    if(!q){results.innerHTML='';results.hidden=true;return}
    results.innerHTML=matches.slice(0,8).map(d=>`<button type="button" class="button subtle-button button-small operator-driver-result" data-operator-driver-id="${esc(d.id)}">${esc(d.display_name||'Driver')}${accessMode(d.id)==='VIEW'?' · View only':''}</button>`).join('');
    results.hidden=!matches.length;
  }

  async function recomputeProgress(){
    const driverId=app.getDriverId?.(),driver=(model?.drivers||[]).find(d=>d.id===driverId);
    if(!driverId)return;
    const reason=window.prompt(`Recompute ${driver?.display_name||'this driver'}’s progress. Enter a reason:`);
    if(!reason?.trim())return;
    if(!window.confirm(`Recompute progress for ${driver?.display_name||'this driver'}?\n\nReason: ${reason.trim()}`))return;
    const status=document.getElementById('operator-driver-search-status');
    if(status)status.textContent='Recomputing…';
    const generation=app.getRenderGeneration?.();
    const {data,error}=await originalInvoke('operator-repair',{body:{action:'recompute_progress',driver_id:driverId,reason:reason.trim()}});
    if(error||!data?.ok){if(status)status.textContent=data?.error||error?.message||'Repair failed';return}
    if(app.getDriverId?.()!==driverId||generation!==app.getRenderGeneration?.())return;
    try{await app.refreshDashboard?.()}catch(_){}
    if(app.getDriverId?.()!==driverId)return;
    if(status)status.textContent='Progress recomputed.';
  }

  const originalInvoke=app.client.functions.invoke.bind(app.client.functions);

  const activate=nextModel=>{
    model=nextModel||app.getModel?.();
    if(model?.is_operator)ensureSearch();
  };
  window.addEventListener('dv:dashboard-rendered',e=>activate(e.detail?.model));
  activate();
})();