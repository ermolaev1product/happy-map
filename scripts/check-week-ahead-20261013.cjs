const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),cp=require('child_process');
const baseline='83edef0d1aae19a60b42fd2f0637ef4e9889f4b9';
function model(text){let c={module:{exports:{}}};vm.runInNewContext(text,c);return c.module.exports;}
const before=model(cp.execFileSync('git',['show',baseline+':public/discovery-model.js'],{encoding:'utf8'}));
const after=model(fs.readFileSync('public/discovery-model.js','utf8'));
const dates=Array.from({length:7},(_,i)=>'2026-10-'+(13+i));
let corrections=new Set(['n23:2820db71477d4cf8','n23:d25578171610ee2b','n23:1834fc3fa2390cd9','n23:46019a4764edff61']);
for(const folder of ['','belgrade/','moscow/','palo-alto/','paris/','london/']){
 const path='public/'+folder+'events.json',prior=JSON.parse(cp.execFileSync('git',['show',baseline+':'+path],{encoding:'utf8',maxBuffer:25e6})),now=JSON.parse(fs.readFileSync(path));
 if(folder){const originalFields=structuredClone(now);for(const e of originalFields.events)delete e.endTimeEstimated;assert.deepEqual(originalFields,prior,folder+' original catalog fields must not change');for(const date of dates)assert.deepEqual(now.events.filter(e=>after.onDate(e,date)).map(e=>e.id),prior.events.filter(e=>before.onDate(e,date)).map(e=>e.id),folder+date);}
 else{
  const seen=new Set();for(const e of now.events){assert(!seen.has(e.id),'duplicate '+e.id);seen.add(e.id);}
  const byid=new Map(now.events.map(e=>[e.id,e]));for(const e of prior.events){assert(byid.has(e.id),'lost historic ID '+e.id);if(e.date<'2026-10-14'&&!corrections.has(e.id))assert.deepEqual(byid.get(e.id),e,'changed earlier event '+e.id);}
  assert.deepEqual(now.events.filter(e=>after.onDate(e,'2026-10-13')).map(e=>e.id),prior.events.filter(e=>before.onDate(e,'2026-10-13')).map(e=>e.id),'Today retained');
  for(const date of dates.slice(1)){const sessions=now.events.filter(e=>e.cinemaSession&&e.date===date);assert(sessions.length>=140,'cinema date gap '+date);assert.equal(sessions.length,now.events.filter(e=>e.cinemaSession&&after.onDate(e,date)).length,'cinema counted on start date only');}
  for(const id of [...corrections].slice(0,3)){assert(!after.onDate(byid.get(id),'2026-10-14'));assert(!after.onDate(byid.get(id),'2026-10-19'));assert(after.onDate(byid.get(id),'2026-10-17'));}
 }
 const en=JSON.parse(fs.readFileSync('public/en/'+folder+'events.json'));assert.equal(now.events.length,en.events.length);for(let i=0;i<now.events.length;i++)for(const date of dates)assert.equal(after.onDate(now.events[i],date),after.onDate(en.events[i],date),'English date parity');
}
const screen={date:'2026-10-17',endDate:'2026-10-18',cinemaSession:true};assert(after.onDate(screen,'2026-10-17'));assert(!after.onDate(screen,'2026-10-18'));
const night={date:'2026-10-17',endDate:'2026-10-18'};assert(after.onDate(night,'2026-10-18'),'retain other overnight events');
for(const path of cp.execFileSync('git',['ls-tree','-r','--name-only',baseline,'public/downloads'],{encoding:'utf8'}).trim().split('\n'))assert.deepEqual(fs.readFileSync(path),cp.execFileSync('git',['show',baseline+':'+path],{maxBuffer:25e6}),'preserve download '+path);
console.log('PASS: six-city membership, EN parity, exact cinema start dates, overnight endings, holiday/Monday closures, today/history IDs, every download including 17 APKs.');
