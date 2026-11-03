const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const model=fs.readFileSync('public/discovery-model.js','utf8');
const client=fs.readFileSync('public/assets/guide.js','utf8');
function harness(zone,instant,events){
 let now=Date.parse(instant);const timers=[],listeners={};
 const nodes=Object.fromEntries(events.map(e=>['event-'+encodeURIComponent(e.id),{hidden:false}]));
 const empty={hidden:true},buttons=['all','today','evening','weekend'].map(period=>({dataset:{period},attributes:{},setAttribute(k,v){this.attributes[k]=v;}}));
 const document={hidden:false,querySelector(s){return s==='main[data-zone]'?{dataset:{zone}}:s==='#guide-data'?{textContent:JSON.stringify(events)}:s==='#empty'?empty:null;},querySelectorAll(s){return s==='[data-period]'?buttons:[];},getElementById(id){return nodes[id];},addEventListener(type,fn){listeners[type]=fn;}};
 class Clock extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const context=vm.createContext({Date:Clock,Intl,document,setInterval(fn,ms){assert.equal(ms,60000);timers.push(fn);}});
 vm.runInContext(model,context);vm.runInContext(client,context);
 return {visible(){return events.filter(e=>!nodes['event-'+encodeURIComponent(e.id)].hidden).map(e=>e.id);},tick(instant){now=Date.parse(instant);timers.forEach(fn=>fn());},resume(instant){now=Date.parse(instant);listeners.visibilitychange();},empty,buttons};
}
const berlin=harness('Europe/Berlin','2026-10-25T17:00:00Z',[
 {id:'evening',date:'2026-10-25',time:'19:00'},
 {id:'ended',date:'2026-10-25',time:'15:00',end:'16:00'},
 {id:'unknown',date:'2026-10-25',time:null},
 {id:'monday',date:'2026-10-26',time:'19:00'},
 {id:'sixth-day',date:'2026-10-31',time:'19:00'},
 {id:'seventh-day',date:'2026-11-01',time:'19:00'},
 {id:'closed-sunday',date:'2026-10-01',endDate:'2026-11-01',closedWeekdays:[0]},
 {id:'hours-ended',date:'2026-10-25',endDate:'2026-10-27',visitSchedule:{'2026-10-25':{start:'10:00',end:'17:00'}}},
 {id:'held',date:'2026-10-25',time:'20:00',publicationStatus:'held_for_recheck'}
]);
assert.deepEqual(berlin.visible(),['evening','unknown','monday','sixth-day','closed-sunday']);
berlin.tick('2026-10-25T20:01:00Z');assert.deepEqual(berlin.visible(),['unknown','monday','sixth-day','closed-sunday']);
berlin.resume('2026-10-26T17:00:00Z');assert.deepEqual(berlin.visible(),['monday','sixth-day','seventh-day','closed-sunday']);
// UTC Monday is still Sunday in California. Local dates win.
const la=harness('America/Los_Angeles','2026-10-26T00:30:00Z',[
 {id:'sun',date:'2026-10-25',time:'18:00'},
 {id:'mon',date:'2026-10-26',time:'18:00'},
 {id:'outside',date:'2026-11-01',time:'18:00'}
]);assert.deepEqual(la.visible(),['sun','mon']);
const dst=harness('Europe/Berlin','2026-10-25T00:30:00Z',[
 {id:'repeated-hour',date:'2026-10-25',time:'02:00',end:'02:45'}
]);assert.deepEqual(dst.visible(),['repeated-hour']);dst.tick('2026-10-25T01:46:00Z');assert.deepEqual(dst.visible(),[]);assert.equal(dst.empty.hidden,false);
// Evaluate the production entry initializer itself in a bounded state fixture.
const catalog=fs.readFileSync('public/catalog-modes.js','utf8');
const initializer=catalog.slice(catalog.indexOf(' function initializeModesFromEntry()'),catalog.indexOf(' const beforeInit=initMap;'));
function entryState(query,start='2026-10-25'){const fixtureDates=Array.from({length:7},(_,i)=>new Date(Date.parse(start+'T12:00:00Z')+i*86400000).toISOString().slice(0,10));const c=vm.createContext({URLSearchParams});vm.runInContext(`let catalogDates=Array.from({length:30},(_,i)=>'old-'+i);let initialized=false,layer='events',radius=.5,freeOnly=true,language='RU',searchTerm='old',day=4,time='day',category='music',controlCalls=0;const entry=new URLSearchParams(${JSON.stringify(query)}),dates=${JSON.stringify(fixtureDates)},categories=[{id:'all'},{id:'art'},{id:'music'},{id:'talk'}];function isCity(){return false;}function setControls(){controlCalls++;}${initializer};initializeModesFromEntry();result={day,time,category,radius,freeOnly,language,searchTerm,layer,controlCalls,catalogLength:catalogDates.length};`,c);return JSON.parse(JSON.stringify(c.result));}
assert.deepEqual(entryState('from=guide&period=week'),{day:-1,time:'all',category:'all',radius:0,freeOnly:false,language:'all',searchTerm:'',layer:'events',controlCalls:1,catalogLength:7});
assert.equal(entryState('from=guide&period=today&time=evening').time,'evening');assert.equal(entryState('from=guide&period=today').day,0);
assert.equal(entryState('from=guide&date=2026-10-31').day,6);assert.equal(entryState('from=guide&period=week&category=art').category,'art');
assert.equal(entryState('period=today').controlCalls,0);
assert.equal(entryState('from=guide&period=week').catalogLength,7);assert.equal(entryState('period=all').catalogLength,30);
assert(fs.readFileSync('public/assets/guide.css','utf8').includes('.guide-event{display:block;min-height:44px}'));
assert.equal(entryState('period=today').category,'music');
assert.equal(entryState('from=guide&period=weekend','2026-10-25').day,0); // Sunday itself
assert.equal(entryState('from=guide&period=weekend','2026-10-26').day,5); // Monday -> Saturday
assert.equal(entryState('from=guide&period=weekend','2026-10-31').day,0); // Saturday itself
assert.equal(entryState('from=guide&period=weekend','2026-10-27').day,4); // Tuesday -> Saturday

