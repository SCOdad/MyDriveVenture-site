(() => {
  const style = document.createElement('style');
  style.textContent = `.dv-driver-identity{display:flex;align-items:center;gap:14px}.dv-driver-avatar{width:76px;height:76px;object-fit:cover;border:3px solid var(--dv-yellow,#f8ba20);background:#111;border-radius:8px;box-shadow:3px 3px 0 #050707}.dv-avatar-new{display:inline-block;margin-top:6px;padding:4px 7px;background:var(--dv-yellow,#f8ba20);color:#101416;font:800 10px/1.1 Orbitron,Arial,sans-serif;letter-spacing:.06em}.dv-avatar-hidden{display:none!important}.dv-access-badge{display:inline-flex;align-items:center;min-height:30px;padding:5px 9px;border:1px solid currentColor;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}.dv-access-badge.view{opacity:.82}.dv-readonly-control:disabled{opacity:.55;cursor:not-allowed;filter:grayscale(.35)}.dv-operator-console{display:none;margin:0 0 22px;padding:14px 18px;border:1px solid #425158;background:#101719;color:#dfe8e8;font-size:12px;line-height:1.55}.dv-operator-console.view{display:block}.dv-operator-console-title{margin:0 0 8px;color:var(--dv-yellow,#f8ba20);font:800 12px/1.2 Orbitron,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase}.dv-operator-row{overflow-wrap:anywhere}.dv-operator-row b{color:#fff}.dv-operator-uuid{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px}@media(max-width:760px){.dv-driver-avatar{width:62px;height:62px}.dv-access-badge{white-space:normal}.dv-operator-console{padding:12px}}`;
  document.head.appendChild(style);

  const cache = new Map();
  let renderToken = 0;
  function ensureUi() {
    const heading = document.getElementById('driver-heading');
    if (!heading || document.getElementById('driver-avatar')) return;
    const host = heading.parentElement;
    if (!host) return;
    const identity = document.createElement('div');
    identity.className = 'dv-driver-identity';
    const image = document.createElement('img');
    image.id = 'driver-avatar';
    image.className = 'dv-driver-avatar dv-avatar-hidden';
    image.alt = '';
    const text = document.createElement('div');
    while (host.firstChild) text.appendChild(host.firstChild);
    const badge = document.createElement('span');
    badge.id = 'driver-avatar-new';
    badge.className = 'dv-avatar-new dv-avatar-hidden';
    badge.textContent = 'NEW AVATAR';
    text.appendChild(badge);
    identity.append(image, text);
    host.appendChild(identity);
  }

  function getAccess(detail) { return (detail?.model?.driver_access || []).find(a => a.driver_id === detail?.driverId) || null; }
  function getContact(detail) { return (detail?.model?.operator_contacts || []).find(a => a.driver_id === detail?.driverId) || null; }

  function ensureAccessBadge() {
    const host = document.getElementById('driver-switcher'); if (!host) return null;
    let badge = document.getElementById('driver-access-badge');
    if (!badge) { badge=document.createElement('span'); badge.id='driver-access-badge'; badge.className='dv-access-badge'; host.appendChild(badge); }
    return badge;
  }

  function ensureOperatorConsole() {
    const heading=document.getElementById('driver-heading'); if(!heading) return null;
    const topline=heading.closest('.app-topline'); if(!topline) return null;
    let panel=document.getElementById('operator-console');
    if(!panel){ panel=document.createElement('section'); panel.id='operator-console'; panel.className='dv-operator-console'; panel.setAttribute('aria-label','Operator console'); topline.parentElement.insertBefore(panel,topline); }
    return panel;
  }

  function smsLabel(value){ return value===true?'Yes':value===false?'No':'—'; }
  function esc(value){ return String(value ?? '—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function operatorRow(label, person, includePhoneSms){
    const bits=[esc(person?.name),esc(person?.email)];
    if(includePhoneSms){ bits.push(esc(person?.mobile),`SMS Opt-In: ${smsLabel(person?.sms_opt_in)}`); }
    bits.push(`<span class="dv-operator-uuid">UUID: ${esc(person?.id)}</span>`);
    return `<div class="dv-operator-row"><b>${label}:</b> ${bits.join(' / ')}</div>`;
  }

  function setDisabled(control,disabled){ if(!control)return; control.disabled=disabled; control.classList.toggle('dv-readonly-control',disabled); if(disabled)control.setAttribute('aria-disabled','true');else control.removeAttribute('aria-disabled'); }
  function applyReadOnlyControls(readOnly){
    const driveForm=document.getElementById('drive-form'); if(driveForm){ driveForm.hidden=false; driveForm.closest('.app-card')?.removeAttribute('hidden'); driveForm.querySelectorAll('input,textarea,button').forEach(c=>setDisabled(c,readOnly)); setDisabled(document.getElementById('drive-vehicle'),false); }
    const vehicleForm=document.getElementById('vehicle-form'); if(vehicleForm){ vehicleForm.hidden=false; const heading=vehicleForm.previousElementSibling;if(heading&&heading.tagName==='H3')heading.hidden=false; vehicleForm.querySelectorAll('input,select,textarea,button').forEach(c=>setDisabled(c,readOnly)); }
    document.querySelectorAll('[data-archive-vehicle],[data-primary-vehicle],[data-edit-drive],[data-save-drive-edit],[data-cancel-drive-edit]').forEach(b=>{b.hidden=false;setDisabled(b,readOnly)});
  }

  function sortDriverOptions(model,select){ if(!select)return; const accessByDriver=new Map((model.driver_access||[]).map(a=>[a.driver_id,a]));const driverById=new Map((model.drivers||[]).map(d=>[d.id,d]));const selected=select.value;const options=Array.from(select.options);options.sort((a,b)=>{const aa=accessByDriver.get(a.value)?.mode==='VIEW'?1:0;const bb=accessByDriver.get(b.value)?.mode==='VIEW'?1:0;if(aa!==bb)return aa-bb;return (driverById.get(a.value)?.display_name||'Driver').localeCompare(driverById.get(b.value)?.display_name||'Driver',undefined,{sensitivity:'base'})});options.forEach(o=>{const d=driverById.get(o.value),a=accessByDriver.get(o.value);if(d)o.textContent=`${d.display_name||'Driver'}${a?.mode==='VIEW'?' · View only':''}`;select.appendChild(o)});if(options.some(o=>o.value===selected))select.value=selected; }

  function applyOperatorView(detail){
    const access=getAccess(detail);if(!access)return;const readOnly=access.mode==='VIEW';applyReadOnlyControls(readOnly);const model=detail?.model||{};sortDriverOptions(model,document.getElementById('driver-select'));
    const badge=ensureAccessBadge();if(badge){badge.textContent=readOnly?'View only':'Family access';badge.className=`dv-access-badge${readOnly?' view':''}`;}
    const panel=ensureOperatorConsole();if(panel){if(readOnly){const contact=getContact(detail);panel.innerHTML=`<div class="dv-operator-console-title">Operator View · Read Only</div>${operatorRow('Grown-Up',contact?.grown_up,true)}${operatorRow('Driver',{...(contact?.driver||{}),id:detail?.driverId},false)}`;panel.className='dv-operator-console view';}else{panel.innerHTML='';panel.className='dv-operator-console';}}
  }

  async function renderAvatar(detail){
    const mine=++renderToken;ensureUi();const image=document.getElementById('driver-avatar');const badge=document.getElementById('driver-avatar-new');if(!image||!badge)return;image.classList.add('dv-avatar-hidden');badge.classList.add('dv-avatar-hidden');image.removeAttribute('src');image.alt='';const model=detail?.model||{};const driverId=detail?.driverId;const access=getAccess(detail);const assignment=(model.avatar_assignments||[]).find(a=>a.driver_id===driverId);if(!assignment)return;const app=window.DV_LOG_APP;const client=app?.client;if(!client)return;let url=cache.get(assignment.id);if(!url){const{data,error}=await client.storage.from(assignment.storage_bucket).createSignedUrl(assignment.storage_path,3600);if(error||!data?.signedUrl){console.error('Unable to resolve driver avatar',error);return}url=data.signedUrl;cache.set(assignment.id,url)}if(mine!==renderToken||app.getDriverId()!==driverId)return;image.src=url;image.alt=`${detail?.driver?.display_name||'Driver'} custom avatar`;image.classList.remove('dv-avatar-hidden');if(!assignment.first_viewed_at&&access?.mode!=='VIEW'){badge.classList.remove('dv-avatar-hidden');try{const{error}=await client.rpc('mark_avatar_first_viewed_v1',{p_assignment_id:assignment.id});if(error)console.error('Unable to mark avatar first viewed',error);else assignment.first_viewed_at=new Date().toISOString()}catch(error){console.error('Unable to mark avatar first viewed',error)}}
  }

  window.addEventListener('dv:dashboard-rendered',event=>{applyOperatorView(event.detail);renderAvatar(event.detail).catch(error=>console.error('Avatar render failed',error));});
})();
