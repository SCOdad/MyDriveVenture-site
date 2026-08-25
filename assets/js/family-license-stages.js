(()=>{
  const form=document.getElementById('add-driver-form');
  if(!form)return;
  const zip=form.elements.home_zip,stage=form.elements.license_stage;
  if(!zip||!stage)return;
  const STAGES={
    MI:[['LEVEL_1','Learner / Level 1 permit'],['LEVEL_2','Intermediate / Level 2 license'],['LEVEL_3','Full / Level 3 license']],
    KS:[['INSTRUCTION','Instruction permit'],['RESTRICTED','Restricted driver license (age 15 path)'],['LESS_RESTRICTED','Less-restricted privileges'],['FULL','Non-restricted driver license']]
  };
  function stateFromZip(value){if(!/^\d{5}$/.test(value))return null;const n=Number(value);if(n>=48001&&n<=49971)return'MI';if(n>=66002&&n<=67954)return'KS';return null}
  function render(){
    const value=String(zip.value||'').trim(),state=stateFromZip(value),prior=stage.value;
    zip.setCustomValidity(value.length===5&&!state?'Drive Venture currently supports Michigan and Kansas ZIP codes.':'');
    if(!state){stage.innerHTML='<option value="">Enter ZIP to choose license stage</option>';stage.value='';return}
    const choices=STAGES[state];
    stage.innerHTML='<option value="">Choose one</option>'+choices.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
    stage.value=choices.some(([v])=>v===prior)?prior:'';
  }
  zip.addEventListener('input',render);
  zip.addEventListener('change',render);
  form.addEventListener('reset',()=>setTimeout(render,0));
  document.querySelectorAll('[data-open-panel="driver"]').forEach(button=>button.addEventListener('click',()=>setTimeout(render,0)));
  render();
})();