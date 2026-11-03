#!/usr/bin/env python3
"""Offline regression: activity-specific Master Class beats a theatre host."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
BASE = '31d58f2d9a77bec9034538019e4823d1f0d0c716'
TARGETS = {'tkt:507968': '2026-10-19', 'tkt:507969': '2026-10-25',
           'tkt:507970': '2026-10-28', 'tkt:507971': '2026-10-30',
           'tkt:507972': '2026-11-01'}
spec = importlib.util.spec_from_file_location('import_tkt', ROOT / 'scripts/import-tkt.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)

cases = [
    ([16, 59, 73, 74], 'workshop'),
    ([16, 73], 'workshop'),
    ([59, 73], 'workshop'),
    ([73], 'workshop'),
    ([74], 'workshop'),
    ([94], 'workshop'),
    ([16, 59, 74], 'theatre'),
    ([16, 74], 'theatre'),
    ([16, 94], 'theatre'),
    ([16], 'theatre'),
    ([18, 22, 63, 64], 'theatre'),
    ([17, 73], 'kids'),
    ([5, 73], 'sport'),
    ([91], 'sport'),
    ([2, 73], 'music'),
    ([89], 'music'),
    ([92], 'talk'),
    ([75], 'city'),
    ([7], 'other'),
    ([], 'other'),
]
for ids, expected in cases:
    assert importer.category([{'id': i} for i in ids]) == expected, (ids, expected)

for relative in ['public/events.json', 'public/en/events.json']:
    before = json.loads(subprocess.check_output(['git', 'show', f'{BASE}:{relative}'], cwd=ROOT))
    after = json.loads((ROOT / relative).read_text())
    assert {e['id'] for e in after['events'] if e['id'] in TARGETS} == set(TARGETS)
    target = next(e for e in after['events'] if e['id'] == 'tkt:507968')
    assert target['date'] == '2026-10-19' and target['time'] == '18:00'
    assert target['sourceUrl'] == 'https://tkt.ge/event/507968'
    assert {'id': 73, 'name': 'Master Class'} in target['sourceCategories']
    assert any(t['name'] == 'Masterclass' for t in target['ticketTypesEvidence'])
    assert 'paint your own ceramic tile' in target['description']
    for event in after['events']:
        if event['id'] in TARGETS:
            assert event['date'] == TARGETS[event['id']]
            assert {'id': 73, 'name': 'Master Class'} in event['sourceCategories']
            assert any(t['name'] == 'Masterclass' for t in event['ticketTypesEvidence'])
            assert event['category'] == importer.category(event['sourceCategories']) == 'workshop'

    # No reimport, refreshed timestamps, invented times or lost historical IDs.
    expected = copy.deepcopy(before)
    for event in expected['events']:
        if event['id'] in TARGETS:
            event['category'] = 'workshop'
    assert after == expected, f'Out-of-scope data change: {relative}'
    assert len(after['events']) == len({e['id'] for e in after['events']})

    # Exercise normalize(), not only the standalone classifier. Keep both the
    # event-level and show-level source category paths covered without a fetch.
    row = {'eventId': 507968, 'eventDate': '2026-10-19T18:00:00',
           'eventName': target['title'], 'venueName': target['venue']}
    item = {'id': row['eventId'], 'date': row['eventDate'], 'name': row['eventName'],
            'description': target['description'], 'eventUrl': target['sourceUrl'],
            'venue': {'id': 34, 'name': target['venue'], 'address': target['address'],
                      'coordinates': {'latitude': target['lat'], 'longitude': target['lng']}},
            'subCategories': target['sourceCategories']}
    doc = {'events': [item]}
    for show_fallback in [False, True]:
        if show_fallback:
            doc['subCategories'] = item.pop('subCategories')
        event, reason = importer.normalize(row, doc, target['checkedAt'])
        assert reason is None and event['category'] == 'workshop'
        assert event['id'] == target['id'] and event['date'] == target['date']
        assert event['time'] == target['time'] and event['end'] is None

print('PASS: 20 category cases, event/show import paths, stored primary evidence, exact RU/EN five-record delta, all IDs/history/other facts preserved.')
