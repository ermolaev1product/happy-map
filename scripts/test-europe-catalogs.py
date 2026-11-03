"""Validate the actual published city selections and provenance constraints."""
import json,math,re
from pathlib import Path
from datetime import datetime
from collections import Counter
for city,zone,currency,bounds in [('paris','Europe/Paris','EUR',(48.78,48.92,2.2,2.44)),('london','Europe/London','GBP',(51.2,51.75,-.6,.4))]:
 p=Path('public')/city;d=json.loads((p/'events.json').read_text());events=d['events'];assert events
 assert d['startDate']=='2026-10-11' and d['endDate']=='2026-10-17'
 assert len({e['id'] for e in events})==len(events),'duplicate IDs'
 keys=set()
 for e in events:
  assert '2026-10-11'<=e['date']<='2026-10-17',(e['title'],e['date'])
  assert e.get('timezone')==zone and e.get('currency')==currency
  assert e.get('sourceUrl','').startswith('https://') and e.get('checkedAt')
  datetime.fromisoformat(e['checkedAt'].replace('Z','+00:00'))
  assert e['price'] is None or isinstance(e['price'],(int,float)) and e['price']>=0
  assert not e.get('cancelled') and e.get('status')!='cancelled'
  lat,lng=e.get('lat'),e.get('lng');assert (lat is None)==(lng is None),'partial coordinate'
  if lat is not None:assert bounds[0]<=lat<=bounds[1] and bounds[2]<=lng<=bounds[3],(e['title'],lat,lng)
  if e.get('time'):assert re.fullmatch(r'(?:[01]\d|2[0-3]):[0-5]\d',e['time'])
  if e.get('validDates'):
   assert all('2026-10-11'<=v<='2026-10-17' for v in e['validDates'])
   assert len(e['validDates'])==len(set(e['validDates']))
  k=(e['title'].casefold(),e['date'],e.get('time'),e['venue'].casefold());assert k not in keys,('duplicate session',k);keys.add(k)
 places=json.loads((p/'places.json').read_text())['places'];assert len({v['id'] for v in places})==len(places)
 assert all(not v.get('date') and v['kind']=='place' for v in places),'permanent places are separate'
 sources=json.loads((p/'sources.json').read_text())['sources'];assert len({s['url'].rstrip('/') for s in sources})==len(sources)
 for s in sources:
  assert s.get('status') and s.get('checkedAt') and s.get('language') and s.get('acquisitionMethod')
  if s['status'] in ['candidate','archive','linked','profile_only']:assert not s.get('importedCount'),'unread profile marked imported'
 print(city,len(events),'dated listings;',len(places),'places;',len(sources),'source access points;',sum(e['price'] is not None for e in events),'known prices;',sum(e.get('lat') is not None for e in events),'map coordinates')
if Path('public/paris/paris-data-derived.json').exists():
 d=json.loads(Path('public/paris/paris-data-derived.json').read_text());assert all(e['sourceLicense']=='ODbL-1.0' for e in d['events'])
 assert all(not re.search('collection permanente',e['title'],re.I) for e in d['events'])
 print('Paris derivative attribution and permanent collection separation passed')
