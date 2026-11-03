import assert from 'node:assert/strict';
import {validatePacket, readModel} from './city-expansion/validate-packet.mjs';

// Synthetic fixtures stay in this test and are never written into public catalogues.
const now = Date.parse('2026-10-15T10:00:00Z');
const config = {id:'fixture', ianaTimezone:'America/New_York', currency:'USD'};
const source = {id:'fixture-source', name:'Test source', url:'https://example.org/test', checkedAt:'2026-10-15T09:00:00Z', status:'reviewed'};
const place = {id:'fixture-place', title:'Test venue', address:'Test address', category:'space', source:'Test source', sourceUrl:source.url, checkedAt:source.checkedAt, lat:40.7, lng:-74, coordinateSource:source.url, coordinatePrecision:'venue'};
const event = {...place, id:'fixture-event', title:'Test event', date:'2026-10-16', time:'18:00', venue:place.title, yearEvidence:'Explicit 2026 test fixture', price:null, timezone:config.ianaTimezone};
const fixture = {cityId:config.id, checkedAt:source.checkedAt, events:[event], places:[place], sources:[source]};
const check = packet => validatePacket(packet, config, {now});
assert(check(fixture).ok);
const snapshot = JSON.stringify(fixture); check(fixture); assert.equal(JSON.stringify(fixture), snapshot);
for (const mutate of [
  p => p.events.push({...event, id:'another-id'}),
  p => p.sources.push({...source,id:'duplicate-source-url'}),
  p => p.events[0].checkedAt='2027-01-01T00:00:00Z',
  p => p.events[0].date='2026-02-30',
  p => p.events[0].date='2026-10-14',
  p => p.events[0].sourceUrl='javascript:alert(1)',
  p => p.events[0].coordinateSource=null,
  p => p.events[0].coordinatePrecision='city-center',
  p => p.events[0].lat=0,
  p => p.events[0].price='20 dollars',
  p => p.events[0].yearEvidence='',
  p => p.events[0].startAt='2026-10-16T18:00:00+03:00',
  p => p.events[0].status='cancelled',
  p => p.places[0].lat=null,
  p => p.sources[0].checkedAt='2026-10-15',
]) {
  const changed=structuredClone(fixture); mutate(changed);
  // A single valid longitude with lat=0 is not inherently a fake coordinate.
  if(changed.events[0].lat===0) changed.events[0].lng=0;
  assert(!check(changed).ok, JSON.stringify(changed));
}
const unlocated = structuredClone(fixture);
unlocated.events.push({...event,id:'unlocated-event',title:'Unlocated event',lat:null,lng:null,coordinateSource:null});
assert(check(unlocated).ok, 'Sourced factual event may remain honestly unlocated');
const model=readModel();
for(const zone of ['Europe/Moscow','America/New_York','Europe/Berlin','Asia/Tbilisi','Asia/Nicosia','Europe/Istanbul','Asia/Almaty','Asia/Dubai','Asia/Jerusalem','Europe/Prague']){
  const e={...event,timezone:zone,end:'20:00'};
  const end=model.wallInstant(e.date,'20:00',zone,true);
  assert(model.availableOnDate(e,e.date,end-1)); assert(!model.availableOnDate(e,e.date,end));
}
assert.equal(model.wallInstant('2026-11-01','01:30','America/New_York',true),Date.parse('2026-11-01T01:30:00-05:00'));
assert.equal(model.wallInstant('2026-10-25','02:30','Europe/Berlin',true),Date.parse('2026-10-25T02:30:00+01:00'));
assert.equal(model.wallInstant('2026-10-25','03:30','Asia/Nicosia',true),Date.parse('2026-10-25T03:30:00+02:00'));
console.log('PASS: packet provenance, unique sessions, checks, valid dates, prices, real-pin evidence, unlocated events, expired filtering and 10 IANA zones/DST. No public fixtures written.');
