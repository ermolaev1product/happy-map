#!/usr/bin/env python3
"""Read-only consistency checks for the bounded conference release and source packets.
This checks source fidelity, not fresh web availability or ticket checkout.
Run from the repository root. It never modifies feeds or report files.
"""
import collections
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PACKET = ROOT / 'data/conferences/release-2026-10-16.json'
raw = PACKET.read_bytes()
release = json.loads(raw)
checks = 0
failures = []
warnings = []

def check(condition, label, **context):
    global checks
    checks += 1
    if not condition:
        failures.append({'check': label, **context})

def read(path):
    return json.loads(path.read_text())

def feed_path(city, locale=''):
    return ROOT / 'public' / locale / ('' if city == 'tbilisi' else city) / 'events.json'

def normalize(text):
    return re.sub(r'[^\w]+', '', str(text).casefold())

source_rows = []
coordinate_patches = []
used_coordinate_patches = []
for manifest in release['sourcePackets']:
    path = ROOT / manifest['file'] if manifest['file'].startswith('data/conferences/evidence/') else ROOT.parent / manifest['file']
    check(path.is_file(), 'source packet exists', path=manifest['file'])
    if not path.is_file():
        continue
    source_bytes = path.read_bytes()
    check(hashlib.sha256(source_bytes).hexdigest() == manifest['sha256'], 'source hash matches release manifest', path=manifest['file'])
    packet = json.loads(source_bytes)
    if isinstance(packet, dict):
        coordinate_patches.extend((manifest['file'], patch) for patch in packet.get('coordinatePatches', []))
    rows = packet if isinstance(packet, list) else packet.get('events', packet.get('candidates', []))
    for row in rows:
        if 'changes' not in row:
            source_rows.append((manifest['file'], row))

new_events = release['events']
ids = [(e['cityId'], e['id']) for e in new_events]
check(len(set(ids)) == len(ids), 'new event IDs unique')
classification_keys = [(e['city'], e['id'], e['date']) for e in release['classifications']]
check(len(set(classification_keys)) == len(classification_keys), 'classification identities unique')
feeds = {}
base_feeds = {}
coverage_path = ROOT / 'data/coverage-20261016/release.json'
coverage_updates = {(u['cityId'],u['id']):u['changes'] for u in read(coverage_path).get('existingUpdates',[]) if u.get('operation') == 'coordinate_only'} if coverage_path.exists() else {}
for changes in coverage_updates.values():
    check(set(changes) == {'lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence'}, 'later coordinate correction has bounded fields')
