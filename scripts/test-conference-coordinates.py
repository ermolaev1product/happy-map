from pathlib import Path
import json,subprocess,hashlib,math,re
R=Path(__file__).resolve().parents[1];BASE='b2a43c9b90755407b10fdebf4051c9c27cb3ff7b';a=json.loads((R/'data/conference-coordinate-20261016/reviewed-delta.json').read_text());checks=0
assert len(a['patches'])==11
for c in json.loads((R/'public/city-picker.json').read_text())['cities']:
 for locale in ('','en/'):
  for kind in ('events','places'):
   f='public/'+locale+('' if c['id']=='tbilisi' else c['id']+'/')+kind+'.json';before=json.loads(subprocess.check_output(['git','show',BASE+':'+f],cwd=R));after=json.loads((R/f).read_text());expected=json.loads(json.dumps(before))
   if kind=='events':
    for x in a['patches']:
     if x['cityId']!=c['id']:continue
     e=next(e for e in expected['events'] if e['id']==x['existingId']);assert e.get('lat') is None and e.get('lng') is None;assert not x['privateOrUndisclosed'];assert all(math.isfinite(x['fields'][k]) for k in ['lat','lng']);assert x['fields']['coordinateSource'].startswith('https://');e.update(x['fields']);
     if locale:e['coordinateEvidence']=json.loads((R/'data/i18n/english-reviewed.json').read_text()).get(e['coordinateEvidence'],e['coordinateEvidence'])
     checks+=5
   assert after==expected,f;checks+=1
for f in subprocess.check_output(['git','ls-tree','-r','--name-only',BASE],cwd=R,text=True).splitlines():
 if f.startswith('public/') and f.endswith(('.js','.html','.css')):assert subprocess.check_output(['git','show',BASE+':'+f],cwd=R)==(R/f).read_bytes(),f;checks+=1
old=json.loads(subprocess.check_output(['git','show',BASE+':lib/place-catalog.json'],cwd=R));new=json.loads((R/'lib/place-catalog.json').read_text())
for city,rows in old.items():
 for id,row in rows.items():assert new[city].get(id)==row,(city,id);checks+=1
print(json.dumps({'pass':True,'checks':checks,'base':BASE,'existingEventPointsAdded':11,'localeRowsChanged':22,'allOtherEventsPlacesAccessDatesAndFrontendUnchanged':True},indent=2))
