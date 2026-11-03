#!/usr/bin/env python3
"""DRAFT ONLY: Skopje frozen -> publisher input, using Ljubljana's packet schema.

Researcher has NOT executed this converter. No network, shell calls, or site writes.
Default: calculate/check in memory and print a summary; no output files.
Publisher after review: python <this-file> --repo <happymap-capitals> --write
Only writes data/capitals-20261028/skopje-{packet,research}.json and adds/merges
this city's config/country in data/city-expansion/registry.json. Never publishes.
Use --as-of 2026-10-28T16:00:00Z WITHOUT --write to inspect expiry boundary.

Contract: 34 records before 16:00Z Oct28, 32 at/after (30 sessions, 2 ranges);
9 physical points while Manevski remains. All timed ends null. Startup has one
range, scalar price null, no live visitSchedule/open-now claim; indicative agenda
is preserved as audit evidence and user-readable timeNote. Three MoCA ranges use
real visitSchedule and omit at/after last published visiting-window close.
"""
from __future__ import annotations
import argparse
import copy
import datetime as dt
import hashlib
import json
import pathlib
import re
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

# Explicit input root: safe if publisher copies this draft into repo/scripts.
S = pathlib.Path('/workspace/scratch/59f6a13c9f12/capitals-wave4/skopje')
TZ = 'Europe/Skopje'
UTC = dt.timezone.utc
FROZEN_SHA = '7d723ae3798045dc878018676c6cc081169556d600f49e90acb5897385613717'
TITLE_SHA = '2b88cbb6840d1e1088c998574e2a061d3ef2ddb454eb502e2fa67bbb62d8783f'
ACCESS_SHA = '50c9e1a2bc6f3a118d865ea2c9ac6b50ebe2c90ea5ddf5f6b15bd6f936d110ff'
CONFIG = {
    'id': 'skopje', 'canonicalCity': 'Skopje', 'countryCode': 'MK',
    'name': {'ru': 'Скопье', 'en': 'Skopje', 'de': 'Skopje'},
    'ianaTimezone': TZ, 'path': 'skopje/index.html', 'currency': 'MKD',
    'interfaceLanguages': ['ru', 'en'], 'defaultDateView': 'week',
    'defaultRadiusKm': 0.5, 'nameLocativeRu': 'Скопье',
    'eventLanguages': [
        {'code': 'MK', 'label': 'Македонский', 'terms': ['Macedonian', 'македонски', 'македонский']},
        {'code': 'EN', 'label': 'Английский', 'terms': ['English', 'английский']},
    ],
}
COUNTRY = {'ru': 'Северная Македония', 'en': 'North Macedonia', 'de': 'Nordmazedonien'}
STARTUP = 'skp-startup-weekend'
UNCERTAIN_PRICES = {'skp-ezhel', 'skp-brilliant-things', 'skp-handball', STARTUP}
STARTUP_AGENDA_NOTE = (
    'Published indicative agenda, not verified visiting hours or actual finishing times: '
    '6 November, registration and dinner 18:00, opening 19:00, agenda to 00:00 on 7 November; '
    '7 November 09:00–21:30; 8 November 09:00–21:00. '
    'The organizer may change the agenda and sends the full schedule to registered participants. '
    'This is one ticketed participant weekend, not three performances or continuous 54-hour access.'
)
STARTUP_HOURS_NOTE = (
    'A participant agenda has been published but is explicitly indicative. '
    'Verified public visiting hours are unknown; no open-now or actual-finish claim is made.'
)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def shortkey(value):
    return digest(value.encode())[:16]


def read_hashed(name, expected):
    data = (S / name).read_bytes()
    assert digest(data) == expected, f'Changed input: {name}; review before converting'
    return json.loads(data)


def instant(value):
    parsed = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    assert parsed.tzinfo is not None, 'Timestamp requires offset'
    return parsed


def wall(date, time):
    return dt.datetime.fromisoformat(date + 'T' + time).replace(tzinfo=ZoneInfo(TZ))


def text(value):
    if value is None:
        return ''
    if isinstance(value, list):
        return ' '.join(filter(None, (text(v) for v in value)))
    if isinstance(value, dict):
        return value.get('noteEn') or value.get('text') or json.dumps(value, ensure_ascii=False)
    return str(value)


def unique(values):
    return list(dict.fromkeys(v for v in values if v))


