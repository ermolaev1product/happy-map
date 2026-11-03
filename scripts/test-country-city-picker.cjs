const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const policyContext={window:{}};vm.runInNewContext(fs.readFileSync('public/locale-policy.js','utf8'),policyContext);const policy=policyContext.window.HappyMapLocalePolicy;
const data=JSON.parse(fs.readFileSync('public/city-picker.json'));
const box={module:{exports:{}}};vm.runInNewContext(fs.readFileSync('public/city-picker.js','utf8'),box);
const {collectCities,matching}=box.module.exports;
assert.equal(new Set(data.cities.map(c=>c.id)).size,data.cities.length);
for(const c of data.cities){assert(fs.existsSync('public/'+c.path),c.path);assert(data.countries[c.country]);for(const lang of ['ru','en','de'])assert(c.name[lang]);}
assert.equal(matching(data.cities,'  МОСКВА ')[0].id,'moscow');assert.equal(matching(data.cities,'Jerewan')[0].id,'yerevan');assert.equal(matching(data.cities,'tiflis')[0].id,'tbilisi');assert.equal(matching(data.cities,'no such city').length,0);
// Every advertised registry entry must have a real route (checked above).
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attrs={};this.dataset={};this.listeners={};this.value='';this.className='';this.classList={toggle:(name,on)=>{const classes=new Set(this.className.split(' '));on?classes.add(name):classes.delete(name);this.className=[...classes].join(' ');}};}
 append(...nodes){this.children.push(...nodes);} before(node){this.beforeNode=node;} after(node){this.afterNode=node;} replaceChildren(...nodes){this.children=nodes;}
 setAttribute(k,v){this.attrs[k]=v;} removeAttribute(k){delete this.attrs[k];} getAttribute(k){return this[k]??this.attrs[k];}
 addEventListener(k,f){this.listeners[k]=f;} focus(){this.focused=true;} click(){this.listeners.click?.({preventDefault(){}});}
 set textContent(t){this.text=String(t);} get textContent(){return this.text??this.children.map(c=>c.textContent).join('');}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 querySelectorAll(s){const matches=e=>s==='a[data-city]'?e.tagName==='a'&&e.dataset.city:s.startsWith('.')?e.className.split(' ').includes(s.slice(1)):s.startsWith('#')?e.id===s.slice(1):e.tagName===s;return this.children.flatMap(c=>[...(matches(c)?[c]:[]),...c.querySelectorAll(s)]);}
}
const card=(id,name,country,href)=>{const e=new Element('a');e.dataset.city=id;e.href=href;const n=new Element('strong');n.textContent=name;const c=new Element('small');c.textContent=country;e.append(n,c);return e;};
// A parallel city's source-card addition survives even if not in this metadata file.
assert(collectCities(data,[card('future-city','Future City','New Country · local currency','future-city/index.html')],'en').some(c=>c.id==='future-city'&&c.country==='New Country'));
assert.equal(collectCities(data,[card('new-georgian-city','New City','Georgia · local currency','new-city/index.html')],'en').find(c=>c.id==='new-georgian-city').country,'GE');
// The picker owns three-language selection without changing established city-map routing.
for(const [path,requested,nav,expected] of [['/cities.html','de','en','de'],['/en/cities.html','','ru','en'],['/cities.html','','de-DE','en'],['/cities.html','ru','en','ru']]){
 const doc={documentElement:{lang:'ru'},addEventListener(){}};
 vm.runInNewContext(fs.readFileSync('public/language-switch.js','utf8'),{window:{HappyMapLocalePolicy:policy},document:doc,location:{pathname:path,search:requested?'?lang='+requested:'',replace(){}},AbortSignal,fetch:async()=>({ok:false}),navigator:{language:nav},localStorage:{getItem:()=>null,setItem(){}},URLSearchParams});
 assert.equal(doc.documentElement.lang,expected);
}
async function ui(lang='en',saved='yerevan',blocked=false,failed=false,automatic=false){
 const list=new Element();list.className='city-cards';
 for(const c of data.cities.filter(c=>c.id!=='flensburg'))list.append(card(c.id,c.name[lang],data.countries[c.country][lang],c.path));
 const intro=new Element();for(const tag of ['div','h1','p']){const el=new Element(tag);if(tag==='div')el.className='eyebrow';intro.append(el);}
 const note=new Element(),storage=new Map([['morrow-city',saved],['plans','keep-me']]),windowListeners={},states=[];
 let url=new URL('https://happymap.app/'+(lang==='en'?'en/':'')+'cities.html?'+(automatic?'autoLang=':'lang=')+lang);
 const location={get href(){return url.href},get hash(){return url.hash},get pathname(){return url.pathname},get search(){return url.search}};
 const document={documentElement:{lang},currentScript:{src:'https://happymap.app/'+(lang==='en'?'en/':'')+'city-picker.js'},querySelector:s=>s==='.city-cards'?list:s==='.choose-intro'?intro:s==='.city-note'?note:null,createElement:t=>new Element(t)};
 let fetched;const context={document,location,URL,URLSearchParams,console,fetch:async u=>{fetched=String(u);return {ok:!failed,json:async()=>data};},localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return storage.get(k);},setItem:(k,v)=>{if(blocked)throw Error('blocked');storage.set(k,v);}},history:{pushState:(_,__,u)=>{states.push(url.href);url=new URL(u);},replaceState:(_,__,u)=>{url=new URL(u);}},Intl,window:{HappyMapLocalePolicy:policy,addEventListener:(k,f)=>windowListeners[k]=f}};
 vm.runInNewContext(fs.readFileSync('public/city-picker.js','utf8'),context);await new Promise(setImmediate);
 return {list,controls:list.beforeNode,status:list.afterNode,storage,states,windowListeners,fetched,location,pop:()=>{url=new URL(states.pop());windowListeners.popstate();}};
}
(async()=>{
 for(const lang of ['ru','en','de']){
  const u=await ui(lang);assert.equal(u.fetched,'https://happymap.app/city-picker.json');
  assert.equal(u.list.children.length,new Set(data.cities.map(c=>c.country)).size);assert(u.list.children.every(c=>c.tagName==='button'));
  const resume=u.controls.querySelector('.picker-resume');assert(resume.textContent.includes(data.cities.find(c=>c.id==='yerevan').name[lang]));assert.equal(new URL(resume.href).pathname,policy.path('yerevan/index.html',policy.choose('yerevan',lang,null)));assert.equal(new URL(resume.href).searchParams.get('lang'),policy.available('yerevan').includes(lang)?lang:null);assert.equal(new URL(resume.href).searchParams.get('location'),'city');
  u.list.children.find(c=>c.dataset.country==='AM').click();assert.equal(u.list.children.length,1);assert.equal(u.list.children[0].dataset.city,'yerevan');assert(u.location.hash.includes('country=AM'));
  assert(u.controls.querySelector('h2').focused);u.pop();assert.equal(u.list.children.length,new Set(data.cities.map(c=>c.country)).size);
  u.list.children.find(c=>c.dataset.country==='US').click();assert.equal(u.list.children.find(c=>c.dataset.city==='palo-alto').href,'https://happymap.app'+policy.path('palo-alto/index.html',policy.choose('palo-alto',lang,null))+(policy.available('palo-alto').includes(lang)?'?lang='+lang+'&':'?')+'location=city');
  const input=u.controls.querySelector('input');input.value='Москва';input.listeners.input();assert.equal(u.list.children[0].dataset.city,'moscow','Search crosses country boundary');
  input.value='missing city';input.listeners.input();assert.equal(u.list.children.length,0);assert.equal(u.status.hidden,false);
  input.listeners.keydown({key:'Escape',preventDefault(){}});assert(u.list.children.some(c=>c.dataset.city==='palo-alto'));assert(input.focused);
  u.controls.querySelector('.picker-back').click();assert.equal(u.list.children.length,new Set(data.cities.map(c=>c.country)).size);
  u.list.children.find(c=>c.dataset.country==='DE').click();const flensburg=u.list.children.find(c=>c.dataset.city==='flensburg');assert(flensburg);if(lang==='de')assert.equal(flensburg.href,'https://happymap.app/de/flensburg/index.html?lang=de&location=city');
  flensburg.click();assert.equal(u.storage.get('morrow-city'),'flensburg');assert.equal(u.storage.get('plans'),'keep-me');
 }
 const automatic=await ui('en',null,false,false,true);automatic.list.children.find(c=>c.dataset.country==='CH').click();assert.equal(automatic.list.children[0].href,'https://happymap.app/de/bern/index.html?location=city');automatic.controls.querySelector('.picker-back').click();automatic.list.children.find(c=>c.dataset.country==='RU').click();assert.equal(automatic.list.children.find(c=>c.dataset.city==='moscow').href,'https://happymap.app/moscow/index.html?location=city');
 assert(!(await ui('en','unknown')).controls.querySelector('.picker-resume'));
 const blocked=await ui('en',null,true);blocked.list.children[0].click();blocked.list.children[0].click();assert.equal(blocked.storage.get('plans'),'keep-me');
 const failed=await ui('en',null,false,true);assert.equal(failed.list.children.length,data.cities.length-1);assert(failed.list.children.every(e=>e.tagName==='a'));
 for(const file of ['public/index.html','public/en/index.html','public/app-start.html']){
  const html=fs.readFileSync(file,'utf8');assert(html.includes('/entry-language.js'));
  const code=fs.readFileSync('public/entry-language.js','utf8');
  for(const saved of [null,'unknown',...data.cities.map(c=>c.id)]){
   let destination;await vm.runInNewContext(code,{window:{HappyMapLocalePolicy:policy},URLSearchParams,AbortSignal,fetch:async url=>({ok:true,json:async()=>url==='/city-picker.json'?data:{language:'en'}}),localStorage:{getItem:key=>key==='morrow-city'?saved:null},location:{pathname:'/index.html',search:'?lang=en',hash:'#keep',replace:value=>destination=value}});
   const city=data.cities.find(c=>c.id===saved);assert.equal(destination,city?'/en/'+city.path+'?lang=en#keep':'/en/cities.html?lang=en&autoLang=en#keep',file+' remembered city '+saved);
  }
 }
 assert(/redirect\('\/index.html'\s*\+/.test(fs.readFileSync('app/page.tsx','utf8')));
 console.log('PASS: '+data.cities.length+' active cities/countries, RU/EN/DE labels, cross-script search, future source-card preservation, country navigation, history back, Escape/clear, empty state, last-city shortcut, blocked storage/fetch fallback, plans untouched, saved-city return and country-first entry. DOM simulation only; no browser visual QA.');
})().catch(e=>{console.error(e);process.exitCode=1;});
