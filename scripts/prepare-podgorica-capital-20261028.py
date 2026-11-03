import json,pathlib,copy,hashlib,datetime
from zoneinfo import ZoneInfo
R=pathlib.Path(__file__).resolve().parents[1];S=R.parent/'capitals-wave4/podgorica';O=R/'data/capitals-20261028';TZ='Europe/Podgorica';key=lambda s:hashlib.sha256(s.encode()).hexdigest()[:14]
raw=json.loads((S/'canonical-frozen-v3.json').read_text());delta=json.loads((S/'canonical-late-delta-v2.json').read_text());raw['programmes']+=delta['programmes'];raw['sources']+=delta['sources'];raw['holds']+=delta['holds'];raw['appliedDelta']='canonical-late-delta-v2.json';raw['checkedAt']=delta['compiledAt'];src={s['id']:s for s in raw['sources']}
p={'cityId':'podgorica','checkedAt':raw['checkedAt'],'window':{'startDate':'2026-10-28','endDate':'2026-11-26'},'coverage':'Selective Podgorica launch from eight named city venues: music, theatre, film, team games, a temporary exhibition and a trade fair. The official tourism calendar was read across14 actual pages with134 observed cards; duplicates, stale linked dates and default23:59 ends were not promoted. Selected full organizer and event bodies were checked, not every observed card.22 timed sessions and2 real date ranges; visiting hours are not performances. November1 and several later dates have no verified timed listing; late November and category coverage remain sparse. Outlying Blizna is held separately, not counted as Podgorica. Gallery weekly hours are retained as guidance only, not verified holiday or open-now windows. Public Telegram announcements were read without complete fresh imports; city chats were profile-only, not read conversations.','events':[],'places':[],'sources':[],'pending':copy.deepcopy(raw['holds'])+[dict(x,reason='Outlying Blizna, not a city programme.') for x in raw.get('nearbyCandidates',[])]};places={};seen=set()
def setprice(x,pr):
 amount=pr.get('amount');unit=pr.get('unit','person');note=' '.join(str(v) for v in [pr.get('note'),pr.get('feeStatus')] if v)
 if unit!='person':
  note+=' Published unit: '+unit+'.'
  if amount is not None:x['priceLabel']=x['priceLabelEn']=f'EUR{amount} / {unit}'
  amount=None
 x.update(price=amount,priceNote=note,priceNoteEn=note)
