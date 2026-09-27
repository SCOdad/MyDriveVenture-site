(()=>{
  const cfg=window.DV_APP_CONFIG||{},endpoint=window.DV_OPERATOR_DICTIONARY_ENDPOINT;
  let client=null,token='',data=null,selectedCategory=null,selectedPolicyTermId=null,selectedAllowlistId=null,currentImpact=null,suppressAutosave=false;
  const timers=new Map(),$=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function status(msg,error=false){const el=$('message');el.textContent=msg||'';el.classList.toggle('error',error)}
  function saveState(id,msg,error=false){const el=$(id);if(!el)return;el.textContent=msg||'';el.classList.toggle('error',error)}
  function debounce(name,fn,delay=550){clearTimeout(timers.get(name));timers.set(name,setTimeout(fn,delay))}
  async function api(action,payload={},retried=false){
    const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token,apikey:cfg.publishableKey},body:JSON.stringify({action,...payload})});
    if(r.status===401&&!retried){const{data:refreshed,error}=await client.auth.refreshSession();if(error||!refreshed.session?.access_token)throw new Error('Your operator session expired. Sign in again.');token=refreshed.session.access_token;return api(action,payload,true)}
    const out=await r.json().catch(()=>({}));if(!r.ok||!out.ok){const e=new Error(out.error||`Dictionary request failed (${r.status})`);e.status=r.status;throw e}return out
  }
  function show(view){for(const name of ['discoveries','destinations','policy']){$(`${name}-view`).hidden=name!==view;document.querySelector(`[data-view="${name}"]`)?.setAttribute('aria-pressed',String(name===view))}}

  function renderDiscoveries(){
    const rows=data.discoveries||[];
    $('discoveries').innerHTML=rows.map(x=>`<button class="discovery-row ${x.status==='NEW'?'new':'dispositioned'}" data-discovery="${esc(x.id)}"><strong>${esc(x.driver_name)}</strong> · ${esc(x.drive?.drive_date||'Unknown date')}<br><small>${esc(x.status)} · surfaced ${esc(x.surfaced_count)} time${Number(x.surfaced_count)===1?'':'s'}</small><br>${esc(x.destination_snapshot||'')}${x.notes_snapshot?`<br><small>${esc(x.notes_snapshot.slice(0,160))}</small>`:''}</button>`).join('')||'<p>No unclassified drives are waiting.</p>';
    $('discoveries').querySelectorAll('[data-discovery]').forEach(b=>b.onclick=()=>openDiscovery(b.dataset.discovery));
  }
  function openDiscovery(id){
    const x=(data.discoveries||[]).find(d=>d.id===id);if(!x)return;
    $('discovery-detail').innerHTML=`<h2>${esc(x.driver_name)}</h2><p class="meta">${esc(x.drive?.drive_date||'Unknown date')} · revision ${esc(x.drive_revision_snapshot??'n/a')} · last seen ${esc(new Date(x.last_seen_at).toLocaleString())}</p><dl><dt>Destination</dt><dd>${esc(x.destination_snapshot||'—')}</dd><dt>Notes</dt><dd>${esc(x.notes_snapshot||'—')}</dd></dl><form id="disposition-form" class="detail-form"><label><span class="field-label">Disposition</span><select name="disposition_code"><option>ALIAS_ADDED</option><option>QUEST_CANDIDATE</option><option>DISMISSED</option><option>IGNORED</option></select></label><label><span class="field-label">Notes</span><textarea name="notes">${esc(x.disposition_notes||'')}</textarea></label><button class="button button-primary" type="submit">Disposition</button></form>`;
    $('disposition-form').onsubmit=async e=>{e.preventDefault();try{const form=e.currentTarget;status('Saving disposition...');await api('disposition_discovery',{id:x.id,disposition_code:form.elements.disposition_code.value,notes:form.elements.notes.value});await load();status('Disposition saved.')}catch(err){status(err.message,true)}};
  }

  function renderCategories(){
    const rows=data.categories||[];
    $('categories').innerHTML=rows.map(c=>`<button class="dictionary-row ${c.is_active?'':'inactive'}" data-category="${esc(c.category_key)}"><strong>${esc(c.label)}</strong><br><small>${esc(c.category_key)}${c.quest_key?` · ${esc(c.quest_key)}`:''}</small></button>`).join('')||'<p>No destination categories yet.</p>';
    $('categories').querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>openCategory(b.dataset.category));
    if(selectedCategory){const still=rows.find(c=>c.category_key===selectedCategory.category_key);if(still)openCategory(still.category_key);else selectedCategory=null}
    if(!selectedCategory&&rows[0])openCategory(rows[0].category_key);
  }
  function openCategory(categoryKey){
    selectedCategory=(data.categories||[]).find(c=>c.category_key===categoryKey)||null;if(!selectedCategory)return;
    suppressAutosave=true;const form=$('category-form');
    for(const k of ['category_key','label','description','quest_key'])form.elements[k].value=selectedCategory[k]||'';
    form.elements.category_key.disabled=true;form.elements.is_active.checked=selectedCategory.is_active!==false;renderAliases();saveState('category-save-state','Saved');suppressAutosave=false;
  }
  function renderAliases(){
    const aliases=(data.aliases||[]).filter(a=>a.category_key===selectedCategory?.category_key);
    $('aliases').innerHTML=`<table class="alias-table"><thead><tr><th>Alias</th><th>Match</th><th>Priority</th><th>Status</th></tr></thead><tbody>${aliases.map(a=>`<tr><td><button class="button button-secondary" data-alias="${esc(a.id)}">${esc(a.alias_text)}</button><br><small>${esc(a.normalized_alias)}</small></td><td>${esc(a.match_strategy)}</td><td>${esc(a.priority)}</td><td>${a.is_active?'Active':'Inactive'}</td></tr>`).join('')||'<tr><td colspan="4">No aliases.</td></tr>'}</tbody></table>`;
    $('aliases').querySelectorAll('[data-alias]').forEach(b=>b.onclick=()=>{const a=aliases.find(x=>x.id===b.dataset.alias),form=$('alias-form');suppressAutosave=true;for(const k of ['id','alias_text','match_strategy','priority'])form.elements[k].value=a[k]??'';form.elements.is_active.checked=a.is_active!==false;$('alias-add').hidden=true;saveState('alias-save-state','Saved');suppressAutosave=false});
  }
  async function saveCategory(){
    if(suppressAutosave)return;const form=$('category-form'),category_key=form.elements.category_key.value.trim(),label=form.elements.label.value.trim();if(category_key.length<2||!label)return;
    try{saveState('category-save-state','Saving…');const out=await api('save_category',{category_key,label,description:form.elements.description.value,quest_key:form.elements.quest_key.value,is_active:form.elements.is_active.checked});selectedCategory={category_key:out.category_key};await load();saveState('category-save-state','Saved')}catch(err){saveState('category-save-state',err.message,true)}
  }
  async function saveAliasExisting(){
    if(suppressAutosave)return;const form=$('alias-form');if(!form.elements.id.value||!selectedCategory)return;
    try{saveState('alias-save-state','Saving…');await api('save_alias',{id:form.elements.id.value,category_key:selectedCategory.category_key,alias_text:form.elements.alias_text.value,match_strategy:form.elements.match_strategy.value,priority:form.elements.priority.value,is_active:form.elements.is_active.checked});await load();openCategory(selectedCategory.category_key);saveState('alias-save-state','Saved')}catch(err){saveState('alias-save-state',err.message,true)}
  }

  function renderPolicy(){
    const terms=data.profanity?.terms||[],allow=data.profanity?.allowlist||[];
    $('policy-terms').innerHTML=terms.map(t=>`<button class="dictionary-row ${t.is_active?'':'inactive'}" data-policy-term="${esc(t.id)}"><strong>${esc(t.normalized_term)}</strong><br><small>${esc(t.review_status||'PENDING')} · ${t.is_active?'Active':'Inactive'} · ${esc(t.match_strategy)} · severity ${esc(t.severity)} · ${esc(t.category||'GENERAL')}</small></button>`).join('')||'<p>No policy terms.</p>';
    $('allowlist').innerHTML=allow.map(a=>`<button class="dictionary-row ${a.is_active?'':'inactive'}" data-allowlist="${esc(a.id)}"><strong>${esc(a.normalized_value)}</strong><br><small>${esc(a.reason||'')}</small></button>`).join('')||'<p>No exceptions.</p>';
    $('policy-terms').querySelectorAll('[data-policy-term]').forEach(b=>b.onclick=()=>openPolicyTerm(b.dataset.policyTerm));
    $('allowlist').querySelectorAll('[data-allowlist]').forEach(b=>b.onclick=()=>openAllowlist(b.dataset.allowlist));
    if(selectedPolicyTermId&&terms.some(t=>t.id===selectedPolicyTermId))openPolicyTerm(selectedPolicyTermId);
    if(selectedAllowlistId&&allow.some(a=>a.id===selectedAllowlistId))openAllowlist(selectedAllowlistId);
  }
  function openPolicyTerm(id){
    const row=(data.profanity?.terms||[]).find(x=>x.id===id);if(!row)return;selectedPolicyTermId=id;suppressAutosave=true;const form=$('policy-term-form');for(const k of ['id','normalized_term','match_strategy','severity','category','review_status'])form.elements[k].value=row[k]??(k==='review_status'?'PENDING':'');form.elements.is_active.checked=row.is_active===true;saveState('policy-save-state','Saved');suppressAutosave=false;
  }
  function openAllowlist(id){
    const row=(data.profanity?.allowlist||[]).find(x=>x.id===id);if(!row)return;selectedAllowlistId=id;suppressAutosave=true;const form=$('allowlist-form');for(const k of ['id','normalized_value','reason'])form.elements[k].value=row[k]??'';form.elements.is_active.checked=row.is_active!==false;saveState('allowlist-save-state','Saved');suppressAutosave=false;
  }
  async function savePolicyTerm(){
    if(suppressAutosave)return;const form=$('policy-term-form'),term=form.elements.normalized_term.value.trim();if(!term)return;
    try{saveState('policy-save-state','Saving…');const out=await api('save_policy_term',{id:form.elements.id.value,normalized_term:term,match_strategy:form.elements.match_strategy.value,severity:form.elements.severity.value,category:form.elements.category.value,review_status:form.elements.review_status.value,is_active:form.elements.is_active.checked});selectedPolicyTermId=out.row.id;await load();saveState('policy-save-state','Saved')}catch(err){saveState('policy-save-state',err.message,true)}
  }
  async function saveAllowlist(){
    if(suppressAutosave)return;const form=$('allowlist-form'),value=form.elements.normalized_value.value.trim(),reason=form.elements.reason.value.trim();if(!value||!reason)return;
    try{saveState('allowlist-save-state','Saving…');const out=await api('save_allowlist',{id:form.elements.id.value,normalized_value:value,reason,is_active:form.elements.is_active.checked});selectedAllowlistId=out.row.id;await load();saveState('allowlist-save-state','Saved')}catch(err){saveState('allowlist-save-state',err.message,true)}
  }

  function render(){renderDiscoveries();renderCategories();renderPolicy()}
  async function load(){data=await api('list');render()}

  $('category-form').addEventListener('input',()=>debounce('category',saveCategory));
  $('category-form').addEventListener('change',()=>debounce('category',saveCategory,150));
  $('alias-form').addEventListener('input',()=>{if($('alias-form').elements.id.value)debounce('alias',saveAliasExisting)});
  $('alias-form').addEventListener('change',()=>{if($('alias-form').elements.id.value)debounce('alias',saveAliasExisting,150)});
  $('alias-form').onsubmit=async e=>{e.preventDefault();try{if(!selectedCategory)throw new Error('Choose a category first');const form=e.currentTarget;if(form.elements.id.value)return saveAliasExisting();saveState('alias-save-state','Adding…');await api('save_alias',{category_key:selectedCategory.category_key,alias_text:form.elements.alias_text.value,match_strategy:form.elements.match_strategy.value,priority:form.elements.priority.value,is_active:form.elements.is_active.checked});suppressAutosave=true;form.reset();form.elements.match_strategy.value='PHRASE';form.elements.priority.value='100';form.elements.is_active.checked=true;$('alias-add').hidden=false;suppressAutosave=false;await load();openCategory(selectedCategory.category_key);saveState('alias-save-state','Added')}catch(err){saveState('alias-save-state',err.message,true)}};
  $('preview-form').onsubmit=async e=>{e.preventDefault();try{const form=e.currentTarget,out=await api('classify_preview',{destination:form.elements.destination.value,notes:form.elements.notes.value}),box=$('preview');box.hidden=false;box.textContent=(out.result?.categories||[]).map(c=>`${c.label} (${c.category_key}) via ${c.alias_text} in ${c.source}`).join(', ')||'No category matched.'}catch(err){status(err.message,true)}};
  $('new-category').onclick=()=>{selectedCategory=null;suppressAutosave=true;const form=$('category-form');form.reset();form.elements.category_key.disabled=false;form.elements.is_active.checked=true;$('aliases').innerHTML='';$('alias-add').hidden=false;saveState('category-save-state','Enter key and label to create');suppressAutosave=false;form.elements.category_key.focus()};

  $('policy-term-form').addEventListener('input',()=>debounce('policy-term',savePolicyTerm));
  $('policy-term-form').addEventListener('change',()=>debounce('policy-term',savePolicyTerm,150));
  $('allowlist-form').addEventListener('input',()=>debounce('allowlist',saveAllowlist));
  $('allowlist-form').addEventListener('change',()=>debounce('allowlist',saveAllowlist,150));
  $('new-policy-term').onclick=()=>{selectedPolicyTermId=null;suppressAutosave=true;const form=$('policy-term-form');form.reset();form.elements.match_strategy.value='TOKEN';form.elements.severity.value='1';form.elements.category.value='GENERAL';form.elements.review_status.value='PENDING';form.elements.is_active.checked=false;saveState('policy-save-state','Enter a term to create');suppressAutosave=false;form.elements.normalized_term.focus()};
  $('new-allowlist').onclick=()=>{selectedAllowlistId=null;suppressAutosave=true;const form=$('allowlist-form');form.reset();form.elements.is_active.checked=true;saveState('allowlist-save-state','Enter value and reason to create');suppressAutosave=false;form.elements.normalized_value.focus()};

  $('impact-refresh').onclick=async()=>{try{status('Calculating historical quest impact...');const out=await api('impact_preview');currentImpact=out;const summary=$('impact-summary');summary.hidden=false;summary.textContent=`${out.award_count} additional quest award${out.award_count===1?'':'s'} across ${out.driver_count} driver${out.driver_count===1?'':'s'}.`;$('impact-results').innerHTML=out.rows.length?`<table class="impact-table"><thead><tr><th>Driver</th><th>Date</th><th>Drive text</th><th>Matched</th><th>Quest</th></tr></thead><tbody>${out.rows.map(r=>`<tr><td>${esc(r.driver_name)}</td><td>${esc(r.drive_date)}</td><td>${esc(r.destination||'')}${r.notes?`<br><small>${esc(r.notes)}</small>`:''}</td><td>${esc(r.alias_text)} → ${esc(r.category_label)}<br><small>${esc(r.match_source)}</small></td><td>${esc(r.quest_name)}<br><small>${esc(r.quest_key)} · ${esc(r.xp)} XP</small></td></tr>`).join('')}</tbody></table>`:'<p>No new historical awards under the current dictionary.</p>';$('impact-apply').hidden=!out.rows.length;status('Impact preview ready.')}catch(err){status(err.message,true)}};
  $('impact-apply').onclick=async()=>{if(!currentImpact?.signature||!currentImpact.rows?.length)return;const ok=window.confirm(`Award ${currentImpact.award_count} quest${currentImpact.award_count===1?'':'s'} to ${currentImpact.driver_count} driver${currentImpact.driver_count===1?'':'s'}? Existing awards will not be revoked or duplicated.`);if(!ok)return;try{status('Applying previewed awards...');const out=await api('apply_impact',{preview_token:currentImpact.signature});status(`Applied ${out.result?.inserted_awards??0} retroactive award(s).`);currentImpact=null;$('impact-apply').hidden=true;await $('impact-refresh').onclick()}catch(err){status(err.message,true)}};

  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>show(b.dataset.view));
  (async()=>{try{if(!window.supabase||!cfg.supabaseUrl||!cfg.publishableKey||!endpoint)throw new Error('Drive Venture operator configuration is unavailable.');client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true}});const{data:{session}}=await client.auth.getSession();if(!session?.access_token)throw Object.assign(new Error('Sign in with an operator account to continue.'),{status:401});token=session.access_token;await load();$('checking').hidden=true;$('main').hidden=false}catch(e){$('checking').hidden=true;$('denied').hidden=false;$('denied-detail').textContent=e.message||'Operator access required.'}})()
})();
