const fs=require('fs'),assert=require('assert');const e=JSON.parse(fs.readFileSync('public/zagreb/events.json')).events;
assert.equal(e.length,101);assert.equal(new Set(e.map(x=>x.id)).size,101);assert.equal(new Set(e.map(x=>[x.lat,x.lng].join(','))).size,8);
assert.equal(e.filter(x=>x.dateType==='published_interval').length,6);assert.equal(e.filter(x=>x.end).length,4);
for(const x of e){assert.equal(x.currency,'EUR');assert.equal(x.timezone,'Europe/Zagreb');if(x.end)assert(/MiniPolis/.test(x.title));}
for(const x of e.filter(x=>/MiniPolis/.test(x.title))){assert.equal(x.price,null);assert(/Not a per-person fee/.test(x.priceNote));assert.equal(x.time,'17:00');assert.equal(x.end,'19:00');}
for(const d of ['2026-11-01','2026-11-02']){assert.equal(e.filter(x=>x.time&&x.date===d).length,0);assert.equal(e.filter(x=>x.visitSchedule&&x.visitSchedule[d]).length,0);}
console.log(JSON.stringify({pass:true,events:101,sessions:95,ranges:6,points:8,actualEnds:4,holidayGapsPreserved:true}));
