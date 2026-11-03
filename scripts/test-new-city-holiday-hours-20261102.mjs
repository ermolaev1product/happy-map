import fs from 'node:fs';
import assert from 'node:assert/strict';
import {normalizePacket} from './city-expansion/normalize-packet.mjs';
const registry=JSON.parse(fs.readFileSync('data/city-expansion/registry.json'));
for(const city of ['philadelphia','chicago','san-diego']) {
 const raw=JSON.parse(fs.readFileSync(`data/city-expansion/research/${city}.json`));
 const packet=normalizePacket(raw,registry.newCities.find(c=>c.id===city));
 for(const locale of ['', 'en/']) {
  const published=JSON.parse(fs.readFileSync(`public/${locale}${city}/events.json`));
  for(const e of packet.events.filter(e=>e.visitSchedule)) {
   const actual=published.events.find(x=>x.id===e.id);
   assert.deepEqual(actual.visitSchedule,e.visitSchedule,`${city}/${locale}${e.id}`);
   for(const closed of e.closedDates||[]) assert(!actual.visitSchedule[closed],`Closed ${closed} must not have visiting hours`);
  }
 }
 if(city==='philadelphia') {
  const e=packet.events.find(e=>e.id==='philadelphia-marcel-duchamp');
  assert(!e.visitSchedule['2026-11-26']);assert(!e.visitSchedule['2026-12-25']);
  assert.equal(e.visitSchedule['2026-12-24'].end,'15:00');
 }
 if(city==='chicago') for(const e of packet.events.filter(e=>e.venueId==='chicago-driehaus'&&e.visitSchedule)) assert.equal(e.visitSchedule['2026-11-25'].end,'15:00');
}
console.log('PASS: explicit holiday closures and shortened hours survive normalization and both published locale feeds.');
