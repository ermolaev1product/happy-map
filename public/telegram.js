/* Telegram UI bridge only. No identity, account linking, contact or location requests. */
(() => {
 'use strict';
 if(window.HappyMapTelegramBridge)return;window.HappyMapTelegramBridge=true;
 // Preserve presentation context through in-app navigation, including blocked session storage.
 document.addEventListener('click',event=>{
  const a=event.target.closest('a[href]');if(!a||a.hasAttribute('download')||a.target==='_blank')return;
  const url=new URL(a.href,location.href);
  if(url.origin!==location.origin||/\/(?:api|downloads)\//.test(url.pathname)||!/(?:\.html|\/|\/map|\/cities)$/.test(url.pathname))return;
  if(/^\/(?:en\/)?(?:index\.html)?$/.test(url.pathname))url.pathname='/telegram.html';
  url.searchParams.set('miniapp','telegram');a.href=url.href;
 },true);
 function connect(){
  const tg=window.Telegram?.WebApp;
  if(!tg||!tg.platform||tg.platform==='unknown')return;
  const root=document.documentElement;root.classList.add('telegram-app');
  const css=document.createElement('link');css.rel='stylesheet';css.href='/telegram.css?v=1';document.head.append(css);
  function viewport(){
   const height=Number(tg.viewportStableHeight);if(height>0)root.style.setProperty('--hm-tg-height',height+'px');
   for(const edge of ['top','bottom','left','right']){
    const safe=Math.max(0,Number(tg.safeAreaInset?.[edge])||0),content=Math.max(0,Number(tg.contentSafeAreaInset?.[edge])||0);
    root.style.setProperty('--hm-tg-'+edge,(safe+content)+'px');
   }
   window.dispatchEvent(new Event('resize'));
  }
  const picker=()=>document.querySelector('.picker-back:not([hidden])');
  const openDialog=()=>[...document.querySelectorAll('dialog[open]')].at(-1);
  const menu=()=>document.querySelector('.more-menu[open],.map-options[open]');
  const plans=()=>document.body.classList.contains('plan-view');
  const chooser=()=>/^\/(?:en\/)?cities(?:\.html)?\/?$/.test(location.pathname);
  function syncBack(){const canGoBack=openDialog()||menu()||picker()||plans()||!chooser();canGoBack?tg.BackButton?.show():tg.BackButton?.hide();}
  function back(){
   const dialog=openDialog();if(dialog){dialog.close();syncBack();return;}
   const expanded=menu();if(expanded){expanded.open=false;syncBack();return;}
   const countryBack=picker();if(countryBack){countryBack.click();syncBack();return;}
   if(plans()){document.getElementById('exploreTab')?.click();syncBack();return;}
   if(!chooser()){const lang=document.documentElement.lang;location.assign('/cities.html?miniapp=telegram&lang='+encodeURIComponent(lang));}
  }
  function ready(){
   viewport();tg.expand?.();tg.ready?.();syncBack();
   tg.BackButton?.onClick(back);
   const observer=new MutationObserver(syncBack);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','class','hidden']});
   window.addEventListener('popstate',syncBack);window.addEventListener('hashchange',syncBack);
   for(const name of ['viewportChanged','safeAreaChanged','contentSafeAreaChanged'])tg.onEvent?.(name,viewport);
   window.addEventListener('pagehide',event=>{if(event.persisted)return;observer.disconnect();tg.BackButton?.offClick(back);for(const name of ['viewportChanged','safeAreaChanged','contentSafeAreaChanged'])tg.offEvent?.(name,viewport);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
 }
 if(window.Telegram?.WebApp)connect();
 else{const sdk=document.createElement('script');sdk.src='https://telegram.org/js/telegram-web-app.js?64';sdk.onload=connect;document.head.append(sdk);}
})();
