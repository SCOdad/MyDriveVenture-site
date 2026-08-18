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
})();