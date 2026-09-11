(() => {
  if(document.documentElement.dataset.dvRoute!=='bklg0128uat')return;

  const install=()=>{
    const api=window.DV_BKLG_0128_UAT;
    const presets=document.querySelector('.uat-presets');
    if(!api||!presets)return false;

    // UAT finding: a generic road should not be forced under destination scenery.
    api.state.road='off';
    api.applyLayers();
    document.querySelectorAll('[data-layer-row="road"] .uat-option').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.value==='off'));
    });

    if(!document.getElementById('bklg0128-composition-presets')){
      const group=document.createElement('div');
      group.id='bklg0128-composition-presets';
      group.className='uat-presets';
      group.setAttribute('aria-label','Billboard and scenery composition experiment');
      group.innerHTML='<button type="button" data-composition="scenery">Scenery Only</button><button type="button" data-composition="billboard">Billboard Only</button><button type="button" data-composition="both">Both</button>';
      presets.after(group);
      group.addEventListener('click',event=>{
        const button=event.target.closest('[data-composition]');
        if(!button)return;
        const choice=button.dataset.composition;
        api.resetBase();
        if(choice==='scenery')api.state.sign='off';
        if(choice==='billboard')api.state.background='off';
        if(choice==='both'){
          if(api.state.background==='off')api.state.background='park';
          api.state.sign='base';
        }
        if(choice==='scenery'&&api.state.background==='off')api.state.background='park';
        if(choice==='billboard')api.state.sign='base';
        api.state.road='off';
        api.applyLayers();
        document.querySelectorAll('.uat-option').forEach(option=>option.setAttribute('aria-pressed',String(api.state[option.dataset.layer]===option.dataset.value)));
        group.querySelectorAll('[data-composition]').forEach(option=>option.setAttribute('aria-pressed',String(option===button)));
      });
    }
    if(!document.getElementById('bklg0128-behavior-presets')){
      const group=document.createElement('div');group.id='bklg0128-behavior-presets';group.className='uat-presets';
      group.innerHTML=[['none','No scenery'],['persistent','Persistent scenery'],['scenery','Scenery-only award'],['mixed','Billboard + scenery'],['order','Display order first'],['xp','XP tie-break'],['key','Quest key tie-break'],['day','Day'],['night','Night']].map(([id,label])=>`<button type="button" data-presentation-scenario="${id}">${label}</button>`).join('');
      presets.after(group);
      group.addEventListener('click',event=>{const button=event.target.closest('[data-presentation-scenario]');if(button)api.showRuntime(button.dataset.presentationScenario)});
    }
    return true;
  };

  if(!install())setTimeout(install,0);
})();
