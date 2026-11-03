const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
function model(file='public/discovery-model.js'){const c={module:{exports:{}}};vm.runInNewContext(fs.readFileSync(file,'utf8'),c);return c.module.exports;}
const m=model(),at=s=>Date.parse(s),base={id:'fixture',date:'2026-10-13',time:'18:00',timezone:'Asia/Tbilisi'};
const show=(e,now,date=e.date)=>m.availableOnDate(e,date,at(now));
assert(!show({...base,end:'20:00'},'2026-10-13T22:00:00+04:00'),'18:00 completed event is hidden at22:00');
assert(show({...base,end:'20:00'},'2026-10-13T18:59:00+04:00'),'arrival remains at 59 minutes');assert(!show({...base,end:'20:00'},'2026-10-13T19:00:00+04:00'),'arrival closes exactly at 60 minutes');
assert(!show({...base,end:'20:00'},'2026-10-13T20:00:00+04:00'),'exact end is exclusive');
assert(show(base,'2026-10-13T18:59:00+04:00'));assert(!show(base,'2026-10-13T19:00:00+04:00'));assert(!show(base,'2026-10-13T20:00:00+04:00'));
assert.equal(m.visibilityEnd(base,base.date).reason,'arrival-cutoff');assert.equal(base.end,undefined,'fallback never writes fabricated end');
assert(show({...base,date:'2026-10-14'},'2026-10-13T22:00:00+04:00'),'tomorrow survives today clock');
assert(!show({...base,end:'23:30'},'2026-10-13T22:00:00+04:00'),'long verified sessions still have an arrival cutoff');const early={...base,end:'18:30'};assert(show(early,'2026-10-13T18:29:00+04:00'));assert(!show(early,'2026-10-13T18:30:00+04:00'),'earlier actual end wins');
const overnight={...base,time:'23:00',end:'02:00'};
assert(show(overnight,'2026-10-13T22:00:00+04:00'));assert(show(overnight,'2026-10-13T23:59:00+04:00'));assert(!show(overnight,'2026-10-14T00:00:00+04:00'));assert(!show(overnight,'2026-10-14T01:00:00+04:00','2026-10-14'));assert(!show(overnight,'2026-10-14T02:00:00+04:00','2026-10-14'));
assert(!show({...overnight,cinemaSession:true},'2026-10-14T01:00:00+04:00','2026-10-14'),'cinema retains advertised calendar date');
assert(show({...overnight,cinemaSession:true},'2026-10-13T23:59:00+04:00'),'cinema remains within arrival window on start-date selection');assert(!show({...overnight,cinemaSession:true},'2026-10-14T00:00:00+04:00'),'cinema hides at arrival cutoff even before its actual end');
const daily={...base,endDate:'2026-10-20',ongoing:true,time:'10:00',end:'18:00',endAt:'2026-10-20T18:00:00+04:00'};
assert(!show(daily,'2026-10-13T19:00:00+04:00'));assert(show(daily,'2026-10-13T19:00:00+04:00','2026-10-14'),'tomorrow museum visit remains');
assert(!show({...daily,closedDates:['2026-10-14']},'2026-10-13T12:00:00+04:00','2026-10-14'));
assert(!show({...daily,closedWeekdays:[3]},'2026-10-13T12:00:00+04:00','2026-10-14'));
const visits={...base,time:null,endDate:'2026-10-20',validDates:['2026-10-13','2026-10-15'],visitSchedule:{'2026-10-13':{start:'10:00',end:'18:00'},'2026-10-15':{start:'10:00',end:'20:00'}}};
assert(!show(visits,'2026-10-13T19:00:00+04:00'));assert(show(visits,'2026-10-13T19:00:00+04:00','2026-10-15'));assert(!show(visits,'2026-10-13T12:00:00+04:00','2026-10-14'));
assert(show({...base,time:null,endDate:'2026-10-20'},'2026-10-13T22:00:00+04:00'),'unknown multi-day hours retain range');
assert(!show({...base,time:null},'2026-10-14T12:00:00+04:00','2026-10-14'),'unknown start does not invent daily recurrence');
assert(show({...base,end:base.time},'2026-10-13T18:59:00+04:00'),'equal start/end is unknown duration');assert(!show({...base,end:base.time},'2026-10-13T19:00:00+04:00'),'equal start/end still has an arrival cutoff');assert(!show({...base,end:base.time},'2026-10-13T22:00:00+04:00'));
const festival={...base,endDate:'2026-10-15',endAt:'2026-10-15T06:00:00+04:00'};assert(show(festival,'2026-10-14T22:00:00+04:00','2026-10-14'));assert(!show(festival,'2026-10-15T06:00:00+04:00','2026-10-15'));
const discussion={...base,end:'22:04',endTimeEstimated:true};assert(show(discussion,'2026-10-13T18:59:00+04:00'));assert(!show(discussion,'2026-10-13T19:00:00+04:00'));assert(!show(discussion,'2026-10-13T22:30:00+04:00'));assert(!show(discussion,'2026-10-13T23:04:00+04:00'));
for(const zone of ['Asia/Tbilisi','Europe/Belgrade','Europe/Moscow','America/Los_Angeles','Europe/Paris','Europe/London']){
 const e={...base,timezone:zone,end:'20:00'},end=m.wallInstant(base.date,'18:00',zone)+3600000;
 assert(m.availableOnDate(e,e.date,end-1));assert(!m.availableOnDate(e,e.date,end));
}
const dst={date:'2026-10-24',time:'23:00',end:'06:00',endDate:'2026-10-25',timezone:'Europe/Belgrade'};
assert.equal(m.visibilityEnd(dst,dst.date,'Europe/Belgrade').at,at('2026-10-25T00:00:00+02:00'));
assert(show(dst,'2026-10-24T23:59:00+02:00'));assert(!show(dst,'2026-10-25T00:00:00+02:00'));assert(!show(dst,'2026-10-25T05:59:00+01:00','2026-10-25'));assert(!show(dst,'2026-10-25T06:00:00+01:00','2026-10-25'));
assert.equal(m.wallInstant('2026-10-25','02:30','Europe/Paris',true),at('2026-10-25T02:30:00+01:00'),'later repeated end hour');
assert.equal(m.wallInstant('2026-03-29','03:30','Europe/Paris',true),at('2026-03-29T03:30:00+02:00'),'spring DST offset');
assert.equal(m.wallInstant('2026-11-01','01:30','America/Los_Angeles',true),at('2026-11-01T01:30:00-08:00'),'US repeated hour');
assert.equal(m.wallInstant('2026-03-08','02:30','America/Los_Angeles'),at('2026-03-08T03:30:00-07:00'),'nonexistent spring hour shifts forward');
const snapshot=JSON.stringify(visits);for(let i=0;i<10;i++)show(visits,'2026-10-13T19:00:00+04:00');assert.equal(JSON.stringify(visits),snapshot);
// All routes and generated English mirrors run the same visibility implementation.
const cities=['','belgrade/','moscow/','palo-alto/','paris/','london/'];
for(const prefix of ['public/','public/en/'])for(const city of cities){
 const code=fs.readFileSync(prefix+city+'app.js','utf8');assert(code.includes('NoreliDiscovery.setTimeZone('));assert(code.includes('NoreliDiscovery.availableOnDate('));assert(!/function (city|paloAlto)NotFinished/.test(code));
 const html=fs.readFileSync(prefix+city+(city?'index.html':'map.html'),'utf8');assert(html.includes('freshness.js'));assert(html.includes('discovery-model.js'));
 const mm=model(prefix+'discovery-model.js');assert(!mm.availableOnDate(base,base.date,at('2026-10-13T22:00:00+04:00')));
 const d=JSON.parse(fs.readFileSync(prefix+city+'events.json'));
 for(const e of d.events)assert.doesNotThrow(()=>mm.availableOnDate(e,'2026-10-14',at('2026-10-14T18:00:00Z')),'all catalog fields/timezones handled: '+e.id);
}
const baseline='42c952051788c0817e9eaa8db7d4b023e8b1f9a9';
for(const city of cities){
 const path='public/'+city+'events.json',before=JSON.parse(cp.execFileSync('git',['show',baseline+':'+path],{maxBuffer:25e6})),after=JSON.parse(fs.readFileSync(path));
 assert.equal(before.events.length,after.events.length);assert.deepEqual(before.sourceRegistry,after.sourceRegistry);
 for(let i=0;i<before.events.length;i++){const e=after.events[i];assert.deepEqual(e,before.events[i],'original event/history preserved '+e.id);}
}
for(const path of cp.execFileSync('git',['ls-tree','-r','--name-only',baseline,'public/downloads'],{encoding:'utf8'}).trim().split('\n'))assert.deepEqual(fs.readFileSync(path),cp.execFileSync('git',['show',baseline+':'+path],{maxBuffer:25e6}));
console.log('PASS: one-hour arrival cutoff, earlier actual ends, future dates, overnight/cinema start day, recurring museums/closures, multi-day, DST, six-city RU/EN, all history/registries/downloads unchanged.');
