const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const registry=JSON.parse(fs.readFileSync('data/city-expansion/registry.json'));
const active=JSON.parse(fs.readFileSync('data/city-expansion/launched.json')).cityIds;
const picker=JSON.parse(fs.readFileSync('public/city-picker.json'));
assert.equal(picker.cities.length,registry.existingCityIds.length+active.length);
assert.equal(new Set(picker.cities.map(c=>c.id)).size,picker.cities.length);
for(const id of registry.existingCityIds){
 const folder=id==='tbilisi'?'':id+'/';
 for(const name of ['events.json','places.json']){
  const file='public/'+folder+name;
  const before=cp.execFileSync('git',['show','HEAD:'+file],{maxBuffer:50e6});
  assert.equal(fs.readFileSync(file).compare(before),0,'Existing city data untouched: '+file);
 }
}
function element(){const attrs={},classes=new Set(),target={value:'all',children:[],dataset:{},hidden:false,style:{},textContent:'',classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,on){on??=!classes.has(x);on?classes.add(x):classes.delete(x);return on;}},setAttribute:(k,v)=>attrs[k]=String(v),getAttribute:k=>attrs[k]??null,querySelector:()=>element(),querySelectorAll:()=>[],replaceChildren(){},addEventListener(){},getBoundingClientRect:()=>({width:800,height:600}),append(){},after(){},before(){},insertAdjacentHTML(){},scrollIntoView(){},focus(){}};return new Proxy(target,{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});}
function load(folder,query='',savedOrigin=null,hash=''){
 const html=fs.readFileSync('public/'+folder+'/index.html','utf8'),nodes=new Map(),lookup=s=>{if(!nodes.has(s))nodes.set(s,element());return nodes.get(s);};
 const asset=name=>{const src=[...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>m[1]).find(s=>s.split('?')[0].endsWith('/'+name)||s.split('?')[0]===name);assert(src,name);return 'public'+new URL(src,'https://happymap.app/'+folder+'/index.html').pathname;};
 const storage=new Map();if(savedOrigin)storage.set('morrow-near-'+folder.split('/').at(-1)+'-v1',JSON.stringify(savedOrigin));const ctx=vm.createContext({console,Intl,Date,URL,URLSearchParams,Map,Set,AbortController,document:{querySelector:lookup,querySelectorAll:()=>[],createElement:element,body:element(),documentElement:{lang:html.match(/<html lang="([^"]+)"/)[1]},addEventListener(){}},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},window:element(),location:{search:query,hash,pathname:'/'+folder+'/index.html'},history:element(),setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},navigator:{},ResizeObserver:class{observe(){}},fetch:()=>new Promise(()=>{})});
 for(const name of ['discovery-model.js','app.js'])vm.runInContext(fs.readFileSync(asset(name),'utf8'),ctx);
 vm.runInContext('initMap=()=>{};render=()=>{};resetFilters=()=>render();',ctx);
 vm.runInContext(fs.readFileSync(asset('discovery.js'),'utf8'),ctx);
 vm.runInContext("catalog={generatedAt:'2026-10-15',endDate:'2099-10-16'};restoreNear();initMap();render();",ctx);
 return {ctx,nodes,storage,html,run:code=>vm.runInContext(code,ctx)};
}
for(const id of active.filter(id=>!process.env.CITY_EXPANSION_TEST_IDS||process.env.CITY_EXPANSION_TEST_IDS.split(',').includes(id))){
 const config=registry.newCities.find(c=>c.id===id);
 for(const prefix of ['', 'en/']){
  const folder=prefix+id,f=load(folder);
  assert.equal(f.run('cityFolder'),id+'/');
  assert.equal(f.run('nearKey'),'morrow-near-'+id+'-v1');
  assert.equal(f.run('layer'),'events');
  assert.equal(f.run('radius'),0,'New city defaults to all-city Events');
  assert.equal(f.run('initialCityOverview'),true);
  if(config.defaultDateView==='week')assert.equal(f.run('day'),-1,'Upcoming-week overview avoids an empty launch-evening view');
  if(config.eventLanguages?.some(x=>x.value==='ES'||x.code==='ES')){
    assert.equal(f.run("languageLabel('ES')"),'Spanish');
    assert(f.run("languageMatches('Catalan and Spanish','ES')"));
    assert(f.run("languageMatches('Catalan and Spanish','CA')"));
    assert(!f.run("languageMatches('Original languages; English subtitles','ES')"),'Language codes must not match arbitrary word fragments');
    assert(!f.run("languageMatches(null,'ES')"),'An unknown language is never inferred');
  }
  f.run("dates=['2099-10-15'];events=[{id:'distant',date:dates[0],time:'19:00',category:'music',lat:-30,lng:130},{id:'unlocated',date:dates[0],time:'19:00',category:'talk',lat:null,lng:null}];day=0;");
  assert.equal(f.run('visible().length'),2,'Fresh default does not artificially hide far or unlocated dated events');
  f.run("places=[{lat:40,lng:-70},{lat:null,lng:null}];globalThis.bounds=null;map={fitBounds:points=>{globalThis.bounds=points}};fitInitialCity();map=null;");
  assert.deepEqual(Array.from(f.ctx.bounds,p=>Array.from(p)),[[40,-70],[-30,130]],'Initial bounds use verified points only');
  for(const selected of [0,.5]){const restored=load(folder,'',{position:[40.7,-74],radius:selected,radiusVersion:1});assert.equal(restored.run('radius'),selected);assert.equal(restored.run('initialCityOverview'),false);}
  for(const [query,value] of [['?radius=all',0],['?radius=0',0],['?radius=0.5',.5],['?radius=500',.5]]){const linked=load(folder,query);assert.equal(linked.run('radius'),value);assert.equal(linked.run('initialCityOverview'),false);}
  const near=load(folder,'',null,'#near=40.7,-74');assert.equal(near.run('radius'),.5);assert.equal(near.run('initialCityOverview'),false);

  const group=f.html.match(/<div class="layer-tabs"[^>]*>(.*?)<\/div>/s)[1];
  assert.deepEqual([...group.matchAll(/<button[^>]*id="([^"]+)"/g)].map(m=>m[1]),['eventsLayer','cityLayer']);
  assert.equal(f.run('priceText({price:10})'),'10 '+config.currency);
  const allowedCategories=new Set(Array.from(f.run('categories.map(c=>c.id)')));
  for(const file of ['events.json','places.json']){const data=JSON.parse(fs.readFileSync('public/'+folder+'/'+file));for(const row of data.events||data.places)assert(allowedCategories.has(row.category),id+' unsupported category '+row.category+' for '+row.id);}
  f.run("dates=['2099-10-15','2099-10-16'];day=0;radius=.5;position=[40.7,-74];places=[{id:'near',kind:'place',title:'Near venue',category:'cafe',lat:40.7001,lng:-74.0001},{id:'far',kind:'place',title:'Far venue',category:'bar',lat:40.8,lng:-74.1}];events=[{id:'dated',title:'Test date',venue:'Near venue',placeId:'near',category:'music',date:dates[0],time:'19:00',price:0,lat:40.7001,lng:-74.0001},{id:'unlocated',title:'Unlocated date',category:'talk',date:dates[0],time:'19:00',price:null}];venueIndex=NoreliDiscovery.connect(places,events);places=venueIndex.places;setLayer('city');");
  assert.deepEqual(new Set(Array.from(f.run('visible().map(e=>e.id)'))),new Set(['near','far','unlocated']));
  assert.equal(f.run('radius'),.5);
  f.run("saved=[events[0]];savedPlaces=[places[1]];setView('plans');setLayer('city')");
  assert.deepEqual(Array.from(f.run('visible().map(e=>e.id)')),['far']);
  f.run("setLayer('events')");assert.deepEqual(Array.from(f.run('visible().map(e=>e.id)')),['dated']);
  for(const alias of ['city','nearby','places'])assert.equal(load(folder,'?layer='+alias).run('layer'),'city');
  // Intervals have no invented daily start and never satisfy a time-of-day filter.
  f.run("setView('explore');radius=0;events=[{id:'range',title:'Exhibition',date:'2099-10-01',endDate:'2099-11-01',dateType:'published_interval',openingHoursUnknown:true,time:null,category:'city'}];time='day';");
  assert.equal(f.run('visible().length'),0);f.run("time='evening'");assert.equal(f.run('visible().length'),0);f.run("time='all'");assert.equal(f.run('visible().length'),1);
  assert(f.run("eventDateLabel(events[0])").includes(' – '));
  f.run("events[0].time='17:00';events[0].timeOfDayEligible=false;time='day'");
  assert.equal(f.run('visible().length'),0,'Interval opening time does not prove daily visiting hours');
  assert(!f.run('eventTimeLabel(events[0])').includes('17:00'));
  f.run("events[0].visitSchedule={'2099-10-15':{start:'11:00',end:'23:00'}};day=0;time='all'");
  assert(f.run('eventTimeLabel(eventForSelectedVisit(events[0]))').includes('11:00–23:00'));
  assert.equal(f.run('eventForSelectedVisit(events[0]).intervalStartDate'),'2099-10-01');
  f.run("time='evening'");assert.equal(f.run('visible().length'),1,'Published 11–23 visiting hours overlap evening');
  assert.equal(f.run("admissionText({admission:'Mandatory deposit amount unknown',priceNote:'Entry 3000 KZT'})"),'Mandatory deposit amount unknown Entry 3000 KZT');
  assert.equal(f.run("admissionText({admission:'Same condition',priceNote:'Same condition'})"),'Same condition');
  const hours=f.run("formatVenueHours({mon:['11:00','23:00'],tue:null})");assert(hours.includes('11:00–23:00'));assert(!hours.includes('[object Object]'));assert(/Closed|Закрыто/.test(hours));
  f.run("globalThis.detail='';showDialog=html=>{globalThis.detail=html};events=[{id:'terms',kind:'event',title:'Terms fixture',venue:'Venue',date:'2099-10-15',time:'19:00',category:'city',price:3000,priceLabel:'3000 KZT + required deposit',admission:'Mandatory deposit amount unknown',priceNote:'Bring a booking confirmation',description:'Original description retained',source:'Fixture',sourceUrl:'https://example.org/event',checkedAt:'2026-10-15T10:00:00Z'}];openEvent('terms');");
  for(const text of ['Mandatory deposit amount unknown','Bring a booking confirmation','Original description retained','3000 KZT + required deposit'])assert(f.ctx.detail.includes(text),'Event details show '+text);
  f.run("openPlace({id:'venue-terms',kind:'place',title:'Venue fixture',category:'city',description:'Original venue description',admission:'Venue admission conditions',openingHours:{Monday:['10:00','18:00'],Sunday:null},openingHoursSource:'https://example.org/hours',sourceUrl:'https://example.org/place'});");
  assert(f.ctx.detail.includes('Venue admission conditions'));assert(f.ctx.detail.includes('10:00–18:00'));assert(!f.ctx.detail.includes('[object Object]'));assert(f.ctx.detail.includes('https://example.org/hours'));

  if(['barcelona','madrid'].includes(id)){
   const actual=JSON.parse(fs.readFileSync('public/'+folder+'/events.json'));
   const actualPlaces=JSON.parse(fs.readFileSync('public/'+folder+'/places.json')).places;
   f.ctx.actualCatalog=actual;f.ctx.actualPlaces=actualPlaces;
   f.run("catalog=actualCatalog;events=actualCatalog.events;places=actualPlaces;venueIndex=NoreliDiscovery.connect(places,events);places=venueIndex.places;dates=Array.from({length:7},(_,i)=>'2026-10-'+String(18+i));day=-1;radius=0;view='explore';layer='events';category='all';searchTerm='';time='all';language='all';freeOnly=false;saved=[];");
   assert(f.run('visible().length')>0,'Actual launch feed has upcoming-week results');
   f.run('day=0');assert(f.run('visible().length')>0,'Actual launch feed has tomorrow results');
   const selected=f.run('visible()[0]');
   f.run(`globalThis.detail='';openEvent(${JSON.stringify(selected.id)});`);
   assert(f.ctx.detail.includes(selected.sourceUrl),'Actual event detail links to its verified primary source');
   assert(f.ctx.detail.includes(selected.venue),'Actual event detail retains the verified venue');
   f.run(`toggleSave(${JSON.stringify(selected.id)});setView('plans');`);
   assert(f.run(`isSaved(${JSON.stringify(selected.id)})`));
   assert.equal(JSON.parse(f.storage.get('morrow-'+id+'-plans-v1'))[0].id,selected.id,'Actual event saved to the correct city-local plan');
   assert(f.run('visible().some(e=>e.id===saved[0].id)'),'Saved actual event is visible in My plans');
   f.run(`toggleSave(${JSON.stringify(selected.id)});`);
   assert.equal(f.run('saved.length'),0,'Actual event can be removed again');
  }

 }
 for(const name of ['events.json','places.json']){
  const a=JSON.parse(fs.readFileSync('public/'+id+'/'+name)),b=JSON.parse(fs.readFileSync('public/en/'+id+'/'+name));
  const aa=a.events||a.places,bb=b.events||b.places;assert.equal(aa.length,bb.length);
  for(let i=0;i<aa.length;i++)for(const key of ['id','date','time','end','endDate','startAt','endAt','lat','lng','price','priceMax','currency','sourceUrl','checkedAt','visitSchedule','openingHoursSource'])assert.deepEqual(bb[i][key],aa[i][key],id+' '+aa[i].id+' '+key);
 }
 console.log('PASS '+id+': two-mode routes, IANA/currency config, citywide places, honest unlocated events, intervals, both saved collections, legacy links, EN factual parity.');
}
for(const file of ['public/index.html','public/en/index.html','public/app-start.html']){
 const script=fs.readFileSync(file,'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
 for(const saved of [null,'invalid',...picker.cities.map(c=>c.id)]){
  let target;vm.runInNewContext(script,{URLSearchParams,localStorage:{getItem:()=>saved},location:{search:'?lang=en',hash:'#keep',replace:value=>target=value}});
  assert.equal(target,'map.html?lang=en#keep');
 }
}
console.log('PASS: original nine data sets preserved, active routes/countries and own-device automatic first-visit routing independent of the last saved city.');
