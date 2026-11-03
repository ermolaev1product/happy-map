import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {hasRemainingOccurrence} from './publication-filter.mjs';

const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const time = value => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const instant = value => typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const https = value => { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } };
const normalized = value => String(value || '').normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export function readModel(root = process.cwd()) {
  const context = {module: {exports: {}}};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/discovery-model.js'), 'utf8'), context);
  return context.module.exports;
}

// Validation does not manufacture facts, mutate records, or silently drop data.
// Research-only records belong in packet.pending. Expired history may be retained,
// but cannot satisfy the launch gate and is hidden by the shared live-expiry model.
export function validatePacket(packet, config, {now = Date.now(), model = readModel()} = {}) {
  const errors = [], warnings = [], counts = {events: 0, places: 0, sources: 0, mappedEvents: 0, liveEvents: 0, liveMappedEvents: 0, expiredEvents: 0, dates: [], venues: []};
  const require = (test, message) => { if (!test) errors.push(message); };
  require(packet && typeof packet === 'object', 'Packet must be an object');
  if (!packet || typeof packet !== 'object') return {ok: false, errors, warnings, counts};
  require(packet.cityId === config.id, `cityId must be ${config.id}`);
  require(instant(packet.checkedAt), 'checkedAt must be a timezone-qualified timestamp');
  require(!instant(packet.checkedAt) || Date.parse(packet.checkedAt) <= now + 300000, 'checkedAt cannot be in the future');
  try { new Intl.DateTimeFormat('en', {timeZone: config.ianaTimezone}); } catch { errors.push('Invalid IANA timezone'); }
  for (const key of ['events', 'places', 'sources']) require(Array.isArray(packet[key]) && packet[key].length > 0, `${key} must be a nonempty array`);
  const ids = new Set(), fingerprints = new Map(), dates = new Set(), venues = new Set();
  for (const kind of ['events', 'places']) {
    for (const [index, item] of (packet[kind] || []).entries()) {
      const label = `${kind}[${index}] ${item?.id || ''}`;
      require(item && typeof item === 'object', `${label}: invalid record`);
      if (!item || typeof item !== 'object') continue;
      for (const field of ['id', 'title', 'category', 'source']) require(nonempty(item[field]), `${label}: ${field} required`);
      require(!ids.has(item.id), `${label}: duplicate id`); ids.add(item.id);
      require(https(item.sourceUrl), `${label}: HTTPS sourceUrl required`);
      require(instant(item.checkedAt), `${label}: checkedAt required`);
      require(!instant(item.checkedAt) || Date.parse(item.checkedAt) <= now + 300000, `${label}: future checkedAt`);
      require(!item.cancelled && !['cancelled', 'held_for_recheck', 'pending', 'unverified'].includes(item.status) && item.publicationStatus !== 'held_for_recheck', `${label}: held/cancelled record belongs in pending`);
      require(!item.timezone || item.timezone === config.ianaTimezone, `${label}: wrong city timezone`);
      require(!item.currency || (config.allowedCurrencies || [config.currency]).includes(item.currency), `${label}: wrong city currency`);
      const hasPoint = Number.isFinite(item.lat) && Number.isFinite(item.lng);
      require(hasPoint || item.lat == null && item.lng == null, `${label}: latitude/longitude must both be real numbers or both unknown`);
      if (hasPoint) {
        require(Math.abs(item.lat) <= 90 && Math.abs(item.lng) <= 180 && (item.lat !== 0 || item.lng !== 0), `${label}: invalid coordinates`);
        require(https(item.coordinateSource), `${label}: pin needs coordinateSource, not a guessed city centre`);
        require(nonempty(item.coordinatePrecision) && !['city', 'city-center', 'city-centre', 'unverified', 'guessed'].includes(item.coordinatePrecision), `${label}: honest coordinatePrecision required`);
      } else if (kind === 'places') errors.push(`${label}: unlocated place belongs in pending`);
      if (kind === 'events') {
        counts.events++;
        require(day(item.date), `${label}: valid explicit event date required`);
        require(item.time == null || time(item.time), `${label}: time must be HH:mm or null, never guessed`);
        if(item.time==null)require(item.dateType==='published_interval'&&item.endDate>item.date&&hasPoint&&(item.openingHoursUnknown===true||item.openingHoursKnown===true&&https(item.openingHoursSource)&&item.visitSchedule&&Object.keys(item.visitSchedule).length>0),`${label}: a missing start time is allowed only for a verified, located date range with sourced visit hours or unknown opening hours disclosed`);
        require(item.end == null || time(item.end), `${label}: end must be HH:mm or null`);
        if(item.visitSchedule){
          require(https(item.openingHoursSource)||https(item.visitScheduleSource),`${label}: visit schedule requires a source URL`);
          for(const [date,hours] of Object.entries(item.visitSchedule))require(day(date)&&date>=item.date&&date<=(item.endDate||item.date)&&hours&&time(hours.start)&&time(hours.end),`${label}: visit schedule must contain real in-range dates and published HH:mm hours`);
        }

        require(!item.endDate || day(item.endDate) && item.endDate >= item.date, `${label}: invalid date range`);
        require(nonempty(item.venue), `${label}: venue required`);
        require(nonempty(item.yearEvidence), `${label}: yearEvidence required; publication date is not an event date`);
        require(item.price == null || Number.isFinite(item.price) && item.price >= 0, `${label}: price must be verified numeric or null`);
        if (item.price === 0) require(nonempty(item.priceEvidence) || nonempty(item.priceNote) || nonempty(item.priceLabel), `${label}: free entry needs evidence`);
        if (item.startAt) {
          require(instant(item.startAt), `${label}: startAt needs explicit offset`);
          if (instant(item.startAt) && day(item.date) && time(item.time)) {
            const actual = new Intl.DateTimeFormat('en-CA', {timeZone: config.ianaTimezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(new Date(item.startAt));
            const p = Object.fromEntries(actual.map(part => [part.type, part.value]));
            require(`${p.year}-${p.month}-${p.day}` === item.date && `${p.hour}:${p.minute}` === item.time, `${label}: startAt conflicts with IANA local date/time (DST)`);
          }
        }
        if (item.endAt) require(instant(item.endAt) && (!item.startAt || Date.parse(item.endAt) > Date.parse(item.startAt)), `${label}: invalid endAt`);
        if (day(item.date)) {
          const live = hasRemainingOccurrence(item,now,config.ianaTimezone,model);
          if (live) {counts.liveEvents++; if(hasPoint) counts.liveMappedEvents++;}
          else counts.expiredEvents++;
          dates.add(item.date);
        }
        if (hasPoint) counts.mappedEvents++;
        venues.add(item.venueId || normalized(item.venue));
        const fingerprint = [normalized(item.title), item.date, item.time || '', normalized(item.venue)].join('|');
        require(!fingerprints.has(fingerprint), `${label}: duplicate session of ${fingerprints.get(fingerprint)}`);
        fingerprints.set(fingerprint, item.id);
      } else counts.places++;
    }
  }
  const sourceIds = new Set(),sourceURLs=new Set();
  for (const [index, source] of (packet.sources || []).entries()) {
    counts.sources++;
    require(!sourceURLs.has(source.url), `sources[${index}]: duplicate source URL`);sourceURLs.add(source.url);
    require(nonempty(source.id) && !sourceIds.has(source.id), `sources[${index}]: stable unique id required`); sourceIds.add(source.id);
    require(nonempty(source.name) && https(source.url), `sources[${index}]: name and HTTPS url required`);
    require(instant(source.checkedAt) && Date.parse(source.checkedAt) <= now + 300000, `sources[${index}]: real checkedAt required`);
    require(nonempty(source.status) || nonempty(source.accessStatus), `sources[${index}]: access/review status required`);
  }
  require(counts.liveEvents > 0 && counts.liveMappedEvents > 0, 'Launch requires a live dated event with a sourced venue pin');
  counts.dates = [...dates].sort(); counts.venues = [...venues];
  if (counts.expiredEvents) warnings.push(`${counts.expiredEvents} expired records retained as history; the shared expiry model excludes them from current results.`);
  if (counts.events < 5 || counts.venues.length < 2) warnings.push('Limited launch selection; this does not establish broad city coverage.');
  return {ok: errors.length === 0, errors, warnings, counts};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const registry = JSON.parse(fs.readFileSync('data/city-expansion/registry.json'));
  const files = process.argv.slice(2);
  if (!files.length) throw Error('Usage: node scripts/city-expansion/validate-packet.mjs packet.json [...]');
  for (const file of files) {
    const packet = JSON.parse(fs.readFileSync(file)), config = registry.newCities.find(city => city.id === packet.cityId);
    if (!config) throw Error(`Unapproved cityId: ${packet.cityId}`);
    const result = validatePacket(packet, config); console.log(JSON.stringify({file, ...result}, null, 2));
    if (!result.ok) process.exitCode = 1;
  }
}
