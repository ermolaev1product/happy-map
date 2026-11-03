const fs=require('fs'),assert=require('assert');
const e=JSON.parse(fs.readFileSync('public/bucharest/events.json')).events;
assert.equal(e.length,57);assert.equal(new Set(e.map(x=>x.id)).size,57);
assert.equal(e.filter(x=>x.dateType==='published_interval').length,4);
assert.equal(e.filter(x=>x.end).length,6);
const categories=new Set(['music','theatre','art','workshop','nightlife','conference']);
for(const x of e){assert(categories.has(x.category),x.id+' category');assert.equal(x.currency,'RON');assert.equal(x.timezone,'Europe/Bucharest');assert(!JSON.stringify(x).includes('muzeulviu.platformademediu.ro'));}
for(const name of ['jozef','notwist'])assert.equal(e.find(x=>x.id.includes('control-'+name+'-')).time,'21:00');
for(const name of ['halloween','elijah','rana','arab'])assert.equal(e.find(x=>x.id.includes('control-'+name+'-')).price,null);
const v=e.find(x=>x.id.includes('control-veils-'));assert.equal(v.price,95);assert.equal(v.min,true);assert.equal(v.priceLabel,'95 RON + taxes');
assert.equal(e.find(x=>x.id.includes('control-sonoro-')).price,90);
assert.equal(e.find(x=>x.title.includes('BAFI')).category,'conference');
for(const x of e.filter(x=>x.dateType==='published_interval'))assert(x.visitSchedule&&Object.keys(x.visitSchedule).length>0);
console.log(JSON.stringify({passed:true,records:57,categories:[...new Set(e.map(x=>x.category))],actualEnds:6,quarantineExcluded:true}));
