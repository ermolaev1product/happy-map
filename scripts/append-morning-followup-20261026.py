# coding: utf-8
import json,copy,hashlib,datetime
from pathlib import Path
from zoneinfo import ZoneInfo
R=Path(__file__).resolve().parents[1];O=R/'data/morning-control-20261026';delta=json.loads((O/'delta.json').read_text());now=datetime.datetime.now(datetime.timezone.utc).isoformat()
for city in ['moscow','almaty']:
 p=R/'public'/city/'events.json';f=json.loads(p.read_text());es=f['events'];new=[]
 if city=='moscow':
  common={'cityId':city,'category':'talk','time':'19:00','timezone':'Europe/Moscow','source':'Tretyakov Gallery — official programme','price':None,'currency':'RUB','language':None,'accessType':'public','accessNote':'In-person ticket required. Online lecture has a separate ticket; remaining tickets and fees are unconfirmed.','description':'A public in-person lecture in the named Tretyakov Gallery building. End time and admission price are unconfirmed.'}
  for slug,title,titleen,date,kad in [('lektsiya-zhivopis-vladimiro-suzdalskoy-rusi-10-2026','Живопись Владимиро-Суздальской Руси','Painting of Vladimir-Suzdal Rus','2026-10-27',False),('lektsiya-borisov-musatov-i-khudozhestvennyy-avangard-nachala-khkh-veka','Борисов-Мусатов и художественный авангард начала ХХ века','Borisov-Musatov and the early twentieth-century artistic avant-garde','2026-10-28',True),('lektsiya-karl-bryullov-10-2026','Карл Брюллов','Karl Bryullov','2026-10-29',False),('lektsiya-mikhail-petrovich-kristi-10-2026','Михаил Петрович Кристи','Mikhail Petrovich Kristi','2026-10-30',False)]:
   ref=next(e for e in es if ('Кадашёвской' if kad else 'Инженерный') in str(e.get('venue')))
   e={**common,**{k:copy.deepcopy(ref[k]) for k in ['venue','address','lat','lng','coordinateSource']},'title':title,'titleEn':titleen,'date':date,'sourceUrl':'https://www.tretyakovgallery.ru/events/o/'+slug+'/','ageRestriction':'12+' if kad else '14+','coordinatePrecision':'building','yearEvidence':'Full official event page explicitly states the2026date,19:00start, venue branch and street address.'}
   new.append(e)
 else:
  ref=next(e for e in es if e.get('sourceUrl')=='https://almaty-ayenderi.kz/ru/event/811') if any(e.get('sourceUrl')=='https://almaty-ayenderi.kz/ru/event/811' for e in es) else next(e for e in es if e['title']=='MEYRAMBEK BESBAYEV' and e['date']=='2026-11-06')
  e=copy.deepcopy(ref);e.pop('id');e['time']='16:00';e['sourceUrl']=ref['sourceUrl'];e['yearEvidence']='Official Republic Palace homepage explicitly lists two distinct6November2026sessions,16:00and20:00, for this programme.';new.append(e)
 for e in new:
  if any(v.get('sourceUrl')==e['sourceUrl'] and v.get('date')==e['date'] and v.get('time')==e['time'] for v in es):continue
  e.update(id='m26f-'+city+'-'+hashlib.sha256((e['sourceUrl']+'|'+e['date']+'|'+e['time']).encode()).hexdigest()[:14],kind='event',checkedAt=now,publicationStatus='verified',availabilityVerified=False,mandatoryFees=None,status='scheduled',researchBatch='morning-followup-20261026',endAt=None)
  e.setdefault('programmeId','programme-'+hashlib.sha256(e['sourceUrl'].encode()).hexdigest()[:16]);e['startAt']=datetime.datetime.fromisoformat(e['date']+'T'+e['time']).replace(tzinfo=ZoneInfo(e['timezone'])).isoformat();es.append(e);delta['added'].append(e)
 f['editorialUpdatedAt']=now;f['latestResearchBatch']='morning-followup-20261026';p.write_text(json.dumps(f,ensure_ascii=False,indent=2)+'\n')
# Restore previous JSON formatting to keep the reviewed source diff focused.
for c in ['bishkek','dubai','barcelona','batumi','palo-alto']:
 p=R/'public'/c/'events.json';p.write_text(json.dumps(json.loads(p.read_text()),ensure_ascii=False,indent=2)+'\n')
for name,key in [('added-events','added'),('delta',None)]: (O/(name+'.json')).write_text(json.dumps(delta if key is None else delta[key],ensure_ascii=False,indent=2)+'\n')
p=R/'data/i18n/english-reviewed.json';m=json.loads(p.read_text());m.update({'Живопись Владимиро-Суздальской Руси':'Painting of Vladimir-Suzdal Rus','Борисов-Мусатов и художественный авангард начала ХХ века':'Borisov-Musatov and the early twentieth-century artistic avant-garde','Карл Брюллов':'Karl Bryullov','Михаил Петрович Кристи':'Mikhail Petrovich Kristi'});p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
print('Total additions',len(delta['added']))
