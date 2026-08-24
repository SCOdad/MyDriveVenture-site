(()=>{
  let linksByFeedback=new Map(),feedbackByCode=new Map(),authHeader='',scoresLoaded=false;
  const cache=new Map(),scoreByCode=new Map(),originalFetch=window.fetch.bind(window);

  window.fetch=async(...args)=>{
    const response=await originalFetch(...args);
    try{
      const request=args[1]||{},body=request.body?JSON.parse(request.body):null;
      if(request.headers){
        const h=request.headers instanceof Headers?request.headers.get('authorization'):request.headers.authorization||request.headers.Authorization;
        if(h)authHeader=h;
      }
      if(body?.action==='list'){
        const out=await response.clone().json();
        if(out?.ok&&Array.isArray(out.feedback)){
          feedbackByCode=new Map((out.feedback||[]).map(f=>[f.feedback_code,f]));
          linksByFeedback=new Map();
          for(const link of out.links||[]){
            if(!linksByFeedback.has(link.feedback_code))linksByFeedback.set(link.feedback_code,[]);
            linksByFeedback.get(link.feedback_code).push(link);
            if(link.backlog_code&&link.priority_score!=null)scoreByCode.set(link.backlog_code,link.priority_score);
          }
        }
      }
    }catch{}
    return response;
  };

  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function pendingClass(status){return String(status||'').toUpperCase()==='PENDING_TEST'?' pending-test':''}
  function scoreBadge(code,score){const value=score??scoreByCode.get(code),n=Number(value);return Number.isFinite(n)&&n>0?` <span class="backlog-score" title="Current priority score">${esc(n)}</span>`:''}
  function relationLine(label,items){if(!items?.length)return'';return `<div class="feedback-relations"><strong>${label}</strong>${items.map(x=>`<a class="backlog-reference${pendingClass(x.status)}" href="/operator/backlog/?bklg=${encodeURIComponent(x.backlog_code)}"><span>${esc(x.backlog_code)}</span>${scoreBadge(x.backlog_code,x.priority_score)} — ${esc(x.title||'Untitled')} — ${esc(x.status||'status unavailable')}</a>`).join('')}</div>`}

  async function detail(code){
    if(cache.has(code))return cache.get(code);
    const endpoint=String(window.DV_OPERATOR_BACKLOG_ENDPOINT||'').trim();
    if(!endpoint||!authHeader)return null;
    const r=await originalFetch(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:authHeader},body:JSON.stringify({action:'get',backlog_code:code})});
    const out=await r.json().catch(()=>null);
    if(r.ok&&out?.ok){cache.set(code,out);return out}
    return null;
  }

  async function loadScores(){
    if(scoresLoaded)return;
    scoresLoaded=true;
    const endpoint=String(window.DV_OPERATOR_BACKLOG_ENDPOINT||'').trim();
    if(!endpoint||!authHeader)return;
    try{
      const r=await originalFetch(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:authHeader},body:JSON.stringify({action:'list',limit:500})});
      const out=await r.json().catch(()=>null);
      if(r.ok&&out?.ok)for(const item of out.items||[])if(item.backlog_code&&item.priority_score!=null)scoreByCode.set(item.backlog_code,item.priority_score);
    }catch{scoresLoaded=false}
  }

  function lifecycleBand(f){
    if(!f?.read_at)return'unread';
    if(f.closed_at||String(f.status||'').toUpperCase()==='CLOSED')return'finished';
    return'in-progress';
  }

  function decorateInbox(){
    const container=document.getElementById('feedback-inbox');
    if(!container||container.querySelector('.feedback-groups')||!feedbackByCode.size)return;
    const buttons=[...container.querySelectorAll(':scope > .feedback-pick')];
    if(!buttons.length)return;

    const groups={unread:[],['in-progress']:[],finished:[]};
    for(const button of buttons){
      const f=feedbackByCode.get(button.dataset.code);
      groups[lifecycleBand(f)].push(button);
    }

    const root=document.createElement('div');
    root.className='feedback-groups';
    for(const [key,label,description] of [
      ['unread','Unread feedback','New submissions that have not been reviewed yet.'],
      ['in-progress','In Progress','Read feedback with triage, follow-up, product-signal observation, or linked work still active.'],
      ['finished','Finished','Feedback whose lifecycle is fully closed.']
    ]){
      const section=document.createElement('section');
      section.className=`feedback-group feedback-group-${key}`;
      section.innerHTML=`<div class="feedback-group-heading"><div><h3>${label}</h3><p>${description}</p></div><span aria-label="${groups[key].length} ${label.toLowerCase()} item${groups[key].length===1?'':'s'}">${groups[key].length}</span></div><div class="feedback-group-items"></div>`;
      const items=section.querySelector('.feedback-group-items');
      if(groups[key].length){
        for(const button of groups[key])items.appendChild(button);
      }else{
        items.innerHTML='<p class="feedback-group-empty">Nothing here right now.</p>';
      }
      root.appendChild(section);
    }
    container.appendChild(root);
  }

  async function decorate(){
    decorateInbox();
    const code=document.getElementById('selected-code')?.textContent?.trim();
    if(!code)return;
    const links=linksByFeedback.get(code)||[],container=document.getElementById('linked-backlog-list');
    if(!container||!links.length)return;
    await loadScores();
    for(const a of [...container.querySelectorAll('.backlog-link')]){
      const strong=a.querySelector('strong'),backlogCode=strong?.textContent?.trim(),link=links.find(x=>x.backlog_code===backlogCode);
      if(!link)continue;
      if(String(link.canonical_status||'').toUpperCase()==='PENDING_TEST')a.classList.add('pending-test');else a.classList.remove('pending-test');
      if(strong&&!a.querySelector(':scope > .backlog-score'))strong.insertAdjacentHTML('afterend',scoreBadge(backlogCode,link.priority_score));
      if(a.querySelector('.feedback-relations'))continue;
      let dependencies=link.dependencies,dependents=link.dependents;
      if(!dependencies&&!dependents){const out=await detail(backlogCode);dependencies=out?.dependencies||[];dependents=out?.dependents||[]}
      if(!a.isConnected||a.querySelector('.feedback-relations'))continue;
      a.insertAdjacentHTML('beforeend',relationLine('Depends on',dependencies)+relationLine('Depended on by',dependents));
    }
  }

  const style=document.createElement('style');
  style.textContent=`
    .feedback-group{margin:1rem 0 1.35rem;padding:.8rem;border:1px solid rgba(0,0,0,.14);border-left-width:5px;border-radius:.45rem;background:rgba(255,255,255,.025)}
    .feedback-group-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:.45rem}
    .feedback-group-heading h3{margin:0}
    .feedback-group-heading p{margin:.2rem 0 0;font-size:.86rem;opacity:.78;max-width:58ch}
    .feedback-group-heading span,.backlog-score{display:inline-flex;align-items:center;justify-content:center;min-width:1.8rem;padding:.12rem .45rem;border-radius:999px;background:#315f8f;color:#fff;font-size:.78rem;font-weight:800;line-height:1.3}
    .feedback-group-unread{border-left-color:#c94c4c}
    .feedback-group-unread>.feedback-group-heading span{background:#8d2f2f}
    .feedback-group-in-progress{border-left-color:#f7c948}
    .feedback-group-in-progress>.feedback-group-heading span{background:#7a5a00}
    .feedback-group-finished{border-color:#45a565;background:rgba(69,165,101,.11)}
    .feedback-group-finished>.feedback-group-heading span{background:#2f7d49}
    .feedback-group-finished .feedback-pick{border-color:#45a565}
    .feedback-group-empty{margin:.55rem 0 .2rem;font-size:.9rem;opacity:.72}
    .backlog-score{margin-left:.35rem;vertical-align:middle}
    @media (max-width:640px){.feedback-group{padding:.65rem}.feedback-group-heading p{font-size:.82rem}}
  `;
  document.head.appendChild(style);

  let queued=false,observersStarted=false;
  function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;decorate()})}
  function init(){
    if(!observersStarted){
      observersStarted=true;
      for(const id of ['feedback-inbox','linked-backlog-list']){
        const target=document.getElementById(id);
        if(target)new MutationObserver(schedule).observe(target,{childList:true,subtree:true});
      }
    }
    schedule();
  }
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();