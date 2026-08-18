(() => {
  if (document.documentElement.dataset.experience !== 'game') return;
  function requirement(model,type,fallback){const r=(model.license_requirements||[]).find(x=>x.license_stage==='LEVEL_2'&&x.requirement_type===type);const n=Number(r?.value_text);return Number.isFinite(n)?n:fallback}
  function apply(e){const {model,driverId,progress}=e.detail||{};if(!model||!driverId)return;const dash=document.querySelector('.dashboard-console');if(!dash)return;const pTarget=requirement(model,'MinimumPracticeHours',50),nTarget=requirement(model,'MinimumNightHours',10);const p=Math.min(100,Number(progress?.total_minutes||0)/(pTarget*60)*100);const n=Math.min(100,Number(progress?.night_minutes||0)/(nTarget*60)*100);dash.style.setProperty('--practice-p',String(Math.max(0,p)));dash.style.setProperty('--night-p',String(Math.max(0,n)))}
  window.addEventListener('dv:dashboard-rendered',apply);
})();