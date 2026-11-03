const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const app=fs.readFileSync('public/vienna/app.js','utf8');
const fn=app.slice(app.indexOf('function setLayer(value)'),app.indexOf('function placeCard(',app.indexOf('function setLayer(value)')));
const ctx={layer:'places',category:'cafe',events:[{category:'music'}],limit:30,render(){}};vm.createContext(ctx);vm.runInContext(fn,ctx);ctx.setLayer('events');assert.equal(ctx.category,'all');
const catalog=JSON.parse(fs.readFileSync('public/vienna/events.json'));const data=JSON.parse(fs.readFileSync('public/vienna/places.json'));const places=Array.isArray(data)?data:data.places;
assert.equal(catalog.timezone,'Europe/Vienna');assert.equal(catalog.currency,'EUR');assert(catalog.events.length>0);assert(places.length>100);
assert.equal(new Set(catalog.events.map(e=>e.id)).size,catalog.events.length);assert.equal(new Set(places.map(e=>e.id)).size,places.length);
for(const e of catalog.events){assert(/^2026-\d\d-\d\d$/.test(e.date));assert(e.sourceUrl?.startsWith('https://'));assert(e.address);assert(e.lat>48.1&&e.lat<48.4&&e.lng>16.1&&e.lng<16.7);assert(e.checkedAt);if(e.startAt){assert(e.startAt.startsWith(e.date));assert(e.startAt.endsWith(e.date<'2026-10-25'?'+02:00':'+01:00'));}assert(e.price==null||typeof e.price==='number');}
for(const e of places){assert(e.lat>48.1&&e.lat<48.4&&e.lng>16.1&&e.lng<16.7);}
assert(app.includes("Europe/Vienna"));assert(app.includes('radius=.5'));
const source=fs.readFileSync('public/city-state.js','utf8');assert(source.includes("vienna:'vienna/index.html'"));
assert(fs.readFileSync('lib/plans.ts','utf8').includes("'vienna'"));
console.log('PASS Vienna: city integration, filters, real event provenance, coordinates, distinct IDs, places, timezone and euro currency');

assert(app.includes("function fitMap(){const list=mapPlaces(visible()).filter"),"Show all events fits city context, not only nearby circle");
