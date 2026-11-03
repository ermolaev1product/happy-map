const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),cp=require('child_process');
const base='b9224f1e5fea571e97d24a50eacee19eebe24f2f',read=p=>JSON.parse(fs.readFileSync(p)),old=p=>JSON.parse(cp.execFileSync('git',['show',base+':'+p],{maxBuffer:30e6}));
const report=read('data/research-exhibitions-20261014/import-result.json'),events=report.events,after=read('public/belgrade/events.json'),before=old('public/belgrade/events.json');
assert.equal(before.events.length,494);assert.equal(before.events.filter(e=>e.category==='art').length,4);assert.equal(events.length,23);assert.equal(after.events.length,517);
const ids=new Set(after.events.map(e=>e.id));assert.equal(ids.size,after.events.length);
for(const e of before.events)assert.deepEqual(after.events.find(x=>x.id===e.id),e,'prior history unchanged '+e.id);
for(const city of ['','moscow/','palo-alto/','paris/','london/'])for(const locale of ['','en/'])for(const filename of ['events.json','places.json'])assert.deepEqual(read('public/'+locale+city+filename),old('public/'+locale+city+filename),'other city preserved '+locale+city+filename);
for(const p of cp.execFileSync('git',['ls-tree','-r','--name-only',base,'public'],{encoding:'utf8'}).trim().split('\n'))if(/\.(js|css|html|apk|zip)$/.test(p)&&!['public/belgrade/app.js','public/en/belgrade/app.js'].includes(p))assert.deepEqual(fs.readFileSync(p),cp.execFileSync('git',['show',base+':'+p],{maxBuffer:35e6}),'unrelated UI and downloads preserved '+p);
const c={module:{exports:{}}};vm.runInNewContext(fs.readFileSync('public/discovery-model.js','utf8'),c);const m=c.module.exports,at=s=>Date.parse(s),now=at('2026-10-14T12:00:00+02:00');
for(const e of events){
 assert.equal(e.category,'art');assert(e.date<e.endDate);assert(e.timezone==='Europe/Belgrade');assert(e.lat>44.6&&e.lat<45&&e.lng>20.1&&e.lng<20.8);assert(e.coordinateSource&&e.address&&e.sourceUrl);assert.equal(e.availabilityVerified,false);
 assert(!m.availableOnDate(e,'2025-01-01',now));assert(!m.availableOnDate(e,'2028-01-01',now));
 for(const [date,visit] of Object.entries(e.visitSchedule||{})){
  assert(date>=e.date&&date<=e.endDate);assert(!e.closedWeekdays.includes(new Date(date+'T12:00Z').getUTCDay()));
  if(visit.end){const end=m.wallInstant(date,visit.end,e.timezone,true);assert(m.availableOnDate(e,date,end-1),'visible until closing '+e.id+' '+date);assert(!m.availableOnDate(e,date,end),'closed at exact end '+e.id+' '+date);}
 }
}
const find=s=>events.find(e=>e.id.includes(s));
const msub=find('zarko-baseski'),ethno=find('traces-'),ruah=find('ulus-ruah'),u10=find('u10-tangenta'),b2=find('b2-ana');
assert.equal(msub.visitSchedule['2026-10-14'].start,'11:00');assert.equal(msub.visitSchedule['2026-10-15'].start,'12:00');assert.equal(msub.visitSchedule['2026-10-15'].end,'20:00');assert(!m.availableOnDate(msub,'2026-10-20',now));
assert(!m.availableOnDate(ethno,'2026-10-14',now));assert(m.availableOnDate(ethno,'2026-10-15',now));
assert(!m.availableOnDate(u10,'2026-10-14',now));assert.equal(u10.visitSchedule['2026-10-15'].start,'19:00');assert.equal(u10.visitSchedule['2026-10-16'].start,'12:00');
assert.equal(ruah.visitSchedule['2026-10-16'].start,'19:00');assert.equal(ruah.visitSchedule['2026-10-16'].end,null);assert.equal(ruah.visitSchedule['2026-10-17'].start,'12:00');
assert(!m.availableOnDate(b2,'2026-10-18',now),'unknown Sunday is not invented as a visit');
assert(m.availableOnDate(find('dots-retke'),'2026-10-14',now),'date range discoverable with explicitly unknown hours');assert.equal(find('dots-retke').time,null);
// Existing global visibility, DST, overnight, closed dates and six-city fixtures.
vm.runInNewContext(fs.readFileSync('scripts/test-live-expiry.cjs','utf8').split('const baseline=')[0],{require,console,module:{exports:{}}});
let totals={};
for(const locale of ['','en/']){
 let clock=now;class Clock extends Date{constructor(...a){super(...(a.length?a:[clock]));}static now(){return clock;}}
 const nodes=new Map();let stub;const create=()=>new Proxy(function(){},{get:(o,k)=>k in o?o[k]:k==='querySelector'?()=>stub:k==='querySelectorAll'?()=>[]:k==='classList'?{add(){},remove(){},toggle(){}}:k==='value'?'all':k==='length'?0:stub,apply:()=>stub,set:(o,k,v)=>(o[k]=v,true)});stub=create();const $=s=>{if(!nodes.has(s))nodes.set(s,create());return nodes.get(s)};
 const ctx=vm.createContext({console,Intl,Date:Clock,URL,URLSearchParams,document:{querySelector:$,getElementById:id=>$('#'+id),querySelectorAll:()=>[],body:stub,createElement:()=>stub},localStorage:{getItem:()=>null},window:stub,location:{search:'',hash:''},history:stub,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},navigator:{},ResizeObserver:class{observe(){}},fetch:()=>{},Map,Set});
 vm.runInContext(fs.readFileSync('public/'+locale+'discovery-model.js','utf8'),ctx);vm.runInContext(fs.readFileSync('public/'+locale+'belgrade/app.js','utf8'),ctx);vm.runInContext(fs.readFileSync('public/'+locale+'discovery.js','utf8').replace(/^start\(\)\.then\([^\n]+$/m,''),ctx);
 ctx.data=read('public/'+locale+'belgrade/events.json');
 vm.runInContext(`catalog=data;events=data.events;dates=['2026-10-14','2026-10-15','2026-10-16','2026-10-17','2026-10-18','2026-10-19','2026-10-20'];day=0;category='art';layer='events';view='explore';radius=0;venueIndex=NoreliDiscovery.connect([],events);places=venueIndex.places;renderMap=list=>globalThis.mapIds=list.map(e=>e.id);`,ctx);
 vm.runInContext('render()',ctx);assert(nodes.get('#categories').innerHTML.includes('data-category="art"'));assert(ctx.mapIds.includes(b2.id));assert(!ctx.mapIds.includes(ethno.id));assert.equal(ctx.mapIds.join(','),vm.runInContext('visible().map(e=>e.id).join(",")',ctx));
 totals[locale||'ru']={todayCitywide:ctx.mapIds.length};
 vm.runInContext('radius=.5;render()',ctx);totals[locale||'ru'].today500m=ctx.mapIds.length;assert(ctx.mapIds.includes(b2.id));assert(!ctx.mapIds.includes(msub.id));
 vm.runInContext('radius=0;day=1;render()',ctx);assert(ctx.mapIds.includes(ethno.id));assert(ctx.mapIds.includes(u10.id));vm.runInContext(`openEvent('${msub.id}')`,ctx);assert(nodes.get('#eventDetails').innerHTML.includes('12:00'));assert(nodes.get('#eventDetails').innerHTML.includes('20:00'));assert(nodes.get('#eventDetails').innerHTML.includes('2026-10-15'));
 vm.runInContext(`openEvent('${u10.id}')`,ctx);assert(nodes.get('#eventDetails').innerHTML.includes('19:00'));assert.equal(vm.runInContext(`eventById('${u10.id}').date`,ctx),'2026-10-15');
 vm.runInContext(`time='evening';render()`,ctx);assert(ctx.mapIds.includes(u10.id));assert(!ctx.mapIds.includes(msub.id));vm.runInContext(`day=2;time='all';render();openEvent('${u10.id}')`,ctx);assert(nodes.get('#eventDetails').innerHTML.includes('12:00'));assert(nodes.get('#eventDetails').innerHTML.includes('20:00'));
 clock=at('2026-10-14T20:00:00+02:00');vm.runInContext('day=0;render()',ctx);assert(!ctx.mapIds.includes(b2.id));vm.runInContext('day=1;render()',ctx);assert(ctx.mapIds.includes(b2.id),'next day survives prior close');
}
assert.deepEqual(totals.ru,totals['en/']);fs.writeFileSync('data/research-exhibitions-20261014/test-result.json',JSON.stringify({passed:true,totals,added:events.length,checks:'full run, closure/reopening, future days, opening vs regular visits, RU/EN selected details/time/category/radius, preserved six cities/UI/APKs, legacy expiry/DST fixtures'},null,2)+'\n');
console.log('PASS exhibition coverage:',JSON.stringify(totals));
