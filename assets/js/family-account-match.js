(()=>{
  const result=document.getElementById('grownup-account-result');
  if(!result)return;
  function enhance(){
    const text=(result.textContent||'').trim();
    const matched=text.startsWith('An existing Drive Venture account uses this email.');
    result.classList.toggle('family-account-match',matched);
    if(matched){
      result.innerHTML='<span class="family-account-match-icon" aria-hidden="true">👍</span><span><strong>Drive Venture account found.</strong><br><span>No other account, family, driver, or phone information is shown. Access will remain pending until they accept the invitation.</span></span>';
    }
  }
  new MutationObserver(enhance).observe(result,{childList:true,subtree:true,characterData:true});
  enhance();
})();