for r in raw['programmes']:
 co=r['verifiedCoordinates'];s=src[r['sourceId']];cs=src[co['sourceId']];vid='podgorica-venue-'+key(str(co['latitude'])+'|'+str(co['longitude']));ad=' '.join(v for v in [r.get('restrictions'),r.get('addressCaveat')] if v)
 b={'title':r['title'],'titleEn':r['title'],'venue':r['venue'],'venueEn':r['venue'],'venueId':vid,'address':r['address'],'category':{'film':'film','exhibition':'art','fair':'city','games':'games'}.get(r['category'],r['category']),'lat':co['latitude'],'lng':co['longitude'],'coordinateSource':cs['url'],'coordinatePrecision':'venue_approximate','coordinateEvidence':co['precision'],'source':'Podgorica tourism / organizer','sourceUrl':s['url'],'checkedAt':s['checkedAt'],'yearEvidence':'Explicit2026 dated programme or verified temporary date range. Exact evidence and review/fetch distinctions retained in source audit.','currency':'EUR','timezone':TZ,'status':'scheduled','description':r['summaryEn'],'descriptionEn':r['summaryEn'],'admission':ad,'admissionEn':ad,'programmeId':r['id'],'hall':r.get('hall'),'hallEn':r.get('hall'),'price':None,'language':'EN surtitles' if r['id']=='crnojevici' else None};setprice(b,r['price'])
 places.setdefault(vid,{**{k:b[k] for k in ['address','lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence','source','sourceUrl','checkedAt','currency','timezone']},'id':vid,'title':r['venue'],'titleEn':r['venue'],'category':'city','operatingStatusVerified':False,'openingNote':'Named programme venue; ordinary public opening and exact indoor entrance are not independently verified.','openingNoteEn':'Named programme venue; ordinary public opening and exact indoor entrance are not independently verified.'})
 if r.get('dateRange'):
  x=copy.deepcopy(b);er=r['dateRange'];x.update(id='podgorica-'+r['id'],date=er['startDate'],endDate=er['endDate'],dateType='published_interval',time=None,end=None,openingHoursKnown=False,openingHoursUnknown=True)
  vs=r.get('visitSchedule')
  if isinstance(vs,list):x.update(visitSchedule={o['date']:{'start':o['startTime'],'end':o['endTime']} for o in vs},openingHoursKnown=True,openingHoursUnknown=False,openingHoursSource=s['url'])
  elif vs:
   x['openingHoursNote']='Date-specific and holiday opening hours are not verified. This is an exhibition date range, not a daily timed session.'
   note=' Published regular hours: Tuesday–Sunday10:30–18:30. Holiday/date-specific opening is not verified; do not assume open now. November4 admission is free under the first-Wednesday rule.'
   x['admission']=x['admissionEn']=ad+note;x['priceNote']=x['priceNoteEn']=x['priceNote']+' November4: free admission; other listed dates use normal eligibility rules.'
  p['events'].append(x)
 for o in r['occurrences']:
  x=copy.deepcopy(b);x.update(id='podgorica-'+r['id']+'-'+o['date'].replace('-','')+'-'+o['startTime'].replace(':',''),date=o['date'],time=o['startTime'],end=o.get('endTime'),startAt=datetime.datetime.fromisoformat(o['date']+'T'+o['startTime']).replace(tzinfo=ZoneInfo(TZ)).isoformat());setprice(x,o.get('price') or r['price'])
  if x['end']:
   dt=datetime.datetime.fromisoformat(o['date']+'T'+x['end']).replace(tzinfo=ZoneInfo(TZ));dt+=datetime.timedelta(days=dt<=datetime.datetime.fromisoformat(x['startAt']));x['endAt']=dt.isoformat()
  p['events'].append(x)
p['places']=list(places.values())
for s in raw['sources']:
 u=s['url']
 if u in seen:continue
 seen.add(u);note=' '.join(str(v) for v in [s.get('checkMethod'),s.get('note')] if v)
 if s.get('sourceFetchedAt') is None:note+=' Checked time is evidence review, not a claimed original network fetch timestamp.'
 p['sources'].append({'id':'podgorica-source-'+key(u),'name':'Podgorica evidence: '+s['id'],'url':u,'checkedAt':s.get('checkedAt'),'status':s.get('readStatus') or 'selected_evidence_review','note':note})
for u,st,nt in [('https://t.me/s/monteafisha','public_preview_read','Public announcement bodies read; no complete fresh in-window import.'),('https://t.me/PodgoricaMNE','profile_only','Profile only; chat conversations not read or joined.')]:
 p['sources'].append({'id':'podgorica-source-'+key(u),'name':'Public Telegram source','url':u,'checkedAt':('2026-10-28T12:23:55Z' if 'monteafisha' in u else '2026-10-28T12:00:50.025Z'),'status':st,'sourceFetchedAt':None,'note':nt+' Retained web-service body; not an executor GET. Announcement read at actual recorded web-read time; chat profile time is retained evidence save time, not an original fetch timestamp.'})
for name,obj in [('podgorica-packet',p),('podgorica-research',raw)]:(O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
r=json.loads((R/'data/city-expansion/registry.json').read_text())
if not any(c['id']=='podgorica' for c in r['newCities']):
 c=copy.deepcopy(r['newCities'][-1]);c.update(id='podgorica',canonicalCity='Podgorica',countryCode='ME',name={'ru':'Подгорица','en':'Podgorica','de':'Podgorica'},ianaTimezone=TZ,path='podgorica/index.html',currency='EUR',nameLocativeRu='Подгорице',eventLanguages=[{'code':'ME','label':'Черногорский','terms':['Montenegrin','черногорский']},{'code':'EN','label':'Английский','terms':['English','английский']}]);r['newCities'].append(c);r['countries']['ME']={'ru':'Черногория','en':'Montenegro','de':'Montenegro'};(R/'data/city-expansion/registry.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(len(p['events']),len(p['places']),len(p['sources']),len(p['pending']))
