const fs=require('fs'),assert=require('assert'),cp=require('child_process');
const d=JSON.parse(fs.readFileSync('data/morning-continuation-20261026/delta.json'));
const h=fs.readFileSync('scripts/test-conference-filters.cjs','utf8').split('for(const root of roots){')[0];const {fixture,roots}=new Function('require',h+';return {fixture,roots}')(require);
const proof=[];const modified=new Set(d.updated.map(e=>e.id));
for(const root of roots){
 const p='public/'+root.locale+(root.city==='tbilisi'?'':root.city+'/');const feed=JSON.parse(fs.readFileSync(p+'events.json'));const old=JSON.parse(cp.execFileSync('git',['show',d.baseCommit+':'+p+'events.json'],{maxBuffer:40*1024*1024}));const idx=new Map(feed.events.map(e=>[e.id,e]));assert.equal(idx.size,feed.events.length,'duplicate ID '+p);
 for(const e of old.events){assert(idx.has(e.id),'lost old ID '+e.id);if(!modified.has(e.id))assert.deepStrictEqual(idx.get(e.id),e,'unrelated event mutated '+e.id);}
 assert.equal(fs.readFileSync(p+'places.json','utf8'),cp.execFileSync('git',['show',d.baseCommit+':'+p+'places.json'],{maxBuffer:40*1024*1024}).toString(),'stored places changed '+p);
 const additions=d.added.filter(e=>e.cityId===root.city);const updates=d.updated.filter(e=>e.cityId===root.city).map(e=>e.after);if(!additions.length&&!updates.length)continue;
 const f=fixture(root,{sentinels:false});f.ctx.__feed=feed;f.run("__now=Date.parse('2026-10-26T05:52:00Z');events=__feed.events;layer='events';view='explore';category='all';radius=0;language='all';time='all';freeOnly=false;searchTerm='';if(typeof accessFilter!=='undefined')accessFilter='all';");
 for(const e of [...additions,...updates]){
  let date=e.date;if(e.ongoing)date=e.cityId==='new-york'?'2026-10-29':'2026-10-26';
  f.run(`dates=['${date}'];if(typeof catalogDates!=='undefined')catalogDates=[...dates];day=0;category='all';setView('explore');render();`);
  const held=e.publicationStatus==='held_for_recheck';assert.equal(f.json('visible().map(e=>e.id)').includes(e.id),!held,'visibility '+root.path+' '+e.id);
  if(!held){f.ctx.__targetId=e.id;f.run("saved=[events.find(e=>e.id===__targetId)];setView('plans');render();");assert(f.json('visible().map(e=>e.id)').includes(e.id),'saved plan '+e.id);f.run("setView('explore');render();");}
  proof.push({route:root.path,id:e.id,date,visible:!held,savedPlan:held?'not_applicable_held':true,language:root.locale?'en':'ru'});
 }
 const ongoing=additions.filter(e=>e.ongoing);
 for(const e of ongoing){for(const date of (root.city==='new-york'?['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01']:['2026-10-26','2026-10-27','2026-10-28'])){
  const weekday=new Date(date+'T12:00:00Z').getUTCDay();const expect=e.date<=date&&e.endDate>=date&&!e.closedWeekdays.includes(weekday);f.run(`dates=['${date}'];if(typeof catalogDates!=='undefined')catalogDates=[...dates];day=0;category='all';render();`);assert.equal(f.json('visible().map(e=>e.id)').includes(e.id),expect,'closure/range '+e.id+' '+date);proof.push({route:root.path,id:e.id,date,expectedVisible:expect,closureRangePassed:true});
 }}global.gc?.();
}
const cities=JSON.parse(fs.readFileSync('public/city-picker.json')).cities;assert.equal(cities.length,27);assert.equal(JSON.stringify(cities),JSON.stringify(JSON.parse(cp.execFileSync('git',['show',d.baseCommit+':public/city-picker.json'])).cities));
for(const e of d.added){assert(Number.isFinite(e.lat)&&Number.isFinite(e.lng));assert(e.coordinateSource&&e.coordinatePrecision&&e.yearEvidence);assert(!e.cinemaSession);assert(e.date<='2026-11-24');if(e.endAt)assert(new Date(e.endAt)>new Date(e.startAt));}
assert.equal(d.added.filter(e=>e.cityId==='moscow').length,15);assert.equal(d.added.filter(e=>e.cityId==='yerevan').length,17);assert.equal(d.held.length,3);
const sold=d.updated.find(e=>e.id==='m24-yerevan-30f1199f92d03f').after;assert(sold.soldOut&&!sold.cancelled&&sold.status!=='cancelled');
fs.writeFileSync('data/morning-continuation-20261026/verification.json',JSON.stringify({base:d.baseCommit,proof,checks:['all prior IDs','all unrelated prior objects byte-equivalent after JSON parse','all54 stored place files unchanged','all27 cities unchanged','RU/EN exact date visibility and saved plans','held exclusion','museum and NYC closure/weekdays/range','sold-out retained distinct from cancellation','coordinates and source metadata','no cinema replacement']},null,2));console.log('PASS continuation '+proof.length+' date/ID/plan/closure checks across RU/EN; all prior IDs and unrelated data preserved.');
