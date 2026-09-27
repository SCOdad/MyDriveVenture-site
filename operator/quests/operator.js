(()=>{
  const cfg=window.DV_APP_CONFIG||{},endpoint=window.DV_OPERATOR_QUESTS_ENDPOINT||window.DV_ENVIRONMENT_CONFIG?.functionUrl?.('operator-quests');
  let client=null,token='',quests=[];
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function api(retried=false){
    const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token,apikey:cfg.publishableKey},body:JSON.stringify({action:'list'})});
    if(r.status===401&&!retried){const{data:refreshed,error}=await client.auth.refreshSession();if(error||!refreshed.session?.access_token)throw new Error('Your operator session expired. Sign in again.');token=refreshed.session.access_token;return api(true)}
    const out=await r.json().catch(()=>({}));if(!r.ok||!out.ok)throw new Error(out.error||`Quest request failed (${r.status})`);return out;
  }
  function filterRows(){
    const q=$('quest-search').value.trim().toLowerCase(),type=$('quest-type').value,status=$('quest-status').value;
    const rows=quests.filter(x=>{
      const hay=[x.quest_key,x.name,x.description,x.quest_type,x.target,x.prerequisite_key].join(' ').toLowerCase();
      if(q&&!hay.includes(q))return false;
      if(type&&x.quest_type!==type)return false;
      if(status==='active'&&!x.active)return false;
      if(status==='inactive'&&x.active)return false;
      return true;
    });
    $('quest-summary').textContent=`${rows.length} of ${quests.length} quests shown.`;
    $('quest-rows').innerHTML=rows.map(x=>`<tr id="quest-${esc(x.quest_key)}" class="${x.active?'':'quest-inactive'}"><td class="quest-key"><strong>${esc(x.quest_key)}</strong><br>${esc(x.name)}<br><small>${esc(x.description||'')}</small></td><td><strong>${esc(x.quest_type)}</strong><br><small>Target: ${esc(x.target??'—')}</small><br><small>${x.repeatable?'Repeatable':'One-time'}</small></td><td>${esc(x.xp)}</td><td>${x.active?'Active':'Inactive'}</td><td>${esc(x.prerequisite_key||'—')}</td><td>${esc(x.display_order??'—')}</td></tr>`).join('')||'<tr><td colspan="6">No quests match the current filters.</td></tr>';
  }
  function render(){
    const types=[...new Set(quests.map(x=>x.quest_type).filter(Boolean))].sort();
    $('quest-type').innerHTML='<option value="">All types</option>'+types.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');
    const params=new URLSearchParams(location.search),key=params.get('quest');
    if(key)$('quest-search').value=key;
    filterRows();
    if(key){requestAnimationFrame(()=>document.getElementById('quest-'+key)?.scrollIntoView({block:'center'}))}
  }
  for(const id of ['quest-search','quest-type','quest-status'])$(id).addEventListener(id==='quest-search'?'input':'change',filterRows);
  (async()=>{try{if(!window.supabase||!cfg.supabaseUrl||!cfg.publishableKey||!endpoint)throw new Error('Drive Venture operator configuration is unavailable.');client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true}});const{data:{session}}=await client.auth.getSession();if(!session?.access_token)throw new Error('Sign in with an operator account to continue.');token=session.access_token;const out=await api();quests=out.quests||[];render();$('checking').hidden=true;$('main').hidden=false}catch(e){$('checking').hidden=true;$('denied').hidden=false;$('denied-detail').textContent=e.message||'Operator access required.'}})();
})();