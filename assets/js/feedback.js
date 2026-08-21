(() => {
  const form=document.getElementById('dv-feedback-form'); if(!form) return;
  const message=document.getElementById('feedback-message'), button=document.getElementById('feedback-submit'),
    success=document.getElementById('feedback-success'), followUp=document.getElementById('feedback-follow-up'), updates=document.getElementById('feedback-updates'),
    email=document.getElementById('feedback-email'), identity=document.getElementById('feedback-identity'), personFields=document.getElementById('feedback-person-fields'),
    attachments=document.getElementById('feedback-attachments'), files=document.getElementById('feedback-files'), codeEl=document.getElementById('feedback-code'),
    reference=document.getElementById('feedback-reference'), attachmentWarning=document.getElementById('feedback-attachment-warning');
  let accessToken='';
  function setMessage(text,isError=false){message.textContent=text||'';message.classList.toggle('error',isError)}
  function value(data,name){return String(data.get(name)||'').trim()}
  function syncContact(){if(email) email.required=Boolean(((followUp&&followUp.checked)||(updates&&updates.checked))&&!accessToken)}
  function selectedFiles(){return files ? Array.from(files.files||[]) : []}
  function validateFiles(){const chosen=selectedFiles();if(chosen.length>5)throw new Error('Please attach no more than 5 screenshots.');for(const f of chosen){if(!['image/png','image/jpeg','image/webp'].includes(f.type))throw new Error('Screenshots must be PNG, JPEG, or WebP.');if(f.size>10*1024*1024)throw new Error(`${f.name} is larger than 10 MB.`)}return chosen}
  async function identifyPilot(){
    const cfg=window.DV_APP_CONFIG||{}; if(!window.supabase||!cfg.supabaseUrl||!cfg.publishableKey)return;
    const client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data:{session}}=await client.auth.getSession(); if(!session?.access_token)return;
    const {data:{user},error}=await client.auth.getUser(); if(error||!user?.email)return;
    accessToken=session.access_token;if(email)email.value=user.email;if(identity)identity.hidden=false;if(personFields)personFields.hidden=true;if(attachments)attachments.hidden=false;syncContact();
  }
  for(const c of [followUp,updates]) if(c)c.addEventListener('change',syncContact); syncContact(); identifyPilot().catch(()=>{});
  async function uploadScreenshots(feedbackCode,chosen){if(!chosen.length)return[];if(!accessToken)throw new Error('Sign in before attaching screenshots.');const endpoint=String(window.DV_FEEDBACK_ATTACHMENT_ENDPOINT||'').trim();if(!endpoint)throw new Error('Screenshot upload is unavailable.');const failures=[];for(const file of chosen){const body=new FormData();body.append('feedback_code',feedbackCode);body.append('file',file);try{const response=await fetch(endpoint,{method:'POST',headers:{authorization:'Bearer '+accessToken},body});const result=await response.json().catch(()=>({}));if(!response.ok||result.ok!==true)throw new Error(result.error||'upload failed')}catch(e){failures.push(`${file.name}: ${e instanceof Error?e.message:'upload failed'}`)}}return failures}
  form.addEventListener('submit',async event=>{
    event.preventDefault();setMessage('');syncContact();if(!form.reportValidity()||button.disabled)return;
    const endpoint=String(window.DV_FEEDBACK_ENDPOINT||'').trim();if(!endpoint){setMessage('Online feedback is being connected. Please try again shortly.',true);return}
    let chosen=[];try{chosen=validateFiles()}catch(e){setMessage(e.message||String(e),true);return}
    const data=new FormData(form);const payload={website:value(data,'website'),name:value(data,'name'),email:value(data,'email'),relationship:value(data,'relationship'),category:value(data,'category'),area:value(data,'area'),rating:value(data,'rating'),message:value(data,'message'),follow_up_requested:data.get('followUpRequested')==='on',updates_opt_in:data.get('updatesOptIn')==='on',project_state:String(window.DV_PROJECT_STATE||'ALPHA'),code_revision:String(window.DV_CODE_REVISION||''),submission_context:window.DVSubmissionContext?.collect('FEEDBACK')??{schema_version:1,form_source:'FEEDBACK'}};
    button.disabled=true;button.textContent='Sending…';
    try{const headers={'content-type':'application/json'};if(accessToken)headers.authorization='Bearer '+accessToken;const response=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify(payload)});const result=await response.json().catch(()=>({}));if(!response.ok||result.ok!==true)throw new Error(result.error||'We could not save your feedback right now.');const feedbackCode=String(result.feedback_code||'');let failures=[];if(feedbackCode&&chosen.length)failures=await uploadScreenshots(feedbackCode,chosen);if(codeEl&&feedbackCode)codeEl.textContent=feedbackCode;if(reference)reference.hidden=!feedbackCode;if(attachmentWarning){attachmentWarning.hidden=!failures.length;attachmentWarning.textContent=failures.length?`Your feedback was saved, but ${failures.length} screenshot upload${failures.length===1?'':'s'} failed. You can reference ${feedbackCode} if you contact us.`:''}form.hidden=true;success.hidden=false;success.focus();
    }catch(error){setMessage(error instanceof Error?error.message:'We could not save your feedback right now.',true)}finally{button.disabled=false;button.textContent='Send feedback'}
  });
})();