def price_fields(pr, source_id):
    # Frozen unverified/current-tier caveats override any advertised numeric amount.
    unit = pr.get('unit')
    bundle = unit == 'one_person_whole_three_day_event'
    amount = pr.get('standard')
    minimum = False
    if amount is None:
        amount = pr.get('min')
        minimum = amount is not None
    if bundle or source_id in UNCERTAIN_PRICES:
        amount, minimum, maximum = None, False, None
    else:
        maximum = pr.get('max')
    note = text(pr.get('text'))
    if unit:
        note += ' Price unit: ' + unit.replace('_', ' ') + '.'
    if pr.get('fees') is None:
        note += ' Final booking fees are unverified.'
    return {
        'price': amount, 'min': minimum, 'priceMax': maximum,
        'priceNote': note.strip(), 'priceNoteEn': note.strip(),
    }


def get_price(r, occurrence=None):
    # Occurrence overrides replace only their explicit fields; null means unknown.
    base = copy.deepcopy(r['price'])
    if occurrence and isinstance(occurrence.get('price'), dict):
        base.update(occurrence['price'])
    return base


def label_source(r):
    if r['sourceType'] == 'primary_ticket_publisher_full_announcement':
        return 'Karti — primary ticket publisher'
    if r['sourceId'] == STARTUP:
        return 'Techstars Startup Weekend Skopje — official organizer'
    return r['venue'] + ' — official organizer'


