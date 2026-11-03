'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const h=fs.readFileSync('scripts/test-conference-filters.cjs','utf8').split('for(const root of roots){')[0];
const {fixture}=new Function('require',h+';return {fixture};')(require);
const ids=['chicago','philadelphia','los-angeles','san-diego','cologne'],now=Date.now(),out=[];
const summary=es=>({records:es.length,titleVenueGroups:new Set(es.map(e=>e.title.trim().toLowerCase()+'|'+(e.venueId||e.venue))).size,cinema:es.filter(e=>e.cinemaSession||e.category==='film'||e.category==='cinema').length,venues:new Set(es.map(e=>e.venueId||e.venue)).size,categories:Object.fromEntries([...new Set(es.map(e=>e.category))].map(c=>[c,es.filter(e=>e.category===c).length])),ids:es.map(e=>e.id).sort()});
for(const city of ids){const rows=[];
 for(const locale of ['','en/']){const root={city,locale,path:locale+city+'/index.html'},f=fixture(root,{sentinels:false});const feed=JSON.parse(fs.readFileSync('public/'+locale+city+'/events.json')),places=JSON.parse(fs.readFileSync('public/'+locale+city+'/places.json')).places;
 assert(feed.events.length>0&&places.length>0);assert(feed.events.every(e=>Number.isFinite(e.lat)&&Number.isFinite(e.lng)&&e.coordinateSource));assert(feed.events.every(e=>!/(?:wikipedia|mapcarta|maps\.me|tripomatic)\./.test(e.coordinateSource)));assert.equal(feed.timezone,({chicago:'America/Chicago',philadelphia:'America/New_York','los-angeles':'America/Los_Angeles','san-diego':'America/Los_Angeles',cologne:'Europe/Berlin'})[city]);
 f.ctx.__feed=feed;f.ctx.__places=places;f.ctx.__timestamp=now;
 f.run("__now=__timestamp;catalog=__feed;events=catalog.events;places=__places;venueIndex=NoreliDiscovery.connect(places,events);places=venueIndex.places;dates=Array.from({length:7},(_,i)=>'2026-11-'+String(2+i).padStart(2,'0'));if(typeof catalogDates!=='undefined')catalogDates=[...dates];day=-1;radius=0;view='explore';layer='events';category='all';searchTerm='';time='all';language='all';freeOnly=false;saved=[];");
 const week=f.json('visible()');const days=[];for(let i=0;i<7;i++){f.run('day='+i);days.push({date:'2026-11-'+String(2+i).padStart(2,'0'),...summary(f.json('visible()'))});}
 rows.push({locale:locale||'ru',stored:feed.events.length,places:places.length,timezone:feed.timezone,week:summary(week),days,feedSha256:crypto.createHash('sha256').update(fs.readFileSync('public/'+locale+city+'/events.json')).digest('hex')});
 }
 assert.deepEqual(rows[0].days.map(d=>d.ids),rows[1].days.map(d=>d.ids),city+' localized day IDs');out.push({city,...rows[0],englishParity:true});
}
fs.mkdirSync('data/million-city-second-launch-20261102',{recursive:true});fs.writeFileSync('data/million-city-second-launch-20261102/coverage.json',JSON.stringify({asOf:new Date(now).toISOString(),method:'Actual source visibility functions with mocked DOM; browser proofs separate',sourceState:'prepared_unpublished',cityCount:100,rows:out},null,2)+'\n');console.log(JSON.stringify({pass:true,newCities:5,newRecords:out.reduce((n,c)=>n+c.stored,0),weekCounts:out.map(c=>[c.city,c.week.records]),emptyDates:out.flatMap(c=>c.days.filter(d=>!d.records).map(d=>[c.city,d.date]))}));
