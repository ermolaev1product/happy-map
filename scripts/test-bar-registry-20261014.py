"""Provenance and bounded-publication tests for the maintained bar registry."""
from pathlib import Path
import json,subprocess
P=Path('public');R=P/'research/bars-2026-10-14'
def load(p):return json.loads(Path(p).read_text())
def before(p):return subprocess.check_output(['git','show','5e010b11b8387f4f92b77744335333794fe69a1c:'+str(p)])
reg=load(R/'bar-registry.json');records=reg['records'];published=reg['publishedPlaces']
assert len(records)==6701 and len({r['id'] for r in records})==6701
assert len(published)==34 and len({p['id'] for p in published})==34
assert reg['summary']['publishedByCity']=={'palo-alto':4,'paris':17,'london':13}
assert not reg['completeCityCoverage'] and reg['summary']['venueOperationReviewIncomplete']
assert reg['summary']['parisBoundary']['candidate_classification_counts']=={'inside_paris_polygon':2037,'near_boundary_review':30,'outside_paris_polygon':272}
for city in ['','belgrade/','moscow/','palo-alto/','paris/','london/']:
 f=P/city/'events.json';assert f.read_bytes()==before(f),('Event data changed',str(f))
 if city not in ['palo-alto/','paris/','london/']:
  f=P/city/'places.json';assert f.read_bytes()==before(f)
for city in ['palo-alto','paris','london']:
 f=P/city/'places.json';d=load(f);prev=json.loads(before(f));cur={p['id']:p for p in d['places']}
 assert len(cur)==len(d['places'])
 for p in prev['places']:assert cur[p['id']]==p,('Existing place changed',city,p['id'])
 for p in d['places']:
  if not p.get('barRegistryId'):continue
  assert p['kind']=='place' and not p.get('date') and not p.get('validDates')
  assert p['price'] is None and p['beerPrice'] is None
  assert p['operatingStatus']=='listed_operating' and p['boundaryStatus']=='verified_city'
  assert p['website'].startswith('https://') and p['coordinateSource'].startswith('https://www.openstreetmap.org/')
  assert p['sourceLicense']=='ODbL-1.0' and len(p['sourceURLs'])>=2
  assert isinstance(p['lat'],(float,int)) and isinstance(p['lng'],(float,int))
  en={p['id']:p for p in load(P/'en'/city/'places.json')['places']}[p['id']]
  assert en['lat']==p['lat'] and en['sourceURLs']==p['sourceURLs'] and en['price'] is None
  assert 'A bar with a checked' in en['description']
for r in records:
 if r['operatingStatus'] in ['temporarily_closed','permanently_closed','seasonally_closed_for_winter']:
  assert r['publicationStatus'] not in ['published','merged_alias']
  assert r['verifiedFields']['openingHours'] is None
rosa=[r for r in records if r.get('publishedPlaceId')=='osm:way:618752756'];assert len(rosa)==3
assert sum(r['publicationStatus']=='merged_alias' for r in rosa)==2
assert next(r for r in records if r['id']=='osm:node:13694833518')['operatingStatus']=='temporarily_closed'
for f in ['bars.json','official-checks.json','sources.json','palo-alto.json','paris.json','london.json','additional-candidates.json','summary.json','handoff.txt']:
 path=R/f;assert path.read_bytes()==before(path),('Original handoff changed',f)
# Preserve authored UI, security code, downloads, bindings and all prior city logic byte-for-byte.
for root in [P,Path('app'),Path('lib'),Path('.openai')]:
 for path in root.rglob('*'):
  if not path.is_file() or path.suffix not in ['.js','.css','.tsx','.ts','.apk']:continue
  if str(path).startswith('public/en/research/'):continue
  try:old=before(path)
  except subprocess.CalledProcessError:continue
  assert path.read_bytes()==old,('Unrelated code/asset changed',str(path))
print('PASS: 6701-candidate registry; 34 evidence-gated places; closure and boundary exclusions; Rosa aliases; null prices; events, prior places, RU/EN identities and all application code preserved.')
