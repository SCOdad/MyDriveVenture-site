(() => {
  const questCard=document.getElementById('quest-list')?.closest('.app-card');
  if(questCard)questCard.id='achievements';
  if(document.documentElement.dataset.experience==='game'){
    const radioLabel=document.querySelector('.radio-head b');
    if(radioLabel)radioLabel.textContent='MISSION CONTROL';
    const panelLabel=questCard?.querySelector('.panel-label');
    if(panelLabel)panelLabel.textContent='ACHIEVEMENTS';
    const heading=questCard?.querySelector('h2');
    if(heading)heading.textContent='Achievement History';
  }else{
    const heading=questCard?.querySelector('h2');
    if(heading)heading.textContent='Achievements';
  }
  if(!window.DV_DRIVER_SWITCH_SYNC_BOUND&&!document.querySelector('script[data-dv-driver-switch-sync]')){
    const script=document.createElement('script');
    script.src='/assets/js/log-driver-switch-sync.js?v=20260906-bklg0089-1';
    script.dataset.dvDriverSwitchSync='true';
    document.body.appendChild(script);
  }
})();