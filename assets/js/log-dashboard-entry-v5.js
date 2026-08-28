(() => {
  const cfg = window.DV_APP_CONFIG || {};
  const loginCard = document.getElementById('app-login');
  const appMain = document.getElementById('app-main');
  const loginForm = document.getElementById('login-form');
  const loginEmail = document.getElementById('login-email');
  const loginStatus = document.getElementById('login-status');
  const signOut = document.getElementById('sign-out');
  const navLogDrive = document.getElementById('nav-log-drive');
  const driverSelect = document.getElementById('driver-select');
  const driverSwitcher = document.getElementById('driver-switcher');

  function status(el,text,kind=''){if(!el)return;el.textContent=text||'';el.className=`app-status${kind?` ${kind}`:''}`}
  function syncAuthUi(signedIn){if(navLogDrive)navLogDrive.hidden=false;if(signOut)signOut.hidden=true;document.documentElement.toggleAttribute('data-dv-authenticated',!!signedIn)}
  function joinPrompt(){if(!loginStatus)return;loginStatus.className='app-status';loginStatus.innerHTML='<div class="login-join-prompt"><strong>New to Drive Venture?</strong><p>That sign-in link could not be sent. If you have not joined the pilot yet, start here.</p><a class="button primary button-small" href="/join/">Join the pilot</a><p class="meta">Already joined? Double-check the email you used during onboarding and try again.</p></div>'}
  function isUnregisteredOtpError(error){const message=String(error?.message||'').toLowerCase();const code=String(error?.code||'').toLowerCase();return code==='otp_disabled'||message.includes('signups not allowed for otp')||message.includes('signup')&&message.includes('otp')}

  if(!window.supabase||!cfg.supabaseUrl||!cfg.publishableKey){status(loginStatus,'The web pilot login is not activated yet.','error');loginForm?.querySelector('button')?.setAttribute('disabled','disabled');return}

  const client=window.DV_SUPABASE_CLIENT||window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  window.DV_SUPABASE_CLIENT=client;

  let model={drivers:[],vehicles:[],progress:[],recent_drives:[],quest_awards:[],license_requirements:[],license_statuses:[]};
  let currentDriverId='';
  let accessInFlight=null;
  let accessReady=false;
  let renderGeneration=0;
  const licenseStatusCache=new Map();
  const licenseStatusInFlight=new Map();

  const esc=v=>String(v??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const hours=m=>(Number(m||0)/60).toFixed(1);
  const currentDriver=()=>model.drivers.find(d=>d.id===currentDriverId)||model.drivers[0]||null;
  const currentProgress=()=>model.progress.find(p=>p.driver_id===currentDriverId)||{};
  const activeVehicles=()=>model.vehicles.filter(v=>v.driver_id===currentDriverId&&v.status!=='ARCHIVED');
  const currentDrives=()=>model.recent_drives.filter(d=>d.driver_id===currentDriverId);
  const currentAwards=()=>model.quest_awards.filter(q=>q.driver_id===currentDriverId);
  const getAccessMode=driverId=>(model.driver_access||[]).find(a=>a.driver_id===driverId)?.mode||(model.is_operator===true?'VIEW':'MANAGE');
  const currentLicenseStatus=()=>licenseStatusCache.get(currentDriverId)??model.license_statuses?.find(s=>s.driver_id===currentDriverId)?.status??null;

  function requirement(type,fallback){const s=currentLicenseStatus(),row=(s?.requirements||[]).find(r=>r.requirement_type===type);const n=Number(row?.value_text);return Number.isFinite(n)?n:fallback}
  function vehicleMarkup(v){return `<li class="vehicle-item"><div><strong>${esc(v.name)}</strong><br><small>${esc(v.vehicle_class)}${v.color?` · ${esc(v.color)}`:''}${v.is_primary?' · Primary':''}</small></div><button class="button subtle-button button-small" type="button" data-archive-vehicle="${esc(v.id)}">Archive</button></li>`}
  function orderedDrivers(){return [...(model.drivers||[])].sort((a,b)=>{const av=getAccessMode(a.id)==='VIEW'?1:0,bv=getAccessMode(b.id)==='VIEW'?1:0;if(av!==bv)return av-bv;return String(a.display_name||'Driver').localeCompare(String(b.display_name||'Driver'),undefined,{sensitivity:'base'})})}

  function resetDriverPresentation(){
    const text={
      'driver-heading':'Drive Venture','kpi-hours':'0.0 h','kpi-night':'0.0 h','kpi-drives':'0','kpi-xp':'0','dash-xp':'0',
      'license-stage':'—','license-date':'—','age-gate':'—','license-hours':'0.0 / 50.0 h','license-night-hours':'0.0 / 10.0 h',
      'hours-sign':'Loading…','dash-clock':'--:--'
    };
    Object.entries(text).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.textContent=value});
    const dash=document.querySelector('.dashboard-console');if(dash){dash.style.setProperty('--practice-p','0');dash.style.setProperty('--night-p','0')}
    const vehicleList=document.getElementById('vehicle-list');if(vehicleList)vehicleList.innerHTML='<li class="empty-state">No active vehicles yet.</li>';
    const driveList=document.getElementById('drive-list');if(driveList)driveList.innerHTML='<li class="empty-state">No drives logged yet.</li>';
    const questList=document.getElementById('quest-list');if(questList)questList.innerHTML='<li class="empty-state">Quest awards will appear here as drives earn them.</li>';
    const driveVehicle=document.getElementById('drive-vehicle');if(driveVehicle){driveVehicle.innerHTML='<option value="">Choose a vehicle</option>';driveVehicle.value=''}
    document.querySelectorAll('[data-dv-weather-summary]').forEach(el=>el.textContent='Loading…');
    document.querySelectorAll('[data-dv-road]').forEach(el=>el.textContent='Checking…');
  }

  function render(generation=renderGeneration){
    const driver=currentDriver();if(!driver||generation!==renderGeneration)return;
    const progress=currentProgress(),license=currentLicenseStatus(),practiceTarget=requirement('MinimumPracticeHours',50),nightTarget=requirement('MinimumNightHours',10);
    const heading=document.getElementById('driver-heading');if(heading)heading.textContent=driver.display_name||'Drive Venture';
    const kh=document.getElementById('kpi-hours');if(kh)kh.textContent=`${hours(progress.total_minutes)} h`;
    const kn=document.getElementById('kpi-night');if(kn)kn.textContent=`${hours(progress.night_minutes)} h`;
    const kd=document.getElementById('kpi-drives');if(kd)kd.textContent=String(progress.total_drives||0);
    const xp=document.getElementById('kpi-xp');if(xp)xp.textContent=String(progress.xp||0);
    const dashXp=document.getElementById('dash-xp');if(dashXp)dashXp.textContent=String(progress.xp||0);
    const stage=document.getElementById('license-stage');if(stage)stage.textContent=license?.current_stage_display||driver.license_stage||'—';
    const stageDate=document.getElementById('license-date');if(stageDate)stageDate.textContent=license?.stage_start_date||driver.level1_license_date||'—';
    const ageGate=document.getElementById('age-gate');if(ageGate)ageGate.textContent=license?(license.next_stage_display?`${license.next_stage_display}${license.next_milestone_date?` · ${license.next_milestone_date}`:''}`:'All time milestones reached'):'Loading…';
    const lh=document.getElementById('license-hours');if(lh)lh.textContent=`${hours(progress.total_minutes)} / ${practiceTarget.toFixed(1)} h`;
    const lnh=document.getElementById('license-night-hours');if(lnh)lnh.textContent=nightTarget>0?`${hours(progress.night_minutes)} / ${nightTarget.toFixed(1)} h`:'Not required for next stage';

    const dash=document.querySelector('.dashboard-console');
    if(dash){const p=practiceTarget>0?Math.min(100,Math.max(0,Number(progress.total_minutes||0)/(practiceTarget*60)*100)):0,n=nightTarget>0?Math.min(100,Math.max(0,Number(progress.night_minutes||0)/(nightTarget*60)*100)):0;dash.style.setProperty('--practice-p',String(p));dash.style.setProperty('--night-p',String(n));const sign=document.getElementById('hours-sign');if(sign)sign.textContent=license?(license.next_stage_display?`${Math.max(0,practiceTarget-Number(hours(progress.total_minutes))).toFixed(1)} HOURS TO ${String(license.next_stage_display).toUpperCase()}`:'LICENSE MILESTONES COMPLETE'):'Loading…'

    const vehicles=activeVehicles(),vehicleList=document.getElementById('vehicle-list');
    if(vehicleList)vehicleList.innerHTML=vehicles.length?vehicles.map(vehicleMarkup).join(''):'<li class="empty-state">No active vehicles yet.</li>';
    const driveVehicle=document.getElementById('drive-vehicle');
    if(driveVehicle){const prior=driveVehicle.value;driveVehicle.innerHTML='<option value="">Choose a vehicle</option>'+vehicles.map(v=>`<option value="${esc(v.id)}">${esc(v.name)}</option>`).join('');if(vehicles.some(v=>v.id===prior))driveVehicle.value=prior;else{const primary=vehicles.find(v=>v.is_primary)||vehicles[0];if(primary)driveVehicle.value=primary.id}}

    const drives=currentDrives(),driveList=document.getElementById('drive-list');
    if(driveList)driveList.innerHTML=drives.length?drives.map(d=>{const v=model.vehicles.find(x=>x.id===d.vehicle_id);return `<li class="drive-item"><div class="drive-item-summary"><span><strong>${esc(d.drive_date)} · ${esc(d.start_time).slice(0,5)}–${esc(d.end_time).slice(0,5)}</strong><br><small>${esc(v?.name||'Vehicle')} · ${Math.round(Number(d.duration_minutes||0))} min${d.destination?` · ${esc(d.destination)}`:''}</small></span><span class="pill">${esc(d.source)}</span></div><a class="drive-detail-trigger" href="#drive-detail" data-drive-detail-id="${esc(d.id)}">View details →</a></li>`}).join(''):'<li class="empty-state">No drives logged yet.</li>';

    const awards=currentAwards(),questList=document.getElementById('quest-list');
    if(questList)questList.innerHTML=awards.length?awards.map(q=>`<li class="quest-item" data-quest-help="${esc(q.quest?.description||'')}"><div><strong class="quest-help-target" tabindex="0">${esc(q.quest?.name||q.quest_key)}</strong><br><small>${new Date(q.awarded_at).toLocaleDateString()}</small></div><span class="pill">+${Number(q.xp_awarded||0)} XP</span></li>`).join(''):'<li class="empty-state">Quest awards will appear here as drives earn them.</li>';

    window.dispatchEvent(new CustomEvent('dv:dashboard-rendered',{detail:{model,driverId:currentDriverId,driver,progress,license,generation}}));
  }

  function renderLicenseOnly(generation=renderGeneration){
    if(generation!==renderGeneration)return;
    const driver=currentDriver();if(!driver)return;
    const progress=currentProgress(),license=currentLicenseStatus();if(!license)return;
    const practiceTarget=requirement('MinimumPracticeHours',50),nightTarget=requirement('MinimumNightHours',10);
    const stage=document.getElementById('license-stage');if(stage)stage.textContent=license.current_stage_display||driver.license_stage||'—';
    const stageDate=document.getElementById('license-date');if(stageDate)stageDate.textContent=license.stage_start_date||driver.level1_license_date||'—';
    const ageGate=document.getElementById('age-gate');
    if(ageGate){
      if(document.querySelector('.dashboard-console')&&license.days_until_age_eligible!=null)ageGate.textContent=license.days_until_age_eligible===0?'AGE ELIGIBLE':`${license.days_until_age_eligible} DAYS`;
      else ageGate.textContent=license.next_stage_display?`${license.next_stage_display}${license.next_milestone_date?` · ${license.next_milestone_date}`:''}`:'All time milestones reached';
    }
    const lh=document.getElementById('license-hours');if(lh)lh.textContent=`${hours(progress.total_minutes)} / ${practiceTarget.toFixed(1)} h`;
    const lnh=document.getElementById('license-night-hours');if(lnh)lnh.textContent=nightTarget>0?`${hours(progress.night_minutes)} / ${nightTarget.toFixed(1)} h`:'Not required for next stage';
    const sign=document.getElementById('hours-sign');if(sign)sign.textContent=license.next_stage_display?`${Math.max(0,practiceTarget-Number(hours(progress.total_minutes))).toFixed(1)} HOURS TO ${String(license.next_stage_display).toUpperCase()}`:'LICENSE MILESTONES COMPLETE';
    window.dispatchEvent(new CustomEvent('dv:license-status-updated',{detail:{model,driverId:currentDriverId,driver,progress,license,generation}}));
  }

  async function ensureLicenseStatus(driverId){
    if(licenseStatusCache.has(driverId))return licenseStatusCache.get(driverId);
    const existing=model.license_statuses?.find(s=>s.driver_id===driverId)?.status;
    if(existing){licenseStatusCache.set(driverId,existing);return existing}
    if(licenseStatusInFlight.has(driverId))return licenseStatusInFlight.get(driverId);
    const request=(async()=>{
      let data=null,error=null;
      try{
        const result=await Promise.race([
          client.rpc('get_authenticated_driver_status_v1',{p_driver_id:driverId}),
          new Promise(resolve=>setTimeout(()=>resolve({data:null,error:{message:'Driver status timed out'}}),5000))
        ]);
        data=result?.data??null;error=result?.error??null;
      }catch(err){error=err}
      const statusValue=!error&&data?.ok?data:null;
      if(statusValue){
        licenseStatusCache.set(driverId,statusValue);
        model.license_statuses=[...(model.license_statuses||[]).filter(s=>s.driver_id!==driverId),{driver_id:driverId,status:statusValue}];
      }
      return statusValue;
    })();
    licenseStatusInFlight.set(driverId,request);
    try{return await request}finally{if(licenseStatusInFlight.get(driverId)===request)licenseStatusInFlight.delete(driverId)}
  }

  async function selectDriver(nextDriverId,{persist=true}={}){
    if(!(model.drivers||[]).some(d=>d.id===nextDriverId))return false;
    const previousDriverId=currentDriverId;
    const generation=++renderGeneration;
    currentDriverId=nextDriverId;
    if(driverSelect)driverSelect.value=nextDriverId;
    if(persist){try{localStorage.setItem('dv.log.driver',currentDriverId)}catch(_){}}
    window.dispatchEvent(new CustomEvent('dv:driver-changing',{detail:{driverId:nextDriverId,previousDriverId,generation}}));
    resetDriverPresentation();
    const hasLicense=!!currentLicenseStatus();
    render(generation);
    if(hasLicense)return true;
    ensureLicenseStatus(nextDriverId).then(()=>{
      if(generation!==renderGeneration||currentDriverId!==nextDriverId)return;
      renderLicenseOnly(generation);
    }).catch(()=>{});
    return true;
  }

  async function loadDashboard({quiet=false}={}){
    if(!quiet)status(loginStatus,'Access linked. Loading dashboard…');
    const result=await Promise.race([client.rpc('get_authenticated_dashboard_v1'),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Dashboard request timed out after 15 seconds.')),15000))]);
    const {data,error}=result;
    if(error)throw new Error(`Dashboard: ${error.message||'Unable to load dashboard'}`);
    if(!data||data.ok!==true)throw new Error(`Dashboard: ${data?.error||'Unable to load dashboard'}`);
    model=data;
    model.license_statuses=[];
    licenseStatusCache.clear();
    licenseStatusInFlight.clear();
    if(!currentDriverId||!model.drivers.some(d=>d.id===currentDriverId)){let savedDriverId='';try{savedDriverId=localStorage.getItem('dv.log.driver')||''}catch(_){}currentDriverId=model.drivers.some(d=>d.id===savedDriverId)?savedDriverId:(model.drivers[0]?.id||'')}
    if(!currentDriverId)throw new Error('Dashboard: no active driver is linked to this account yet.');
    if(driverSelect){driverSelect.innerHTML=orderedDrivers().map(d=>`<option value="${esc(d.id)}">${esc(d.display_name||'Driver')}${getAccessMode(d.id)==='VIEW'?' · View only':''}</option>`).join('');driverSelect.value=currentDriverId}
    if(driverSwitcher)driverSwitcher.hidden=model.drivers.length<=1;
    await selectDriver(currentDriverId,{persist:false});
    return model;
  }

  async function establishAccess(){
    if(accessReady)return;
    if(accessInFlight)return accessInFlight;
    accessInFlight=(async()=>{
      status(loginStatus,'Resolving Drive Venture access…');
      const {data,error}=await client.rpc('claim_authenticated_access_v1');
      if(error)throw new Error(`Access claim: ${error.message||'Unable to resolve access'}`);
      if(!data||data.ok!==true)throw new Error(`Access claim: ${data?.error||'Unable to resolve access'}`);
      await loadDashboard();
      loginCard.classList.add('app-hidden');
      appMain.classList.remove('app-hidden');
      syncAuthUi(true);
      accessReady=true;
    })();
    try{await accessInFlight}finally{accessInFlight=null}
  }

  window.DV_LOG_APP={
    client,
    refreshDashboard:()=>loadDashboard({quiet:true}),
    getModel:()=>model,
    getDriverId:()=>currentDriverId,
    getActiveVehicles:activeVehicles,
    getAccessMode,
    getRenderGeneration:()=>renderGeneration,
    selectDriver
  };

  if(!document.querySelector('link[data-dv-drive-detail-css]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/css/log-drive-detail-v4.css?v=20260824-6';l.dataset.dvDriveDetailCss='true';document.head.appendChild(l)}
  if(!document.querySelector('script[data-dv-drive-detail]')){const s=document.createElement('script');s.src='/assets/js/log-drive-detail-v4.js?v=20260827-0078-stable1';s.dataset.dvDriveDetail='true';document.body.appendChild(s)}

  loginForm.addEventListener('submit',async e=>{e.preventDefault();status(loginStatus,'Sending sign-in link…');const email=loginEmail.value.trim();if(!email)return;const{error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:`${window.location.origin}${document.documentElement.dataset.experience==='game'?'/log/game/':'/log/'}`,shouldCreateUser:false}});if(error){if(isUnregisteredOtpError(error))joinPrompt();else status(loginStatus,'We could not send a sign-in link right now. Please try again.','error')}else status(loginStatus,'Check your email for a secure sign-in link.','success')});
  signOut?.addEventListener('click',async()=>{accessReady=false;await client.auth.signOut();syncAuthUi(false);appMain.classList.add('app-hidden');loginCard.classList.remove('app-hidden');status(loginStatus,'Signed out.')});
  driverSelect?.addEventListener('change',()=>{selectDriver(driverSelect.value).catch(()=>status(loginStatus,'We could not switch drivers. Please try again.','error'))});

  const today=new Date(),dateEl=document.getElementById('drive-date');
  if(dateEl)dateEl.value=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  syncAuthUi(false);
  client.auth.onAuthStateChange((_e,session)=>{syncAuthUi(!!session);if(!session){accessReady=false;return}if(!accessReady)setTimeout(()=>establishAccess().catch(()=>status(loginStatus,'We could not open your Drive Venture account. Please try again or contact us.','error')),0)});
  client.auth.getSession().then(({data})=>{syncAuthUi(!!data.session);if(data.session)establishAccess().catch(()=>status(loginStatus,'We could not open your Drive Venture account. Please try again or contact us.','error'))});
})();