// Telegram is a presentation context only, never an authentication source.
(() => {
 if(typeof window==='undefined')return;
 let active=new URLSearchParams(location.search).get('miniapp')==='telegram'||/tgWebApp(?:Data|Version|Platform)=/.test(location.hash);
 try{active=active||sessionStorage.getItem('happymap-telegram-session')==='1';if(active)sessionStorage.setItem('happymap-telegram-session','1');}catch{}
 if(!active)return;
 window.HappyMapTelegram=true;
 const script=document.createElement('script');script.src='/telegram.js?v=1';script.defer=true;document.head.append(script);
})();
(() => {
 const policy=window.HappyMapLocalePolicy;
 if(!policy)return; // Original static localized content remains usable if loading fails.
 const params=new URLSearchParams(location.search),requested=policy.normalize(params.get('lang'));
 const parsed=policy.parse(location.pathname),chooser=/^\/cities(?:\.html)?\/?$/.test(parsed.raw);
 let saved;try{saved=localStorage.getItem('happymap-interface-language')}catch{}
 if(!saved&&parsed.city==='flensburg'){try{saved=localStorage.getItem('happymap-flensburg-language')}catch{}}
 const globalReady=Object.keys(policy.registry.locales).filter(code=>policy.registry.locales[code].uiAvailable!==false);
 let selected;
 if(chooser){
  selected=[requested,parsed.explicit,policy.normalize(saved),policy.normalize(params.get('autoLang')),'en'].find(code=>globalReady.includes(code));
  if(!requested&&!parsed.explicit&&!saved&&!params.has('autoLang')){
   try{fetch('/api/locale',{cache:'no-store',signal:AbortSignal.timeout(2000)}).then(r=>r.ok?r.json():null).then(data=>{
    const hint=policy.normalize(data?.language);if(hint&&hint!==selected&&globalReady.includes(hint)){const u=new URL(location.href);u.pathname=policy.path('/cities.html',hint);u.searchParams.set('autoLang',hint);location.replace(u.pathname+u.search+u.hash);}
   }).catch(()=>{});}catch{}
  }
 }else{
  // Existing unprefixed RU URLs and explicit locale prefixes stay indexable.
  selected=parsed.city?policy.choose(parsed.city,requested||parsed.explicit||'ru',saved):[requested||parsed.explicit||'ru',policy.normalize(saved),'en','ru'].find(code=>policy.sharedAvailable(parsed.raw).includes(code));
 }
 if(requested){try{localStorage.setItem('happymap-interface-language',requested)}catch{}}
 document.documentElement.lang=selected==='de'&&parsed.city==='bern'?'de-CH':selected;
 const targetPath=policy.path(parsed.raw==='/'?'/index.html':parsed.raw,selected);
 // Chooser layout is genuinely localized, not a document-lang relabel of Russian HTML.
 if(targetPath!==location.pathname){location.replace(targetPath+location.search+location.hash);return;}
 const ready=chooser?globalReady:parsed.city?policy.available(parsed.city):policy.sharedAvailable(parsed.raw);
 const defaultLocale=chooser?selected:policy.defaultForCity(parsed.city);
 const order=[defaultLocale,'en','ru',...ready].filter((code,i,list)=>ready.includes(code)&&list.indexOf(code)===i);
 document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.language-switch').forEach(el=>el.remove());
  const group=document.createElement('span');group.className='language-switch';group.setAttribute('aria-label',selected==='ru'?'Язык':selected==='de'?'Sprache':selected==='pt-BR'?'Idioma':selected==='fr-CA'?'Langue':'Language');
  for(const code of order){const a=document.createElement('a'),q=new URLSearchParams(location.search);q.set('lang',code);q.delete('autoLang');a.textContent=code==='pt-BR'?'PT':code==='fr-CA'?'FR':code.toUpperCase();a.lang=code;a.title=policy.registry.locales[code]?.label||code;a.href=policy.path(parsed.raw,code)+'?'+q+location.hash;if(code===selected)a.setAttribute('aria-current','true');a.onclick=()=>{try{localStorage.setItem('happymap-interface-language',code)}catch{}};group.append(a);}
  const header=document.querySelector('.header,header');if(header)header.append(group);else{group.style.cssText='position:fixed;right:12px;top:12px;z-index:9999;background:white;border-radius:12px;padding:8px';document.body.append(group);}
 });
})();
