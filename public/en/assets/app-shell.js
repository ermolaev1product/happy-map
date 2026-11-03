const downloadLink=document.querySelector('.app-download'), moreMenu=document.querySelector('.more-menu');
if(downloadLink&&moreMenu)moreMenu.before(downloadLink);
if(location.hostname==='appassets.androidplatform.net'){
 document.documentElement.classList.add('native-app');
 // Accounts are web-only in this preview. Keep their controls useful.
 document.addEventListener('click',event=>{
  const button=event.target.closest('#visitorButton,.social-nav,[data-social-open],[data-presence]');
  if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  location.href='https://happymap.app'+location.pathname+'#friends';
 },true);
 const profile=document.getElementById('visitorButton');
 if(profile)profile.textContent=document.documentElement.lang==='en'?'My profile · on the website ↗':'My profile · for сайте ↗';
}
