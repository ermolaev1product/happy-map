#!/usr/bin/env python3
"""Verify that this release preserves v145 data and unrelated GPS/URL/app logic."""
from pathlib import Path
import json,subprocess,re,hashlib,datetime
ROOT=Path(__file__).resolve().parents[1]
p=json.loads((ROOT/'data/conferences/release-2026-10-16.json').read_text());BASE=p['baseCommit']
def old_bytes(f):return subprocess.check_output(['git','show',BASE+':'+f],cwd=ROOT)
def old(f):return json.loads(old_bytes(f))
def new(f):return json.loads((ROOT/f).read_text())
def rows(v,k):return v if isinstance(v,list) else v[k]
cities=new('public/city-picker.json')['cities']; additions={c['id']:{e['id'] for e in p['events'] if e['cityId']==c['id']} for c in cities};updates={(e['cityId'],e['id']):e['changes'] for e in p.get('existingUpdates',[])}
report={'base':BASE,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'oldRowsPreserved':0,'placeInventoriesUnchanged':0,'feedDeltas':[],'htmlOnlyCacheHashes':0}
for locale in ['', 'en/','de/']:
 for c in cities:
  city=c['id']
  if locale=='de/' and city!='flensburg':continue
  prefix='public/'+locale+('' if city=='tbilisi' else city+'/')
  for kind in ['places','events']:
   f=prefix+kind+'.json';a,b=old(f),new(f)
   if kind=='places':assert a==b,f+' unrelated Places data changed';report['placeInventoriesUnchanged']+=1;continue
   aa,bb=rows(a,kind),rows(b,kind);ai={e['id']:e for e in aa};bi={e['id']:e for e in bb}
   assert len(bi)==len(bb),f+' duplicate IDs'
   assert not set(ai)-set(bi),f+' old event removed'
   assert set(bi)-set(ai)==additions[city],f+' added event outside reviewed packet'
   changed=[]
   for id,e in ai.items():
    allowed=updates.get((city,id),{})
    delta={k for k in set(e)|set(bi[id]) if e.get(k)!=bi[id].get(k)}
    assert delta<=set(allowed),f+' unauthorized old-row change '+id+': '+str(delta-set(allowed))
    for k in delta:assert bi[id].get(k)==allowed[k],f+' unauthorized correction value '+id+': '+k
    if delta:changed.append({'id':id,'fields':sorted(delta)})
    else:report['oldRowsPreserved']+=1
   # No replacement of catalog history or broad source freshness claims.
   metaA={k:v for k,v in a.items() if k!='events'};metaB={k:v for k,v in b.items() if k!='events'}
   delta={k for k in set(metaA)|set(metaB) if metaA.get(k)!=metaB.get(k)}
   assert delta<={'endDate','lastConferencesRefresh'},f+' unrelated catalog metadata changed '+str(delta)
   if additions[city] or changed:report['feedDeltas'].append({'file':f,'added':len(additions[city]),'oldChanged':changed})
files=subprocess.check_output(['git','diff','--name-only',BASE],cwd=ROOT,text=True).splitlines()
extra=subprocess.check_output(['git','ls-files','--others','--exclude-standard'],cwd=ROOT,text=True).splitlines()
allowed={'data/i18n/english-build-sha256.json','data/i18n/english-reviewed.json','lib/place-catalog-packed.ts','lib/place-catalog.json','public/catalog-modes.js','public/discovery-model.js','public/en/discovery-model.js'}
for f in files:
 if f.endswith('.html'):
  strip=lambda s:re.sub(r'((?:catalog-modes|discovery-model)\.js\?v=)[a-f0-9]+',r'\1HASH',s)
  assert strip(old_bytes(f).decode())==strip((ROOT/f).read_text()),f+' HTML changed beyond shared-script cache hashes'
  report['htmlOnlyCacheHashes']+=1
 elif f not in allowed:assert re.fullmatch(r'public/(?:en/|de/)?(?:[a-z-]+/)?events\.json',f),f+' unauthorized source change'
for f in extra:assert f.startswith('data/conferences/') or f in {'scripts/import-conference-release.py','scripts/test-conference-filters.cjs','scripts/test-conference-release-data.py','scripts/test-conference-release-scope.py','scripts/audit-conference-coverage.cjs'},'Unexpected new file '+f
# Translation additions may not silently reword historical rows elsewhere.
a,b=old('data/i18n/english-reviewed.json'),new('data/i18n/english-reviewed.json');assert all(b.get(k)==v for k,v in a.items()),'Existing reviewed translation changed'
# Generated venue lookup only adds links derived from source-verified event venues.
a,b=old('lib/place-catalog.json'),new('lib/place-catalog.json');assert set(a)==set(b)
for city in a:assert all(b[city].get(k)==v for k,v in a[city].items()),'Existing generated place mutated '+city
# Explicitly protect live automatic GPS, clean URLs, UI implementation and analytics.
for f in subprocess.check_output(['git','ls-tree','-r','--name-only',BASE],text=True,cwd=ROOT).splitlines():
 if re.search(r'(?:^|/)(?:location-control|app|traffic|visitor-stats|tracking)[^/]*\.(?:js|ts)$',f) or f=='.openai/hosting.json':assert old_bytes(f)==(ROOT/f).read_bytes(),f+' protected behavior changed'
report.update({'pass':True,'protectedGpsUrlAnalyticsAppLogicUnchanged':True,'addedOccurrences':len(p['events']),'existingCorrections':len(updates),'changedTrackedFiles':len(files),'newSourceFiles':len(extra)})
print(json.dumps(report,ensure_ascii=False,indent=2))
