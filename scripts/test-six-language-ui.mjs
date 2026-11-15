import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import path from 'node:path';import {createLocalePolicy} from '../lib/locale-routing.mjs';
const registry=JSON.parse(fs.readFileSync('data/i18n/market-locales.json')),policy=createLocalePolicy(registry),picker=JSON.parse(fs.readFileSync('public/city-picker.json'));
const langs=['ru','en','sr','es','de','pt-BR'],newLangs=['sr','es','de','pt-BR'];
assert.equal(registry.cities.length,100);assert.equal(policy.normalize('sr-Latn'),'sr');assert.equal(policy.normalize('es-MX'),'es');assert.equal(policy.normalize('de-AT'),'de');assert.equal(policy.normalize('pt-BR'),'pt-BR');assert.equal(policy.defaultForCity('montreal'),'fr-CA');
for(const lang of langs){assert(picker.copy[lang]);for(const [key,value] of Object.entries(picker.copy[lang]))assert(value,lang+' picker '+key);}
let routes=0,assets=0;
for(const city of picker.cities)for(const lang of langs){
 assert(policy.available(city.id).includes(lang),city.id+' '+lang);assert.equal(policy.choose(city.id,lang,'ru'),lang);assert.equal(policy.choose(city.id,null,lang),lang);
 const route=policy.path(city.path,lang),file='public'+route;assert(fs.existsSync(file),file);const h=fs.readFileSync(file,'utf8');assert(h.includes(`lang="${lang==='sr'?'sr-Latn':lang==='de'&&city.id==='bern'?'de-CH':lang}"`),file+' html lang');
 for(const id of ['eventsLayer','cityLayer'])assert(h.includes('id="'+id+'"'),file+' '+id);
 if(newLangs.includes(lang)){
  assert(h.includes('/'+policy.prefix(lang)+'/cities.html'),file+' localized city chooser');
  for(const match of h.matchAll(/\b(?:src|href)=["']([^"'#?]+\.(?:js|css))(?:\?[^"']*)?["']/g)){
   const url=match[1];if(/^(?:https?:|\/\/)/.test(url))continue;
   const asset=url.startsWith('/')?'public'+url:path.resolve(path.dirname(file),url);assert(fs.existsSync(asset),file+' missing '+url);assets++;
  }
  const script=city.id==='tbilisi'?'app.js':city.id+'/app.js';const app=fs.readFileSync('public/'+policy.prefix(lang)+'/'+script,'utf8');
  assert(app.includes('window.HappyMapCatalog.load'),file+' shared catalog source');assert(h.includes('/catalog-client.js?v='),file+' shared client binding');
  assert(!/language\s*=\s*document\.documentElement\.lang/.test(app),file+' language must not filter events');
  const publication=JSON.parse(fs.readFileSync('public/catalog/v1/manifest.json')).catalogs[city.id];assert.equal(publication.events.path,city.id==='tbilisi'?'/events.json':'/'+city.id+'/events.json');const projection=lang==='de'&&city.id==='flensburg'?publication.locales.de.events:publication.locales.en.events;assert(fs.existsSync('public'+projection.path),file+' reviewed text projection');
 }
 routes++;
}
// All 600 choices, including mismatched saved language, keep city, URL state and plans.
for(const city of picker.cities)for(const lang of langs){
 const current=policy.path(city.path,'en'),u=new URL(current+'?lang='+lang+'&period=week&location=manual#event=test','https://happymap.app');let destination;const storage=new Map([['happymap-interface-language','ru'],['morrow-city',city.id],['morrow-real-plans-v1','preserved']]);
 const document={documentElement:{lang:'en'},addEventListener(){}};
 vm.runInNewContext(fs.readFileSync('public/language-switch.js','utf8'),{window:{HappyMapLocalePolicy:policy},URL,URLSearchParams,location:{pathname:u.pathname,search:u.search,hash:u.hash,replace:p=>destination=p},document,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});
 assert.equal(document.documentElement.lang,lang==='sr'?'sr-Latn':lang==='de'&&city.id==='bern'?'de-CH':lang);assert.equal(storage.get('morrow-city'),city.id);assert.equal(storage.get('morrow-real-plans-v1'),'preserved');
 const next=new URL(destination||u.href,'https://happymap.app');assert.equal(policy.parse(next.pathname).city,city.id);assert.equal(next.searchParams.get('lang'),lang);assert.equal(next.searchParams.get('location'),'manual');assert.equal(next.hash,'#event=test');
}
// Source records, rather than UI language, determine the event set. UI prefixes
// share English/live data, except the bounded reviewed German Flensburg text mirror.
for(const lang of ['sr','es'])for(const city of picker.cities){const prefix=policy.prefix(lang),relative=city.id==='tbilisi'?'':city.id+'/';assert(!fs.existsSync('public/'+prefix+'/'+relative+'events.json'));}
for(const lang of newLangs){const root='public/'+policy.prefix(lang);for(const f of ['cities.html','friends.html','android.html','traffic-privacy.html','map.html','app.js','social.js','plan-account.js'])assert(fs.existsSync(root+'/'+f));
 const social=fs.readFileSync(root+'/social.js','utf8');assert(social.includes('sr|es'),'new prefixes recognized');assert(social.includes("API='/api/social/'"));
 const privacy=fs.readFileSync(root+'/traffic-privacy.html','utf8');assert(!privacy.includes('Stop counting my visits in this browser'));
}
console.log(`PASS: ${routes} city-language routes, ${assets} asset links; locale aliases; local French retained; shared catalogues; query/hash, city and plans preserved. DOM/VM simulation, not visual browser QA.`);
let redirects=0;
for(const city of picker.cities)for(const lang of newLangs){const p=policy.prefix(lang),file=`public/${p}/${city.id}/invite.html`;if(!fs.existsSync(file))continue;const h=fs.readFileSync(file,'utf8'),u=new URL(`https://happymap.app/${p}/${city.id}/invite.html?lang=${lang}&period=all#event=keep`);for(const m of h.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)){if(!m[1].includes('location.replace'))continue;let target;vm.runInNewContext(m[1],{URL,URLSearchParams,location:{href:u.href,origin:u.origin,pathname:u.pathname,search:u.search,hash:u.hash,replace:v=>target=v}});assert(target,file+' expected redirect');const next=new URL(target,u);assert.equal(policy.parse(next.pathname).explicit,lang,file+' same language');assert.equal(policy.parse(next.pathname).city,city.id,file+' same city');if(next.searchParams.has('lang'))assert.equal(next.searchParams.get('lang'),lang);if(m[1].includes('location.hash'))assert.equal(next.hash,'#event=keep');redirects++;}}
console.log('PASS: '+redirects+' localized invitation redirects retain language and city; existing query/hash forwarding retained.');
