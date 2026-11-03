import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {localeFromHosting} from '../lib/locale-policy.mjs';import {createLocalePolicy} from '../lib/locale-routing.mjs';
const registry=JSON.parse(fs.readFileSync('data/i18n/market-locales.json')),policy=createLocalePolicy(registry);
for(const [cf,language,source='hosting-ip'] of [
 [{country:'BR',city:'Brasília'},'pt-BR'],[{country:'BR',city:'Recife'},'pt-BR'],[{country:'DE',city:'Berlin'},'de'],[{country:'AT',city:'Vienna'},'de'],[{country:'CH',city:'Bern'},'de'],[{country:'CH',city:'Genève'},'en'],
 [{country:'GE',city:'Tbilisi'},'ru'],[{country:'RU',city:'Kazan'},'ru'],[{country:'AM',city:'Yerevan'},'ru'],[{country:'RS',city:'Belgrade'},'en'],[undefined,'en','fallback'],[{},'en','fallback']
 ])assert.deepEqual(localeFromHosting(cf),{language,source});
for(const c of registry.cities){assert(c.availableLocales.includes('en'));assert(c.availableLocales.includes('ru'));}
assert.equal(policy.defaultForCity('brasilia'),'pt-BR');assert.equal(policy.defaultForCity('bern'),'de');assert.equal(policy.defaultForCity('tbilisi'),'ru');assert.equal(policy.defaultForCity('paris'),'en');
function route(path,saved=null){const u=new URL(path,'https://happymap.app'),calls=[],storage=new Map([['happymap-interface-language',saved]]),document={documentElement:{lang:'en'},addEventListener(){}};
 vm.runInNewContext(fs.readFileSync('public/language-switch.js','utf8'),{window:{HappyMapLocalePolicy:policy},URL,URLSearchParams,AbortSignal,fetch:async()=>({ok:false}),location:{href:u.href,pathname:u.pathname,search:u.search,hash:u.hash,replace:p=>calls.push(p)},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},document});return {calls,lang:document.documentElement.lang};}
for(const [path,saved,language,target=null]of[
 ['/bern/map','en','ru'],['/en/bern/map','ru','en'],['/de/bern/map','ru','de-CH'],['/pt-br/brasilia/map',null,'pt-BR'],['/brasilia/map',null,'ru'],
 ['/en/bern/map?lang=ru','en','ru','/bern/map?lang=ru'],['/flensburg/map',null,'ru'],['/de/flensburg/map',null,'de'],
 ['/de/friends.html','ru','de'],['/de/about.html','ru','de'],['/pt-br/android.html',null,'pt-BR'],['/pt-br/cities.html?autoLang=pt-BR',null,'pt-BR'],
 ['/en/cities.html?autoLang=en',null,'en'],['/cities.html?autoLang=de',null,'de','/de/cities.html?autoLang=de']
 ]){const r=route(path,saved);assert.equal(r.lang,language,path);assert.deepEqual(r.calls,target?[target]:[],path);}
const cityData=JSON.parse(fs.readFileSync('public/city-picker.json'));
async function start(path,{city=null,manual=null,hint='en',flensburg=null,failed=false}={}){
 const u=new URL(path,'https://happymap.app'),calls=[],storage={'morrow-city':city,'happymap-interface-language':manual,'happymap-flensburg-language':flensburg};
 await vm.runInNewContext(fs.readFileSync('public/entry-language.js','utf8'),{window:{HappyMapLocalePolicy:policy},URLSearchParams,AbortSignal,location:{pathname:u.pathname,search:u.search,hash:u.hash,replace:p=>calls.push(p)},localStorage:{getItem:k=>storage[k]},fetch:async url=>{if(failed)throw Error('Offline');return {ok:true,json:async()=>url==='/city-picker.json'?cityData:{language:hint}}}});return calls[0];
}
assert.equal(await start('/',{hint:'pt-BR'}),'/pt-br/cities.html?autoLang=pt-BR');assert.equal(await start('/',{hint:'de'}),'/de/cities.html?autoLang=de');assert.equal(await start('/',{hint:'ru'}),'/cities.html?autoLang=ru');assert.equal(await start('/',{failed:true}),'/en/cities.html?autoLang=en');
assert.equal(await start('/',{city:'brasilia'}),'/pt-br/brasilia/index.html');assert.equal(await start('/',{city:'bern'}),'/de/bern/index.html');assert.equal(await start('/',{city:'moscow'}),'/moscow/index.html');
assert.equal(await start('/',{city:'bern',manual:'ru'}),'/bern/index.html');assert.equal(await start('/en/index.html',{city:'bern',manual:'ru'}),'/en/bern/index.html?lang=en');
assert.equal(await start('/',{city:'flensburg',flensburg:'de'}),'/de/flensburg/index.html');
for(const city of cityData.cities){const dir=city.id==='tbilisi'?'':city.id+'/';const a='public/'+dir+'events.json',b='public/en/'+dir+'events.json';if(fs.existsSync(a)&&fs.existsSync(b)){const ids=p=>JSON.parse(fs.readFileSync(p)).events.map(e=>e.id).sort();assert.deepEqual(ids(a),ids(b),city.id+' IDs');}}
console.log('PASS: '+cityData.cities.length+' cities retain RU+EN; available local defaults, hosted country/city fixtures, multilingual-country fallback, explicit RU/EN/local/shared routes, chooser/saved-city/offline entry, and event-ID parity. Fixtures are not real IP sessions.');
