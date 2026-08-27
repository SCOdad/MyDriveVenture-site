(() => {
  if (document.documentElement.dataset.experience === 'game') return;
  let token=0;
  function localDate(timezone){try{const p=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),x=Object.fromEntries(p.map(v=>[v.type,v.value]));return `${x.year}-${x.month}-${x.day}`}catch(_){return null}}
  function clock(value){if(!/^\d{2}:\d{2}$/.test(String(value||'')))return 'Unavailable';const[h,m]=value.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`}
  function field(){let el=document.getElementById('night-xp-start');if(el)return el;const night=document.getElementById('license-night-hours')?.closest('.license-line');if(!night)return null;night.insertAdjacentHTML('afterend','<div class="license-line"><strong>Night XP begins</strong><span id="night-xp-start">Loading…</span></div>');return document.getElementById('night-xp-start')}
  async function apply(e){const driver=e.detail?.driver;if(!driver)return;const el=field();if(!el)return;const mine=++token,date=driver.timezone?localDate(driver.timezone):null;el.textContent='Loading…';if(!date){el.textContent='Unavailable';return}try{const app=window.DV_LOG_APP,{data,error}=await app.client.functions.invoke('night-xp-start',{body:{driver_id:driver.id,date}});if(mine!==token)return;el.textContent=!error&&data?.ok&&data.threshold?.status==='CLASSIFIED'?clock(data.threshold.localTime):'Unavailable'}catch(_){if(mine===token)el.textContent='Unavailable'}}
  window.addEventListener('dv:dashboard-rendered',apply);
})();