const fs=require('fs'),assert=require('assert');const e=JSON.parse(fs.readFileSync('public/ljubljana/events.json')).events;
assert.equal(e.length,98);assert.equal(new Set(e.map(x=>x.id)).size,98);assert.equal(new Set(e.map(x=>[x.lat,x.lng].join(','))).size,8);assert.equal(e.filter(x=>x.dateType==='published_interval').length,22);assert.equal(e.filter(x=>x.end).length,1);
for(const x of e){assert.equal(x.currency,'EUR');assert.equal(x.timezone,'Europe/Ljubljana');if(x.end){assert(/Dada/i.test(x.title));assert.equal(x.time,'10:00');assert.equal(x.end,'13:00');}}
const sf=e.find(x=>/Sleaford/.test(x.title));assert.equal(sf.price,36.2);assert(/already includes/.test(sf.admission));
const wine=e.find(x=>/Wine Festival/.test(x.title));assert.equal(wine.price,60);assert(/per person per day/.test(wine.priceNote));assert.deepEqual(Object.keys(wine.visitSchedule),['2026-11-19','2026-11-20']);
assert.equal(e.filter(x=>x.time&&x.date==='2026-11-01').length,0);assert.equal(e.filter(x=>x.visitSchedule?.['2026-11-01']).length,5);
console.log(JSON.stringify({pass:true,events:98,sessions:76,ranges:22,points:8,actualEnds:1,feeNotDuplicated:true}));
