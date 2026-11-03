const fs=require('fs'),assert=require('assert');
const harness=fs.readFileSync('scripts/test-conference-filters.cjs','utf8').split('for(const root of roots){')[0];
const {fixture,roots}=new Function('require',harness+';return {fixture,roots};')(require);
const zones=['Asia/Tbilisi','Europe/Belgrade','Europe/Moscow','America/Los_Angeles','Europe/Paris','Europe/London','Asia/Yerevan','Europe/Berlin','Europe/Vienna','Europe/Moscow','America/New_York','Asia/Dubai','Europe/Prague','Asia/Tbilisi','Europe/Berlin','Asia/Nicosia','Europe/Istanbul','Asia/Jerusalem','Asia/Almaty','Europe/Istanbul','Europe/Madrid','Europe/Madrid','Europe/Minsk','Asia/Baku','Asia/Tashkent','Asia/Almaty','Asia/Bishkek'];
const cities=JSON.parse(fs.readFileSync('public/city-picker.json')).cities;
const now='2026-10-24T05:52:30Z',out=[];
for(const root of roots){
 const zone=zones[cities.findIndex(c=>c.id===root.city)],today=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
 const dates=Array.from({length:8},(_,i)=>new Date(Date.parse(today+'T12:00:00Z')+i*86400000).toISOString().slice(0,10));
 const f=fixture(root,{sentinels:false}),prefix='public/'+root.locale+(root.city==='tbilisi'?'':root.city+'/');
 const feed=JSON.parse(fs.readFileSync(prefix+'events.json')),raw=JSON.parse(fs.readFileSync(prefix+'places.json')),stored=raw.places||raw;
 f.ctx.__data=feed;f.ctx.__places=stored;f.ctx.__dates=dates;f.ctx.__zone=zone;
 f.run(`__now=Date.parse('${now}');NoreliDiscovery.setTimeZone(__zone);catalog=__data;events=catalog.events.map(e=>({...e,category:({cinema:'film',concert:'music',concerts:'music',festival:'city',lecture:'talk',classical:'music',party:'music'})[e.category]||e.category}));venueIndex=NoreliDiscovery.connect(__places.map(p=>({...p,kind:'place'})),events);places=venueIndex.places;dates=__dates;if(typeof catalogDates!=='undefined')catalogDates=[...dates];layer='events';view='explore';category='all';language='all';time='all';freeOnly=false;searchTerm='';if(typeof accessFilter!=='undefined')accessFilter='all';if(typeof hideCinema!=='undefined')hideCinema=false;`);
 const r={city:root.city,locale:root.locale?'en':'ru',route:root.path,zone,storedEvents:feed.events.length,storedPlaces:stored.length,connectedPlaces:f.run('places.length'),days:[]};
 for(let i=0;i<8;i++){
  f.run(`day=${i};radius=0;category='all';render();`);
  const items=f.json('visible()'),cats={};for(const e of items)cats[e.category]=(cats[e.category]||0)+1;
  const d={date:dates[i],occurrences:items.length,nonCinema:items.filter(e=>!e.cinemaSession&&e.category!=='film').length,programmes:new Set(items.map(e=>e.programmeId||e.parentProgrammeId||e.id)).size,categories:cats,mapped:items.filter(e=>Number.isFinite(e.lat)&&Number.isFinite(e.lng)).length,ids:items.map(e=>e.id).sort()};
  f.run("category='conference'");d.thematic=f.run('visible().length');f.run("category='all';radius=.5");d.near500m=f.run('visible().length');r.days.push(d);
 }
 out.push(r);console.log(root.city,r.locale,r.days.map(d=>d.occurrences).join('/'));global.gc?.();
}
const parity=[];for(const city of cities){const [a,b]=out.filter(r=>r.city===city.id);parity.push({city:city.id,events:JSON.stringify(a.days.map(d=>d.ids))===JSON.stringify(b.days.map(d=>d.ids)),places:a.connectedPlaces===b.connectedPlaces});}
fs.mkdirSync('data/morning-control-20261024',{recursive:true});fs.writeFileSync('data/morning-control-20261024/source-audit.json',JSON.stringify({asOf:now,baseCommit:'6c460a54232755eab9e5adac3201833795a1618f',method:'Exact source functions with mocked DOM; eight-date audit extends normal seven-date UI by one day. Not independent live browser verification.',routes:out,parity},null,2));
console.log(JSON.stringify(parity));
