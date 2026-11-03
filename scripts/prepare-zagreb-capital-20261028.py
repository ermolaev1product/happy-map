import json,pathlib,copy,hashlib,datetime
from zoneinfo import ZoneInfo
R=pathlib.Path('/workspace/scratch/59f6a13c9f12/happymap-capitals');S=R.parent/'capitals-wave4/zagreb';O=R/'data/capitals-20261028';raw=json.loads((S/'combined/zagreb-canonical-frozen.json').read_text());TZ='Europe/Zagreb';key=lambda s:hashlib.sha256(s.encode()).hexdigest()[:16]
qa=json.loads((S/'combined/local-semantic-qa-sidecar.json').read_text())
for patch in qa['concreteChanges']:
 for r in raw['programmes']:
  if r['sourceId']==patch['sourceId']:
   for o in r['occurrences']:
    if o['date']==patch['date'] and o['startTime']==patch['startTime']:o.update(patch['set'])
p={'cityId':'zagreb','checkedAt':raw['checkedAt'],'window':{'startDate':'2026-10-28','endDate':'2026-11-26'},'coverage':'Selected public Zagreb programmes from four actual InfoZagreb pages: 127 unique full event details retrieved, not all approved for import. Independent venue programmes include Lisinski, theatres, museums, cultural centres and family activities. Real performance dates and exhibition visiting windows remain separate. November1/2 and November18 have no verified eligible listing; holiday closures are preserved, not filled with invented events. Most concerts are at Lisinski; this is a selective and asymmetric launch, not complete city coverage. Sold-out, cancelled, off-city, school-only and conflicting candidates remain held. Telegram discovery and access limits are separately documented; no unverified chat announcements imported.','events':[],'places':[],'sources':[],'pending':copy.deepcopy(raw['held'])};places={};seen=set()
def price(x,pr):
 a=pr.get('standard');minimum=False
 if a is None and pr.get('unit')!='family_bundle':a=pr.get('min');minimum=a is not None
 if pr.get('unit')=='family_bundle':a=None
 x.update(price=a,min=minimum,priceMax=pr.get('max') if pr.get('unit')!='family_bundle' else None,priceNote=pr.get('text') or '',priceNoteEn=pr.get('text') or '')
