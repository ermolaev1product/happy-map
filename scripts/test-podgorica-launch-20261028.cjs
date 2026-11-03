const fs=require('fs'),assert=require('assert');
const e=JSON.parse(fs.readFileSync('public/podgorica/events.json')).events;
assert.equal(e.length,24);assert.equal(new Set(e.map(x=>x.id)).size,24);assert.equal(new Set(e.map(x=>[x.lat,x.lng].join(','))).size,8);
assert.equal(e.filter(x=>x.dateType==='published_interval').length,2);
for(const x of e){assert.equal(x.currency,'EUR');assert.equal(x.timezone,'Europe/Podgorica');if(x.time)assert(!x.end);assert(!/Blizna|Zoo Maketa/.test(x.title));}
for(const x of e.filter(x=>/team/.test(x.priceLabel||''))){assert.equal(x.price,null);assert(/team/.test(x.priceNote));}
assert.equal(e.filter(x=>/team/.test(x.priceLabel||'')).length,2);
const ir=e.find(x=>x.title.includes('IRWIN'));assert(ir.openingHoursUnknown);assert(!ir.visitSchedule);assert(/November4/.test(ir.priceNote));assert(/Date-specific and holiday/.test(ir.description));assert(!/Opening hours have not been published/.test(ir.description));
const ex=e.find(x=>/Expo/i.test(x.title));assert.deepEqual(ex.visitSchedule,{'2026-11-19':{start:'12:00',end:'19:00'},'2026-11-20':{start:'12:00',end:'19:00'}});assert.equal(ex.price,0);
assert.equal(e.filter(x=>x.time&&x.date==='2026-11-01').length,0);
console.log(JSON.stringify({passed:true,records:24,points:8,sessions:22,ranges:2,teamUnits:true,unknownHolidayHours:true}));
