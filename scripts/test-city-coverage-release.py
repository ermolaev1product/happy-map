#!/usr/bin/env python3
"""Strict incremental source, access, licence and persistence regression for v147."""
from pathlib import Path
import json,re,hashlib,subprocess,collections,urllib.parse,gzip
R=Path(__file__).resolve().parents[1];P=json.loads((R/'data/coverage-20261016/release.json').read_text());BASE=P['baseCommit'];checks=0
COORD=json.loads((R/'data/conference-coordinate-20261016/reviewed-delta.json').read_text())['patches']
REVIEWED_UPDATES=P.get('existingUpdates',[])+[{'cityId':x['cityId'],'id':x['existingId'],'changes':x['fields']} for x in COORD]

def check(value,label):
 global checks;checks+=1
 if not value:raise AssertionError(label)
def old(f):return json.loads(subprocess.check_output(['git','show',BASE+':'+f],cwd=R))
def blob(f):return subprocess.check_output(['git','show',BASE+':'+f],cwd=R)
for src in P['sourceFiles']:check(hashlib.sha256((R/src['file']).read_bytes()).hexdigest()==src['sha256'],'Source packet changed '+src['file'])
ids=set();counts=collections.Counter()
for kind in ['events','places','osmPlaces']:
 for e in P[kind]:
  check(e['id'] not in ids,'Duplicate ID '+e['id']);ids.add(e['id']);counts[kind]+=1
  check(bool(e.get('sourceUrl')) and urllib.parse.urlparse(e['sourceUrl']).scheme in ['https','http'],'Missing source '+e['id'])
  check(bool(e.get('checkedAt')),'No verification timestamp '+e['id'])
  check((e.get('lat') is None)==(e.get('lng') is None),'Partial point '+e['id'])
  if e.get('lat') is not None:check(-90<=e['lat']<=90 and -180<=e['lng']<=180 and bool(e.get('coordinateSource')),'Unsourced coordinate '+e['id'])
  if kind=='events':
   check(bool(e.get('programmeId')),'No stable programme '+e['id']);check(re.fullmatch(r'2026-10-\d\d',e['date']) is not None,'Invalid date '+e['id']);check(e.get('time') is None or re.fullmatch(r'\d\d:\d\d',e['time']) is not None,'Invalid time '+e['id'])
   if e.get('timeType')=='doors':check(e.get('time') is None,'Doors misrepresented as show start '+e['id'])
  if kind=='osmPlaces':check(e['license']=='ODbL-1.0' and e.get('sourceSnapshot')=='2026-10-15T20:21:00+00:00','Missing OSM licence/snapshot '+e['id'])
for update in P.get('existingUpdates',[]):
 if update.get('operation')=='coordinate_only':
  check(set(update['changes'])=={'lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence'},'Coordinate correction scope')
  kind='places' if update['baselineEvidenceKind']=='place' else 'events'; data=old('public/'+update['cityId']+'/'+kind+'.json'); rows=data if isinstance(data,list) else data[kind]; evidence=next(e for e in rows if e['id']==update['baselineEvidenceRecordId'])
  check(all(update['changes'][k]==evidence.get(k) for k in ['lat','lng','coordinateSource']),'Exact existing point and provenance reuse')
for fix in json.loads((R/'data/coverage-20261016/evidence/availability-corrections.json').read_text()):
 e=next(x for x in P['events'] if x['id']==fix['id']);check(all(e.get(k)==v for k,v in fix['fix'].items()),'Source access status lost '+e['id'])
