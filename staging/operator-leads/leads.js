(()=>{
  const cfg=window.DV_APP_CONFIG||{};
  const endpoint=String(window.DV_OPERATOR_LEADS_ENDPOINT||'');
  if(!endpoint||!document.getElementById('operator-dashboard'))return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mins=v=>{const n=Number(v||0),h=Math.floor(n/60),m=n%60;return h?`${h}h ${m}m`:`${m}m`};
  const label=s=>String(s||'').replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
  let client,token='',payload=null;

  function install(){
    const tools=document.querySelector('[aria-labelledby="tools-title"]');
    if(!tools||document.getElementById('lead-lifecycle'))return;
    const section=document.createElement('section');section.id='lead-lifecycle';section.className='operator-panel lead-lifecycle';section.setAttribute('aria-labelledby','lead-title');
    section.innerHTML=`<div class="lead-head"><div><p class="eyebrow">Alpha acquisition</p><h2 id="lead-title">Leads &amp; engagement</h2><p class="meta">Human context plus lifecycle signals derived from canonical family and drive activity.</p></div><button id="lead-refresh" class="range-button" type="button">Refresh leads</button></div>
    <div id="lead-summary" class="lead-summary"></div><p id="lead-error" class="dashboard-error" hidden></p>
    <details class="lead-create"><summary>Add a lead</summary><form id="lead-form" class="lead-form">
      <label>Name <input name="name" required maxlength="160"></label><label>Email <input name="email" type="email"></label><label>Phone <input name="phone" inputmode="tel"></label><label>State <input name="home_state" maxlength="2" placeholder="MI"></label>
      <label>Source <input name="source" maxlength="80" placeholder="PERSONAL_REFERRAL"></label><label>Referred by <input name="referred_by" maxlength="160"></label><label class="lead-wide">Notes <textarea name="operator_notes" rows="2" maxlength="2000"></textarea></label>
      <div class="lead-wide"><button class="button button-primary" type="submit">Add lead</button> <span id="lead-save-status" class="meta" role="status"></span></div></form></details>
    <div class="table-scroll"><table class="lead-table"><thead><tr><th>Lead</th><th>Lifecycle</th><th>Family / driver</th><th>Use</th><th>Progress</th><th>Signals</th><th>Link</th></tr></thead><tbody id="lead-rows"></tbody></table></div>`;
    tools.parentNode.insertBefore(section,tools);
    document.getElementById('lead-refresh').addEventListener('click',load);
    document.getElementById('lead-form').addEventListener('submit',createLead);
  }

  async function auth(){
    if(!client)client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data}=await client.auth.getSession();token=data.session?.access_token||'';return token;
  }
  async function api(body,retried=false){
    await auth();
    if(!token)throw Object.assign(new Error('Sign in with an Operator account to continue.'),{status:401});
    const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`,apikey:cfg.publishableKey},body:JSON.stringify(body)});
    if(r.status===401&&!retried){const {data,error}=await client.auth.refreshSession();if(error||!data.session)throw Object.assign(new Error('Operator session expired. Sign in again.'),{status:401});token=data.session.access_token;return api(body,true)}
    const out=await r.json().catch(()=>({}));if(!r.ok||!out.ok)throw Object.assign(new Error(out.error||`Lead request failed (${r.status})`),{status:r.status});return out;
  }
  function familySelect(row){
    const opts=(payload.family_options||[]).map(f=>`<option value="${esc(f.id)}" ${row.converted_family_id===f.id?'selected':''}>${esc(f.label)}</option>`).join('');
    const suggested=row.suggested_family_id&&!row.converted_family_id?`<small>Exact contact match available.</small>`:'';
    return `<select class="lead-family" data-id="${esc(row.id)}"><option value="">Not linked</option>${opts}</select>${suggested}`;
  }
  function render(){
    const counts=payload.counts||{};document.getElementById('lead-summary').innerHTML=Object.entries(counts).sort().map(([k,v])=>`<span><strong>${esc(v)}</strong> ${esc(label(k))}</span>`).join('')||'<span>No leads yet.</span>';
    document.getElementById('lead-rows').innerHTML=(payload.rows||[]).map(row=>{
      const flags=(row.attention_flags||[]).map(x=>`<span class="lead-flag">${esc(label(x))}</span>`).join('');
      const driver=(row.driver_names||[]).join(', ')||'—',uses=row.usage_occasions?`${row.usage_occasions} occasion${row.usage_occasions===1?'':'s'} · ${row.drive_count} drives`:'No drive use yet',progress=row.practice_target_minutes?`${mins(row.total_minutes)} / ${mins(row.practice_target_minutes)} (${row.practice_progress_pct}%)`:mins(row.total_minutes);
      return `<tr><td><strong>${esc(row.name)}</strong><small>${esc(row.email||row.phone||'')}</small><small>${esc(row.source||'')}</small>${row.referred_by?`<small>via ${esc(row.referred_by)}</small>`:''}</td><td><span class="lead-stage stage-${esc(String(row.lifecycle).toLowerCase())}">${esc(label(row.lifecycle))}</span></td><td>${esc(driver)}</td><td>${esc(uses)}${row.last_usage_date?`<small>Last: ${esc(row.last_usage_date)}</small>`:''}</td><td>${esc(progress)}</td><td><div class="lead-flags">${flags||'—'}</div>${row.operator_notes?`<small>${esc(row.operator_notes)}</small>`:''}</td><td>${familySelect(row)}<button class="lead-link range-button" data-id="${esc(row.id)}" type="button">Save link</button></td></tr>`;
    }).join('')||'<tr><td colspan="7">No lead records.</td></tr>';
    document.querySelectorAll('.lead-link').forEach(b=>b.addEventListener('click',linkFamily));
  }
  async function load(){
    const err=document.getElementById('lead-error');err.hidden=true;try{payload=await api({action:'list'});render();document.getElementById('operator-dashboard').hidden=false;document.getElementById('lead-access-status').textContent='';document.getElementById('lead-signin').hidden=true}catch(e){document.getElementById('lead-access-status').textContent=e.message;if(e.status===401||e.status===403){document.getElementById('operator-dashboard').hidden=true;document.getElementById('lead-signin').hidden=false;document.getElementById('lead-rows').replaceChildren();payload=null}else{err.textContent=e.message;err.hidden=false}}
  }
  async function createLead(ev){
    ev.preventDefault();const form=ev.currentTarget,status=document.getElementById('lead-save-status'),body=Object.fromEntries(new FormData(form).entries());status.textContent='Saving…';try{await api({action:'create_lead',...body});form.reset();status.textContent='Lead added.';await load()}catch(e){status.textContent=e.message}
  }
  async function linkFamily(ev){
    const id=ev.currentTarget.dataset.id,select=document.querySelector(`.lead-family[data-id="${CSS.escape(id)}"]`);ev.currentTarget.disabled=true;try{await api({action:'link_family',id,family_id:select.value||null});await load()}catch(e){alert(e.message)}finally{ev.currentTarget.disabled=false}
  }
  install();
  auth().then(()=>{client.auth.onAuthStateChange((_event,session)=>{if(!session){token='';payload=null;document.getElementById('operator-dashboard').hidden=true;document.getElementById('lead-rows').replaceChildren();document.getElementById('lead-signin').hidden=false;document.getElementById('lead-access-status').textContent='Sign in with an Operator account to continue.'}});load()}).catch(e=>{document.getElementById('lead-access-status').textContent=e.message});
})();