(() => {
  const env=window.DV_ENVIRONMENT_CONFIG;
  const button=document.getElementById('dv-mock-preview');
  if(!button||env?.name!=='dev')return;
  button.hidden=false;

  const MOCK_DRIVER_ID='mock-driver-v2';
  const mockDetail={
    model:{
      is_operator:true,
      mock_preview:true,
      quest_awards:[],
      avatar_assignments:[],
      drivers:[],
      driver_access:[{driver_id:MOCK_DRIVER_ID,mode:'VIEW'}]
    },
    driverId:MOCK_DRIVER_ID,
    driver:{
      id:MOCK_DRIVER_ID,
      display_name:'Riley Roadster',
      favorite_color:'TEAL',
      timezone:'America/Detroit',
      home_latitude:null,
      home_longitude:null
    },
    progress:{total_minutes:1110,night_minutes:205,drive_count:34},
    license:{next_stage_display:'LEVEL 2'}
  };

  const text=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
  const html=(id,value)=>{const el=document.getElementById(id);if(el)el.innerHTML=value};

  function readonlyWorkbench(){
    document.querySelectorAll('#app-main form input,#app-main form select,#app-main form textarea,#app-main form button').forEach(el=>{
      el.disabled=true;
      el.setAttribute('aria-disabled','true');
      el.classList.add('dv-mock-disabled');
    });
    document.querySelectorAll('#app-main form').forEach(form=>{
      if(form.querySelector('.dv-mock-form-note'))return;
      const note=document.createElement('p');
      note.className='dv-mock-form-note';
      note.textContent='Mock preview — saving is disabled.';
      form.prepend(note);
    });
  }

  function ensureMockIdentity(){
    const heading=document.getElementById('driver-heading');
    if(!heading)return;
    let identity=document.querySelector('.dv-driver-identity');
    if(!identity){
      const host=heading.parentElement;
      identity=document.createElement('div');
      identity.className='dv-driver-identity';
      const img=document.createElement('img');
      img.id='driver-avatar';
      img.className='dv-driver-avatar';
      img.src='/assets/images/dv-char-parker-guide.webp';
      img.alt='Synthetic preview character';
      const copy=document.createElement('div');
      while(host.firstChild)copy.appendChild(host.firstChild);
      identity.append(img,copy);
      host.appendChild(identity);
    }else{
      const img=identity.querySelector('#driver-avatar');
      if(img){
        img.src='/assets/images/dv-char-parker-guide.webp';
        img.alt='Synthetic preview character';
        img.classList.remove('dv-avatar-hidden');
      }
    }
    let badge=identity.querySelector('.dv-mock-avatar-badge');
    if(!badge){
      badge=document.createElement('span');
      badge.className='dv-mock-avatar-badge';
      badge.textContent='MOCK CHARACTER · LAYOUT PREVIEW';
      identity.querySelector('div')?.appendChild(badge);
    }
  }

  function renderMock(){
    document.documentElement.dataset.dvMockPreview='true';
    document.body.dataset.dvMockPreview='true';

    const login=document.getElementById('app-login');
    const main=document.getElementById('app-main');
    if(login)login.classList.add('app-hidden');
    if(main)main.classList.remove('app-hidden');

    const banner=document.getElementById('dv-mock-banner');
    if(banner)banner.hidden=false;

    ensureMockIdentity();
    text('driver-heading','Riley Roadster');
    text('hours-sign','31.5 HOURS TO LEVEL 2');
    text('kpi-hours','18.5 h');
    text('kpi-drives','34');
    text('license-stage','LEVEL 1');
    text('license-date','MAY 18, 2026');
    text('age-gate','NOV 18, 2026');
    text('dash-xp','4,850');
    text('kpi-night','3.4 h');
    text('license-night-hours','3.4 / 10.0 h');
    text('dash-clock','5:42 PM');

    const dash=document.querySelector('.dashboard-console');
    dash?.style.setProperty('--practice-p','37');
    dash?.style.setProperty('--night-p','34');

    const weatherSummary=document.querySelector('[data-dv-weather-summary]');
    const road=document.querySelector('[data-dv-road]');
    if(weatherSummary)weatherSummary.textContent='CLEAR · 74°F';
    if(road)road.textContent='DRY';

    const radio=document.querySelector('.radio-display');
    if(radio)radio.innerHTML='<span>GPS / MISSION CONTROL</span><div class="mission-featured"><small>FEATURED QUEST</small><strong>Neighborhood Explorer</strong><em>One more new destination to unlock the next route.</em></div><ol class="mission-list"><li><strong>Drive to a park</strong><small>Scenery-ready achievement</small></li><li><strong>Construction</strong><small>Scenery-ready achievement</small></li></ol>';

    html('quest-list','<li class="quest-item"><strong>🌲 Drive to a park</strong><small>Mock achievement · +400 XP</small></li><li class="quest-item"><strong>🚧 Construction</strong><small>Mock achievement · +400 XP</small></li><li class="quest-item"><strong>⭐ Five Hours</strong><small>Mock achievement · +500 XP</small></li>');
    html('vehicle-list','<li class="vehicle-item"><div><strong>Roadrunner</strong><br><small>Sedan · Gray · Primary</small></div></li>');
    html('drive-list','<li class="drive-item"><div><strong>Aug 29 · 42 min</strong><br><small>Park · Roadrunner</small></div></li><li class="drive-item"><div><strong>Aug 27 · 31 min</strong><br><small>School · Roadrunner</small></div></li>');

    readonlyWorkbench();
    window.DV_GAME_V2?.renderMockPreview?.(mockDetail);

    const switcher=document.getElementById('driver-switcher');
    if(switcher)switcher.hidden=true;
    const signOut=document.getElementById('sign-out');
    if(signOut)signOut.hidden=true;
  }

  button.addEventListener('click',renderMock);
  window.DV_GAME_V2_MOCK=Object.freeze({render:renderMock,detail:mockDetail});
})();