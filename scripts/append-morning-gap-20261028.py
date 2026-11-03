import json,hashlib,datetime
from pathlib import Path
R=Path(__file__).resolve().parents[1];D=R/'data/morning-verified-20261028/delta.json';x=json.loads(D.read_text());p=json.load(open('/workspace/shared/hm28-gap-close.json'))
for e in p['candidates']:
 c=e['cityId'];fp=R/'public'/c/'events.json';pp=R/'public'/c/'places.json';f=json.loads(fp.read_text());places=json.loads(pp.read_text());pr=places.get('places') if isinstance(places,dict) else places
 assert not any(v['id']==e['id']for v in f['events'])
 pv=next((v for v in pr if v['id']==e.get('placeId',e['venueId'])),None)
 if pv is None:
  pv={k:e[k]for k in ['cityId','venue','address','lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence','checkedAt']};pv.update(id=e['venueId'],kind='place',title=e['venue'],category='music',source=e['source'],sourceUrl=e['coordinateSource'],openingNote='Hours and admission depend on the advertised programme; not independently reviewed.');pr.append(pv);x['newPlaces'].append(pv)
 e.update(placeId=pv['id'],venueId=pv['id'],kind='event',status='scheduled',publicationStatus='verified',researchBatch='morning-verified-20261028',programmeId='programme-'+hashlib.sha256((c+'|'+e['title']+'|'+e['venue']).encode()).hexdigest()[:16],language=None,mandatoryFees=None,sourceURLs=[e['sourceUrl']])
 f['events'].append(e);x['added'].append(e);fp.write_text(json.dumps(f,ensure_ascii=False,separators=(',',':'))+'\n');pp.write_text(json.dumps(places,ensure_ascii=False,separators=(',',':'))+'\n')
 x['sourceAudit'].append({'cityId':c,'name':e['source'],'url':e['sourceUrl'],'checkedAt':e['checkedAt'],'status':'read','scope':'Full primary programme and named venue pin verified; closes Nov2 zero date; not full source pagination.'})
x['held']+=p.get('held',[]);D.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n');(D.parent/'hm28-gap-close.json').write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n')
mem=R/'data/i18n/english-memory.json';m=json.loads(mem.read_text());m.update({'Сона Шахгельдян':'Sona Shahgeldyan','Шейкер Квиз — Телеквиз #3':'Shaker Quiz — TV Quiz #3','ул. Желтоксан, 2Т, Астана':'2T Zheltoksan Street, Astana'});mem.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
print(len(x['added']),len(x['newPlaces']))
