const fs=require('fs'),assert=require('assert'),vm=require('vm');
const e=JSON.parse(fs.readFileSync('public/skopje/events.json')).events;
assert.equal(e.length,34);assert.equal(new Set(e.map(x=>x.id)).size,34);assert.equal(new Set(e.map(x=>[x.lat,x.lng].join(','))).size,9);assert.equal(e.filter(x=>x.dateType==='published_interval').length,4);assert.equal(e.filter(x=>x.end).length,0);
for(const x of e){assert.equal(x.currency,'MKD');assert.equal(x.timezone,'Europe/Skopje');}
const startup=e.find(x=>/Startup Weekend/.test(x.title));assert(startup);assert.equal(startup.price,null);assert.equal(startup.time,null);assert.equal(startup.endAt,null);assert(!startup.visitSchedule);assert(/indicative/i.test(startup.admission+' '+startup.description));assert(/confidential/i.test(startup.admission));
const challenge=e.find(x=>x.id.startsWith('skp-tdm-challenge-'));assert.equal(challenge.time,'20:00');assert(/12/.test(challenge.admission));
const context={Intl,Date,console};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('public/discovery-model.js','utf8')+';globalThis.NoreliDiscovery=NoreliDiscovery;',context);
const ending=e.filter(x=>x.dateType==='published_interval'&&x.endDate==='2026-10-28');assert.equal(ending.length,2);
for(const x of ending){assert(context.NoreliDiscovery.availableOnDate(x,'2026-10-28',Date.parse('2026-10-28T15:59:59Z')));assert(!context.NoreliDiscovery.availableOnDate(x,'2026-10-28',Date.parse('2026-10-28T16:00:00Z')));}
console.log(JSON.stringify({pass:true,events:e.length,points:9,hardExpiry:'2026-10-28T16:00:00Z',startupNotOpenNow:true}));