// Run the production deep-link opening block: once only, known and available ID only.
const openBlock=catalog.slice(catalog.indexOf("  if(!guideEventOpened&&entry.get('from')==='guide'"),catalog.indexOf('  const whole=isCity();'));
function openState(eventId,events){const c=vm.createContext({URLSearchParams,Date,Intl});vm.runInContext(model,c);c.events=events;vm.runInContext(`let guideEventOpened=false,opened=[];const entry=new URLSearchParams('from=guide&event='+encodeURIComponent(${JSON.stringify(eventId)})),dates=['2099-10-25'];function queueMicrotask(fn){fn();}function openEvent(id){opened.push(id);}${openBlock};${openBlock};result=opened;`,c);return JSON.parse(JSON.stringify(c.result));}
assert.deepEqual(openState('known',[{id:'known',date:'2099-10-25',time:'20:00'}]),['known']);
assert.deepEqual(openState('absent',[{id:'known',date:'2099-10-25',time:'20:00'}]),[]);
assert.deepEqual(openState('held',[{id:'held',date:'2099-10-25',publicationStatus:'held_for_recheck'}]),[]);
// Real HTML anchors must work without JS: cards and period controls target the map.
let links=0,pages=0;for(const lang of ['ru','en','de'])for(const f of fs.readdirSync('public/guide/'+lang).filter(f=>f.endsWith('.html')&&f!=='index.html')){
 const html=fs.readFileSync('public/guide/'+lang+'/'+f,'utf8');assert(!/<button[^>]*data-period/.test(html));
 const controls=[...html.matchAll(/<a class="guide-action" data-period="([^"]+)" href="([^"]+)"/g)];assert.equal(controls.length,4);
 for(const [,period,href]of controls){const u=new URL(href.replaceAll('&amp;','&'),'https://happymap.app');assert(!u.pathname.startsWith('/guide/'));assert.equal(u.searchParams.get('from'),'guide');assert.equal(u.searchParams.get('layer'),'events');assert.equal(u.searchParams.get('radius'),'all');assert.equal(u.searchParams.get('lang'),lang);if(period==='all')assert.equal(u.searchParams.get('period'),'week');if(period==='today')assert.equal(u.searchParams.get('period'),'today');if(period==='evening')assert.equal(u.searchParams.get('time'),'evening');if(period==='weekend'){assert.equal(u.searchParams.get('period'),'weekend');assert.equal(u.searchParams.has('date'),false);}links++;}
 for(const [,href]of html.matchAll(/<a class="guide-event" href="([^"]+)"/g)){const u=new URL(href.replaceAll('&amp;','&'),'https://happymap.app');assert.equal(u.searchParams.get('from'),'guide');assert(u.searchParams.get('event'));assert.match(u.searchParams.get('date'),/^\d{4}-\d{2}-\d{2}$/);links++;}pages++;
}
console.log(JSON.stringify({passed:true,client:'guide.js',pages,links,checks:['7-day-expiry','closed-days','visit-hours','held','minute-refresh','visibility-refresh','local-date','Europe/Berlin-DST','real-navigation-anchors','map-entry-initializer']}));
