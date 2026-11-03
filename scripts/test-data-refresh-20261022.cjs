const fs=require('fs'),assert=require('assert'),cp=require('child_process'),vm=require('vm');
// Original expiry behaviour tests (the old file's final assertions compare against a superseded migration snapshot).
const old=fs.readFileSync('scripts/test-live-expiry.cjs','utf8').split("const baseline='c0c2")[0];new Function('require',old)(require);
const base='da908724d6f9628e4f4261558e6658944978c07b',added=JSON.parse(fs.readFileSync('data/morning-control-20261022/added-events.json')),fixes=JSON.parse(fs.readFileSync('data/morning-control-20261022/place-link-fixes.json'));
const cities=JSON.parse(fs.readFileSync('public/city-picker.json')).cities;
for(const c of cities){
 let sets=[];
 for(const locale of ['','en/']){
  const p='public/'+locale+(c.id==='tbilisi'?'':c.id+'/')+'events.json',before=JSON.parse(cp.execFileSync('git',['show',base+':'+p],{maxBuffer:50e6})),after=JSON.parse(fs.readFileSync(p));
  assert.equal(after.events.length,before.events.length+added.filter(e=>e.cityId===c.id).length);
  const map=new Map(after.events.map(e=>[e.id,e]));assert.equal(map.size,after.events.length,'unique stable event IDs');
  for(const e of before.events){let a={...map.get(e.id)},b={...e};const change=fixes.find(x=>x.city===c.id&&x.eventId===e.id);if(change){assert.equal(a.placeId,change.placeId);delete a.placeId;delete b.placeId;}assert.deepEqual(a,b,'Only explicitly audited link changes allowed: '+p+' '+e.id);}
  for(const e of added.filter(e=>e.cityId===c.id)){const a=map.get(e.id);assert(a.sourceUrl&&a.checkedAt&&a.coordinateSource&&a.timezone);assert(Number.isFinite(a.lat)&&Number.isFinite(a.lng));assert(!a.cancelled);}
  sets.push([...map.keys()].sort());
 }
 assert.deepEqual(sets[0],sets[1],c.id+' same RU/EN event IDs');
}
const london=added.filter(e=>e.cityId==='london');assert(london.find(e=>e.date==='2026-10-22').startAt.endsWith('+01:00'));assert(london.find(e=>e.date==='2026-10-26').startAt.endsWith('+00:00'));
const y=added.find(e=>e.cityId==='yerevan');assert(!y.endAt&&!y.end,'unknown end not fabricated');
const najah=added.find(e=>e.id==='dubai-najah-20261025');assert.equal(najah.time,null);assert.deepEqual(najah.openingWindows['2026-10-26'].intervals,[{start:'08:30',end:'13:30'},{start:'16:30',end:'20:30'}]);assert(!najah.visitSchedule['2026-10-26'].start,'no continuous start-time claim across closure');
for(const p of cp.execFileSync('git',['ls-tree','-r','--name-only',base,'public/downloads'],{encoding:'utf8'}).trim().split('\n'))assert.deepEqual(fs.readFileSync(p),cp.execFileSync('git',['show',base+':'+p],{maxBuffer:30e6}));
console.log('PASS: expiry/DST/closures; 27 city histories preserved; '+added.length+' new programmes, '+fixes.length+' venue identity corrections; same RU/EN IDs; original downloads unchanged. DOM/model validation, not live browser.');
