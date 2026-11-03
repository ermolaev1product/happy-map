'use strict';
// Focused, source-level regression tests. No browser, network, feed writes or deployment.
// Run with node --expose-gc scripts/test-conference-filters.cjs for bounded fixture memory.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const cities=JSON.parse(fs.readFileSync('public/city-picker.json')).cities;
const roots=cities.flatMap(c=>['','en/'].map(locale=>({city:c.id,locale,path:locale+c.path})));
let checks=0;const failures=[];
function equal(actual,expected,label){checks++;if(JSON.stringify(actual)!==JSON.stringify(expected))failures.push({label,expected,actual});}
function truth(actual,label){equal(!!actual,true,label);}
function element(tag='div'){
 const attributes={},classes=new Set(),queries=new Map();let text='',html='';
 const node={tagName:tag.toUpperCase(),attributes,classes,value:'all',children:[],dataset:{},hidden:false,style:{},
  classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,on){on??=!classes.has(x);on?classes.add(x):classes.delete(x);return on;}},
  setAttribute(k,v){attributes[k]=String(v);},getAttribute:k=>attributes[k]??null,removeAttribute:k=>delete attributes[k],
  querySelector(selector){
   const match=n=>selector[0]==='#'?n.id===selector.slice(1):selector.startsWith('[data-')?(()=>{const m=selector.match(/^\[data-([\w-]+)(?:="([^"]*)")?\]$/),key=m?.[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return !!m&&key in n.dataset&&(m[2]===undefined||n.dataset[key]===m[2]);})():n.tagName===selector.toUpperCase();
   for(const child of node.children){if(match(child))return child;}
   if(selector.startsWith('[data-'))return null;
   if(!queries.has(selector))queries.set(selector,element(selector==='p'?'p':'div'));return queries.get(selector);
  },querySelectorAll:()=>[],closest:()=>element(),replaceChildren(...children){node.children=children;},
  addEventListener(){},getBoundingClientRect:()=>({width:390,height:844}),append(...children){node.children.push(...children);},after(){},before(){},insertAdjacentHTML(){},focus(){},click(){node.onclick?.();}};
 Object.defineProperty(node,'textContent',{get(){return text;},set(value){text=String(value);html='';node.children=[];queries.clear();}});
 Object.defineProperty(node,'innerHTML',{get(){return html;},set(value){html=String(value);text='';node.children=[];queries.clear();}});
 return new Proxy(node,{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
}
function fixture(root,{sentinels=true,locationControl=false}={}){
 // The runner's explicit GC flag prevents completed VM contexts accumulating across routes.
 global.gc?.();
 const html=fs.readFileSync('public/'+root.path,'utf8'),nodes=new Map(),lookup=s=>{if(!nodes.has(s))nodes.set(s,element());return nodes.get(s);};
 const asset=name=>{const src=[...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>m[1]).find(s=>s.split('?')[0].endsWith('/'+name)||s.split('?')[0]===name);if(!src)throw Error(root.path+': missing '+name);return 'public'+new URL(src,'https://happymap.app/'+root.path).pathname;};
 const storage=new Map(),geo={calls:0,success:null};const browserWindow=element();browserWindow.isSecureContext=true;browserWindow.HappyMapTelegram=null;
 const ctx=vm.createContext({console,Intl,Date,URL,URLSearchParams,Map,Set,AbortController,__now:Date.parse('2026-10-16T16:31:00Z'),
  document:{querySelector:lookup,querySelectorAll:()=>[],getElementById:id=>lookup('#'+id),createElement:element,body:element(),documentElement:{lang:root.locale?'en':'ru'},addEventListener(){}},
  localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},window:browserWindow,
  location:{search:'?category=conference',hash:'',pathname:'/'+root.path,href:'https://happymap.app/'+root.path,hostname:'happymap.app'},history:element(),
  setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,requestAnimationFrame(){},navigator:locationControl?{geolocation:{getCurrentPosition(success){geo.calls++;geo.success=success;}}}:{},ResizeObserver:class{observe(){}},fetch:()=>new Promise(()=>{})});
 const run=s=>vm.runInContext(s,ctx),json=s=>JSON.parse(run('JSON.stringify('+s+')'));
 run('Date=class extends Date{constructor(...args){super(...(args.length?args:[__now]));}static now(){return __now;}};');
 for(const name of ['discovery-model.js','app.js'])run(fs.readFileSync(asset(name),'utf8'));
 run('initMap=()=>{};fitMap=()=>{};');
 if(locationControl)run(fs.readFileSync(asset('location-control.js'),'utf8'));
 run(fs.readFileSync(asset('discovery.js'),'utf8'));
 run('globalThis.__beforeCatalogVisible=visible;');
 let modes=fs.readFileSync('public/catalog-modes.js','utf8');
 if(sentinels){const extra=['near','far','unknown'].map(id=>({city:root.city,id:'fixture:'+id,date:'2026-10-17',topics:['ai'],format:'conference'}));modes=modes.replace('const reviewed=[','const reviewed=['+extra.map(x=>JSON.stringify(x)).join(',')+',');}
 run(modes);
 run("catalog={generatedAt:'2026-10-16',startDate:'2026-10-16',endDate:'2026-11-13'};dates=['2026-10-16','2026-10-17','2026-10-18','2026-10-19','2026-10-20','2026-10-21','2026-10-22'];if(typeof catalogDates!=='undefined')catalogDates=[...dates];initMap();day=1;category='conference';render();");
 const state=()=>json("({category,language,radius,freeOnly,time,searchTerm,day,position,layer,view,access:typeof accessFilter==='undefined'?null:accessFilter,hideCinema:typeof hideCinema==='undefined'?null:hideCinema})");
 const buttons=()=>nodes.get('#discoveryNote').children;
 return {ctx,run,json,nodes,storage,geo,state,buttons};
}
function seed(f){f.run("events=[{id:'fixture:near',title:'Near AI',category:'talk',date:'2026-10-17',time:'10:00',end:'11:00',timezone:'UTC',price:0,language:'ru',lat:position[0]+.0001,lng:position[1],accessType:'public'},{id:'fixture:far',title:'Far AI',category:'talk',date:'2026-10-17',time:'19:00',end:'21:00',timezone:'UTC',price:20,language:'EN/RU',lat:position[0]+.02,lng:position[1],accessType:'registration'},{id:'fixture:unknown',title:'Unknown AI',category:'talk',date:'2026-10-17',time:'14:00',end:'15:00',timezone:'UTC',price:0,language:['en','ru-RU'],lat:null,lng:null,accessType:'guest_only'}];places=[];venueIndex=null;day=1;layer='events';view='explore';category='conference';radius=.5;freeOnly=false;time='all';language='all';searchTerm='';if(typeof accessFilter!=='undefined')accessFilter='all';render();");}
for(const root of roots){
 const f=fixture(root),{run,json,nodes}=f,label=root.path+' · ';seed(f);
 const baseline=f.state(),savedStorage=[...f.storage];f.ctx.__calendar=Array.from({length:7},(_,day)=>({dataset:{day:String(day)}}));f.ctx.document.querySelectorAll=selector=>selector==='[data-day]'?f.ctx.__calendar:[];run('render()');f.ctx.__calendar[2].onclick();equal(run('day'),2,label+'actual calendar callback selects new day');equal(run('category'),'conference',label+'calendar callback retains conference');equal(run('radius'),.5,label+'calendar callback retains radius');f.ctx.__calendar[1].onclick();equal(f.state(),baseline,label+'calendar round-trip preserves controls');
 for(let i=0;i<3;i++){run('visible();window.HappyMapCatalogModes.conferenceEvents({citywide:true,allFilters:true});render();');equal(f.state(),baseline,label+'read/render does not change controls');equal(f.buttons().filter(x=>x.id==='conferenceCitywide').length,0,label+'no redundant citywide button after repeated render');}
 equal([...f.storage],savedStorage,label+'read/render does not persist a different search point');
 equal(json('visible().map(e=>e.id)'),['fixture:near','fixture:far','fixture:unknown'],label+'radius highlights without trimming citywide events');
 equal(json('window.HappyMapCatalogModes.conferenceEvents({citywide:true}).map(e=>e.id).sort()'),['fixture:far','fixture:near','fixture:unknown'],label+'citywide includes unknown coordinate');
 truth(nodes.get('#discoveryNote').textContent.includes(': 3'),label+'notice citywide count');truth(nodes.get('#discoveryNote').textContent.includes(': 1'),label+'notice nearby count');truth(nodes.get('#discoveryNote').textContent.includes((root.locale?'No verified map location':'Без проверенной точки на карте')+': 1'),label+'notice honestly identifies unknown map point');run("globalThis.__layoutPoints=[];globalThis.MorrowMapLayout=points=>{__layoutPoints=points;return [];};map={getSize:()=>({x:1000,y:1000}),getZoom:()=>15,latLngToContainerPoint:()=>({x:100,y:100})};renderMap(visible());map=undefined;");equal(json('__layoutPoints.map(p=>p.item.id).sort()'),['fixture:far','fixture:near'],label+'map receives only verified finite-coordinate records');
 run('freeOnly=true;render();render()');equal(f.buttons().filter(b=>b.id==='conferenceCitywide').length,0,label+'mixed filters need no redundant radius expansion');equal(f.buttons().filter(b=>b.id==='conferenceAllFilters').length,1,label+'mixed filters have exactly one all-filter action');run('freeOnly=false;render()');const point=f.state().position;run('window.HappyMapCatalogModes.showConferenceCity()');equal(run('radius'),0,label+'explicit citywide click expands radius');equal(run('category'),'conference',label+'citywide click retains category');equal(run('day'),1,label+'citywide click retains date');equal(json('position'),point,label+'citywide click retains search point');equal(run('visible().length'),3,label+'citywide click reveals three');
 run("radius=.5;freeOnly=true;time='evening';language='FR';searchTerm='absent';render();");truth(nodes.get('#discoveryNote').textContent.includes('FR'),label+'notice shows language');truth(nodes.get('#discoveryNote').textContent.includes('absent'),label+'notice shows search');equal(run('visible().length'),0,label+'filtered empty');truth(f.buttons().some(b=>b.id==='conferenceAllFilters'),label+'filtered empty offers all filters');
 f.buttons().find(b=>b.id==='conferenceAllFilters')?.click();equal(f.state(),{...baseline,radius:0},label+'explicit all-filters click clears only intended controls');equal(run('visible().length'),3,label+'all filters restores three');
 run("day=2;render();");equal(run('visible().length'),0,label+'genuinely empty date');equal(f.buttons().length,0,label+'empty inventory has no misleading recovery button');truth(nodes.get('#eventList .empty').querySelector('p').textContent.includes(root.locale?'No verified announcements':'пока нет проверенных анонсов'),label+'empty inventory explanation');
 run('day=1;radius=0;language="RU";render();');equal(run('visible().length'),3,label+'RU normalizes lowercase/multiple/localized values');
 const languageCases=[['ru','RU',true],['RU','RU',true],['ru-RU','RU',true],['rus','RU',true],['Russian','RU',true],['Русский','RU',true],['English / Русский','EN',true],['EN;RU','RU',true],['EN + RU','RU',true],['en ru','RU',true],[['en','ru-RU'],'RU',true],['French','RU',false],['SURE','RU',false],['','RU',false],[null,'all',true],['ENG','EN',true]];
 for(const [value,selected,expected]of languageCases){f.ctx.__lang=value;f.ctx.__selected=selected;equal(run('window.HappyMapCatalogModes.matchesConferenceLanguage(__lang,__selected)'),expected,label+'language '+JSON.stringify(value)+' → '+selected);}
 run("language='all';if(typeof accessFilter!=='undefined')accessFilter='restricted';");if(run("typeof accessFilter!=='undefined'")){
  equal(run('visible().length'),0,label+'access restriction still filters ordinary conference results');equal(run('window.HappyMapCatalogModes.conferenceEvents({citywide:true,allFilters:true}).length'),3,label+'all-filter availability includes access-filtered records');equal(run('accessFilter'),'restricted',label+'availability probe restores access filter');run('render()');truth(f.buttons().some(b=>b.id==='conferenceAllFilters'),label+'access-filtered empty offers all-filter recovery');run('window.HappyMapCatalogModes.showConferenceCity(true)');equal(run('accessFilter'),'all',label+'all-filters action clears access filter');
 }
 run("if(typeof accessFilter!=='undefined')accessFilter='all';language='all';events=events.slice(0,1);radius=0;day=1;");
 for(const [status,access,word]of [['closed','public',root.locale?'Registration closed':'Регистрация закрыта'],['request_only','public',root.locale?'Participation by request':'Участие по запросу'],['','professional_only',root.locale?'Professional audience':'Для профессиональной аудитории'],['','accreditation',root.locale?'Accreditation required':'Нужна аккредитация']]){
  f.ctx.__status=status;f.ctx.__access=access;const html=run("card({...events[0],registrationStatus:__status,accessType:__access})");equal(status==='closed'?(html.match(/Registration closed|Регистрация закрыта/g)||[]).length:html.split(word).length-1,1,label+'exactly one '+word+' badge');
 }
 run("events[0].soldOut=true");equal(run('visible().length'),1,label+'sold out remains visible');run("events[0].cancelled=true");equal(run('visible().length'),0,label+'cancelled excluded');run("delete events[0].cancelled;events[0].status='cancelled'");equal(run('visible().length'),0,label+'cancelled status excluded');run("delete events[0].status;events[0].publicationStatus='held_for_recheck'");equal(run('visible().length'),0,label+'held for recheck excluded');
 run("delete events[0].publicationStatus;events[0].endDate='2026-10-19';events[0].scheduleType='daily_opening_hours';events[0].time='10:00';events[0].end='20:00';day=2;__now=Date.parse('2026-10-18T12:00:00Z');");equal(run('visible().length'),1,label+'ongoing daily event visible after initial day');equal(run('window.HappyMapCatalogModes.conferenceEvents({citywide:true,allFilters:true}).length'),1,label+'notice honors selected daily date');run("__now=Date.parse('2026-10-18T21:00:00Z')");equal(run('visible().length'),0,label+'daily event expires at selected-date end');
 run("delete events[0].scheduleType;delete events[0].endDate;events[0].time='10:00';events[0].end='11:00';events[0].startAt='2026-10-17T10:00:00Z';events[0].endAt='2026-10-17T11:00:00Z';day=1;__now=Date.parse('2026-10-17T12:00:00Z');");equal(run('visible().length'),0,label+'explicit ended event remains excluded');equal(run('window.HappyMapCatalogModes.conferenceEvents({citywide:true,allFilters:true}).length'),0,label+'all filters never resurrect ended event');
 run("__now=Date.parse('2026-10-16T16:31:00Z');delete events[0].startAt;delete events[0].endAt;places=[{id:'place:one',kind:'place',title:'Near bar',category:'bar',lat:position[0],lng:position[1]},{id:'place:two',kind:'place',title:'Far bar',category:'bar',lat:position[0]+1,lng:position[1]}];category='conference';radius=.5;freeOnly=true;time='evening';language='RU';searchTerm='';");const eventState=f.state();run("setLayer('city')");equal(run('visible().length'),2,label+'city directory remains citywide and date-independent');run("window.HappyMapCatalogModes.showConferenceCity(true)");equal(run('layer'),'city',label+'conference action guarded in directory');run("setLayer('events')");equal(f.state(),eventState,label+'directory restores event controls');
 run("saved=[events[0],{...events[0],id:'not-a-conference',title:'Ordinary'}];setView('plans');");equal(run('visible().length'),2,label+'plans bypass conference classification and filters');const planState=f.state();run('window.HappyMapCatalogModes.showConferenceCity(true)');equal(f.state(),planState,label+'conference actions guarded in plans');
 console.log('CHECK '+root.path);
}
// Ordinary Events categories share transparent availability/recovery without broadening inventory.
for(const root of roots){for(const selected of ['all','music']){
 const f=fixture(root),{run,json,nodes}=f,label=root.path+' ordinary '+selected+' · ';seed(f);f.ctx.__category=selected;
 run("events=events.map(e=>({...e,category:'music',language:e.id==='fixture:unknown'?'EN':'RU'}));events.push({...events[0],id:'ordinary:talk',title:'Other category',category:'talk'}, {...events[0],id:'ordinary:cancelled',cancelled:true}, {...events[0],id:'ordinary:held',publicationStatus:'held_for_recheck'}, {...events[0],id:'ordinary:other-date',date:'2026-10-19'});category=__category;render();");
 const baseline=f.state(),savedStorage=[...f.storage],cityCount=selected==='all'?4:3,nearCount=selected==='all'?2:1;
 f.ctx.__calendar=Array.from({length:7},(_,day)=>({dataset:{day:String(day)}}));f.ctx.document.querySelectorAll=selector=>selector==='[data-day]'?f.ctx.__calendar:[];run('render()');f.ctx.__calendar[2].onclick();equal(run('day'),2,label+'calendar changes only selected date');equal(run('category'),selected,label+'calendar retains ordinary category');equal(run('radius'),.5,label+'calendar retains radius');f.ctx.__calendar[1].onclick();equal(f.state(),baseline,label+'calendar round-trip preserves ordinary filters');
 equal(run('visible().length'),cityCount,label+'citywide result count stays category-scoped');equal(json('visible().map(e=>e.id).sort()'),json('(()=>{const old=radius;try{radius=0;return __beforeCatalogVisible().map(e=>e.id).sort()}finally{radius=old}})()'),label+'ordinary filtering semantics are unchanged');
 for(let i=0;i<3;i++){run('window.HappyMapCatalogModes.discoveryEvents({citywide:true,allFilters:true});render()');equal(f.state(),baseline,label+'count/render never silently changes filters');equal(f.buttons().filter(b=>b.id==='eventsCitywide').length,0,label+'no redundant citywide button after repeated render');equal(f.buttons().filter(b=>b.id?.startsWith('conference')).length,0,label+'ordinary categories do not show conference-only actions');}
 equal([...f.storage],savedStorage,label+'count/render never persists a different search point');
 equal(run('window.HappyMapCatalogModes.discoveryEvents({citywide:true}).length'),cityCount,label+'citywide count preserves selected category and date');equal(run('window.HappyMapCatalogModes.discoveryEvents({citywide:true,allFilters:true}).length'),cityCount,label+'all-filter count excludes cancelled held and other dates');
 truth(nodes.get('#discoveryNote').textContent.includes((root.locale?'Events in this category on these dates across the city':'События выбранной категории и дат по всему городу')+': '+cityCount),label+'notice reports all-city selected-category availability');truth(nodes.get('#discoveryNote').textContent.includes((root.locale?'Within the selected radius':'В выбранном радиусе')+': '+nearCount),label+'notice reports nearby availability');truth(nodes.get('#discoveryNote').textContent.includes((root.locale?'No verified map location':'Без проверенной точки на карте')+': 1'),label+'notice discloses unknown coordinates');
 run("globalThis.__layoutPoints=[];globalThis.MorrowMapLayout=points=>{__layoutPoints=points;return [];};map={getSize:()=>({x:1000,y:1000}),getZoom:()=>15,latLngToContainerPoint:()=>({x:100,y:100})};renderMap(visible());map=undefined;");truth(!json('__layoutPoints.map(p=>p.item.id)').includes('fixture:unknown'),label+'unknown-coordinate ordinary event creates no fake map point');
 run('freeOnly=true;render();render()');equal(f.buttons().filter(b=>b.id==='eventsCitywide').length,0,label+'mixed filters need no radius-expansion button');equal(f.buttons().filter(b=>b.id==='eventsAllFilters').length,1,label+'mixed filters retain one all-filter button');run('freeOnly=false;render()');
 run('window.HappyMapCatalogModes.showEventsCity(false)');equal(f.state(),{...baseline,radius:0},label+'explicit no-radius action changes only radius');
 run("radius=.5;freeOnly=true;time='day';language='RU';searchTerm='near';render();");const restricted=f.state();equal(run('visible().length'),1,label+'secondary filters actually apply');run('window.HappyMapCatalogModes.showEventsCity(false)');equal(f.state(),{...restricted,radius:0},label+'citywide action changes only radius');equal(run('visible().length'),1,label+'citywide action keeps secondary filters');
 run("radius=.5;freeOnly=true;time='evening';language='FR';searchTerm='absent';if(typeof accessFilter!=='undefined')accessFilter='restricted';render();");const allFiltered=f.state();equal(run('visible().length'),0,label+'secondary-filtered empty');equal(run('window.HappyMapCatalogModes.discoveryEvents({citywide:true,allFilters:true}).length'),cityCount,label+'availability clears all secondary filters but not category/date');equal(f.state(),allFiltered,label+'all-filter availability probe restores every secondary control');truth(nodes.get('#discoveryNote').textContent.includes('FR')&&nodes.get('#discoveryNote').textContent.includes('absent'),label+'active filters are explained');
 equal(f.buttons().filter(b=>b.id==='eventsAllFilters').length,1,label+'one all-filter recovery button');f.buttons().find(b=>b.id==='eventsAllFilters')?.click();equal(f.state(),{...baseline,radius:0},label+'actual all-filter action clears secondary controls only');equal(run('visible().length'),cityCount,label+'all-filter action reveals category-scoped inventory');equal(run('layer'),'events',label+'recovery stays in Events instead of Places');
 run('day=2;render()');equal(run('visible().length'),0,label+'genuinely empty selected date remains empty');equal(f.buttons().length,0,label+'empty category/date inventory offers no spurious recovery');run('day=1');
 // In ordinary categories the wrapper must not introduce conference-only language normalization.
 run("events[0].language='ru';language='RU';render()");equal(json('visible().map(e=>e.id).sort()'),json('(()=>{const old=radius;try{radius=0;return __beforeCatalogVisible().map(e=>e.id).sort()}finally{radius=old}})()'),label+'conference normalization does not leak to ordinary categories');equal(json('window.HappyMapCatalogModes.discoveryEvents({citywide:true}).map(e=>e.id)'),json('__beforeCatalogVisible().map(e=>e.id)'),label+'ordinary citywide API preserves native language semantics');
 run("language='all';category=__category;radius=.5;places=[{id:'place:ordinary',kind:'place',title:'City venue',category:'music',lat:position[0],lng:position[1]}];setLayer('city')");const cityState=f.state();run('window.HappyMapCatalogModes.showEventsCity(true)');equal(f.state(),cityState,label+'Events recovery is guarded in Places mode');truth(!nodes.get('#discoveryNote').textContent.includes(root.locale?'Events in this category on these dates across the city':'События выбранной категории и дат по всему городу'),label+'Places note does not masquerade as dated event inventory');run("setLayer('events');saved=[events[0]];setView('plans')");const plans=f.state();run('window.HappyMapCatalogModes.showEventsCity(true)');equal(f.state(),plans,label+'Events recovery is guarded in Plans');
}}

// Tbilisi's separate cinema toggle is also a secondary filter, not missing inventory.
for(const locale of ['', 'en/']){
 const root=roots.find(r=>r.city==='tbilisi'&&r.locale===locale),f=fixture(root),label=root.path+' cinema filter · ';seed(f);
 f.run("events.push({...events[0],id:'ordinary:film',title:'Cinema screening',category:'film'});category='all';hideCinema=true;radius=.5;render()");const state=f.state();
 equal(f.run('window.HappyMapCatalogModes.discoveryEvents({citywide:true}).length'),3,label+'citywide still honors hide cinema');equal(f.run('window.HappyMapCatalogModes.discoveryEvents({citywide:true,allFilters:true}).length'),4,label+'all-filter availability includes hidden cinema');equal(f.state(),state,label+'availability probe restores hide cinema');truth(f.nodes.get('#discoveryNote').textContent.includes(locale?'Cinema hidden':'Без кино'),label+'active cinema filter explained');
 f.run('window.HappyMapCatalogModes.showEventsCity(false)');equal(f.run('hideCinema'),true,label+'citywide action does not clear cinema toggle');f.run('window.HappyMapCatalogModes.showEventsCity(true)');equal(f.run('hideCinema'),false,label+'explicit all-filter action clears cinema toggle');equal(f.run('visible().length'),4,label+'cinema restored without switching date or category');equal(f.run('category'),'all',label+'all-filter action retains category');equal(f.run('day'),1,label+'all-filter action retains date');
}

// A source-declared dated programme is a listing policy, not a fabricated event end.
// Timed programmes use the same one-hour arrival cutoff; unknown starts retain the date.
const model=vm.runInNewContext(fs.readFileSync('public/discovery-model.js','utf8')+';NoreliDiscovery;',{Intl,Date,Map,Set});
const midnightCases=[
 ['UTC','2026-10-17','2026-10-18T00:00:00Z'],
 ['Europe/Moscow','2026-10-17','2026-10-17T21:00:00Z'],
 ['Europe/Istanbul','2026-10-17','2026-10-17T21:00:00Z'],
 ['Asia/Tbilisi','2026-10-17','2026-10-17T20:00:00Z'],
 ['Asia/Yerevan','2026-10-19','2026-10-19T20:00:00Z'],
 ['Europe/Berlin','2026-10-25','2026-10-25T23:00:00Z'],
 ['Europe/London','2026-10-25','2026-10-26T00:00:00Z'],
 ['America/Los_Angeles','2026-11-01','2026-11-02T08:00:00Z'],
 ['America/Los_Angeles','2026-03-08','2026-03-09T07:00:00Z']
];
for(const [timezone,date,midnight]of midnightCases){
 const e={id:'fixture:programme',date,time:null,end:null,endAt:null,endDate:date,timezone,listingPolicy:'dated_programme',listingPolicySource:'https://example.org/official-agenda'},snapshot=JSON.stringify(e),label=timezone+' '+date+' programme · ',deadline=Date.parse(midnight);
 const policy=model.visibilityEnd(e,date,timezone);
 equal(policy.reason,'dated-programme',label+'explicit policy reason');equal(policy.at,deadline,label+'next local midnight, including DST');
 equal(model.availableOnDate(e,date,model.wallInstant(date,'18:00',timezone)),true,label+'unknown-start programme retains its date');
 equal(model.availableOnDate(e,date,deadline-1),true,label+'listed through final millisecond of local date');equal(model.availableOnDate(e,date,deadline),false,label+'expires exactly at local midnight');
 const nextDate=new Date(Date.parse(date+'T12:00:00Z')+86400000).toISOString().slice(0,10);
 equal(model.availableOnDate(e,nextDate,deadline-1),false,label+'not misclassified as a next-date overnight event');
 equal(model.availableOnDate({...e,cancelled:true},date,deadline-1),false,label+'cancelled boolean remains excluded');equal(model.availableOnDate({...e,status:'cancelled'},date,deadline-1),false,label+'cancelled status remains excluded');equal(model.availableOnDate({...e,publicationStatus:'held_for_recheck'},date,deadline-1),false,label+'held listing remains excluded');
 equal(model.availableOnDate({...e,validDates:[]},date,deadline-1),false,label+'explicit valid dates remain authoritative');equal(model.availableOnDate({...e,closedDates:[date]},date,deadline-1),false,label+'explicit closed dates remain authoritative');
 equal(JSON.stringify(e),snapshot,label+'policy never mutates source times');
 const timed={...e,time:'09:00'},arrival=model.wallInstant(date,'09:00',timezone)+3600000;
 equal(model.visibilityEnd(timed,date,timezone).reason,'arrival-cutoff',label+'timed programme uses arrival cutoff');equal(model.visibilityEnd(timed,date,timezone).at,arrival,label+'timed programme ends discovery after one elapsed hour');
 equal(model.availableOnDate(timed,date,arrival-60000),true,label+'timed programme visible at 59 minutes');equal(model.availableOnDate(timed,date,arrival),false,label+'timed programme hidden at 60 minutes');
 const ordinary={...timed};delete ordinary.listingPolicy;const grace=model.visibilityEnd(ordinary,date,timezone);equal(grace.reason,'arrival-cutoff',label+'ordinary unknown-end uses same cutoff');equal(grace.at,arrival,label+'ordinary control is one hour');
 equal(model.visibilityEnd({...e,listingPolicy:'dated_programme_typo'},date,timezone).reason,'unknown-hours',label+'unknown start without exact policy stays honest');
 equal(model.visibilityEnd({...e,listingPolicySource:null},date,timezone).reason,'unknown-hours',label+'unknown-start policy without evidence does not activate retention');
 const published=model.visibilityEnd({...timed,end:'10:30'},date,timezone);equal(published.reason,'arrival-cutoff',label+'later wall end cannot extend arrival window');equal(published.at,arrival,label+'known long event hidden at one hour');
 const endAt=new Date(model.wallInstant(date,'10:15',timezone,true)).toISOString();equal(model.visibilityEnd({...timed,endAt},date,timezone).at,arrival,label+'later exact end cannot extend arrival window');equal(model.availableOnDate({...timed,endAt},date,Date.parse(endAt)),false,label+'known ended programme not resurrected');
 const earlyEndAt=new Date(model.wallInstant(date,'09:30',timezone,true)).toISOString();equal(model.visibilityEnd({...timed,endAt:earlyEndAt},date,timezone).at,Date.parse(earlyEndAt),label+'earlier exact end still wins');
 const duration=model.visibilityEnd({...timed,durationMinutes:45},date,timezone);equal(duration.reason,'published-duration',label+'earlier published duration wins');equal(duration.at,model.wallInstant(date,'09:45',timezone),label+'published duration not extended');
 equal(model.visibilityEnd({...timed,endDate:nextDate},date,timezone).reason,'arrival-cutoff',label+'next-day individual session does not evade arrival cutoff');
 const range=model.visibilityEnd({...timed,endDate:nextDate,category:'city'},date,timezone);equal(range.reason,'date-range',label+'source-classified multi-date festival range retained');

}

// Shared card disclosure must not describe a calendar listing as guaranteed ongoing.
for(const root of roots){
 const f=fixture(root),label=root.path+' dated programme · ';seed(f);
 f.run("events=events.slice(0,1);Object.assign(events[0],{time:null,end:null,endTime:null,endAt:null,listingPolicy:'dated_programme',listingPolicySource:'https://example.org/official-agenda'});radius=0;__now=Date.parse('2026-10-17T18:00:00Z');");
 equal(f.run('visible().length'),1,label+'unknown-start programme listing remains visible at 18:00');
 const badge=root.locale?'Programme for this date · end time unpublished':'Программа этой даты · окончание не опубликовано';
 equal(f.run('card(events[0])').split(badge).length-1,1,label+'unknown end disclosed once');
 equal(f.run("card({...events[0],end:'19:00'})").split(badge).length-1,0,label+'published wall end removes unknown-end badge');
 equal(f.run("card({...events[0],endAt:'2026-10-17T19:00:00Z'})").split(badge).length-1,0,label+'published exact end removes unknown-end badge');
 equal(f.run("card({...events[0],durationMinutes:600})").split(badge).length-1,1,label+'duration without known start cannot invent an end');
 f.run("__now=Date.parse('2026-10-18T00:00:00Z')");equal(f.run('visible().length'),0,label+'programme listing expires at local midnight');
}

// Actual data regression rather than a fixture-only classification.
for(const locale of ['', 'en/']){const root=roots.find(r=>r.city==='tbilisi'&&r.locale===locale),f=fixture(root,{sentinels:false});f.ctx.__frame=JSON.parse(fs.readFileSync('public/'+locale+'events.json')).events.find(e=>e.id==='tg:framespb:7662:2026-10-18');truth(f.ctx.__frame,root.path+' actual Frame record exists');truth(f.ctx.__frame.cancelled||f.ctx.__frame.status==='cancelled',root.path+' official Frame cancellation is retained');equal(f.run("window.HappyMapCatalogModes.matchesConferenceLanguage(__frame.language,'RU')"),true,root.path+' Frame original language normalizes independently of cancellation');f.run("events=[__frame];day=2;category='conference';radius=0;language='all';render();");equal(f.json('visible().map(e=>e.id)'),[],root.path+' cancelled Frame absent with all languages');f.nodes.get('#languageFilter').onchange({target:{value:'RU'}});equal(f.json('visible().map(e=>e.id)'),[],root.path+' language filter never resurrects cancelled Frame');equal(f.run('window.HappyMapCatalogModes.conferenceEvents({citywide:true,allFilters:true}).length'),0,root.path+' all-filter recovery never resurrects cancelled Frame');}
// Source-declared ends remain unchanged; discovery has a separate arrival cutoff.
const releasePacket=JSON.parse(fs.readFileSync('data/conferences/release-2026-10-16.json'));
// Timed programme day rows follow the one-hour discovery window without inventing ends.
const datedRows=[...releasePacket.events.filter(e=>e.listingPolicy==='dated_programme'),...releasePacket.existingUpdates.filter(u=>u.operation==='programme_listing_policy').map(u=>({...JSON.parse(fs.readFileSync('public/'+(u.cityId==='tbilisi'?'':u.cityId+'/')+'events.json')).events.find(e=>e.id===u.id),cityId:u.cityId}))];
truth(datedRows.length>=6,'source-confirmed new and existing dated programme rows are present');
for(const row of datedRows){for(const locale of ['', 'en/']){
 const root=roots.find(r=>r.city===row.cityId&&r.locale===locale),f=fixture(root,{sentinels:false}),label=root.path+' '+row.id+' · ';
 const feed=JSON.parse(fs.readFileSync('public/'+locale+(row.cityId==='tbilisi'?'':row.cityId+'/')+'events.json')).events;
 const actual=feed.find(e=>e.id===row.id);truth(actual,label+'actual source programme imported');if(!actual)continue;
 f.ctx.__programme=actual;const snapshot=JSON.stringify(actual),deadline=model.visibilityEnd(actual,actual.date,actual.timezone).at;
 truth(actual.listingPolicySource?.startsWith('https://'),label+'programme policy cites source');truth(!actual.end&&!actual.endTime&&!actual.endAt,label+'unknown end is not fabricated');
 f.run("events=[__programme];dates=[__programme.date];day=0;category='conference';radius=0;language='all';freeOnly=false;time='all';searchTerm='';__now=NoreliDiscovery.wallInstant(__programme.date,'18:15',__programme.timezone);");
 equal(f.run('NoreliDiscovery.visibilityEnd(__programme,__programme.date,__programme.timezone).reason'),'arrival-cutoff',label+'effective policy is arrival cutoff');equal(f.run('visible().length'),0,label+'timed programme hidden after arrival window');
 const badge=locale?'Programme for this date · end time unpublished':'Программа этой даты · окончание не опубликовано';equal(f.run('card(__programme)').split(badge).length-1,0,label+'timed arrival cutoff is not advertised as all-day listing');
 f.ctx.__now=deadline-1;equal(f.run('visible().length'),1,label+'programme retained until arrival cutoff');f.ctx.__now=deadline;equal(f.run('visible().length'),0,label+'programme expires exactly at arrival cutoff');
 f.ctx.__now=deadline-1;f.run('events=[{...__programme,cancelled:true}]');equal(f.run('visible().length'),0,label+'cancelled programme remains excluded');equal(JSON.stringify(actual),snapshot,label+'availability calculations do not mutate source facts');
}}

const copRows=releasePacket.events.filter(e=>e.id.startsWith('yv-cop17-green-programme:'));
truth(copRows.length>=4,'COP17 verified daily release rows present');
for(const row of copRows){
 const f=fixture(roots.find(r=>r.city==='yerevan'&&r.locale===''),{sentinels:false});f.ctx.__cop=row;
 f.run("events=[__cop];dates=[__cop.date];day=0;category='conference';radius=0;language='all';freeOnly=false;time='all';searchTerm='';__now=Date.parse(__cop.date+'T13:15:00+04:00');");
 truth(row.endAt&&row.end,'COP17 '+row.date+' has source-declared end');
 equal(f.run('NoreliDiscovery.visibilityEnd(__cop,__cop.date,__cop.timezone).reason'),'arrival-cutoff','COP17 '+row.date+' separates arrival cutoff from published end');
 equal(f.run('visible().length'),0,'COP17 '+row.date+' afternoon programme is outside arrival window');
 f.run('__now=NoreliDiscovery.arrivalDeadline(__cop)-1');equal(f.run('visible().length'),1,'COP17 '+row.date+' visible just before arrival cutoff');f.run('__now=NoreliDiscovery.arrivalDeadline(__cop)');equal(f.run('visible().length'),0,'COP17 '+row.date+' hidden exactly at arrival cutoff');f.run('__now=Date.parse(__cop.endAt)-1');equal(f.run('visible().length'),0,'COP17 '+row.date+' remains hidden before later published end');f.run('__now=Date.parse(__cop.endAt)');equal(f.run('visible().length'),0,'COP17 '+row.date+' expires exactly at published end');
 // Counterfactual control documents existing behavior when a known start has no source-declared end.
 // It is not written to the feed and must not be interpreted as a guaranteed one-hour event duration.
 f.run("globalThis.__unknownEnd={...__cop,end:null,endTime:null,endAt:null,endDate:__cop.date};events=[__unknownEnd];__now=Date.parse(__cop.date+'T10:01:00+04:00');");
 equal(f.run('NoreliDiscovery.visibilityEnd(__unknownEnd,__unknownEnd.date,__unknownEnd.timezone).reason'),'arrival-cutoff','COP17 unknown-end control reports arrival policy');equal(f.run('visible().length'),1,'COP17 unknown-end control retained during initial grace');f.run("__now=Date.parse(__cop.date+'T12:01:00+04:00')");equal(f.run('visible().length'),0,'COP17 unknown-end control expires after one-hour arrival window');equal(f.run('__unknownEnd.endAt'),null,'visibility policy never writes a fabricated end');
}
for(const locale of ['', 'en/']){
 const root=roots.find(r=>r.city==='yerevan'&&r.locale===locale),f=fixture(root,{sentinels:false});f.ctx.__vibe=JSON.parse(fs.readFileSync('public/'+locale+'yerevan/events.json')).events.find(e=>e.id==='yv-luma:vod5567j:2026-10-17');truth(f.ctx.__vibe,root.path+' actual Vibe Coding row imported');if(!f.ctx.__vibe)continue;
 equal([f.ctx.__vibe.lat,f.ctx.__vibe.lng],[null,null],root.path+' guest-only venue retains null coordinates');equal(f.ctx.__vibe.locationPrivacy,'registered_guests_only',root.path+' venue privacy retained');
 f.run("events=[__vibe];dates=['2026-10-17'];day=0;category='conference';radius=.5;language='all';freeOnly=false;time='all';searchTerm='';render();");equal(f.run('visible().length'),1,root.path+' actual private venue remains in citywide list without a false map point');equal(f.run('window.HappyMapCatalogModes.conferenceEvents({citywide:true}).length'),1,root.path+' actual private venue available citywide');truth(f.nodes.get('#discoveryNote').textContent.includes((locale?'No verified map location':'Без проверенной точки на карте')+': 1'),root.path+' actual private venue has honest unknown-point notice');
 f.run("globalThis.__layoutPoints=[];globalThis.MorrowMapLayout=points=>{__layoutPoints=points;return [];};map={getSize:()=>({x:1000,y:1000}),getZoom:()=>15,latLngToContainerPoint:()=>({x:100,y:100})};renderMap(visible());map=undefined;");equal(f.json('__layoutPoints'),[],root.path+' actual private venue creates no fake map point');
}

// Exercise the actual location controller with a mocked, explicitly delivered device fix.
for(const city of ['tbilisi','yerevan','palo-alto']){const root=roots.find(r=>r.city===city&&r.locale===''),f=fixture(root,{locationControl:true});seed(f);const initial=f.state();equal(f.geo.calls,1,city+' location flow still starts once');f.run('render();window.HappyMapCatalogModes.conferenceEvents({citywide:true,allFilters:true})');equal(f.state(),initial,city+' conference notice does not alter location state');if(f.geo.success){const point=[initial.position[0]+.001,initial.position[1]];f.geo.success({coords:{latitude:point[0],longitude:point[1],accuracy:10},timestamp:f.ctx.__now});equal(f.json('position'),initial.position,city+' automatic location preserves deep-linked search context');f.run('locate()');equal(f.geo.calls,2,city+' explicit locate starts a fresh request');f.geo.success({coords:{latitude:point[0],longitude:point[1],accuracy:10},timestamp:f.ctx.__now});equal(f.json('position'),point,city+' explicit device fix sets search point');equal(f.run('radius'),.5,city+' explicit device fix retains 500 m flow');equal(f.run('category'),'conference',city+' device fix preserves conference category');}}
console.log(JSON.stringify({pass:failures.length===0,checks,routes:roots.length,failures,noActualDeviceTest:true},null,2));if(failures.length)process.exitCode=1;