def convert(now):
    raw = read_hashed('skopje-frozen-20261028.json', FROZEN_SHA)
    titles = read_hashed('title-en-map.json', TITLE_SHA)
    access = read_hashed('access-delta-20261028.json', ACCESS_SHA)
    assert access['frozenSha256'] == FROZEN_SHA
    assert len(raw['programmes']) == 31
    assert set(titles) == {r['sourceId'] for r in raw['programmes']}
    applied = copy.deepcopy(raw)
    p = {
        'cityId': 'skopje', 'checkedAt': raw['checkedAt'],
        'window': {'startDate': raw['windowStart'], 'endDate': raw['windowEnd']},
        'coverage': (
            'Selected Skopje programmes from the Karti ticket catalogue and full organizer announcements: '
            'theatre, family theatre, music, handball, temporary exhibitions and a participant startup weekend. '
            'This is a bounded selection, not a complete city calendar or a live ticket-inventory check. '
            '1 and 3 November have no verified programme in this pass. '
            'Unknown prices and actual finishes remain unknown; public venue pins are building-level, not entrances. '
            'Blocked and unresolved sources were not bypassed; held candidates remain excluded. '
            'Telegram review was search-index discovery only, with zero current verified message imports.'
        ),
        'events': [], 'places': [], 'sources': [],
        'pending': copy.deepcopy(raw['holdsAndExclusions']),
    }
    places, expiry_audit = {}, []
    for r in applied['programmes']:
        sid = r['sourceId']
        r['titleEn'] = titles[sid]['titleEn']
        delta = access['bySourceId'].get(sid)
        if delta:
            assert delta['field'] == 'restrictionsAppend'
            r['restrictions'] = ' '.join(filter(None, [r.get('restrictions'), delta['value']]))
        # Expiry applies to last genuine museum visit, not a fabricated performance end.
        if r['eventKind'] == 'date_range_exhibition':
            final = max(wall(v.get('endDate') or v['date'], v['endTime']) for v in r['visitingSlots'])
            expiry_audit.append({'sourceId': sid, 'lastVisitEnd': final.isoformat(), 'omitted': now >= final})
            if now >= final:
                p['pending'].append({
                    'sourceId': sid, 'title': r['title'], 'status': 'expired_before_conversion',
                    'sourceUrl': r['sourceUrl'], 'checkedAt': r['checkedAt'],
                    'reason': 'Last published museum visiting window has ended; not extended to midnight.',
                    'lastVisitEnd': final.isoformat(),
                })
                continue
        pin = r['verifiedCoordinates']
        vid = 'skopje-venue-' + shortkey(str(pin['latitude']) + '|' + str(pin['longitude']))
        admission = ' '.join(filter(None, [text(r.get('restrictions')), text(r.get('notes')), text(r.get('availability'))]))
        urls = unique([r['sourceUrl'], r.get('ticketUrl'), r['price'].get('sourceUrl')] + r.get('additionalEvidenceUrls', []))
        b = {
            'title': r['title'], 'titleEn': r['titleEn'], 'programmeId': sid, 'seriesId': sid,
            'venue': r['venue'], 'venueEn': r['venue'], 'venueId': vid,
            'address': r['address'], 'addressEn': r['address'], 'category': r['normalizedCategory'],
            'lat': pin['latitude'], 'lng': pin['longitude'],
            'coordinateSource': pin['sourceUrl'], 'coordinatePrecision': 'venue_approximate',
            'coordinateEvidence': pin['evidence'] + '; ' + pin['precision'],
            'source': label_source(r), 'sourceEn': label_source(r), 'sourceUrl': r['sourceUrl'],
            'sourceURLs': urls, 'ticketUrl': r.get('ticketUrl'), 'checkedAt': r['checkedAt'],
            'yearEvidence': json.dumps(r['dateEvidence'], ensure_ascii=False),
            'currency': 'MKD', 'timezone': TZ, 'status': 'scheduled', 'soldOut': r.get('soldOut'),
            'description': r['summary'], 'descriptionEn': r['summary'],
            'admission': admission, 'admissionEn': admission,
            'hall': r.get('room'), 'hallEn': r.get('room'),
            # Do not infer performance language from a Macedonian title or final-pitch rule.
            'language': r.get('eventLanguage'), 'availability': r.get('availability'),
        }
        b.update(price_fields(r['price'], sid))
        age = re.search(r'\bAge (\d+\+)\.', r.get('restrictions') or '')
        if age:
            b['ageRating'] = b['ageRatingEn'] = age.group(1)
        places.setdefault(vid, {
            **{k: b[k] for k in ['address', 'addressEn', 'lat', 'lng', 'coordinateSource', 'coordinatePrecision', 'coordinateEvidence', 'currency', 'timezone']},
            'id': vid, 'title': r['venue'], 'titleEn': r['venue'], 'category': 'city',
            'source': 'Named venue coordinate evidence', 'sourceEn': 'Named venue coordinate evidence',
            'sourceUrl': pin['sourceUrl'], 'checkedAt': pin['checkedAt'],
            'operatingStatusVerified': False,
            'openingNote': 'Named programme venue at building precision; general opening and the exact indoor entrance are not independently verified.',
            'openingNoteEn': 'Named programme venue at building precision; general opening and the exact indoor entrance are not independently verified.',
        })
        if not r['occurrences']:
            x = copy.deepcopy(b)
            x.update(id=sid, date=r['startDate'], endDate=r['endDate'], dateType='published_interval', time=None, end=None)
            x['visitingSlotsEvidence'] = copy.deepcopy(r['visitingSlots'])  # audit, never actual event ends
            if sid == STARTUP:
                x.update(
                    openingHoursKnown=False, openingHoursUnknown=True, timeOfDayEligible=False,
                    openingHoursNote=STARTUP_HOURS_NOTE,
                    timeNote=STARTUP_AGENDA_NOTE, timeNoteEn=STARTUP_AGENDA_NOTE,
                    validDates=[v['date'] for v in r['visitingSlots']],
                )
                # Deliberately no visitSchedule/openingHours/startAt/endAt. Normalizer treats
                # any sourced schedule as verified visiting hours; Startup's agenda is not that.
                x['description'] = x['descriptionEn'] = b['description'] + ' ' + STARTUP_AGENDA_NOTE
            else:
                x['visitSchedule'] = {v['date']: {'start': v['startTime'], 'end': v['endTime']} for v in r['visitingSlots']}
                x['validDates'] = sorted(x['visitSchedule'])
                x['openingHoursKnown'], x['openingHoursUnknown'] = True, False
                x['openingHoursSource'] = r['visitingSlots'][0]['sourceUrl']
                x['visitScheduleSource'] = x['openingHoursSource']
                x['timeNote'] = x['timeNoteEn'] = 'Published museum visiting windows, not repeated performances; the exhibition expires at the last real closing time.'
            p['events'].append(x)
        for o in r['occurrences']:
            # This frozen version has no confirmed actual ends, and no inferred end from duration.
            assert o.get('endTime') is None and o.get('endDate') is None
            assert o.get('endEvidence', {}).get('actualEnd') is None
            x = copy.deepcopy(b)
            x.update(
                id=sid + '-' + o['date'].replace('-', '') + '-' + o['startTime'].replace(':', ''),
                date=o['date'], time=o['startTime'], end=None,
                startAt=wall(o['date'], o['startTime']).isoformat(),
                ticketUrl=o.get('ticketUrl') or r.get('ticketUrl'),
                hall=o.get('room') or r.get('room'), hallEn=o.get('room') or r.get('room'),
                endEvidence=copy.deepcopy(o['endEvidence']),
            )
            x['yearEvidence'] = json.dumps(o.get('dateEvidence') or r['dateEvidence'], ensure_ascii=False)
            x['sourceURLs'] = unique(urls + [o.get('sourceUrl'), o.get('ticketUrl')])
            x.update(price_fields(get_price(r, o), sid))
            if o.get('restrictions'):
                x['admission'] = x['admissionEn'] = admission + ' ' + text(o['restrictions'])
            if o.get('durationMinutes') is not None:
                x['durationMinutes'] = o['durationMinutes']
                n = f"Published duration {o['durationMinutes']} minutes; not a verified finishing time."
                x['timeNote'] = x['timeNoteEn'] = n
                x['admission'] += ' ' + n
                x['admissionEn'] += ' ' + n
            # Generic 'not_reserved' occurrence status does not erase temporary-sale limitation.
            p['events'].append(x)
    p['places'] = list(places.values())

    # Preserve real network timestamps/statuses, not a blanket 'verified official source'.
    # An actual HTTP->HTTPS redirect may be represented by its observed destination;
    # a remaining HTTP-only page is kept in research, never rewritten to guessed HTTPS.
    source_by_url = {}
    registry_omissions = []
    for a in raw['sourceAudit']:
        u = a['url'] if a['url'].startswith('https://') else a.get('finalUrl')
        if a['status'] != 'full_content_reviewed' or not u or urlparse(u).scheme != 'https':
            # Blocked/shell/unavailable/discovery-only requests are NOT promoted to
            # a reviewed source registry row. All 90 remain unchanged in research.
            registry_omissions.append(copy.deepcopy(a))
            continue
        host = urlparse(u).hostname or 'source'
        if u not in source_by_url:
            source_by_url[u] = {
                'id': 'skopje-source-' + shortkey(u),
                'name': 'Reviewed Skopje page — ' + host,
                'nameEn': 'Reviewed Skopje page — ' + host,
                'url': u, 'checkedAt': a['checkedAt'], 'status': a['status'],
                'httpStatus': a.get('httpStatus'), 'requestedUrl': a['url'],
                'finalUrl': a.get('finalUrl'), 'sha256': a.get('sha256'),
                'type': 'selected_primary_or_coordinate_page',
                'note': f"Full saved page reviewed; HTTP {a.get('httpStatus')}. "
                        + ('Observed redirect from ' + a['url'] + '. ' if u != a['url'] else '')
                        + 'Exact request timestamp, not recheck time. Primary ticket, organizer, or named-coordinate '
                          'evidence as applicable; this does not make every domain an official organizer. '
                          'Selected page only, not full host coverage; no forms submitted. Original body and limits remain in research.',
            }
    p['sources'] = list(source_by_url.values())
    research = copy.deepcopy(raw)  # preserve every original programme field verbatim
    research['importSemanticDeltas'] = {'titleEnglish': titles, 'access': access}
    research['conversionAudit'] = {
        'convertedAt': now.isoformat(), 'frozenSha256': FROZEN_SHA,
        'frozenFileUnchanged': True, 'sourceCountDoesNotEqualImportedSourceCount': True,
        'expiry': expiry_audit, 'startupScheduleTreatment': STARTUP_HOURS_NOTE,
        'registryConfig': CONFIG, 'countryConfig': COUNTRY,
        'originalProgrammesPreserved': True,
        'sourceAuditNotPromotedToReviewedRegistry': registry_omissions,
        'telegramTreatment': 'All search-only Telegram discovery remains in original telegramAudit, no imported or full-read registry claim.',
    }
    validate_contract(p, raw, now)
    return p, research


