import json,pathlib,copy,hashlib,datetime
from zoneinfo import ZoneInfo
R=pathlib.Path('/workspace/scratch/59f6a13c9f12/happymap-capitals');S=R.parent/'capitals-wave4/ljubljana';O=R/'data/capitals-20261028';raw=json.loads((S/'combined/ljubljana-canonical-frozen.json').read_text());TZ='Europe/Ljubljana';key=lambda s:hashlib.sha256(s.encode()).hexdigest()[:16]
qa=json.loads((S/'semantic-qa/local-findings.json').read_text())
for r in raw['programmes']:
 if r['sourceId'] in qa['importDeltas'] and qa['importDeltas'][r['sourceId']].get('feesNoteEn'):r['fees']={'noteEn':qa['importDeltas'][r['sourceId']]['feesNoteEn']}
 if r['sourceId'] in [q['sourceId'] for q in qa['bookingContract']]:r['accessEn']+=' Booking link is the programme route; select and confirm the intended date before purchasing.'
p={'cityId':'ljubljana','checkedAt':raw['checkedAt'],'window':{'startDate':'2026-10-28','endDate':'2026-11-26'},'coverage':'Selective Ljubljana launch from Cankarjev dom, independent cinema, museums and cultural venues. Main tourism calendar was blocked and not retried; two actual organizer month calendars and 59 full details plus independent reserves were read, not complete city coverage.76 actual timed sessions and22 real ranges retain source visiting windows separately. November1 has only five exhibitions under published daily hours, without separately confirmed holiday exceptions; this uncertainty remains explicit. School-only, invitation-only, postponed, sold-out and unresolved candidates remain held. No unverified Telegram announcements or chat conversations imported.','events':[],'places':[],'sources':[],'pending':copy.deepcopy(raw['held'])};places={};seen=set()
def price(x,pr):
 a=pr.get('standard');minimum=False
 if a is None and pr.get('unit')!='family_bundle':a=pr.get('min');minimum=a is not None
 if pr.get('unit')=='family_bundle':a=None
 x.update(price=a,min=minimum,priceMax=pr.get('max') if pr.get('unit')!='family_bundle' else None,priceNote=pr.get('text') or ('Price unit: '+str(pr.get('unit')).replace('_',' ')+'.' if pr.get('unit') else ''),priceNoteEn=pr.get('text') or ('Price unit: '+str(pr.get('unit')).replace('_',' ')+'.' if pr.get('unit') else ''))
for r in raw['programmes']:
 pin=r['verifiedCoordinates'];vid='ljubljana-venue-'+key(str(pin['latitude'])+'|'+str(pin['longitude']));ad=r.get('accessEn') or ''
 for z in [r.get('fees')]+r.get('notes',[]):
  if z:ad+=' '+(z if isinstance(z,str) else z.get('noteEn') or json.dumps(z,ensure_ascii=False))
 b={'title':r['title'],'titleEn':r['title'],'venue':r['venue'],'venueEn':r['venue'],'venueId':vid,'address':r['address'],'category':r['normalizedCategory'],'lat':pin['latitude'],'lng':pin['longitude'],'coordinateSource':pin['sourceUrl'],'coordinatePrecision':'venue_approximate','coordinateEvidence':pin.get('evidence','')+'; '+pin['precision'],'source':'Ljubljana official tourism / organizer','sourceUrl':r['sourceUrl'],'sourceURLs':list(dict.fromkeys([r['sourceUrl']]+r.get('additionalEvidenceUrls',[]))),'ticketUrl':r.get('ticketUrl'),'checkedAt':r['checkedAt'],'yearEvidence':json.dumps(r.get('dateEvidence'),ensure_ascii=False),'currency':'EUR','timezone':TZ,'status':'scheduled','description':r['summaryEn'],'descriptionEn':r['summaryEn'],'admission':ad.strip(),'admissionEn':ad.strip(),'hall':r.get('hall'),'hallEn':r.get('hall'),'language':r.get('eventLanguage'),'programmeId':r['sourceId']};price(b,r['price'])
 if r.get('approximateDurationMinutes'):b['admission']=b['admissionEn']=ad+' Approximate duration '+str(r['approximateDurationMinutes'])+' minutes, not a confirmed finishing time.'
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
  seen.add(u);p['sources'].append({'id':'ljubljana-source-'+key(u),'name':'Read evidence: '+r['title'],'url':u,'checkedAt':pin.get('checkedAt',r['checkedAt']) if u==pin['sourceUrl'] else r['checkedAt'],'status':'selected_evidence_review','note':'Selected primary programme or named venue evidence; checkedAt is content review, not necessarily original network fetch. Original source-read timestamps, full bodies and access limits retained in canonical research. Not full host coverage.'})
p['places']=list(places.values())
raw['importSemanticQA']=qa
raw['telegramAudit']=json.loads((S/'telegram-audit.json').read_text())

for name,obj in [('ljubljana-packet',p),('ljubljana-research',raw)]:(O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
r=json.loads((R/'data/city-expansion/registry.json').read_text())
if not any(c['id']=='ljubljana' for c in r['newCities']):
 c=copy.deepcopy(r['newCities'][-1]);c.update(id='ljubljana',canonicalCity='Ljubljana',countryCode='SI',name={'ru':'Любляна','en':'Ljubljana','de':'Ljubljana'},ianaTimezone=TZ,path='ljubljana/index.html',currency='EUR',nameLocativeRu='Любляне',eventLanguages=[{'code':'SL','label':'Словенский','terms':['Slovenian','slovenščina','словенский']},{'code':'EN','label':'Английский','terms':['English','английский']}]);r['newCities'].append(c);r['countries']['SI']={'ru':'Словения','en':'Slovenia','de':'Slowenien'};(R/'data/city-expansion/registry.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(len(p['events']),len(p['places']),len(p['sources']),len(p['pending']))
