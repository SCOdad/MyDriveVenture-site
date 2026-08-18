(() => {
  const form=document.getElementById('dv-feedback-form'); if(!form) return;
  const message=document.getElementById('feedback-message'), button=document.getElementById('feedback-submit'),
    success=document.getElementById('feedback-success'), followUp=document.getElementById('feedback-follow-up'),
    email=document.getElementById('feedback-email'), identity=document.getElementById('feedback-identity'),
    personFields=document.getElementById('feedback-person-fields');
  let accessToken='';
  function setMessage(text,isError=false){message.textContent=text||'';message.classList.toggle('error',isError)}
  function value(data,name){return String(data.get(name)||'').trim()}
  function syncFollowUp(){if(email) email.required=Boolean(followUp&&followUp.checked&&!accessToken)}
  async function identifyPilot(){
    const cfg=window.DV_APP_CONFIG||{}; if(!window.supabase||!cfg.supabaseUrl||!cfg.publishableKey)return;
    const client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data:{session}}=await client.auth.getSession(); if(!session?.access_token)return;
    const {data:{user},error}=await client.auth.getUser(); if(error||!user?.email)return;
    accessToken=session.access_token;
    if(email)email.value=user.email;
    if(identity)identity.hidden=false;
    if(personFields)personFields.hidden=true;
    syncFollowUp();
  }
  if(followUp) followUp.addEventListener('change',syncFollowUp); syncFollowUp();
  identifyPilot().catch(()=>{});
  form.addEventListener('submit',async event=>{
    event.preventDefault();setMessage('');syncFollowUp();if(!form.reportValidity()||button.disabled)return;
    const endpoint=String(window.DV_FEEDBACK_ENDPOINT||'').trim();
    if(!endpoint){setMessage('Online feedback is being connected. Please try again shortly.',true);return}
    const data=new FormData(form);
    const payload={website:value(data,'website'),name:value(data,'name'),email:value(data,'email'),
      relationship:value(data,'relationship'),category:value(data,'category'),area:value(data,'area'),
      rating:value(data,'rating'),message:value(data,'message'),follow_up_opt_in:data.get('followUpOptIn')==='on',
      submission_context:window.DVSubmissionContext?.collect('FEEDBACK')??{schema_version:1,form_source:'FEEDBACK'}};
    button.disabled=true;button.textContent='Sending…';
    try{const headers={'content-type':'application/json'};if(accessToken)headers.authorization='Bearer '+accessToken;
      const response=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify(payload)});
      const result=await response.json().catch(()=>({}));if(!response.ok||result.ok!==true)throw new Error(result.error||'We could not save your feedback right now.');
      form.hidden=true;success.hidden=false;success.focus();
    }catch(error){setMessage(error instanceof Error?error.message:'We could not save your feedback right now.',true)}
    finally{button.disabled=false;button.textContent='Send feedback'}
  });
})();