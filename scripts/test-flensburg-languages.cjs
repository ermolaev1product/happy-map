const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const output=process.env.FLENSBURG_DE_OUTPUT||'public/de/flensburg',switchFile=process.env.FLENSBURG_SWITCH_FILE||'public/language-switch.js';
function route(url,{global='ru',saved=null,nav='ru-RU',disabled=false}={}){
 const u=new URL(url,'https://happymap.app'),calls=[],listeners={},storage=new Map([['happymap-interface-language',global],['happymap-flensburg-language',saved]]);
 const document={documentElement:{lang:'ru'},addEventListener:(n,f)=>listeners[n]=f};
 vm.runInNewContext(fs.readFileSync('public/locale-policy.js','utf8')+'\n'+fs.readFileSync(switchFile,'utf8'),{window:{},location:{pathname:u.pathname,search:u.search,hash:u.hash,replace:x=>calls.push(x)},document,localStorage:{getItem:k=>{if(disabled)throw Error();return storage.get(k)},setItem:(k,v)=>{if(disabled)throw Error();storage.set(k,v)}},navigator:{language:nav},URLSearchParams});return {calls,listeners,storage};
}
for(const [url,opts,target] of [
 ['/flensburg/',{},null],['/flensburg/',{nav:'de-DE'},null],['/flensburg/',{saved:'de'},null],
 ['/flensburg/?lang=ru&period=all#venue',{},null],['/en/flensburg/?lang=de&period=all#venue',{},'/de/flensburg/?lang=de&period=all#venue'],
 ['/en/flensburg/',{saved:'de'},null],['/de/flensburg/',{saved:'en'},null],['/de/flensburg/sources.html',{},null],
 ['/flensburg/',{disabled:true,nav:'de'},null],['/moscow/',{},null],['/en/moscow/',{},null],['/moscow/',{global:'en'},null]
])assert.deepEqual(route(url,opts).calls,target?[target]:[],url);
assert.equal(route('/de/flensburg/').storage.get('happymap-interface-language'),'ru');
assert.equal(route('/de/flensburg/').storage.get('happymap-flensburg-language'),null,'explicit URL does not silently replace saved choice');
const stub=new Proxy(function(){},{get:(o,k)=>k==='querySelector'?()=>stub:k==='querySelectorAll'?()=>[]:k==='classList'?{add(){},remove(){},toggle(){}}:k==='value'?'all':stub,apply:()=>stub,set:()=>true});
const ctx=vm.createContext({console,Intl,Date,URL,URLSearchParams,document:{documentElement:{lang:'de'},querySelector:()=>stub,querySelectorAll:()=>[]},localStorage:{getItem:()=>null},window:stub,location:{search:'',hash:''},history:stub,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},navigator:{},ResizeObserver:class{observe(){}},fetch:()=>{},Map,Set});
vm.runInContext(fs.readFileSync('public/discovery-model.js','utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(output,'app.js'),'utf8'),ctx);
assert.equal(vm.runInContext('cityFolder',ctx),'flensburg/');assert.equal(vm.runInContext('nearKey',ctx),'happy-map-near-flensburg-v1');
assert.equal(vm.runInContext('timeLabel("19:30")',ctx),'19:30');assert.equal(vm.runInContext('dateLabel("2026-10-18")',ctx),'Sonntag, 18. Oktober');
assert.equal(vm.runInContext('priceText({price:0})',ctx),'Kostenlos');assert.equal(vm.runInContext('priceText({price:10})',ctx),'€10');
assert.equal(vm.runInContext('eventCount(2)',ctx),'2 Veranstaltungen');assert.equal(vm.runInContext('placeCount(1)',ctx),'1 Ort');
assert.equal(vm.runInContext('languageLabel("DE")',ctx),'Deutsch');assert.equal(vm.runInContext('languageLabel("de/da")',ctx),'Deutsch / Dänisch');assert.equal(vm.runInContext('languageLabel("nds")',ctx),'Plattdeutsch');assert.equal(vm.runInContext('categories.find(c=>c.id==="music").name',ctx),'Musik');
assert.equal(vm.runInContext('accessLabel({accessType:"registration"})',ctx),'Ticket / Anmeldung');
const html=fs.readFileSync(path.join(output,'index.html'),'utf8');for(const phrase of ['lang="de"','Veranstaltung kostenlos hinzufügen','Veranstaltungen','Orte','Meine Pläne','Vorschau ansehen','Titel der Veranstaltung','Beginn'])assert(html.includes(phrase),phrase);
assert(!html.includes('CALIFORNIA'));assert(!html.includes('/palo-alto/android.html'));assert(html.includes('/de/flensburg/city-state.js'));assert(html.includes('/de/flensburg/map-space.js'));assert(html.includes('/de/flensburg/business-entry.js'));
for(const name of fs.readdirSync(output).filter(x=>x.endsWith('.js')))new vm.Script(fs.readFileSync(path.join(output,name),'utf8'),{filename:name});
for(const name of ['events.json','places.json','sources.json'])assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output,name),'utf8')),JSON.parse(fs.readFileSync('public/en/flensburg/'+name,'utf8')),name+' changed listing data');
console.log('PASS: Flensburg EN/DE route and saved preferences, RU city isolation, German controls/categories/dates/prices, 24-hour time, JS syntax, unchanged listing data');
const workerText=fs.readFileSync('build/sites-worker.ts','utf8');
const routeBlock=workerText.match(/    const cityUrl = new URL\(request.url\);[\s\S]*?(?=    let binding =)/)?.[0];
assert(routeBlock,'German entry redirect must happen before framework routing');
const entryRoute=new Function('request',routeBlock+'return null;');
for(const pathname of ['/de/flensburg','/de/flensburg/','/de/flensburg/index.html']){
 const response=entryRoute(new Request('https://happymap.app'+pathname+'?lang=de&period=all&tag=a&tag=b'));
 assert.equal(response.status,302);assert.equal(response.headers.get('location'),'https://happymap.app/de/flensburg/map?lang=de&period=all&tag=a&tag=b');
}
for(const pathname of ['/de/flensburg/map','/de/flensburg/map.html','/en/flensburg/','/flensburg/','/moscow/'])assert.equal(entryRoute(new Request('https://happymap.app'+pathname)),null,pathname);
assert.equal(entryRoute(new Request('https://happymap.app/de/flensburg/',{method:'POST'})),null);
console.log('PASS: bounded German entry bridge preserves queries, does not redirect map or other cities');
