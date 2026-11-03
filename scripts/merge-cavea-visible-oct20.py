"""Add only actual, dated visible Cavea bookings; never replace existing sessions."""
import json,glob,urllib.parse,datetime,collections
from pathlib import Path
R=Path(__file__).resolve().parents[1]; out=R/'data/refresh-20261020'
base=json.load(open(R/'public/events.json')); venues={e['venue']:{k:e[k] for k in ['venue','venueId','address','lat','lng','coordinateSource'] if k in e} for e in base['events'] if e.get('cinemaSession')}
extra=out/'batumi-grand-mall-venue.json'
if extra.exists(): venues['Cavea Grand Mall']=json.load(open(extra))
added=[];excluded=[]
for language in ['ru','en']:
 for city in ['tbilisi','batumi']:
  path=R/'public'/('en' if language=='en' else '')/('' if city=='tbilisi' else city)/'events.json'
  data=json.load(open(path)); ids={e['id'] for e in data['events']}; changes=[]
  for f in sorted(out.glob('cavea-*-dom.json')):
   snap=json.load(open(f))
   for x in snap['records']:
    is_batumi=x['venue']=='Cavea Grand Mall'
    if is_batumi!=(city=='batumi'):continue
    if x['venue'] not in venues:
     if language=='ru':excluded.append(x)
     continue
    booking=urllib.parse.unquote(x['url'].split('/booking/')[1]); part=booking.split('/'); date=datetime.datetime.strptime(part[-2],'%d-%m-%Y').date().isoformat(); time=part[-1]
    assert date==f.name[6:10]+'-'+f.name[10:12]+'-'+f.name[12:14],(date,f)
    id='cinema:'+booking
    if id in ids:continue
    bits=x['text'].splitlines();price=float(bits[-1].replace('₾',''));fmt=bits[1];lang={'GEO':'KA','ENG':'EN','RUS':'RU'}.get(bits[-2],bits[-2])
    v={k:value for k,value in venues[x['venue']].items() if k in ['venue','venueId','address','lat','lng','coordinateSource','coordinateAccuracy','coordinatePrecision','coordinateEvidence','addressEvidence']}
    e={**v,'id':id,'title':x['title'],'date':date,'time':time,'startAt':date+'T'+time+':00+04:00','timezone':'Asia/Tbilisi','end':None,'category':'film','language':lang,'price':price,'currency':'GEL','min':True,'mandatoryFees':None,'priceNote':('Advertised session price. Final total, mandatory fees and availability are confirmed by the cinema.' if language=='en' else 'Цена сеанса в расписании. Итоговая стоимость, обязательные сборы и наличие уточняются у кинотеатра.'),'description':('Film screening · ' if language=='en' else 'Киносеанс · ')+fmt+'.','source':'Cavea','sourceUrl':x['url'],'sources':[{'name':'Cavea visible dated schedule','url':snap['source']},{'name':'Film programme','url':x['movieUrl']},{'name':'Cinema','url':x['venueUrl']}],'checkedAt':snap['checkedAt'],'cinemaSession':True,'format':fmt,'duration':None,'subtitleLanguage':('KA' if 'SUB-GEO' in bits else None),'dateEvidence':'Actual booking URL and visible selected-date heading; not inferred from requested URL.'}
    data['events'].append(e);ids.add(id);changes.append(e)
  if changes:
   data['generatedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();data['lastPartialRefresh']={'checkedAt':data['generatedAt'],'scope':'Cavea visible dated bookings 2026-10-21 through 2026-10-26; additive only; other sources preserved','added':len(changes)};path.write_text(json.dumps(data,ensure_ascii=False,indent=2))
  if language=='ru':added.extend([{'city':city,'event':e} for e in changes])
print(collections.Counter(x['city'] for x in added));(out/'cinema-additions.json').write_text(json.dumps({'additions':added,'excludedCount':len(excluded)},ensure_ascii=False,indent=2))
