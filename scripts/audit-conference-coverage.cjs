'use strict';
// Read-only reproducible census using the actual route filters, at a fixed audit instant.
const fs=require('node:fs'),cp=require('node:child_process');
const base='4f4b09dbf5e64eb9ce99f98f2129eee461d8f4f2';
let harness=fs.readFileSync('scripts/test-conference-filters.cjs','utf8').split('for(const root of roots){')[0];
harness=harness.replace("let modes=fs.readFileSync('public/catalog-modes.js','utf8');","let modes=__modes||fs.readFileSync('public/catalog-modes.js','utf8');");
const baselineModes=cp.execFileSync('git',['show',base+':public/catalog-modes.js'],{encoding:'utf8',maxBuffer:64*1024*1024});
const factories={before:new Function('require','__modes',harness+';return {fixture,roots};')(require,baselineModes),after:new Function('require','__modes',harness+';return {fixture,roots};')(require,null)};
const all=[],parity=[];const dayDates=Array.from({length:10},(_,i)=>'2026-10-'+String(16+i));
for(const [stage,{fixture,roots}] of Object.entries(factories))for(const root of roots){
 const path='public/'+root.locale+(root.city==='tbilisi'?'':root.city+'/')+'events.json';
 const feed=JSON.parse(stage==='before'?cp.execFileSync('git',['show',base+':'+path],{encoding:'utf8',maxBuffer:64*1024*1024}):fs.readFileSync(path,'utf8'));
 const f=fixture(root,{sentinels:false});f.ctx.__feed=feed;f.ctx.__days=dayDates;
 f.run("catalog=__feed;events=__feed.events.map(e=>({...e,category:({cinema:'film',concert:'music',concerts:'music',festival:'city',lecture:'talk',classical:'music',party:'music'})[e.category]||e.category}));dates=__days;if(typeof catalogDates!=='undefined')catalogDates=[...dates];category='conference';language='all';freeOnly=false;time='all';searchTerm='';if(typeof accessFilter!=='undefined')accessFilter='all';layer='events';view='explore';");
 const row={stage,city:root.city,locale:root.locale?'en':'ru',path:root.path,asOf:'2026-10-16T16:31:00Z',referencePoint:f.json('position'),days:[]};
 const unique=new Map(),future=new Map();
 for(let i=1;i<dayDates.length;i++){
  f.run('day='+i+';radius=0;');const citywide=f.json('visible()');f.run('radius=.5;');const near=f.json('visible().map(e=>e.id)');
  const programmes=new Set(citywide.map(e=>e.programmeId||e.parentProgrammeId||e.id));
  const d={date:dayDates[i],occurrences:citywide.length,programmes:programmes.size,near500m:near.length,mapLocations:new Set(citywide.filter(e=>Number.isFinite(e.lat)&&Number.isFinite(e.lng)).map(e=>e.lat+','+e.lng)).size,unmapped:citywide.filter(e=>!Number.isFinite(e.lat)||!Number.isFinite(e.lng)).length,soldOut:citywide.filter(e=>e.soldOut).length,closed:citywide.filter(e=>['closed','registration_closed'].includes(e.registrationStatus)).length,requestOnly:citywide.filter(e=>e.registrationStatus==='request_only'||e.accessType==='request_only').length,ids:citywide.map(e=>e.id).sort()};row.days.push(d);
  for(const e of citywide)(i<=6?unique:future).set(e.id,e);
 }
 const summarize=m=>({occurrences:m.size,programmes:new Set([...m.values()].map(e=>e.programmeId||e.parentProgrammeId||e.id)).size,unmapped:[...m.values()].filter(e=>!Number.isFinite(e.lat)||!Number.isFinite(e.lng)).length,soldOut:[...m.values()].filter(e=>e.soldOut).length,closed:[...m.values()].filter(e=>['closed','registration_closed'].includes(e.registrationStatus)).length,requestOnly:[...m.values()].filter(e=>e.registrationStatus==='request_only'||e.accessType==='request_only').length});
 row.primary=summarize(unique);row.forward=summarize(future);all.push(row);
}
for(const stage of ['before','after'])for(const city of factories.after.roots.filter(r=>!r.locale).map(r=>r.city)){
 const [ru,en]=['ru','en'].map(locale=>all.find(r=>r.stage===stage&&r.city===city&&r.locale===locale));
 if(JSON.stringify(ru.days.map(d=>d.ids))!==JSON.stringify(en.days.map(d=>d.ids)))parity.push({stage,city});
}
const summary=factories.after.roots.filter(r=>!r.locale).map(({city})=>{const b=all.find(r=>r.stage==='before'&&r.city===city&&r.locale==='ru'),a=all.find(r=>r.stage==='after'&&r.city===city&&r.locale==='ru');return {city,before17_22:b.primary.occurrences,after17_22:a.primary.occurrences,programmes17_22:a.primary.programmes,oct17:a.days[0].occurrences,oct18:a.days[1].occurrences,oct19:a.days[2].occurrences,near500mOct17:a.days[0].near500m,unmapped17_22:a.primary.unmapped,soldOut17_22:a.primary.soldOut,closed17_22:a.primary.closed,requestOnly17_22:a.primary.requestOnly,forward23_25:a.forward.occurrences};});
fs.mkdirSync('outputs/conference-release',{recursive:true});fs.writeFileSync('outputs/conference-release/filter-census.json',JSON.stringify({asOf:'2026-10-16T16:31:00Z',base,parityFailures:parity,summary,routes:all},null,2)+'\n');
const cols=Object.keys(summary[0]);fs.writeFileSync('outputs/conference-release/city-counts.csv',cols.join(',')+'\n'+summary.map(r=>cols.map(c=>r[c]).join(',')).join('\n')+'\n');
console.log(JSON.stringify({pass:!parity.length,parityFailures:parity,summary},null,2));if(parity.length)process.exitCode=1;
