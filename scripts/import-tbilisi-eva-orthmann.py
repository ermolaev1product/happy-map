#!/usr/bin/env python3
"""Idempotent, one-announcement editorial addition; never a city/feed refresh.
Run before npm run build. Pending research is retained as evidence, never imported.
"""
import copy, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKET = ROOT / 'data/tbilisi-eva-orthmann/verified-import.json'
EVENT_ID = 'tbilisi-eva-orthmann-20261019'
PLACE_ID = 'yandex:48369759539'
CHECKED_AT = '2026-10-17T20:27:50.966743Z'

def read(path):
    return json.loads(path.read_text())

def write(path, value):
    compact = path.exists() and len(path.read_text().splitlines()) <= 2
    path.write_text(json.dumps(value, ensure_ascii=False, **({'separators': (',', ':')} if compact else {'indent': 2})) + '\n')

def append_exact(rows, row, key='id'):
    found = next((old for old in rows if old.get(key) == row[key]), None)
    if found is None:
        rows.append(row)
        return 1
    assert found == row, f'Refuse to rewrite an existing {key}: {row[key]}'
    return 0

def main():
    packet = read(PACKET)
    assert packet['checkedAt'] == CHECKED_AT
    assert len(packet['events']) == len(packet['places']) == 1
    event = copy.deepcopy(packet['events'][0])
    place = copy.deepcopy(packet['places'][0])
    assert event['id'] == EVENT_ID and place['id'] == event['placeId'] == PLACE_ID
    assert event['checkedAt'] == event['sourceRetrievedAt'] == place['checkedAt'] == CHECKED_AT
    assert (event['category'], event['date'], event['time'], event['end'], event['timezone']) == ('talk', '2026-10-19', '16:00', '18:00', 'Asia/Tbilisi')
    assert event['price'] == 0 and event['language'] == 'en' and event['availabilityVerified'] is False
    assert (event['lat'], event['lng']) == (place['lat'], place['lng']) == (41.712917, 44.748364)
    # Ordinary event filters use uppercase UI tokens; retain the source ISO code.
    event['languageCode'] = event['language']
    event['language'] = event['language'].upper()
    # The unchanged shared detail renderer displays description, not availabilityNote.
    # Include the same sourced caveat there without modifying any interface logic.
    for suffix in ['', 'En']:
        event['description' + suffix] += ' ' + event['availabilityNote' + suffix]
    place.update(kind='place', city='Tbilisi', title=place['name'], titleEn=place['nameEn'],
                 venue=place['name'], venueEn=place['nameEn'], category='space', placeType='university',
                 description=event['venue'], descriptionEn=event['venueEn'])
    catalog = read(ROOT / 'public/events.json')
    places = read(ROOT / 'public/places.json')
    # Fail closed on another ID carrying the same announcement or semantic title.
    for old in catalog['events']:
        if old['id'] != EVENT_ID:
            assert old.get('sourceUrl', '').rstrip('/') != event['sourceUrl'].rstrip('/'), 'Announcement already imported under another ID'
            assert not (old.get('date') == event['date'] and old.get('time') == event['time'] and re.sub(r'\W', '', old.get('title', '').lower()) == re.sub(r'\W', '', event['title'].lower())), 'Semantic duplicate'
    for old in places:
        if old['id'] != PLACE_ID:
            assert old.get('sourceUrl', '').rstrip('/') != place['sourceUrl'].rstrip('/'), 'Exact S building already imported under another ID'
    count = append_exact(catalog['events'], event)
    venue_count = append_exact(places, place)
    source_name = 'Государственный университет Ильи · лекция Евы Ортман, 19 октября 2026'
    source_name_en = 'Ilia State University · Eva Orthmann lecture, 19 October 2026'
    note = 'Добавлен только один проверенный анонс лекции Евы Ортман. Это частичное дополнение, не полный импорт календаря университета и не перепроверка остальных событий. Наличие свободных мест не проверялось.'
    note_en = 'Only one verified Eva Orthmann lecture announcement is added. This is a partial addition, not a complete import of the university calendar or a recheck of other events. Available seats have not been checked.'
    append_exact(catalog['sources'], {'name': source_name, 'url': event['sourceUrl'], 'count': 1}, 'name')
    append_exact(catalog['sourceRegistry'], {'name': source_name, 'url': event['sourceUrl'], 'type': 'curated', 'status': 'imported', 'count': 1, 'checkedAt': CHECKED_AT, 'publicNote': note}, 'name')
    reviewed_path = ROOT / 'data/i18n/english-reviewed.json'
    reviewed = read(reviewed_path)
    memory = read(ROOT / 'data/i18n/english-memory.json')
    additions = {source_name: source_name_en, note: note_en, 'Бесплатное посещение': 'Free attendance'}
    for row in [event, place]:
        for key, value in row.items():
            if isinstance(value, str) and key + 'En' in row:
                additions[value] = row[key + 'En']
    # A new reviewed mapping would override existing memory globally. Never do that:
    # preserve the old translation (including source/registration wording) instead.
    for source, target in additions.items():
        if source not in reviewed and source not in memory:
            reviewed[source] = target
    write(ROOT / 'public/events.json', catalog)
    write(ROOT / 'public/places.json', places)
    write(reviewed_path, reviewed)
    print(json.dumps({'addedEvents': count, 'addedPlaces': venue_count, 'checkedAt': CHECKED_AT,
                      'pendingImported': 0, 'catalogFreshnessMetadataUnchanged': True}))

if __name__ == '__main__':
    main()
