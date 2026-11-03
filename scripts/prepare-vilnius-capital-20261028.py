import json,pathlib,copy,hashlib,datetime
from zoneinfo import ZoneInfo
R=pathlib.Path(__file__).resolve().parents[1];S=pathlib.Path('/workspace/shared/capitals-wave2/vilnius');O=R/'data/capitals-20261028'
raw=json.loads((S/'candidates.json').read_text());audit=json.loads((S/'audit.json').read_text());delta=json.loads((S/'marriott-pin-delta.json').read_text());rows=copy.deepcopy(raw)
def key(x):return hashlib.sha256(x.encode()).hexdigest()[:14]
p={'cityId':'vilnius','checkedAt':audit['checkedAt'],'window':{'startDate':'2026-10-28','endDate':'2026-11-26'},'coverage':'Initial verified selection, not complete Vilnius coverage. Official Vilnius Events calendar and full readable announcements reviewed first, then current venue and museum programmes, public Telegram announcements and a chat profile. Dynamic More Events pagination was not exhausted; HTTP403 detail requests were stopped. Holiday closures on November 1–2 override ordinary museum hours. No Telegram events imported where dates were unclear. Exact building-level coordinates are distinguished from entrances.','events':[],'places':[],'sources':[],'pending':json.loads((S/'held.json').read_text())};places={}
for e in rows:
 if e['status']!='verified_candidate' or e.get('lat') is None:
  p['pending'].append(e);continue
 if e['venue']==delta['match']['venue']:e.update(delta['set']);e['coordinateCheckedAt']=delta['checkedAt']
 if e['venue'].startswith('(LT) Konstitucijos'):e['venue']='Konstitucijos pr. 23 — building B, room 608';e['address']='Konstitucijos pr. 23, B korpusas, 608 kab.'
 if any(x in e['id'] for x in ['deniss-pashkevich','baltijos-gitar','gars-atmintis','vaizduot-s-teatras']):e['priceType']='from'
 vid='vilnius-venue-'+key(e['address'].casefold()+'|'+str(round(e['lat'],5))+'|'+str(round(e['lon'],5)))
 amount=e.get('price');notes=e.get('restrictions') or '';priceNote='Listed minimum; ticket category and mandatory fees must be checked with the organizer.' if e.get('priceType')=='from' and amount else ('Mandatory fees, if any, not independently verified.' if amount else None)
 if amount==0:priceNote='Free admission explicitly listed in the full programme announcement; registration or table reservations may still be required.'
 if 'dinner-with-jazz' in e['id']:notes='Advance table reservation recommended; food and drinks are separate from free music admission.'
 b={k:e[k] for k in ['id','title','venue','address','date','time','currency','timezone','checkedAt','yearEvidence','sourceUrl','coordinateSource','durationMinutes','endDate'] if k in e}
 b.update(titleEn=e['title'],venueEn=e['venue'],venueId=vid,lat=e['lat'],lng=e['lon'],coordinatePrecision='venue_approximate',coordinateEvidence=e['coordinatePrecision'],category={'family':'kids','tour':'city','comedy':'theatre','dance':'theatre','exhibition':'art','cinema':'film','conference':'conference'}.get(e['category'],e['category']),price=amount,min=e.get('priceType')=='from',priceNote=priceNote,language=e.get('eventLanguage'),source='Vilnius official agenda / verified organizer',status='scheduled',admission=notes or None,admissionEn=notes or None,description=notes or None,descriptionEn=notes or None,programmeId=e['programmeId'])
 if e.get('doors'):b['timeNote']='Doors '+e['doors']+'; programme starts '+e['time'];b['timeNoteEn']=b['timeNote']
 if e.get('recordType')=='range':
  b.update(dateType='published_interval',time=None,end=None,openingHoursKnown=True,closedDates=e.get('closedDates',[]),visitSchedule={},visitScheduleSource=e.get('hoursSource') or e['sourceUrl'],openingHoursSource=e.get('hoursSource') or e['sourceUrl'])
  d=datetime.date.fromisoformat(e['date']);end=datetime.date.fromisoformat(e['endDate'])
  while d<=end:
   day=d.isoformat();h=e['visitSchedule'].get(['mon','tue','wed','thu','fri','sat','sun'][d.weekday()])
   if h and day not in e.get('closedDates',[]):b['visitSchedule'][day]=h
   d+=datetime.timedelta(days=1)
 else:b['startAt']=datetime.datetime.fromisoformat(e['date']+'T'+e['time']).replace(tzinfo=ZoneInfo('Europe/Vilnius')).isoformat()
 p['events'].append(b)
 if vid not in places:places[vid]={k:b[k] for k in ['address','lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence','source','sourceUrl','checkedAt','currency','timezone']};places[vid].update(id=vid,title=e['venue'],titleEn=e['venue'],category='city',operatingStatusVerified=False,openingNote='Venue confirmed through its current programme; regular hours outside the programme not verified.',openingNoteEn='Venue confirmed through its current programme; regular hours outside the programme not verified.')
for s in audit['sources']:p['sources'].append(dict(id='vilnius-source-'+key(s['url']),name=s['url'].split('/')[2]+' '+s['type'],url=s['url'],type=s['type'],status=s['status'],checkedAt=audit['checkedAt'],note=s.get('detail','Source route inspected; no claim of complete event import.')))
seen={s['url'] for s in p['sources']}
for e in p['events']:
 if e['sourceUrl'] not in seen:p['sources'].append(dict(id='vilnius-source-'+key(e['sourceUrl']),name='Read programme: '+e['title'],url=e['sourceUrl'],type='direct_announcement',status='read_dated_announcement',checkedAt=e['checkedAt'],note='Full dated announcement read; not complete source coverage.'));seen.add(e['sourceUrl'])
p['places']=list(places.values())
for name,obj in [('vilnius-packet',p),('vilnius-research',raw),('vilnius-source-audit',audit),('vilnius-delta',delta)]: (O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
r=json.loads((R/'data/city-expansion/registry.json').read_text())
if not any(c['id']=='vilnius' for c in r['newCities']):
 c=copy.deepcopy(r['newCities'][-1]);c.update(id='vilnius',canonicalCity='Vilnius',countryCode='LT',name={'ru':'Вильнюс','en':'Vilnius','de':'Vilnius'},ianaTimezone='Europe/Vilnius',path='vilnius/index.html',currency='EUR',nameLocativeRu='Вильнюсе',eventLanguages=[{'code':'LT','label':'Литовский','terms':['Lithuanian','lietuvių','литовский']},{'code':'EN','label':'Английский','terms':['English','английский']},{'code':'RU','label':'Русский','terms':['Russian','русский']}]);r['newCities'].append(c);r['countries']['LT']={'ru':'Литва','en':'Lithuania','de':'Litauen'};(R/'data/city-expansion/registry.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(len(p['events']),len(p['places']),len(p['sources']),len(p['pending']))