critical_feed_fields = ('id', 'date', 'time', 'end', 'endTime', 'endDate', 'startAt', 'endAt', 'timezone', 'price', 'currency', 'min', 'lat', 'lng', 'coordinateSource', 'coordinateAccuracy', 'coordinateEvidence', 'sourceUrl', 'registrationStatus', 'soldOut', 'accessType', 'registrationRequired', 'locationPrivacy', 'programmeId', 'listingPolicy', 'listingPolicySource', 'listingPolicyEvidence')
for event in new_events:
    city, identity = event['cityId'], event['id']
    sources = [(p, s) for p, s in source_rows if (s.get('id') == identity or identity == str(s.get('id')) + ':' + event['date']) and event['date'] in s.get('dailyDates', [s.get('date')])]
    check(len(sources) == 1, 'one matching source occurrence', id=identity, matches=[p for p, _ in sources])
    if len(sources) != 1:
        continue
    source_path, source = sources[0]
    patches = [(p, patch) for p, patch in coordinate_patches if patch.get('id') in {identity, source['id']} and patch.get('cityId') == city]
    check(len(patches) <= 1, 'coordinate override is unambiguous and explicitly manifested', id=identity)
    if len(patches) == 1:
        patch_path, patch = patches[0]
        allowed = {'id', 'cityId', 'lat', 'lng', 'coordinateSource', 'coordinateAccuracy', 'coordinateEvidence'}
        check(set(patch) <= allowed, 'coordinate patch changes only documented coordinate fields', id=identity)
        check(str(patch.get('coordinateSource', '')).startswith('https://') and bool(patch.get('coordinateEvidence')), 'coordinate patch has source and address evidence', id=identity)
        source = {**source, **{k: v for k, v in patch.items() if k in allowed - {'id', 'cityId'}}}
        used_coordinate_patches.append({'id': identity, 'packet': patch_path})
    schedule = next((row for row in source.get('schedule', []) if row.get('date') == event['date']), None)
    check(event['date'] in source.get('dailyDates', [source.get('date')]), 'date is source-declared', id=identity)
    expected_start = (schedule or source).get('time')
    expected_end = (schedule or source).get('endTime', (schedule or source).get('end'))
    check(event.get('time') == expected_start, 'start time preserved', id=identity, source=expected_start, actual=event.get('time'))
    check(event.get('end') == expected_end, 'end time preserved', id=identity, source=expected_end, actual=event.get('end'))
    if source.get('endAt'):
        check(event.get('endAt') == source['endAt'], 'exact end instant preserved', id=identity)
    for field in ('timezone', 'price', 'currency', 'lat', 'lng', 'sourceUrl'):
        check(event.get(field) == source.get(field), 'source field preserved: ' + field, id=identity, source=source.get(field), actual=event.get(field))
    for field in ('min', 'soldOut', 'registrationRequired', 'locationPrivacy', 'listingPolicy', 'listingPolicySource', 'listingPolicyEvidence', 'coordinateSource', 'coordinateAccuracy', 'coordinateEvidence'):
        if field in source:
            check(event.get(field) == source[field], 'admission/privacy field preserved: ' + field, id=identity)
    for field in ('registrationStatus', 'accessType'):
        if field in source:
            check(event.get(field) == source[field], 'source admission status preserved: ' + field, id=identity, source=source[field], actual=event.get(field))
    if event.get('listingPolicy') == 'dated_programme':
        check(str(event.get('listingPolicySource', '')).startswith('https://'), 'dated programme policy has an explicit source', id=identity)
    if source.get('admission'):
        check(source['admission'] in '\n'.join(str(event.get(k, '')) for k in ('admission', 'description', 'accessNote')), 'source admission caveat retained', id=identity)
    check((event.get('lat') is None) == (event.get('lng') is None), 'coordinates jointly known or unknown', id=identity)
    if event.get('lat') is not None:
        check(-90 <= event['lat'] <= 90 and -180 <= event['lng'] <= 180, 'coordinate range valid', id=identity)
        check(bool(event.get('coordinateSource')), 'known coordinates have evidence', id=identity)
    else:
        check(event.get('coordinateSource') is None, 'unknown coordinates do not claim coordinate evidence', id=identity)
    if event.get('price') is None:
        check(str(event.get('priceLabel', '')).casefold() not in {'free', 'бесплатно', 'kostenlos'}, 'unknown price is not free', id=identity)
    elif event['price'] == 0:
        check(source.get('price') == 0, 'free admission supported by source', id=identity)
    else:
        check(event.get('currency') and re.fullmatch(r'[A-Z]{3}', event['currency']), 'paid amount has explicit currency', id=identity)
    if event.get('startAt') and event.get('endAt'):
        start = dt.datetime.fromisoformat(event['startAt'].replace('Z', '+00:00'))
        end = dt.datetime.fromisoformat(event['endAt'].replace('Z', '+00:00'))
        check(end > start, 'end follows start', id=identity)
        check(event['startAt'][:10] == event['date'], 'start instant uses occurrence date', id=identity)
    check((city, identity, event['date']) in classification_keys, 'new event is classified once', id=identity)
    for locale in ('', 'en'):
        key = city, locale
        if key not in feeds:
            feeds[key] = read(feed_path(city, locale))['events']
        matches = [e for e in feeds[key] if e['id'] == identity]
        check(len(matches) == 1, 'exactly one imported feed row', id=identity, locale=locale or 'ru', count=len(matches))
        if len(matches) == 1:
            for field in critical_feed_fields:
                check(matches[0].get(field) == {**event, **coverage_updates.get((city, identity), {})}.get(field), 'feed critical field matches packet: ' + field, id=identity, locale=locale or 'ru')
    if city not in base_feeds:
        relative = str(feed_path(city).relative_to(ROOT))
        base_feeds[city] = json.loads(subprocess.check_output(['git', 'show', release['baseCommit'] + ':' + relative], cwd=ROOT))['events']
    old = base_feeds[city]
    check(not any(e['id'] == identity for e in old), 'new ID does not overwrite baseline', id=identity)
    source_duplicates = [e['id'] for e in old if e.get('sourceUrl') == event['sourceUrl'] and e['date'] == event['date']]
    title_duplicates = [e['id'] for e in old if normalize(e.get('title')) == normalize(event['title']) and e['date'] == event['date']]
    if source_duplicates or title_duplicates:
        warnings.append({'type': 'possible_existing_duplicate', 'id': identity, 'same_source_date': source_duplicates, 'same_title_date': title_duplicates})

programme_days = collections.defaultdict(list)
for event in new_events:
    programme_days[(event['cityId'], event['programmeId'], event['date'])].append(event)
for key, rows in programme_days.items():
    if len(rows) > 1:
        distinct_venues = {(r.get('venue'), r.get('lat'), r.get('lng')) for r in rows}
        warnings.append({'type': 'one_programme_day_multiple_occurrences', 'key': key, 'ids': [r['id'] for r in rows], 'distinct_venues': len(distinct_venues), 'counting': 'Count once as a programme/day, even if distinct locations justify separate cards.'})

for update in release.get('existingUpdates', []):
    if update.get('operation') == 'programme_listing_policy':
        check(set(update['changes']) == {'listingPolicy', 'listingPolicySource', 'listingPolicyEvidence'}, 'programme policy correction does not fabricate time fields', id=update['id'])
    for locale in ('', 'en'):
        key = update['cityId'], locale
        if key not in feeds:
            feeds[key] = read(feed_path(*key))['events']
        matches = [e for e in feeds[key] if e['id'] == update['id'] and e['date'] == update['date']]
        check(len(matches) == 1, 'one row for existing-record correction', id=update['id'], locale=locale or 'ru')
        if matches:
            for field, value in update['changes'].items():
                check(matches[0].get(field) == value, 'existing-record correction preserved: ' + field, id=update['id'], locale=locale or 'ru')

check(PACKET.read_bytes() == raw, 'release packet stayed unchanged during audit')
print(json.dumps({'pass': not failures, 'checks': checks, 'addedOccurrences': len(new_events), 'uniqueProgrammes': len({(e['cityId'], e['programmeId']) for e in new_events}), 'uniqueProgrammeDays': len(programme_days), 'classifications': len(classification_keys), 'existingCorrections': len(release.get('existingUpdates', [])), 'cancellationCorrections': sum(u.get('operation') == 'cancellation' for u in release.get('existingUpdates', [])), 'programmePolicyCorrections': sum(u.get('operation') == 'programme_listing_policy' for u in release.get('existingUpdates', [])), 'datedProgrammeOccurrences': sum(e.get('listingPolicy') == 'dated_programme' for e in new_events), 'documentedCoordinatePatches': used_coordinate_patches, 'nullCoordinateOccurrences': [e['id'] for e in new_events if e.get('lat') is None], 'failures': failures, 'warnings': warnings}, ensure_ascii=False, indent=2))
sys.exit(bool(failures))
