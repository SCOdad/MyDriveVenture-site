(()=>{
  const params=new URLSearchParams(location.search),invite=params.get('invite');
  if(!invite)return;
  const authBox=document.getElementById('family-auth-needed');
  if(!authBox)return;
  const link=authBox.querySelector('a[href^="/log/"]');
  if(link){
    const returnTo=`/family/?invite=${encodeURIComponent(invite)}`;
    link.href=`/log/?return=${encodeURIComponent(returnTo)}`;
    link.textContent='Sign in to accept invitation';
  }
  const p=authBox.querySelector('p');
  if(p)p.textContent='Sign in with the email address that received this invitation. After sign-in, we’ll bring you back here to review and accept it.';
})();
