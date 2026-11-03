import json,pathlib,re
R=pathlib.Path(__file__).resolve().parents[1]
for cid in ['nicosia','abu-dhabi','tirana']:
 p=json.loads((R/f'data/capitals-20261029/{cid}-packet.json').read_text());by={e['id']:e for e in p['events']};f=R/f'public/{cid}/events.json';d=json.loads(f.read_text())
 for e in d['events']:
  for k in ['programmeId','placeId','mandatoryFees','feeStatus','coordinateCheckedAt','durationEvidence','endEvidence','sourceReadAt','checkedAtSemantics','openingHoursCheckedAt','openingHoursSourceReadAt','openingHoursCheckedAtSemantics']:
   if k in by[e['id']]:e[k]=by[e['id']][k]
  if e['category']=='film':e['cinemaSession']=True
 f.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
 f=R/f'public/{cid}/source-registry.json';d=json.loads(f.read_text());rows=d.get('sources',[])if isinstance(d,dict)else d;sb={s['url']:s for s in p['sources']}
 for s in rows:
  for k in ['sourceReadAt','checkedAtSemantics','sourceReadWindow']:
   if k in sb[s['url']]:s[k]=sb[s['url']][k]
 f.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
f=R/'public/location-control.js';s=f.read_text();m=re.search(r'const cities=(\[.*?\]);',s);a=json.loads(m[1]);reg=json.loads((R/'data/city-expansion/registry.json').read_text())
for cid in ['nicosia','abu-dhabi','tirana']:
 c=next(c for c in reg['newCities']if c['id']==cid);p=json.loads((R/f'public/{cid}/places.json').read_text())['places'];point=[sorted(x[k]for x in p)[len(p)//2]for k in ['lat','lng']]
 if not any(x['id']==cid for x in a):a.append({'id':cid,'path':c['path'],'point':point,'name':c['name']})
f.write_text(s[:m.start(1)]+json.dumps(a,ensure_ascii=False,separators=(',',':'))+s[m.end(1):])
