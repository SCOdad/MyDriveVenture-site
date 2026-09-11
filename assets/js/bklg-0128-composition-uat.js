(() => {
  if(document.documentElement.dataset.dvRoute!=='bklg0128uat')return;

  const syncButtons=api=>document.querySelectorAll('.uat-option').forEach(option=>option.setAttribute('aria-pressed',String(api.state[option.dataset.layer]===option.dataset.value)));
  const install=()=>{
    const api=window.DV_BKLG_0128_UAT;
    const presets=document.querySelector('.uat-presets');
    if(!api||!presets)return false;

    // Destination scenery owns its local pavement/approach; generic road is optional.
    api.state.road='off';
    api.applyLayers();
    syncButtons(api);

    if(!document.getElementById('bklg0128-composition-presets')){
      const group=document.createElement('div');
      group.id='bklg0128-composition-presets';
      group.className='uat-presets';
      group.setAttribute('aria-label','Billboard and scenery composition experiment');
      group.innerHTML='<button type="button" data-composition="scenery">Scenery Only</button><button type="button" data-composition="billboard">Billboard Only</button><button type="button" data-composition="both">Both</button>';
      presets.after(group);
      group.addEventListener('click',event=>{
        const button=event.target.closest('[data-composition]');if(!button)return;
        const choice=button.dataset.composition;
        if(choice==='scenery'){api.state.sign='off';if(api.state.background==='off')api.state.background='park'}
        if(choice==='billboard'){api.state.background='off';api.state.sign='base'}
        if(choice==='both'){if(api.state.background==='off')api.state.background='park';api.state.sign='base'}
        api.state.road='off';api.applyLayers();syncButtons(api);
        group.querySelectorAll('[data-composition]').forEach(option=>option.setAttribute('aria-pressed',String(option===button)));
      });
    }

    if(!document.getElementById('bklg0128-presentation-scenarios')){
      const scenarios=document.createElement('div');
      scenarios.id='bklg0128-presentation-scenarios';
      scenarios.className='uat-presets';
      scenarios.setAttribute('aria-label','Persistent presentation scenarios');
      scenarios.innerHTML='<button type="button" data-presentation="new">No Scenery Yet</button><button type="button" data-presentation="persistent">Persistent Scenery</button><button type="button" data-presentation="scenery-win">Scenery Wins</button><button type="button" data-presentation="billboard-win">Billboard Wins</button><button type="button" data-presentation="day">Day</button><button type="button" data-presentation="night">Night</button>';
      document.getElementById('bklg0128-composition-presets')?.after(scenarios);
      scenarios.addEventListener('click',event=>{
        const button=event.target.closest('[data-presentation]');if(!button)return;
        const choice=button.dataset.presentation;
        api.state.road='off';
        if(choice==='new'){api.state.background='off';api.state.sign='base'}
        if(choice==='persistent'){api.state.background='library';api.state.sign='off'}
        if(choice==='scenery-win'){api.state.background='snack-run';api.state.sign='off'}
        if(choice==='billboard-win'){api.state.background='snack-run';api.state.sign='base'}
        if(choice==='day')api.state.sky='base';
        if(choice==='night')api.state.sky='night';
        api.applyLayers();syncButtons(api);
        scenarios.querySelectorAll('[data-presentation]').forEach(option=>option.setAttribute('aria-pressed',String(option===button)));
      });
    }
    return true;
  };

  if(!install())setTimeout(install,0);
})();
