(() => {
  const button=document.getElementById('dv-mock-preview');
  if(!button||window.DV_ENVIRONMENT_CONFIG?.name!=='dev')return;
  const entry=button.closest('.dv-mock-entry');if(entry)entry.hidden=false;
  const DRIVER_ID='mock-dv03-driver';
  const detail={model:{mock_preview:true,is_operator:false,avatar_assignments:[],driver_access:[{driver_id:DRIVER_ID,mode:'VIEW'}],quest_awards:[]},driverId:DRIVER_ID,driver:{id:DRIVER_ID,display_name:'Synthetic Driver',favorite_color:'TEAL',timezone:'America/Detroit'},progress:{total_minutes:1110,night_minutes:205,total_drives:34,xp:4850},license:{next_stage_display:'LEVEL 2'}};
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
  function disableWrites(){document.querySelectorAll('#app-main form input,#app-main form select,#app-main form textarea,#app-main form button').forEach(el=>{el.disabled=true;el.setAttribute('aria-disabled','true')})}
  function render(){
    document.documentElement.dataset.dvMockPreview='true';document.body.dataset.dvMockPreview='true';
    document.getElementById('app-login')?.classList.add('app-hidden');document.getElementById('app-main')?.classList.remove('app-hidden');
    const banner=document.getElementById('dv-mock-banner');if(banner)banner.hidden=false;
    window.DV_GAME_DV03?.showFallback('Synthetic Driver');window.dispatchEvent(new CustomEvent('dv:dashboard-rendered',{detail}));
    set('driver-heading','Synthetic Driver');set('hours-sign','31.5 HOURS TO LEVEL 2');set('kpi-hours','18.5 h');set('kpi-drives','34');set('license-stage','LEVEL 1');set('license-date','MAY 18, 2026');set('age-gate','NOV 18, 2026');set('dash-xp','4,850');set('kpi-night','3.4 h');set('license-night-hours','3.4 / 10.0 h');set('dash-clock','5:42 PM');set('night-time-phase','BEGINS');set('night-time-value','9:12 PM');
    document.querySelector('.dashboard-console')?.style.setProperty('--practice-p','37');document.querySelector('.dashboard-console')?.style.setProperty('--night-p','34');
    document.querySelector('[data-dv-weather-summary]').textContent='CLEAR · 74°F';document.querySelector('[data-dv-road]').textContent='DRY';
    document.querySelector('.radio-display').innerHTML='<span>GPS / MISSION CONTROL</span><h2>Neighborhood Explorer</h2><small>One more new destination to unlock the next route.</small>';
    document.getElementById('quest-list').innerHTML='<li class="quest-item"><strong>Five Hours</strong><small>Mock achievement · +500 XP</small></li>';
    document.getElementById('vehicle-list').innerHTML='<li class="vehicle-item"><div><strong>Roadrunner</strong><br><small>Sedan · Gray · Primary</small></div></li>';
    document.getElementById('drive-list').innerHTML='<li class="drive-item"><div><strong>Aug 29 · 42 min</strong><br><small>Park · Roadrunner</small></div></li>';
    disableWrites();
    const switcher=document.getElementById('driver-switcher');if(switcher)switcher.hidden=true;
  }
  button.addEventListener('click',render);window.DV_GAME_DV03_MOCK=Object.freeze({render,detail});
})();
