(()=>{
  const cfg=window.DV_APP_CONFIG||{},endpoint=String(window.DV_LIFECYCLE_NUDGE_ENDPOINT||'');
  if(!endpoint||!document.getElementById('nudge-dashboard'))return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label=s=>String(s||'').replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
  const SEQUENCE_CLASSES=[
    {key:'CRITICAL_ACTIVATION',min:1,max:99,title:'Required / activation',range:'000–099'},
    {key:'JOURNEY_PROGRESS',min:100,max:299,title:'Journey progress / licensing',range:'100–299'},
    {key:'COACHING',min:300,max:699,title:'Coaching / progress gaps',range:'300–699'},
    {key:'FEATURE_ADOPTION',min:700,max:799,title:'Feature adoption / enrichment',range:'700–799'},
    {key:'COMMUNITY_PRODUCT',min:800,max:899,title:'Community / product asks',range:'800–899'},
    {key:'REENGAGEMENT',min:900,max:999,title:'Re-engagement',range:'900–999'}
  ];
  const sequenceClass=priority=>SEQUENCE_CLASSES.find(x=>Number(priority)>=x.min&&Number(priority)<=x.max)||null;
  function suppressionText(row){
    const reason=String(row?.suppression_reason||'');
    if(reason==='ANOTHER_MESSAGE_SELECTED'||reason==='LOWER_PRIORITY_SAME_RECIPIENT'){
      const winner=row?.selected_rule_key?label(row.selected_rule_key):'another message';
      return row?.selected_sequence?'Another message selected: '+row.selected_sequence+' · '+winner:'Another message selected for this recipient: '+winner;
    }
    if(reason.startsWith('SUPERSEDED_BY_HIGHER_MILESTONE:'))return 'More advanced milestone selected: '+label(reason.split(':')[1]||'');
    if(reason==='ACTIVATION_NOT_YET_DUE')return 'Not yet eligible — begins '+row.eligible_from+' ('+row.schedule_timezone+')';
    if(reason==='WAITING_FOR_THURSDAY')return 'Waiting for Thursday — next eligible date '+row.next_eligible_date+' ('+row.schedule_timezone+')';
    if(reason==='PENDING_ACTIVATION')return 'Waiting for activation: add the first driver or log the first actual drive. Imported practice credit does not complete activation.';
    if(reason==='HIGHER_PRIORITY_CERTIFICATION_PENDING')return 'Certification takes precedence';
    if(reason==='WEEKLY_COMMUNICATION_CAP_USED'){
      const workflow=row?.blocking_workflow==='DRIVE_CERTIFICATION'?'Weekly Certification':label(row?.blocking_communication_type||row?.blocking_workflow||'another automated communication');
      const when=row?.blocking_at?' on '+String(row.blocking_at):'';
      return 'Weekly communication slot already used — '+workflow+when;
    }
    return label(reason);
  }
  let client,otpClient,token='',payload=null,activeEditor=null,otpCooldownTimer=null,draggedCard=null;

  async function auth(){if(!client)client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const {data}=await client.auth.getSession();token=data.session?.access_token||'';return token}
  async function api(body,retried=false){await auth();if(!token)throw Object.assign(new Error('Sign in with an Operator account to continue.'),{status:401});const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`,apikey:cfg.publishableKey},body:JSON.stringify(body)});if(r.status===401&&!retried){const {data,error}=await client.auth.refreshSession();if(error||!data.session)throw Object.assign(new Error('Operator session expired. Sign in again.'),{status:401});token=data.session.access_token;return api(body,true)}const out=await r.json().catch(()=>({}));if(!r.ok||!out.ok)throw Object.assign(new Error(out.error||`Nudge request failed (${r.status})`),{status:r.status,validation:out.validation});return out}

  function resolvedEmail(row){
    const preview=row?.message_preview;if(!preview)return '';
    const html=preview.html?'<iframe class="resolved-email-frame" sandbox="" title="Resolved email preview" srcdoc="'+esc(preview.html)+'"></iframe>':'<pre>'+esc(preview.text||'')+'</pre>';
    return '<details class="recipient-preview"><summary>Resolved email</summary><div class="resolved-email-shell"><div class="resolved-email-subject"><strong>Subject</strong><span>'+esc(preview.subject||'')+'</span></div>'+html+'<details class="resolved-email-text"><summary>Plain-text version</summary><pre>'+esc(preview.text||'')+'</pre></details></div></details>';
  }
  function recipientList(rows,kind){if(!rows?.length)return '<p class="meta">None.</p>';return '<ul>'+rows.map(row=>`<li><strong>${esc(row.recipient_name)}</strong> <small>${esc(row.recipient_kind==="DRIVER"?"DRIVER":"GROWN-UP")}</small>${row.driver_name?` · ${esc(row.driver_name)}`:''}<small>${esc(row.recipient_email||'')}</small>${row.eligible_from?`<small>Eligible beginning ${esc(row.eligible_from)} · ${esc(row.schedule_label)} · ${esc(row.schedule_timezone)}</small>`:''}${row.communication?.timezone_source==='DEFAULT_AMERICA_DETROIT'?'<small>Timezone not recorded; using America/Detroit.</small>':''}${row.preview_trigger_condition&&kind==='upcoming'?`<small>Trigger: ${esc(row.preview_trigger_condition)}</small>`:''}${row.suppression_reason&&row.suppression_reason!=='TRIGGER_NOT_MET'?`<small>${esc(suppressionText(row))}</small>`:''}${row.audience_policy?`<small>Audience: ${esc(label(row.audience_policy.grownup_audience))}${row.audience_policy.include_driver?' + Driver':''}</small>`:''}${row.preview_error?`<small class="dashboard-error">${esc(row.preview_error)}</small>`:''}${resolvedEmail(row)}</li>`).join('')+'</ul>'}

  function templateEditor(group,audience='GROWN_UP'){
    const driver=audience==='DRIVER';
    const t=(driver?group.driver_template_version:group.template_version)||{},meta=(driver?group.driver_template:group.template)||{},tokens=meta.allowed_tokens||[],key=meta.template_key||(driver?'':group.rule.template_key);
    if(!key)return '<p class="meta">Driver message not configured. Driver delivery stays suppressed.</p>';
    return `<section class="template-editor nudge-settings-panel" data-audience="${audience}" data-rule="${esc(group.rule.rule_key)}" data-template="${esc(key)}"><h4>${driver?'Driver Message':'Grown-up Message'}</h4>${driver&&!t.id?'<p class="meta">Save a driver-specific message before enabling delivery.</p>':''}<div class="template-row"><label>Subject<input class="template-field" data-field="subject_template" value="${esc(t.subject_template||'')}"></label><label>Heading<input class="template-field" data-field="heading_template" value="${esc(t.heading_template||'')}"></label></div><label>Message body<textarea class="template-field" data-field="body_template">${esc(t.body_template||'')}</textarea></label><label>CTA / button label<input class="template-field" data-field="cta_label_template" value="${esc(t.cta_label_template||'')}"></label><div><strong>Available tokens</strong><div class="token-list">${tokens.map(token=>`<button type="button" class="token-chip" data-template="${esc(key)}" data-token="${esc(token)}">[[${esc(token)}]]</button>`).join('')||'<span class="meta">No tokens for this message.</span>'}</div></div><div class="template-actions"><button type="button" class="button button-primary template-save" data-template="${esc(key)}">Save ${driver?'Driver':'Grown-up'} Message</button><span class="template-version">Current: ${t.id?'v'+esc(t.version_number):'Not configured'}</span><span class="save-status" data-status="${esc(key)}" role="status"></span><span class="unsaved-indicator" hidden>Unsaved changes</span></div></section>`;
  }

  function groupCard(group){
    const r=group.rule,selected=group.ready||group.selected||[],upcoming=group.upcoming||[],suppressed=group.blocked||group.suppressed||[],cls=sequenceClass(r.priority),managed=Boolean(group.managed_externally);
    const controls=managed?'<span class="system-lock" title="System communication rule is fixed">🔒</span>':`<span class="nudge-reorder-controls"><button type="button" class="nudge-drag-handle" draggable="true" aria-label="Drag to reorder ${esc(r.display_name)}" title="Drag to reorder">↕</button><button type="button" class="nudge-move" data-dir="-1" aria-label="Move earlier">↑</button><button type="button" class="nudge-move" data-dir="1" aria-label="Move later">↓</button></span>`;
    const ruleControls=managed?`<div class="system-managed-rule"><strong>System communication</strong><span>Fixed at Sequence ${esc(r.priority)} · ${esc(group.schedule_label||'System-managed schedule')}</span><small>Rule, trigger, sequence, and enabled state are read-only. Message template remains editable.</small></div>`:`<section class="nudge-delivery nudge-settings-panel"><h4>Delivery Configuration</h4><div class="nudge-config"><label>Sequence<span class="sequence-value">${esc(r.priority)}</span></label><label>Enabled<span><input class="rule-enabled" type="checkbox" ${r.enabled?'checked':''}> Enabled</span></label><label>Grown-up audience<select class="rule-grownup-audience">${[['NONE','None'],['INDIVIDUAL','Individual'],['PRIMARY_GUARDIAN','Primary Guardian'],['ALL_GROWNUPS','All Grown-ups'],['ONE_PER_FAMILY','One per Family']].map(([v,n])=>`<option value="${v}" ${String(r.trigger_config?.grownup_audience||(r.scope==='FAMILY'?'ONE_PER_FAMILY':'PRIMARY_GUARDIAN'))===v?'selected':''}>${n}</option>`).join('')}</select></label><label>Driver audience<span><input class="rule-include-driver" type="checkbox" ${r.trigger_config?.include_driver===true?'checked':''}> Include driver</span></label>${r.trigger_primitive==='PRACTICE_PROGRESS_PERCENT'?`<label>Milestone timing<select class="rule-delivery-timing"><option value="WEEKLY" ${r.trigger_config?.delivery_timing==='IMMEDIATE'?'':'selected'}>Weekly</option><option value="IMMEDIATE" ${r.trigger_config?.delivery_timing==='IMMEDIATE'?'selected':''}>Hourly / immediate</option></select></label>`:''}<button type="button" class="range-button rule-save" data-rule="${esc(r.rule_key)}">Save Delivery Settings</button></div><span class="delivery-save-status save-status" role="status"></span><span class="unsaved-indicator" hidden>Unsaved changes</span></section>`;
    return `<details class="nudge-card${managed?' system-managed':''}" data-rule="${esc(r.rule_key)}" data-sequence-class="${esc(cls?.key||'UNCLASSIFIED')}" data-system-managed="${managed?'true':'false'}" ${selected.length?'open':''}><summary>${controls}<span class="nudge-sequence-badge" title="Sequence">${esc(r.priority)}</span><span class="nudge-card-title"><strong>${esc(r.display_name)}</strong><small>${esc(r.description||'')}${managed?' · System communication':''} · ${esc(group.schedule_label||'Thursday · 3 PM local')}</small></span><span class="nudge-counts"><span class="nudge-count selected">${selected.length} selected</span><span class="nudge-count upcoming">${upcoming.length} upcoming</span><span class="nudge-count suppressed">${suppressed.length} suppressed</span></span></summary><div class="nudge-card-body"><div class="nudge-record-flow" aria-label="${esc(r.display_name)} record sections">${ruleControls}<p class="meta">Recipient audience settings must be validated against consent and eligibility before live delivery.</p><p class="meta">Trigger: ${esc(label(r.trigger_primitive))} · Post-send: ${esc(label(r.post_send_behavior))}${r.once_only?' · Once only':''}</p>${templateEditor(group,"GROWN_UP")}${r.scope==="DRIVER"?templateEditor(group,"DRIVER"):""}<section class="nudge-recipient-panel nudge-settings-panel"><h4>Recipient Preview</h4><div class="recipient-columns"><div class="recipient-box"><h4>Ready / Selected (${selected.length})</h4>${recipientList(selected,'ready')}</div><div class="recipient-box"><h4>Upcoming (${upcoming.length})</h4>${recipientList(upcoming,'upcoming')}</div><div class="recipient-box"><h4>Blocked / Suppressed (${suppressed.length})</h4>${recipientList(suppressed,'blocked')}</div></div></section></div></div></details>`;
  }

  function sequenceSections(groups){
    const known=new Set();
    const sections=SEQUENCE_CLASSES.map(cls=>{
      const rows=groups.filter(g=>Number(g.rule.priority)>=cls.min&&Number(g.rule.priority)<=cls.max).sort((a,b)=>a.rule.priority-b.rule.priority);
      rows.forEach(g=>known.add(g.rule.rule_key));
      if(!rows.length)return '';
      const hasManaged=rows.some(g=>g.managed_externally);
      return `<section class="nudge-sequence-section" data-sequence-class="${esc(cls.key)}"><div class="sequence-section-head"><div><h3>${esc(cls.title)}</h3><p class="meta">Sequence ${esc(cls.range)} · ${hasManaged?'system communications are fixed; drag lifecycle rules to reorder':'drag within this class to reorder'}</p></div><span class="sequence-save-status" role="status"></span></div><div class="nudge-sort-list" data-sequence-class="${esc(cls.key)}">${rows.map(groupCard).join('')}</div></section>`;
    }).join('');
    const extra=groups.filter(g=>!known.has(g.rule.rule_key));
    return sections+(extra.length?`<section class="nudge-sequence-section"><h3>Unclassified</h3>${extra.map(groupCard).join('')}</section>`:'');
  }

  function render(){
    const runtime=payload?.runtime_setting||{},runtimeEnabled=runtime.enabled===true,badge=document.getElementById('nudge-runtime-badge'),toggle=document.getElementById('nudge-runtime-enabled');
    if(toggle)toggle.checked=runtimeEnabled;
    if(badge){badge.textContent=runtimeEnabled?'ACTIVE':'PAUSED';badge.classList.toggle('active',runtimeEnabled);badge.classList.toggle('paused',!runtimeEnabled)}
    const updated=document.getElementById('nudge-runtime-updated');if(updated)updated.textContent=runtime.updated_at?'Last changed '+runtime.updated_at:'No delivery-state history yet.';
    const groups=payload?.groups||[],selected=groups.reduce((n,g)=>n+(g.ready?.length||0),0),upcoming=groups.reduce((n,g)=>n+(g.upcoming?.length||0),0),suppressed=groups.reduce((n,g)=>n+(g.blocked?.length||0),0);
    document.getElementById('nudge-summary').innerHTML=`<span><strong>${selected}</strong> selected</span><span><strong>${upcoming}</strong> upcoming</span><span><strong>${suppressed}</strong> suppressed</span><span><strong>${groups.filter(g=>g.rule.enabled).length}</strong> enabled messages</span>`;
    document.getElementById('nudge-groups').innerHTML=sequenceSections(groups)||'<p>No nudge rules configured.</p>';
    document.getElementById('nudge-history').innerHTML=(payload?.recent_dispatches||[]).map(row=>`<tr><td>${esc(row.sent_at||row.created_at||'—')}</td><td>${esc(row.recipient_email_normalized||row.intended_recipient||'—')}</td><td>${esc(label(row.communication_type||row.rule_key))}</td><td>${esc(label(row.status))}${row.eligible_from?`<small>Eligible beginning ${esc(row.eligible_from)} · ${esc(row.schedule_label)} · ${esc(row.schedule_timezone)}</small>`:''}${row.communication?.timezone_source==='DEFAULT_AMERICA_DETROIT'?'<small>Timezone not recorded; using America/Detroit.</small>':''}${row.suppression_reason?`<small>${esc(label(row.suppression_reason))}</small>`:''}</td><td>${esc(row.template_version||'—')}</td></tr>`).join('')||'<tr><td colspan="5">No communication history yet.</td></tr>';
    document.querySelectorAll('.rule-save').forEach(b=>b.addEventListener('click',saveRule));
    document.querySelectorAll('.template-save').forEach(b=>b.addEventListener('click',saveTemplate));
    document.querySelectorAll('.template-field').forEach(el=>el.addEventListener('focus',()=>{activeEditor=el}));
    document.querySelectorAll('.token-chip').forEach(b=>b.addEventListener('click',insertToken));
    document.querySelectorAll('.nudge-drag-handle').forEach(h=>h.addEventListener('dragstart',startDrag));
    document.querySelectorAll('.nudge-sort-list').forEach(list=>{list.addEventListener('dragover',dragOver);list.addEventListener('drop',dropOrder)});
    document.querySelectorAll('.nudge-move').forEach(b=>b.addEventListener('click',moveRule));
  }

  // Reloads update server-truth while preserving every *other* unsaved editor.
  function snapshotEditors(exclude){
    const open=[...document.querySelectorAll('.nudge-card[open]')].map(c=>c.dataset.rule);
    const panels=[...document.querySelectorAll('.nudge-settings-panel')].filter(p=>p!==exclude).map(p=>({
      rule:p.closest('.nudge-card')?.dataset.rule,
      audience:p.dataset.audience||'DELIVERY',
      values:[...p.querySelectorAll('input,textarea,select')].map(el=>({field:el.dataset.field||el.className,value:el.value,checked:el.checked})),
      dirty:!p.querySelector('.unsaved-indicator')?.hidden
    }));
    return {open,panels};
  }
  function restoreEditors(snapshot){
    if(!snapshot)return;
    for(const key of snapshot.open)document.querySelectorAll('.nudge-card').forEach(c=>{if(c.dataset.rule===key)c.open=true});
    for(const saved of snapshot.panels){
      const card=[...document.querySelectorAll('.nudge-card')].find(c=>c.dataset.rule===saved.rule);
      const panel=[...card?.querySelectorAll('.nudge-settings-panel')||[]].find(p=>(p.dataset.audience||'DELIVERY')===saved.audience);
      if(!panel||!saved.dirty)continue;
      const els=[...panel.querySelectorAll('input,textarea,select')];
      saved.values.forEach((v,i)=>{if(!els[i]||((els[i].dataset.field||els[i].className)!==v.field))return;els[i].value=v.value;if(els[i].type==='checkbox')els[i].checked=v.checked});
      panel.querySelector('.unsaved-indicator').hidden=false;
    }
  }
  function savedConfirmation(rule,audience,message){
    const card=[...document.querySelectorAll('.nudge-card')].find(c=>c.dataset.rule===rule);
    const panel=[...card?.querySelectorAll('.nudge-settings-panel')||[]].find(p=>(p.dataset.audience||'DELIVERY')===audience);
    const status=panel?.querySelector('.save-status');
    if(status)status.textContent=message;
  }
  document.getElementById('nudge-groups').addEventListener('input',ev=>{
    const panel=ev.target.closest('.nudge-settings-panel');
    if(panel)panel.querySelector('.unsaved-indicator').hidden=false;
  });
  document.getElementById('nudge-groups').addEventListener('change',ev=>{
    const panel=ev.target.closest('.nudge-settings-panel');
    if(panel)panel.querySelector('.unsaved-indicator').hidden=false;
  });
  async function load(options={}){const snapshot=snapshotEditors(options.savedPanel);const err=document.getElementById('nudge-error');err.hidden=true;try{payload=await api({action:'preview'});render();restoreEditors(snapshot);if(options.savedRule)savedConfirmation(options.savedRule,options.savedAudience,options.savedMessage);document.getElementById('nudge-dashboard').hidden=false;document.getElementById('nudge-access-status').textContent='';document.getElementById('nudge-signin').hidden=true}catch(e){document.getElementById('nudge-access-status').textContent=e.message;if(e.status===401||e.status===403){document.getElementById('nudge-dashboard').hidden=true;document.getElementById('nudge-signin').hidden=false}else{err.textContent=e.message;err.hidden=false}}}

  async function saveRule(ev){const card=ev.currentTarget.closest('.nudge-card'),rule=ev.currentTarget.dataset.rule,enabled=card.querySelector('.rule-enabled').checked,grownup_audience=card.querySelector('.rule-grownup-audience').value,include_driver=card.querySelector('.rule-include-driver').checked,delivery_timing=card.querySelector('.rule-delivery-timing')?.value;if(grownup_audience==='NONE'&&!include_driver){alert('Choose at least one audience: a grown-up or the driver.');return;}ev.currentTarget.disabled=true;try{await api({action:'update_rule',rule_key:rule,enabled,grownup_audience,include_driver,...(delivery_timing?{delivery_timing}:{})});await load({savedPanel:card.querySelector('.nudge-delivery'),savedRule:rule,savedAudience:'DELIVERY',savedMessage:'Delivery settings saved.'})}catch(e){alert(e.message)}finally{ev.currentTarget.disabled=false}}
  async function saveRuntime(){
    const toggle=document.getElementById('nudge-runtime-enabled'),button=document.getElementById('nudge-runtime-save'),status=document.getElementById('nudge-runtime-status'),enabled=Boolean(toggle?.checked);
    if(enabled&&!confirm('Enable live lifecycle nudge delivery? Once active, authorized server delivery requests will be allowed.')){toggle.checked=false;return}
    button.disabled=true;if(status)status.textContent=enabled?'Enabling live lifecycle delivery…':'Pausing live lifecycle delivery…';
    try{await api({action:'set_runtime_enabled',enabled});if(status)status.textContent=enabled?'Lifecycle delivery is active.':'Lifecycle delivery is paused.';await load()}
    catch(e){if(status)status.textContent=e.message;await load()}
    finally{button.disabled=false}
  }

  function startDrag(ev){draggedCard=ev.currentTarget.closest('.nudge-card');if(!draggedCard)return;draggedCard.classList.add('dragging');ev.dataTransfer.effectAllowed='move';ev.dataTransfer.setData('text/plain',draggedCard.dataset.rule||'')}
  function dragOver(ev){
    if(!draggedCard)return;
    const list=ev.currentTarget;
    if(list.dataset.sequenceClass!==draggedCard.dataset.sequenceClass)return;
    ev.preventDefault();
    const target=ev.target.closest('.nudge-card');
    if(!target||target===draggedCard)return;
    const box=target.getBoundingClientRect();
    list.insertBefore(draggedCard,ev.clientY<box.top+box.height/2?target:target.nextSibling);
  }
  async function persistOrder(list){
    const sequenceClassKey=list.dataset.sequenceClass,ordered=[...list.querySelectorAll(':scope > .nudge-card:not([data-system-managed="true"])')].map(card=>card.dataset.rule);
    const status=list.closest('.nudge-sequence-section')?.querySelector('.sequence-save-status');
    if(status)status.textContent='Saving order…';
    try{await api({action:'reorder_rules',sequence_class:sequenceClassKey,ordered_rule_keys:ordered});if(status)status.textContent='Order saved.';await load()}
    catch(e){if(status)status.textContent=e.message;await load()}
  }
  async function dropOrder(ev){if(!draggedCard)return;const list=ev.currentTarget;if(list.dataset.sequenceClass!==draggedCard.dataset.sequenceClass)return;ev.preventDefault();draggedCard.classList.remove('dragging');draggedCard=null;await persistOrder(list)}
  async function moveRule(ev){
    ev.preventDefault();ev.stopPropagation();
    const card=ev.currentTarget.closest('.nudge-card'),list=card?.parentElement,dir=Number(ev.currentTarget.dataset.dir||0);
    if(!card||!list||!dir)return;
    if(card.dataset.systemManaged==='true')return;
    const cards=[...list.querySelectorAll(':scope > .nudge-card:not([data-system-managed="true"])')],index=cards.indexOf(card),swap=cards[index+dir];
    if(!swap)return;
    if(dir<0)list.insertBefore(card,swap);else list.insertBefore(swap,card);
    await persistOrder(list);
  }

  async function saveTemplate(ev){const editor=ev.currentTarget.closest('.template-editor'),key=ev.currentTarget.dataset.template,status=editor.querySelector(`[data-status="${CSS.escape(key)}"]`),fields={};editor.querySelectorAll('.template-field').forEach(el=>fields[el.dataset.field]=el.value);status.textContent='Validating and saving…';ev.currentTarget.disabled=true;try{const out=await api({action:'save_template',template_key:key,rule_key:editor.dataset.rule,audience:editor.dataset.audience,...fields});status.textContent='Saved as v'+out.version.version_number+'.';await load({savedPanel:editor,savedRule:editor.dataset.rule,savedAudience:editor.dataset.audience,savedMessage:'Saved as v'+out.version.version_number+'.'})}catch(e){status.textContent=e.message}finally{ev.currentTarget.disabled=false}}

  function insertToken(ev){const key=ev.currentTarget.dataset.template,token='[['+ev.currentTarget.dataset.token+']]',editor=ev.currentTarget.closest('.template-editor'),target=activeEditor&&activeEditor.closest('.template-editor')===editor?activeEditor:editor.querySelector('[data-field="body_template"]');const start=target.selectionStart??target.value.length,end=target.selectionEnd??start;target.value=target.value.slice(0,start)+token+target.value.slice(end);target.focus();target.selectionStart=target.selectionEnd=start+token.length;activeEditor=target;target.dispatchEvent(new Event('input',{bubbles:true}))}

  document.getElementById('nudge-refresh').addEventListener('click',load);
  document.getElementById('nudge-runtime-save')?.addEventListener('click',saveRuntime);
  function startOtpCooldown(button,status,seconds=60,message=''){
    if(otpCooldownTimer)clearInterval(otpCooldownTimer);
    let remaining=Math.max(1,Math.ceil(seconds));
    const render=()=>{button.disabled=true;if(status)status.textContent=(message?message+' ':'')+'Please wait '+remaining+'s before requesting another link.'};
    render();
    otpCooldownTimer=setInterval(()=>{remaining--;if(remaining<=0){clearInterval(otpCooldownTimer);otpCooldownTimer=null;button.disabled=false;if(status)status.textContent='You can request another sign-in link now.'}else render()},1000);
  }
  function retrySeconds(error){
    const text=String(error?.message||'');
    const match=text.match(/(?:after|wait)\s+(\d+)\s*(?:seconds?|s)/i);
    return match?Number(match[1]):(Number(error?.status)===429?60:null);
  }
  document.getElementById('nudge-signin')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const email=document.getElementById('nudge-signin-email')?.value.trim(),button=e.currentTarget.querySelector('button'),status=document.getElementById('nudge-signin-status');
    if(!email||button.disabled)return;
    button.disabled=true;if(status)status.textContent='Sending sign-in link… This can take a little while in DEV.';
    try{
      if(!otpClient)otpClient=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'dv-nudge-otp-request'}});
      const result=await otpClient.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+'/log/?return='+encodeURIComponent('/operator/nudge/'),shouldCreateUser:false}});
      if(result.error)throw result.error;
      if(status)status.textContent='Check your email for a secure sign-in link. After verification, Drive Venture will return you to Nudges.';
      startOtpCooldown(button,status,60,'The request was accepted.');
    }catch(error){
      const wait=retrySeconds(error);
      if(wait){startOtpCooldown(button,status,wait,'Supabase is rate-limiting magic-link requests.')}else{button.disabled=false;if(status)status.textContent=error?.message||'We could not send a sign-in link right now. Please try again.'}
    }
  });
  auth().then(()=>{client.auth.onAuthStateChange((_event,session)=>{if(!session){token='';payload=null;document.getElementById('nudge-dashboard').hidden=true;document.getElementById('nudge-signin').hidden=false;document.getElementById('nudge-access-status').textContent='Sign in with an Operator account to continue.'}});load()}).catch(e=>{document.getElementById('nudge-access-status').textContent=e.message});
})();