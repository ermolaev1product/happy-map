import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {validatePacket, readModel} from './city-expansion/validate-packet.mjs';

const base = '1d7491a0cf1fcee42889b80a3e9a75b593e30549';
const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const previous = path => execFileSync('git', ['show', `${base}:${path}`], {maxBuffer: 50e6});
const original = JSON.parse(previous('public/city-picker.json'));
const picker = read('public/city-picker.json');
const registry = read('data/city-expansion/registry.json');
const model = readModel();
assert.equal(original.cities.length, 20, 'The verified live baseline has twenty cities');
assert.deepEqual(picker.cities.filter(city => !['barcelona', 'madrid'].includes(city.id)), original.cities);
assert.equal(picker.cities.length, 22);
for (const city of original.cities) {
  const folder = city.id === 'tbilisi' ? '' : `${city.id}/`;
  for (const prefix of ['', 'en/']) for (const name of ['events.json', 'places.json']) {
    const path = `public/${prefix}${folder}${name}`;
    assert.equal(fs.readFileSync(path).compare(previous(path)), 0, `Existing city data unchanged: ${path}`);
  }
}
const changed = execFileSync('git', ['diff', '--name-only', base], {encoding:'utf8'}).trim().split('\n');
assert(!changed.some(path => /pending-v133|pending-v137|pending-v138/.test(path)), 'Deferred packages are not included');
for (const path of ['.openai/hosting.json','app/chatgpt-auth.ts','lib/connectors.ts','lib/social.ts']) {
  assert.equal(fs.readFileSync(path).compare(previous(path)), 0, `Access, auth and connector configuration unchanged: ${path}`);
}
for (const id of ['barcelona', 'madrid']) {
  const config = registry.newCities.find(city => city.id === id);
  assert.equal(config.ianaTimezone, 'Europe/Madrid');
  assert.equal(config.currency, 'EUR');
  assert.deepEqual(config.interfaceLanguages, ['en'], 'Spanish source research does not claim a translated interface');
  assert.equal(picker.cities.find(city => city.id === id).country, 'ES');
  const packet = read(`data/city-expansion/packets/${id}.json`);
  const result = validatePacket(packet, config);
  assert(result.ok, JSON.stringify(result.errors));
  assert(result.counts.liveEvents > 0 && result.counts.liveMappedEvents > 0);
  const feeds = ['', 'en/'].map(prefix => read(`public/${prefix}${id}/events.json`));
  const research=read(`data/city-expansion/research/${id}.json`);
  assert.deepEqual(feeds[0].events, feeds[1].events, 'English-only city mirrors preserve all event facts');
  for (const event of feeds[0].events) {
    const source=research.events.find(row=>row.id===event.id);
    assert(source,'Every launched listing has an audited research record');
    for(const field of ['date','time','end','endDate','startAt','endAt','lat','lng','price','sourceUrl','coordinateSource','checkedAt'])assert.deepEqual(event[field],source[field],`${event.id}: ${field} must preserve the verified source fact`);
    assert.equal(event.originalTitle,source.originalTitle||source.title);
    if(source.admissionNoteEn)assert(event.description.includes(source.admissionNoteEn),'Admission caveat visible in card details');
    if(source.availabilityNote)assert(event.description.includes(source.availabilityNote),'Ticket availability caveat visible in card details');
    if(source.registrationRequired)assert.equal(event.registrationRequired,true);
    if(source.priceType==='from')assert.equal(event.min,true,'Starting price is not represented as a fixed total');
    assert.equal(event.timezone, 'Europe/Madrid');
    assert.equal(event.currency, 'EUR');
    assert(!event.soldOut, 'Known sold-out announcements remain excluded from launch recommendations');
    assert(!['cancelled', 'unverified', 'pending'].includes(event.status));
    if (event.price === 0) assert(event.priceNote || event.priceLabel || event.priceEvidence);
    if (Number.isFinite(event.lat)) {
      assert(event.coordinateSource && event.coordinatePrecision);
      const bounds = id === 'barcelona' ? [41.2, 41.6, 1.9, 2.4] : [40.2, 40.7, -4.0, -3.4];
      assert(event.lat >= bounds[0] && event.lat <= bounds[1] && event.lng >= bounds[2] && event.lng <= bounds[3], `${id}: pin outside launch area: ${event.id}`);
    }
  }
  for (const prefix of ['', 'en/']) for (const name of ['index.html','map.html','sources.html','invite.html','share.html']) {
    assert(fs.existsSync(`public/${prefix}${id}/${name}`), `Missing ${prefix}${id}/${name}`);
  }
  assert(fs.readFileSync(`app/${id}/page.tsx`, 'utf8').includes(`redirect("/${id}/index.html")`));
  const catalog = read('lib/place-catalog.json');
  assert(Object.keys(catalog[id] || {}).length > 0, 'Server place registry knows the new city');
  console.log(`PASS ${id}: ${feeds[0].events.length} verified listings, ${packet.places.length} source-backed venues, ${packet.sources.length} audited sources.`);
}
const classification=code=>JSON.parse(code.match(/ const reviewed=(\[.*?\]);\n/)[1]);
const oldClassifications=classification(previous('public/catalog-modes.js').toString());
const newClassifications=classification(fs.readFileSync('public/catalog-modes.js','utf8'));
assert.deepEqual(newClassifications.filter(row=>!['barcelona','madrid'].includes(row.city)),oldClassifications,'Existing conference selection is untouched');
assert.equal(newClassifications.filter(row=>['barcelona','madrid'].includes(row.city)).length,9,'Only source-reviewed Spanish conference/science/AI sessions are added');
assert.equal(model.wallInstant('2026-10-24', '19:00', 'Europe/Madrid', true), Date.parse('2026-10-24T19:00:00+02:00'));
assert.equal(model.wallInstant('2026-10-25', '19:00', 'Europe/Madrid', true), Date.parse('2026-10-25T19:00:00+01:00'));
console.log('PASS: Madrid DST change, all twenty pre-existing city feeds, deferred packages, hosting audience and authentication remain unchanged.');
