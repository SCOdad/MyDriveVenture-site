(()=>{
  const form=document.getElementById('add-driver-form');
  if(!form)return;
  const zip=form.elements.home_zip,stage=form.elements.license_stage;
  const stages={
    MI:[['LEVEL_1','Learner / Level 1 license'],['LEVEL_2','Intermediate / Level 2 license'],['LEVEL_3','Full / Level 3 license']],
    KS:[['INSTRUCTION','Instruction permit'],['RESTRICTED','Restricted driver license'],['LESS_RESTRICTED','Less-restricted privileges'],['FULL','Non-restricted driver license']]
  };
  function stateFromZip(value){if(!/^\d{5}$/.test(value))return null;const n=Number(value);if(n>=48001&&n<=49971)return'MI';if(n>=66002&&n<=67954)return'KS';return null}
  function sync(){const raw=zip.value.trim(),state=stateFromZip(raw),prior=stage.value;if(raw.length===5&&!state)zip.setCustomValidity('Drive Venture currently supports Michigan and Kansas ZIP codes.');else zip.setCustomValidity('');const rows=state?stages[state]:[];stage.innerHTML=`<option value="">${state?'Choose one':'Enter a supported ZIP first'}</option>`+rows.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');stage.disabled=!state;if(rows.some(([v])=>v===prior))stage.value=prior}
  zip.addEventListener('input',sync);zip.addEventListener('change',sync);sync();
})();
