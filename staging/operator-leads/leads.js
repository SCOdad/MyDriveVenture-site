(()=>{
  const cfg=window.DV_APP_CONFIG||{};
  const endpoint=String(window.DV_OPERATOR_LEADS_ENDPOINT||'');
  const nudgeEndpoint=String(window.DV_LIFECYCLE_NUDGE_ENDPOINT||'');
  if(!endpoint||!nudgeEndpoint||!document.getElementById('operator-dashboard'))return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mins=v=>{const n=Number(v||0),h=Math.floor(n/60),m=n%60;return h?`${h}h ${m}m`:`${m}m`};
  const label=s=>String(s||'').replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
  let client,token='',payload=null,nudges=null;

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
    <div class="table-scroll"><table class="lead-table"><thead><tr><th>Lead</th><th>Lifecycle</th><th>Family / driver</th><th>Use</th><th>Progress</th><th>Signals</th><th>Link</th></tr></thead><tbody id="lead-rows"></tbody></table></div>
    <section class="nudge-panel" aria-labelledby="nudge-title"><div class="lead-head"><div><p class="eyebrow">Next best nudge</p><h3 id="nudge-title">Lifecycle communications</h3><p class="meta">Preview who qualifies and safely tune rule priority/enabled state. This screen does not send family email.</p></div></div>
      <div id="nudge-summary" class="lead-summary"></div><p id="nudge-error" class="dashboard-error" hidden></p>
      <div class="table-scroll"><table class="lead-table nudge-rule-table"><thead><tr><th>Priority</th><th>Rule</th><th>Trigger</th><th>Post-send</th><th>Enabled</th><th></th></tr></thead><tbody id="nudge-rule-rows"></tbody></table></div>
      <h4>Current preview</h4><div class="table-scroll"><table class="lead-table nudge-preview-table"><thead><tr><th>Grown-up</th><th>Driver</th><th>Nudge</th><th>Reason/state</th><th>Status</th></tr></thead><tbody id="nudge-preview-rows"></tbody></table></div>
    </section>`;
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
  async function nudgeApi(body,retried=false){
    await auth();if(!token)throw Object.assign(new Error('Sign in with an Operator account to continue.'),{status:401});
    const r=await fetch(nudgeEndpoint,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`,apikey:cfg.publishableKey},body:JSON.stringify(body)});
    if(r.status===401&&!retried){const {data,error}=await client.auth.refreshSession();if(error||!data.session)throw Object.assign(new Error('Operator session expired. Sign in again.'),{status:401});token=data.session.access_token;return nudgeApi(body,true)}
    const out=await r.json().catch(()=>({}));if(!r.ok||!out.ok)throw Object.assign(new Error(out.error||`Nudge request failed (${r.status})`),{status:r.status});return out;
  }
  function renderNudges(){
    const rules=nudges?.rules||[],selected=nudges?.selected||[],candidates=nudges?.candidates||[];
    document.getElementById('nudge-summary').innerHTML=`<span><strong>${esc(selected.length)}</strong> selected</span><span><strong>${esc(candidates.filter(x=>!x.eligible_to_send).length)}</strong> suppressed</span><span><strong>${esc(rules.filter(x=>x.enabled).length)}</strong> enabled rules</span>`;
    document.getElementById('nudge-rule-rows').innerHTML=rules.map(rule=>`<tr><td><input class="nudge-priority" data-rule="${esc(rule.rule_key)}" type="number" min="1" step="1" value="${esc(rule.priority)}" aria-label="Priority for ${esc(rule.display_name)}"></td><td><strong>${esc(rule.display_name)}</strong><small>${esc(rule.rule_key)}</small></td><td>${esc(label(rule.trigger_primitive))}<small>${esc(JSON.stringify(rule.trigger_config||{}))}</small></td><td>${esc(label(rule.post_send_behavior))}${rule.once_only?'<small>Once only</small>':''}</td><td><input class="nudge-enabled" data-rule="${esc(rule.rule_key)}" type="checkbox" ${rule.enabled?'checked':''} aria-label="Enable ${esc(rule.display_name)}"></td><td><button class="range-button nudge-save" data-rule="${esc(rule.rule_key)}" type="button">Save</button></td></tr>`).join('');
    document.getElementById('nudge-preview-rows').innerHTML=candidates.map(row=>`<tr><td><strong>${esc(row.recipient_name)}</strong><small>${esc(row.recipient_email)}</small></td><td>${esc(row.driver_name||'Family setup')}</td><td><span class="lead-stage">${esc(row.rule.display_name)}</span><small><strong>Subject:</strong> ${esc(row.message_preview?.subject||'')}</small><details class="nudge-copy"><summary>Email copy</summary><pre>${esc(row.message_preview?.text||'')}</pre></details></td><td>${esc(row.rule.description||'')}<small>${esc(row.state?.usage_occasions??0)} use occasion(s) · ${esc(row.state?.drive_count??0)} drive(s)</small></td><td>${row.eligible_to_send?'<span class="nudge-eligible">Selected/eligible</span>':`<span class="nudge-suppressed">Suppressed</span><small>${esc(label(row.suppression_reason||''))}</small>`}</td></tr>`).join('')||'<tr><td colspan="5">No current candidates.</td></tr>';
    document.querySelectorAll('.nudge-save').forEach(b=>b.addEventListener('click',saveNudgeRule));
  }
  async function loadNudges(){
    const err=document.getElementById('nudge-error');err.hidden=true;
    try{nudges=await nudgeApi({action:'preview'});renderNudges()}catch(e){nudges=null;err.textContent=e.message;err.hidden=false}
  }
  async function saveNudgeRule(ev){
    const rule=ev.currentTarget.dataset.rule,priority=Number(document.querySelector(`.nudge-priority[data-rule="${CSS.escape(rule)}"]`).value),enabled=document.querySelector(`.nudge-enabled[data-rule="${CSS.escape(rule)}"]`).checked;
    ev.currentTarget.disabled=true;try{await nudgeApi({action:'update_rule',rule_key:rule,priority,enabled});await loadNudges()}catch(e){alert(e.message)}finally{ev.currentTarget.disabled=false}
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
    const err=document.getElementById('lead-error');err.hidden=true;try{payload=await api({action:'list'});render();await loadNudges();document.getElementById('operator-dashboard').hidden=false;document.getElementById('lead-access-status').textContent='';document.getElementById('lead-signin').hidden=true}catch(e){document.getElementById('lead-access-status').textContent=e.message;if(e.status===401||e.status===403){document.getElementById('operator-dashboard').hidden=true;document.getElementById('lead-signin').hidden=false;document.getElementById('lead-rows').replaceChildren();payload=null;nudges=null}else{err.textContent=e.message;err.hidden=false}}
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