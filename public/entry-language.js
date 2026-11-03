/* First entry uses completed UI locales only. Never request GPS for language. */
(async () => {
 const policy=window.HappyMapLocalePolicy;
 if(!policy){location.replace('/en/cities.html'+location.search+location.hash);return;}
 const query=new URLSearchParams(location.search),requested=policy.normalize(query.get('lang'));
 const parsed=policy.parse(location.pathname),explicit=requested||parsed.explicit;
 let savedCity,manual,flensburg;try{savedCity=localStorage.getItem('morrow-city');manual=localStorage.getItem('happymap-interface-language');flensburg=localStorage.getItem('happymap-flensburg-language')}catch{}
 if(explicit&&!requested)query.set('lang',explicit);
 let chosen=explicit||policy.normalize(manual),page='/cities.html',city;
 try{const r=await fetch('/city-picker.json',{signal:AbortSignal.timeout(2500)});if(r.ok){const data=await r.json();city=data.cities.find(c=>c.id===savedCity);if(city&&/^[a-z0-9/-]+\.html$/.test(city.path))page='/'+city.path;}}catch{}
 if(city){chosen=policy.choose(city.id,explicit,manual||(city.id==='flensburg'?flensburg:null));}
 else if(!chosen){try{const r=await fetch('/api/locale',{cache:'no-store',signal:AbortSignal.timeout(2000)});if(r.ok)chosen=policy.normalize((await r.json()).language);}catch{}}
 chosen=chosen||'en';
 if(!city)query.set('autoLang',chosen);
 location.replace(policy.path(page,chosen)+(query.size?'?'+query:'')+location.hash);
})();
