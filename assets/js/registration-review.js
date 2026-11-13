(()=>{
  const cfg=window.DV_APP_CONFIG||{};
  const loading=document.getElementById('review-loading');
  const grownup=document.getElementById('review-grownup');
  const driver=document.getElementById('review-driver');
  const complete=document.getElementById('review-complete');
  const status=document.getElementById('review-status');
  const name=document.getElementById('review-driver-name');
  const form=document.getElementById('review-form');
  const submit=document.getElementById('review-submit');
  const query=new URLSearchParams(location.search);
  const requested=query.get('review')||'';
  let activeReview=null;
  function returnPath(){
    const value=query.get('return')||'/family/';
    // Never permit external redirects or a review-page redirect loop.
    return value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\')
      &&!value.startsWith('/registration-review/')?value:'/family/';
  }
  const show=(target)=>{
    for(const el of [grownup,driver,complete])el.hidden=el!==target;
    loading.hidden=true;
  };
  if(!window.supabase||!cfg.supabaseUrl||!cfg.publishableKey){
    loading.textContent='Registration review is unavailable. Please try again later.';
    return;
  }
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,
    {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  async function request(action,data={}){
    const {data:auth,error:authError}=await client.auth.getSession();
    if(authError||!auth?.session?.access_token)throw new Error('Sign in to Drive Venture to review registration.');
    const response=await fetch(cfg.supabaseUrl+'/functions/v1/profile-api',{
      method:'POST',
      headers:{apikey:cfg.publishableKey,
        authorization:'Bearer '+auth.session.access_token,
        'content-type':'application/json'},
      body:JSON.stringify({action,...data})
    });
    const body=await response.json().catch(()=>({}));
    if(!response.ok||body.ok!==true)throw new Error(body.error||'Unable to load registration review.');
    return body;
  }
  async function load(){
    try{
      const body=await request('registration_reviews');
      const rows=Array.isArray(body.pending_reviews)?body.pending_reviews:[];
      activeReview=rows.find(r=>r.review_id===requested)||rows[0]||null;
      if(!activeReview){show(complete);return}
      name.textContent='Driver: '+String(activeReview.driver_name||'Driver');
      if(activeReview.can_complete===true){
        document.getElementById('review-license-stage').value='';
        document.getElementById('review-issue-date').value='';
        show(grownup);
      }else show(driver);
      status.textContent='';
    }catch(error){
      loading.textContent=error.message||'Unable to load registration details.';
      status.textContent='You can sign in from Family & Profiles and return here.';
    }
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!activeReview||activeReview.can_complete!==true)return;
    const stage=document.getElementById('review-license-stage').value;
    const issueDate=document.getElementById('review-issue-date').value;
    if(!['LEARNER','INTERMEDIATE','FULL'].includes(stage)||
      !/^\d{4}-\d{2}-\d{2}$/.test(issueDate)||
      !document.getElementById('review-confirm').checked){
      status.textContent='Choose the actual license stage and issue date, then confirm the details.';
      return;
    }
    submit.disabled=true;status.textContent='Saving verified registration…';
    try{
      const body=await request('complete_registration_review',{
        review_id:activeReview.review_id,
        requirement_version:activeReview.requirement_version,
        license_stage:stage,effective_date:issueDate
      });
      if(body.result?.ok!==true)throw new Error('Registration confirmation was not recorded.');
      const next=await request('registration_reviews');
      if((next.pending_reviews||[]).length){
        activeReview=null;await load();
      }else location.replace(returnPath());
    }catch(error){
      status.textContent=error.message||'Could not save the registration update.';
    }finally{submit.disabled=false;}
  });
  void load();
})();