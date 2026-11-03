const fs=require('fs'),assert=require('assert'),cp=require('child_process');
const harness=fs.readFileSync('scripts/test-conference-filters.cjs','utf8').split('for(const root of roots){')[0];const {fixture,roots}=new Function('require',harness+';return {fixture,roots}')(require);
const delta=JSON.parse(fs.readFileSync('data/morning-control-20261026/delta.json'));let result=[];
for(const root of roots.filter(r=>delta.added.some(e=>e.cityId===r.city)||delta.updated.some(e=>e.cityId===r.city))){
 const prefix='public/'+root.locale+(root.city==='tbilisi'?'':root.city+'/');const feed=JSON.parse(fs.readFileSync(prefix+'events.json'));const before=JSON.parse(cp.execFileSync('git',['show','8c5e0c0:'+prefix+'events.json'],{maxBuffer:30*1024*1024}));const changes=new Set(delta.updated.filter(e=>e.cityId===root.city).map(e=>e.id));const idx=new Map(feed.events.map(e=>[e.id,e]));
 for(const e of before.events){assert(idx.has(e.id),'old ID lost '+e.id);if(!changes.has(e.id))assert.deepStrictEqual(idx.get(e.id),e,'unrelated prior record changed '+e.id);}
 assert.equal(idx.size,feed.events.length,'duplicate IDs');
 const f=fixture(root,{sentinels:false});f.ctx.__feed=feed;f.run("__now=Date.parse('2026-10-26T05:12:00Z');events=__feed.events.map(e=>({...e,category:({party:'music',lecture:'talk'})[e.category]||e.category}));layer='events';view='explore';category='all';radius=0;language='all';time='all';freeOnly=false;searchTerm='';if(typeof accessFilter!=='undefined')accessFilter='all';");
 for(const e of [...delta.added,...delta.updated.map(x=>({...x.after,cityId:x.cityId}))].filter(e=>e.cityId===root.city)){
  f.run(`dates=['${e.date}'];if(typeof catalogDates!=='undefined')catalogDates=[...dates];day=0;category='all';render();`);assert(f.json('visible().map(e=>e.id)').includes(e.id),'new/corrected ID hidden '+e.id);f.ctx.__targetId=e.id;f.run("saved=[events.find(e=>e.id===__targetId)];setView('plans');render();");assert(f.json('visible().map(e=>e.id)').includes(e.id),'saved plan missing '+e.id);f.run("setView('explore');render();");result.push({route:root.path,id:e.id,date:e.date,visible:true,savedPlan:true});
 }
 if(root.city==='palo-alto'){f.run("dates=['2026-10-28'];catalogDates=[...dates];day=0;category='conference';render();");assert(f.json('visible().map(e=>e.id)').includes('pa-stanford-53995718968113'),'AI conference missing thematic filter');}
 global.gc?.();
}
const unknown=delta.added.filter(e=>['almaty','moscow'].includes(e.cityId));assert(unknown.every(e=>e.price===null),'unknown current price converted to free');assert.equal(delta.added.filter(e=>e.cinemaSession).length,0);
for(const e of delta.added.filter(e=>e.endAt))assert(new Date(e.endAt)>new Date(e.startAt),'bad overnight end '+e.id);
fs.writeFileSync('data/morning-control-20261026/visibility-tests.json',JSON.stringify(result,null,2));console.log('PASS '+result.length+' RU/EN ID/date/plan checks; all prior records and IDs preserved; unknown prices/overnight times/thematic conference verified.');
