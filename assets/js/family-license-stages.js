(()=>{
  const form=document.getElementById('add-driver-form');
  if(!form)return;
  const zip=form.elements.home_zip,stage=form.elements.license_stage,date=form.elements.license_stage_start_date;
  const stageLabel=document.getElementById('family-license-stage-label'),dateLabel=document.getElementById('family-stage-date-label');
  if(!zip||!stage||!date)return;
  const STAGES={
    MI:[['LEVEL_1','Learner / Level 1 permit'],['LEVEL_2','Intermediate / Level 2 license'],['LEVEL_3','Full / Level 3 license']],
    KS:[['INSTRUCTION','Instruction permit'],['RESTRICTED','Restricted driver license (age 15 path)'],['LESS_RESTRICTED','Less-restricted privileges'],['FULL','Non-restricted driver license']]
  };
  function stateFromZip(value){
    if(!/^\d{5}$/.test(value))return null;
    const n=Number(value);
    if(n>=48001&&n<=49971)return'MI';
    if(n>=66002&&n<=67954)return'KS';
    return'STATE_NEUTRAL';
  }
  function render(){
    const value=String(zip.value||'').trim(),state=stateFromZip(value),prior=stage.value;
    zip.setCustomValidity('');
    if(!state){
      stage.innerHTML='<option value="">Enter ZIP to choose tracking mode</option>';
      stage.value='';
      stageLabel.innerHTML='License / tracking mode <span class="required-marker">*</span>';
      dateLabel.innerHTML='Permit / current-stage issue date <span class="required-marker">*</span>';
      date.required=true;
      return;
    }
    if(state==='STATE_NEUTRAL'){
      stage.innerHTML='<option value="STATE_NEUTRAL">State-neutral practice tracking</option>';
      stage.value='STATE_NEUTRAL';
      stageLabel.innerHTML='Tracking mode <span class="required-marker">*</span>';
      dateLabel.innerHTML='Practice tracking start date <span class="meta">(optional)</span>';
      date.required=false;
      return;
    }
    const choices=STAGES[state];
    stageLabel.innerHTML='License stage <span class="required-marker">*</span>';
    dateLabel.innerHTML='Permit / current-stage issue date <span class="required-marker">*</span>';
    date.required=true;
    stage.innerHTML='<option value="">Choose one</option>'+choices.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
    stage.value=choices.some(([v])=>v===prior)?prior:'';
  }
  zip.addEventListener('input',render);
  zip.addEventListener('change',render);
  form.addEventListener('reset',()=>setTimeout(render,0));
  document.querySelectorAll('[data-open-panel="driver"]').forEach(button=>button.addEventListener('click',()=>setTimeout(render,0)));
  render();
})();