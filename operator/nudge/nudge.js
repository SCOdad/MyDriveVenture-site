(()=>{
  const cfg=window.DV_APP_CONFIG||{},endpoint=String(window.DV_LIFECYCLE_NUDGE_ENDPOINT||'');
  if(!endpoint||!document.getElementById('nudge-dashboard'))return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label=s=>String(s||'').replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
  const SEQUENCE_CLASSES=[
    {key:'CRITICAL_ACTIVATION',min:1,max:99,title:'Required / activation',range:'000–099'},
    {key:'JOURNEY_PROGRESS',min:100,max:299,title:'Journey progress / licensing',range:'100–299'},
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
    if(reason==='HIGHER_PRIORITY_CERTIFICATION_PENDING')return 'Certification takes precedence';
    return label(reason);
  }
  let client,otpClient,token='',payload=null,activeEditor=null,otpCooldownTimer=null,draggedCard=null;

  async function auth(){if(!client)client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const {data}=await client.auth.getSession();token=data.session?.access_token||'';return token}
  async function api(body,retried=false){await auth();if(!token)throw Object.assign(new Error('Sign in with an Operator account to continue.'),{status:401});const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`,apikey:cfg.publishableKey},body:JSON.stringify(body)});if(r.status===401&&!retried){const {data,error}=await client.auth.refreshSession();if(error||!data.session)throw Object.assign(new Error('Operator session expired. Sign in again.'),{status:401});token=data.session.access_token;return api(body,true)}const out=await r.json().catch(()=>({}));if(!r.ok||!out.ok)throw Object.assign(new Error(out.error||`Nudge request failed (${r.status})`),{status:r.status,validation:out.validation});return out}

  function recipientList(rows,kind){if(!rows?.length)return '<p class="meta">None.</p>';return '<ul>'+rows.map(row=>`<li><strong>${esc(row.recipient_name)}</strong>${row.driver_name?` · ${esc(row.driver_name)}`:''}<small>${esc(row.recipient_email||'')}</small>${row.suppression_reason?`<small>${esc(suppressionText(row))}</small>`:''}${row.preview_error?`<small class="dashboard-error">${esc(row.preview_error)}</small>`:''}${row.message_preview?`<details class="recipient-preview"><summary>Resolved email</summary><pre>Subject: ${esc(row.message_preview.subject)}\n\n${esc(row.message_preview.heading)}\n\n${esc(row.message_preview.body)}\n\nCTA: ${esc(row.message_preview.cta_label)}</pre></details>`:''}</li>`).join('')+'</ul>'}

  function templateEditor(group){
    const t=group.template_version||{},meta=group.template||{},tokens=meta.allowed_tokens||[],key=meta.template_key||group.rule.template_key;
    return `<div class="template-editor" data-template="${esc(key)}"><div class="template-row"><label>Subject<input class="template-field" data-field="subject_template" value="${esc(t.subject_template||'')}"></label><label>Heading<input class="template-field" data-field="heading_template" value="${esc(t.heading_template||'')}"></label></div><label>Message body<textarea class="template-field" data-field="body_template">${esc(t.body_template||'')}</textarea></label><label>CTA / button label<input class="template-field" data-field="cta_label_template" value="${esc(t.cta_label_template||'')}"></label><div><strong>Available tokens</strong><div class="token-list">${tokens.map(token=>`<button type="button" class="token-chip" data-template="${esc(key)}" data-token="${esc(token)}">[[${esc(token)}]]</button>`).join('')||'<span class="meta">No tokens for this message.</span>'}</div></div><div class="template-actions"><button type="button" class="button button-primary template-save" data-template="${esc(key)}">Save new message version</button><span class="template-version">Current: v${esc(t.version_number||'?')}</span><span class="save-status" data-status="${esc(key)}" role="status"></span></div></div>`;
  }

  function groupCard(group){
    const r=group.rule,selected=group.selected||[],superRows=group.eligible_superseded||[],suppressed=group.suppressed||[],cls=sequenceClass(r.priority);
    return `<details class="nudge-card" data-rule="${esc(r.rule_key)}" data-sequence-class="${esc(cls?.key||'UNCLASSIFIED')}" ${selected.length?'open':''}><summary><span class="nudge-reorder-controls"><button type="button" class="nudge-drag-handle" draggable="true" aria-label="Drag to reorder ${esc(r.display_name)}" title="Drag to reorder">↕</button><button type="button" class="nudge-move" data-dir="-1" aria-label="Move earlier">↑</button><button type="button" class="nudge-move" data-dir="1" aria-label="Move later">↓</button></span><span class="nudge-sequence-badge" title="Sequence">${esc(r.priority)}</span><span class="nudge-card-title"><strong>${esc(r.display_name)}</strong><small>${esc(r.description||'')}${group.managed_externally?' · Delivery handled by certification workflow':''}</small></span><span class="nudge-counts"><span class="nudge-count selected">${selected.length} selected</span><span class="nudge-count superseded">${superRows.length} superseded</span><span class="nudge-count suppressed">${suppressed.length} suppressed</span></span></summary><div class="nudge-card-body"><div class="nudge-config"><label>Sequence<span class="sequence-value">${esc(r.priority)}</span></label><label>Enabled<span><input class="rule-enabled" type="checkbox" ${r.enabled?'checked':''}> Enabled</span></label><button type="button" class="range-button rule-save" data-rule="${esc(r.rule_key)}">Save rule</button></div><p class="meta">Trigger: ${esc(label(r.trigger_primitive))} · Post-send: ${esc(label(r.post_send_behavior))}${r.once_only?' · Once only':''}</p>${templateEditor(group)}<div class="recipient-columns"><div class="recipient-box"><h4>Selected (${selected.length})</h4>${recipientList(selected,'selected')}</div><div class="recipient-box"><h4>Eligible but superseded (${superRows.length})</h4>${recipientList(superRows,'superseded')}</div><div class="recipient-box"><h4>Suppressed (${suppressed.length})</h4>${recipientList(suppressed,'suppressed')}</div></div></div></details>`;
  }

  function sequenceSections(groups){
    const known=new Set();
    const sections=SEQUENCE_CLASSES.map(cls=>{
      const rows=groups.filter(g=>Number(g.rule.priority)>=cls.min&&Number(g.rule.priority)<=cls.max).sort((a,b)=>a.rule.priority-b.rule.priority);
      rows.forEach(g=>known.add(g.rule.rule_key));
      if(!rows.length)return '';
      return `<section class="nudge-sequence-section" data-sequence-class="${esc(cls.key)}"><div class="sequence-section-head"><div><h3>${esc(cls.title)}</h3><p class="meta">Sequence ${esc(cls.range)} · drag within this class to reorder</p></div><span class="sequence-save-status" role="status"></span></div><div class="nudge-sort-list" data-sequence-class="${esc(cls.key)}">${rows.map(groupCard).join('')}</div></section>`;
    }).join('');
    const extra=groups.filter(g=>!known.has(g.rule.rule_key));
    return sections+(extra.length?`<section class="nudge-sequence-section"><h3>Unclassified</h3>${extra.map(groupCard).join('')}</section>`:'');
  }

  function render(){
    const groups=payload?.groups||[],selected=groups.reduce((n,g)=>n+(g.selected?.length||0),0),superseded=groups.reduce((n,g)=>n+(g.eligible_superseded?.length||0),0),suppressed=groups.reduce((n,g)=>n+(g.suppressed?.length||0),0);
    document.getElementById('nudge-summary').innerHTML=`<span><strong>${selected}</strong> selected</span><span><strong>${superseded}</strong> eligible but superseded</span><span><strong>${suppressed}</strong> suppressed</span><span><strong>${groups.filter(g=>g.rule.enabled).length}</strong> enabled messages</span>`;
    document.getElementById('nudge-groups').innerHTML=sequenceSections(groups)||'<p>No nudge rules configured.</p>';
    document.getElementById('nudge-history').innerHTML=(payload?.recent_dispatches||[]).map(row=>`<tr><td>${esc(row.sent_at||row.created_at||'—')}</td><td>${esc(row.recipient_email_normalized||row.intended_recipient||'—')}</td><td>${esc(label(row.communication_type||row.rule_key))}</td><td>${esc(label(row.status))}${row.suppression_reason?`<small>${esc(label(row.suppression_reason))}</small>`:''}</td><td>${esc(row.template_version||'—')}</td></tr>`).join('')||'<tr><td colspan="5">No communication history yet.</td></tr>';
    document.querySelectorAll('.rule-save').forEach(b=>b.addEventListener('click',saveRule));
    document.querySelectorAll('.template-save').forEach(b=>b.addEventListener('click',saveTemplate));
    document.querySelectorAll('.template-field').forEach(el=>el.addEventListener('focus',()=>{activeEditor=el}));
    document.querySelectorAll('.token-chip').forEach(b=>b.addEventListener('click',insertToken));
    document.querySelectorAll('.nudge-drag-handle').forEach(h=>h.addEventListener('dragstart',startDrag));
    document.querySelectorAll('.nudge-sort-list').forEach(list=>{list.addEventListener('dragover',dragOver);list.addEventListener('drop',dropOrder)});
    document.querySelectorAll('.nudge-move').forEach(b=>b.addEventListener('click',moveRule));
  }

  async function load(){const err=document.getElementById('nudge-error');err.hidden=true;try{payload=await api({action:'preview'});render();document.getElementById('nudge-dashboard').hidden=false;document.getElementById('nudge-access-status').textContent='';document.getElementById('nudge-signin').hidden=true}catch(e){document.getElementById('nudge-access-status').textContent=e.message;if(e.status===401||e.status===403){document.getElementById('nudge-dashboard').hidden=true;document.getElementById('nudge-signin').hidden=false}else{err.textContent=e.message;err.hidden=false}}}

  async function saveRule(ev){const card=ev.currentTarget.closest('.nudge-card'),rule=ev.currentTarget.dataset.rule,enabled=card.querySelector('.rule-enabled').checked;ev.currentTarget.disabled=true;try{await api({action:'update_rule',rule_key:rule,enabled});await load()}catch(e){alert(e.message)}finally{ev.currentTarget.disabled=false}}

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
    const sequenceClassKey=list.dataset.sequenceClass,ordered=[...list.querySelectorAll(':scope > .nudge-card')].map(card=>card.dataset.rule);
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
    const cards=[...list.querySelectorAll(':scope > .nudge-card')],index=cards.indexOf(card),swap=cards[index+dir];
    if(!swap)return;
    if(dir<0)list.insertBefore(card,swap);else list.insertBefore(swap,card);
    await persistOrder(list);
  }

  async function saveTemplate(ev){const editor=ev.currentTarget.closest('.template-editor'),key=ev.currentTarget.dataset.template,status=editor.querySelector(`[data-status="${CSS.escape(key)}"]`),fields={};editor.querySelectorAll('.template-field').forEach(el=>fields[el.dataset.field]=el.value);status.textContent='Validating and saving…';ev.currentTarget.disabled=true;try{const out=await api({action:'save_template',template_key:key,...fields});status.textContent='Saved as v'+out.version.version_number+'.';await load()}catch(e){status.textContent=e.message}finally{ev.currentTarget.disabled=false}}

  function insertToken(ev){const key=ev.currentTarget.dataset.template,token='[['+ev.currentTarget.dataset.token+']]',editor=ev.currentTarget.closest('.template-editor'),target=activeEditor&&activeEditor.closest('.template-editor')===editor?activeEditor:editor.querySelector('[data-field="body_template"]');const start=target.selectionStart??target.value.length,end=target.selectionEnd??start;target.value=target.value.slice(0,start)+token+target.value.slice(end);target.focus();target.selectionStart=target.selectionEnd=start+token.length;activeEditor=target}

  document.getElementById('nudge-refresh').addEventListener('click',load);
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