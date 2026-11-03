from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[1];p=R/'data/conference-coordinate-20261016/reviewed-delta.json';assert hashlib.sha256(p.read_bytes()).hexdigest()=='586d57925d8a6368fd5080596466bc71c8086c7a306d2e2c739511dcc571270f'
a=json.loads(p.read_text());assert len(a['patches'])==11
for city in sorted({x['cityId'] for x in a['patches']}):
 for locale in ('','en/'):
  f=R/'public'/(locale+city)/'events.json';d=json.loads(f.read_text())
  for x in a['patches']:
   if x['cityId']!=city:continue
   e=next(e for e in d['events'] if e['id']==x['existingId']);assert not x['privateOrUndisclosed'];assert set(x['fields'])=={'lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence'}
   assert e.get('lat') is None or all(e.get(k)==v for k,v in x['fields'].items()),e['id'];e.update(x['fields'])
  f.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print('Applied 11 verified existing-event points to RU/EN. No new events, places or admission changes.')