def validate_contract(p, raw, now):
    sessions = [x for x in p['events'] if x.get('time')]
    ranges = [x for x in p['events'] if x.get('dateType') == 'published_interval']
    assert len(sessions) == 30
    assert len({x['id'] for x in p['events']}) == len(p['events'])
    assert all(x['end'] is None and not x.get('endAt') for x in sessions)
    assert all(x['currency'] == 'MKD' and x['timezone'] == TZ for x in p['events'])
    for r in raw['programmes']:
        for o in r['occurrences']:
            matches = [x for x in sessions if x['seriesId'] == r['sourceId'] and x['date'] == o['date'] and x['time'] == o['startTime']]
            assert len(matches) == 1
            x = matches[0]
            assert x['ticketUrl'] == (o.get('ticketUrl') or r.get('ticketUrl'))
            assert x.get('durationMinutes') == o.get('durationMinutes')
            assert x['hall'] == (o.get('room') or r.get('room'))
            assert x['price'] == price_fields(get_price(r, o), r['sourceId'])['price']
    startup = next(x for x in ranges if x['seriesId'] == STARTUP)
    assert startup['price'] is None and startup['priceMax'] is None and not startup['min']
    assert not startup.get('visitSchedule') and not startup.get('endAt') and not startup.get('startAt')
    assert not startup['openingHoursKnown'] and startup['openingHoursUnknown']
    assert 'photographed and filmed' in startup['admission']
    assert 'final pitch must be in English' in startup['admission']
    assert '1200' in startup['priceNote'] and 'not a daily price' in startup['priceNote']
    for sid, deadline in [('skp-msu-picasso', '2026-10-28T16:00:00Z'), ('skp-msu-solidarity', '2026-10-28T16:00:00Z'), ('skp-msu-manevski', '2026-10-30T16:00:00Z')]:
        matches = [x for x in ranges if x['seriesId'] == sid]
        assert bool(matches) == (now < instant(deadline))
        if matches:
            assert list(matches[0]['visitSchedule'].values())[-1]['end'] == '17:00'
    expected_ranges = 1 + sum(now < instant(d) for d in ['2026-10-28T16:00:00Z', '2026-10-28T16:00:00Z', '2026-10-30T16:00:00Z'])
    assert len(ranges) == expected_ranges
    assert len(p['places']) == (9 if now < instant('2026-10-30T16:00:00Z') else 8)
    held = {x['sourceId'] for x in raw['holdsAndExclusions']}
    assert held.isdisjoint({x['seriesId'] for x in p['events']})
    for sid in UNCERTAIN_PRICES:
        assert all(x['price'] is None for x in p['events'] if x['seriesId'] == sid)
    for sid in ['skp-ezhel', 'skp-brilliant-things']:
        x = next(x for x in p['events'] if x['seriesId'] == sid)
        assert x.get('soldOut') is None and x['status'] == 'scheduled'
        assert 'temporarily unavailable' in x['admission']
    challenge = next(x for x in sessions if x['seriesId'] == 'skp-tdm-challenge')
    assert challenge['time'] == '20:00' and challenge['ageRating'] == '12+'
    assert all(not re.search('[\u0400-\u04ff]', x['titleEn']) for x in p['events'])
    for day in ['2026-11-01', '2026-11-03']:
        assert not any(x['date'] == day for x in sessions)
        assert not any(day in x.get('visitSchedule', {}) for x in ranges)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=pathlib.Path, default=S.parent.parent / 'happymap-capitals')
    parser.add_argument('--write', action='store_true', help='Publisher only: write two data files and this city registry entry; never publish')
    parser.add_argument('--as-of', help='Read-only expiry boundary fixture; incompatible with --write')
    args = parser.parse_args()
    if args.write and args.as_of:
        parser.error('--write cannot be backdated; omit --as-of')
    now = instant(args.as_of) if args.as_of else dt.datetime.now(UTC)
    packet, research = convert(now)
    summary = {
        'draft': True, 'asOf': now.isoformat(), 'writeRequested': args.write,
        'events': len(packet['events']), 'sessions': sum(bool(e.get('time')) for e in packet['events']),
        'ranges': sum(e.get('dateType') == 'published_interval' for e in packet['events']),
        'places': len(packet['places']), 'sources': len(packet['sources']), 'pending': len(packet['pending']),
        'registryConfig': CONFIG, 'countryConfig': COUNTRY,
        'nextGate': 'Publisher normalize/validate, RU/EN parity, exact16:00Z runtime expiry, Startup unknown-hours UI, live main-flow QA.',
    }
    if args.write:
        repo = args.repo.resolve()
        reg_path = repo / 'data/city-expansion/registry.json'
        registry = json.loads(reg_path.read_text())
        # Preserve all other cities/countries and unknown fields on an existing Skopje entry.
        found = [c for c in registry['newCities'] if c['id'] == 'skopje']
        assert len(found) <= 1
        if found:
            found[0].update(copy.deepcopy(CONFIG))
        else:
            registry['newCities'].append(copy.deepcopy(CONFIG))
        registry['countries'].setdefault('MK', {}).update(COUNTRY)
        out = repo / 'data/capitals-20261028'
        assert out.is_dir()
        for name, obj in [('skopje-packet', packet), ('skopje-research', research)]:
            (out / (name + '.json')).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n')
        reg_path.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + '\n')
    # This assertion runs in both modes, after any requested writes, for immutable source proof.
    assert digest((S / 'skopje-frozen-20261028.json').read_bytes()) == FROZEN_SHA
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