for r in raw['programmes']:
 pin=r['verifiedCoordinates'];vid='zagreb-venue-'+key(str(pin['latitude'])+'|'+str(pin['longitude']));ad=r.get('accessEn') or ''
 for z in [r.get('fees')]+r.get('notes',[]):
  if z:ad+=' '+(z if isinstance(z,str) else json.dumps(z,ensure_ascii=False))
 b={'title':r['title'],'titleEn':r['title'],'venue':r['venue'],'venueEn':r['venue'],'venueId':vid,'address':r['address'],'category':r['normalizedCategory'],'lat':pin['latitude'],'lng':pin['longitude'],'coordinateSource':pin['sourceUrl'],'coordinatePrecision':'venue_approximate','coordinateEvidence':pin.get('evidence','')+'; '+pin['precision'],'source':'Zagreb official tourism / organizer','sourceUrl':r['sourceUrl'],'sourceURLs':list(dict.fromkeys([r['sourceUrl']]+r.get('additionalEvidenceUrls',[]))),'ticketUrl':r.get('ticketUrl'),'checkedAt':r['checkedAt'],'yearEvidence':json.dumps(r.get('dateEvidence'),ensure_ascii=False),'currency':'EUR','timezone':TZ,'status':'scheduled','description':r['summaryEn'],'descriptionEn':r['summaryEn'],'admission':ad.strip(),'admissionEn':ad.strip(),'hall':r.get('hall'),'hallEn':r.get('hall'),'language':r.get('eventLanguage'),'programmeId':r['sourceId']};price(b,r['price'])
 if r.get('durationMinutes'):b['durationMinutes']=r['durationMinutes'];b['admission']=b['admissionEn']=ad+' Published duration '+str(r['durationMinutes'])+' minutes'+(' approximately' if r.get('durationApproximate') else '')+'; not a verified finishing time.'
 places.setdefault(vid,{**{k:b[k] for k in ['address','lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence','source','sourceUrl','checkedAt','currency','timezone']},'id':vid,'title':r['venue'],'titleEn':r['venue'],'category':'city','operatingStatusVerified':False,'openingNote':'Named programme venue; ordinary public access and exact indoor entrance are not independently verified.','openingNoteEn':'Named programme venue; ordinary public access and exact indoor entrance are not independently verified.'})
 if not r['occurrences']:
  vs=r.get('visitSchedule') or [];sch={o['date']:{'start':o['startTime'],'end':o['endTime']} for o in vs};hs=(vs[0].get('sourceUrl') if vs else None) or r['sourceUrl'];x=copy.deepcopy(b);x.update(id=r['id'],date=r['startDate'],endDate=r['endDate'],dateType='published_interval',time=None,end=None,visitSchedule=sch,openingHoursKnown=bool(sch),openingHoursUnknown=not bool(sch),openingHoursSource=hs);p['events'].append(x)
 for o in r['occurrences']:
  x=copy.deepcopy(b);x.update(id=r['id']+'-'+o['date'].replace('-','')+'-'+o['startTime'].replace(':',''),date=o['date'],time=o['startTime'],end=o.get('endTime'),startAt=datetime.datetime.fromisoformat(o['date']+'T'+o['startTime']).replace(tzinfo=ZoneInfo(TZ)).isoformat(),ticketUrl=o.get('ticketUrl') or r.get('ticketUrl'),hall=o.get('hall') or r.get('hall'),hallEn=o.get('hall') or r.get('hall'))
  if x['end']:
   dt=datetime.datetime.fromisoformat((o.get('endDate') or o['date'])+'T'+x['end']).replace(tzinfo=ZoneInfo(TZ));dt+=datetime.timedelta(days=dt<=datetime.datetime.fromisoformat(x['startAt']));x['endAt']=dt.isoformat()
  p['events'].append(x)
 for u in b['sourceURLs']+[pin['sourceUrl']]:
  if u in seen:continue
  seen.add(u);p['sources'].append({'id':'zagreb-source-'+key(u),'name':'Read evidence: '+r['title'],'url':u,'checkedAt':pin.get('checkedAt',r['checkedAt']) if u==pin['sourceUrl'] else r['checkedAt'],'status':'selected_evidence_review','note':'Selected primary programme or named venue evidence; checkedAt is content review, not necessarily original network fetch. Original source-read timestamps, full bodies and access limits retained in canonical research. Not full host coverage.'})
p['places']=list(places.values())
raw['telegramAudit']=json.loads((S/'telegram-audit.json').read_text())
raw['localSemanticQA']=qa
for name,obj in [('zagreb-packet',p),('zagreb-research',raw)]:(O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
r=json.loads((R/'data/city-expansion/registry.json').read_text())
if not any(c['id']=='zagreb' for c in r['newCities']):
 c=copy.deepcopy(r['newCities'][-1]);c.update(id='zagreb',canonicalCity='Zagreb',countryCode='HR',name={'ru':'Загреб','en':'Zagreb','de':'Zagreb'},ianaTimezone=TZ,path='zagreb/index.html',currency='EUR',nameLocativeRu='Загребе',eventLanguages=[{'code':'HR','label':'Хорватский','terms':['Croatian','Hrvatski','хорватский']},{'code':'EN','label':'Английский','terms':['English','английский']}]);r['newCities'].append(c);r['countries']['HR']={'ru':'Хорватия','en':'Croatia','de':'Kroatien'};(R/'data/city-expansion/registry.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(len(p['events']),len(p['places']),len(p['sources']),len(p['pending']))