for c in json.loads((R/'public/city-picker.json').read_text())['cities']:
 for locale in ['', 'en/']:
  for kind in ['events','places']:
   f='public/'+locale+('' if c['id']=='tbilisi' else c['id']+'/')+kind+'.json';a=old(f);b=json.loads((R/f).read_text());aa=a if isinstance(a,list) else a[kind];bb=b if isinstance(b,list) else b[kind];ai={e['id']:e for e in aa};bi={e['id']:e for e in bb};check(len(bi)==len(bb),'Duplicate feed ID '+f)
   for id,e in ai.items():
    expected={**e,**next((u['changes'] for u in REVIEWED_UPDATES if u['cityId']==c['id'] and u['id']==id),{})} if kind=='events' else e
    if locale and any(x['existingId']==id and x['cityId']==c['id'] for x in COORD):expected['coordinateEvidence']=json.loads((R/'data/i18n/english-reviewed.json').read_text()).get(expected['coordinateEvidence'],expected['coordinateEvidence'])
    check(bi.get(id)==expected,'Historical row changed/deleted beyond reviewed patch '+f+' '+id)
   expect={e['id'] for name in ([kind] if kind=='events' else ['places','osmPlaces']) for e in P[name] if e['cityId']==c['id']};check(set(bi)-set(ai)==expect,'Unexpected additions '+f)
   for e in P[kind] if kind=='events' else P['places']+P['osmPlaces']:
    if e['cityId']!=c['id']:continue
    for key in ['id','date','time','end','endDate','lat','lng','price','currency','sourceUrl','checkedAt','programmeId','soldOut','registrationStatus']:check(bi[e['id']].get(key)==e.get(key),'Factual normalization drift '+f+' '+e['id']+' '+key)
# Normal build must keep newly committed inventory and existing reviewed category identities.
mode=(R/'public/catalog-modes.js').read_text();oldmode=blob('public/catalog-modes.js').decode();oldreviewed=json.loads(re.search(r' const reviewed=(\[.*?\]);\n',oldmode).group(1));newreviewed=json.loads(re.search(r' const reviewed=(\[.*?\]);\n',mode).group(1));check(all(e in newreviewed for e in oldreviewed),'Conference membership lost')
a=old('lib/place-catalog.json');b=json.loads((R/'lib/place-catalog.json').read_text())
for city in a:
 for id,e in a[city].items():check(b[city].get(id)==e,'Existing stable social place lookup lost '+city+' '+id)
allowed={'public/catalog-modes.js','scripts/complete-english.py','scripts/build-place-catalog.mjs','data/i18n/english-reviewed.json','data/i18n/english-build-sha256.json','lib/place-catalog.json','lib/place-catalog-packed.ts'}
files=subprocess.check_output(['git','diff','--name-only',BASE],cwd=R,text=True).splitlines()
for f in files:
 if f.endswith('.html'):
  strip=lambda s:re.sub(r'(catalog-modes\.js\?v=)[a-f0-9]+',r'\1HASH',s)
  check(strip(blob(f).decode())==strip((R/f).read_text()),'HTML changed beyond catalog cache hash '+f)
 elif f not in allowed and not f.startswith('data/coverage-20261016/') and not f.startswith('data/conference-coordinate-20261016/') and f not in ['scripts/import-city-coverage-release.py','scripts/audit-city-coverage.cjs','scripts/test-city-coverage-release.py','scripts/test-conference-release-data.py','scripts/compact-built-json.mjs','build/sites-worker.ts','vite.config.ts','lib/compressed-place-assets.mjs','scripts/test-compressed-place-assets.mjs','scripts/test-progressive-directory.cjs','scripts/apply-conference-coordinates.py','scripts/test-conference-coordinates.py']:
  check(re.fullmatch(r'public/(?:en/)?(?:[a-z-]+/)?(?:events|places)\.json',f) is not None,'Unexpected tracked source change '+f)
for f in subprocess.check_output(['git','ls-tree','-r','--name-only',BASE],cwd=R,text=True).splitlines():
 if re.search(r'(?:^|/)(?:location-control|app|traffic|visitor-stats|tracking)[^/]*\.(?:js|ts)$',f) or f in ['.openai/hosting.json','public/discovery-model.js','public/en/discovery-model.js']:
  check(blob(f)==(R/f).read_bytes(),'Protected behavior changed '+f)
print(json.dumps({'pass':True,'checks':checks,'added':dict(counts),'base':BASE,'historicalEventsPlacesAndConferenceMembershipPreserved':True,'gpsCleanUrlAnalyticsProtected':True},indent=2))
