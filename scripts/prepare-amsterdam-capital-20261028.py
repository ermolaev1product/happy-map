import json,pathlib,copy,hashlib,datetime
from zoneinfo import ZoneInfo
R=pathlib.Path(__file__).resolve().parents[1];S=R.parent/'capitals-recovery/amsterdam';O=R/'data/capitals-20261028';raw=json.loads((S/'amsterdam-capital-candidates-20261028.json').read_text());extra=json.loads((S.parent/'amsterdam-exhibitions/normalized-programmes.json').read_text());TZ='Europe/Amsterdam'
raw['windowStart']=raw['horizon']['start'];raw['windowEnd']=raw['horizon']['end'];raw['holdsAndExclusions']=[r for r in raw['programmes'] if r['publicationStatus']!='ready']+extra['holds'];raw['programmes']=[r for r in raw['programmes'] if r['publicationStatus']=='ready']+extra['programmes']

for r in list(raw['programmes']):
 if r['sourceId'] in ['9407d813-e791-4c97-bbe5-11bb8384a4a5','9e43b52e-7201-49f4-83d8-ca139c45beec']:
  raw['programmes'].remove(r);raw['holdsAndExclusions'].append({**r,'publicationStatus':'held_for_recheck','holdReason':'Amstel1 event address conflict Waterlooplein4C versus6, 100m apart. Own page403; no bypass. Exact BAG points cannot resolve programme location.'})
raw['amstel1HoldDelta']=json.loads((S/'amstel1-hold-delta.json').read_text())
def key(x):return hashlib.sha256(x.encode()).hexdigest()[:16]
p={'cityId':'amsterdam','checkedAt':raw['checkedAt'],'window':{'startDate':raw['windowStart'],'endDate':raw['windowEnd']},'coverage':'Fresh initial Amsterdam selection. 43 actual linked calendar pages were traversed; totals changed from1205 to686 and final page43 was empty, leaving670 unique observed cards. This is incomplete/inconsistent pagination, not proof of full catalogue coverage. 302 selected timed detail pages and separate temporary-exhibition sources were curated. Independent BAG address points and named organizer pins are explicitly distinguished from entrances. Sold-out, school/private, permanent-attraction, outside-city and conflicting records remain held. Museum ranges use actual visiting schedules, not invented performances. Public Telegram posts and chat profiles have separate access limitations.','events':[],'places':[],'sources':[],'pending':copy.deepcopy(raw['holdsAndExclusions'])};places={};seen=set()
for r in raw['programmes']:
 pin=r['verifiedCoordinates'];assert pin;ed={'summary':r['summaryEn'],'restrictions':r.get('restrictions') or ''};vid='amsterdam-venue-'+key(str(round(pin['latitude'],7))+'|'+str(round(pin['longitude'],7)));pr=r['price'];amount=pr.get('standard');minimum=amount is not None and amount>0 and pr.get('max') is not None and pr['max']>amount;note=pr.get('text') or '';access=ed.get('restrictions') or ''
 if r.get('fees'):access+=' '+r['fees']
 if r.get('freeAdmissionDates'):access+=' Free admission dates: '+', '.join(r['freeAdmissionDates'])+'.'
 b={'title':r['title'],'titleEn':r['title'],'venue':r['venue'],'venueEn':r['venue'],'venueId':vid,'address':r['address'],'category':({'practice':'workshop'}.get(r['normalizedCategory'],r['normalizedCategory'])),'lat':pin['latitude'],'lng':pin['longitude'],'coordinateSource':pin['sourceUrl'],'coordinatePrecision':'venue_approximate','coordinateEvidence':pin.get('evidence','Exact source address matched to named venue/address-object point.')+'; '+pin['precision'],'source':'Amsterdam municipal / official organizer','sourceUrl':r['sourceUrl'],'sourceURLs':list(dict.fromkeys([r['sourceUrl']]+r.get('additionalEvidenceUrls',[]))),'ticketUrl':r.get('ticketUrl'),'checkedAt':r['checkedAt'],'yearEvidence':str(r['dateEvidence'])+' '+r['sourceUrl'],'currency':'EUR','timezone':TZ,'price':amount,'min':minimum,'priceMax':(0 if amount==0 else pr.get('max')),'priceNote':note or ('Free admission; conditions apply.' if amount==0 else 'Additional mandatory fees not confirmed.'),'priceNoteEn':note or ('Free admission; conditions apply.' if amount==0 else 'Additional mandatory fees not confirmed.'),'language':r.get('eventLanguage'),'status':'scheduled','description':ed['summary'],'descriptionEn':ed['summary'],'admission':access.strip(),'admissionEn':access.strip(),'programmeId':r['sourceId']}
 places.setdefault(vid,{**{k:b[k] for k in ['address','lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence','source','sourceUrl','checkedAt','currency','timezone']},'id':vid,'title':r['venue'],'titleEn':r['venue'],'category':'city','operatingStatusVerified':False,'openingNote':'Venue identified in a current verified programme; ordinary visiting hours not independently confirmed.','openingNoteEn':'Venue identified in a current verified programme; ordinary visiting hours not independently confirmed.'})
 if not r['occurrences']:
  x=copy.deepcopy(b);hoursSource=r.get('openingHoursSource') or r['sourceUrl'];schedule={s['date']:{'start':s['startTime'],'end':s['endTime']} for s in (r.get('visitSchedule') or [])};x.update(id='amsterdam-'+key(r['sourceId']+'|'+r['startDate']),date=r['startDate'],endDate=r['endDate'],dateType='published_interval',time=None,end=None,openingHoursKnown=bool(schedule),openingHoursUnknown=not bool(schedule))
  if schedule:x.update(visitSchedule=schedule,openingHoursSource=hoursSource,visitScheduleSource=hoursSource)
  x['openingNote']=r.get('openingNote') or ('Date-specific verified visiting windows; not performance sessions.' if schedule else 'Visiting hours not confirmed; do not interpret as open now.');x['openingNoteEn']=x['openingNote'];p['events'].append(x)

 for o in r['occurrences']:
  x=copy.deepcopy(b);x.update(id='amsterdam-'+key(r['sourceId']+'|'+o['date']+'|'+o['startTime']),date=o['date'],time=o['startTime'],end=o.get('endTime'),language=o.get('eventLanguage') or r.get('eventLanguage'),startAt=datetime.datetime.fromisoformat(o['date']+'T'+o['startTime']).replace(tzinfo=ZoneInfo(TZ)).isoformat())
  if o.get('endTime'):
   dt=datetime.datetime.fromisoformat((o.get('endDate') or o['date'])+'T'+o['endTime']).replace(tzinfo=ZoneInfo(TZ))
   if dt<=datetime.datetime.fromisoformat(x['startAt']):dt+=datetime.timedelta(days=1)
   x['endAt']=dt.isoformat()
  if o.get('price'):
   q=o['price'];x['price']=q.get('standard');x['min']=q.get('standard') is not None and q.get('max') is not None and q['max']>q['standard'];x['priceMax']=q.get('max');x['priceNote']=q.get('text') or q.get('note') or '';x['priceNoteEn']=x['priceNote']
   if q.get('fees'):x['admission']+=' '+q['fees'];x['admissionEn']=x['admission']
  if o.get('sourceUrl'):x['sourceUrl']=o['sourceUrl'];x['sourceURLs']=list(dict.fromkeys(x['sourceURLs']+[o['sourceUrl']]))
  if o.get('ticketInformationUrl'):x['ticketUrl']=o['ticketInformationUrl']
  if o.get('venueDetail'):x['hall']=o['venueDetail'];x['hallEn']=o['venueDetail']
  if o.get('doorsTime'):x['admission']+=' Doors '+o['doorsTime']+'.';x['admissionEn']=x['admission']
  p['events'].append(x)
 for u in b['sourceURLs']:
  if not u.startswith('https://') or u in seen:continue
  seen.add(u);p['sources'].append({'id':'amsterdam-source-'+key(u),'name':'Read evidence: '+r['title'],'url':u,'status':'read_programme_or_venue_evidence','checkedAt':r['checkedAt'],'note':'Selected programme, venue or linked primary evidence. Not a complete import; access limitations remain in the research audit.'})
p['places']=list(places.values())
tg=json.loads((S/'telegram-audit.json').read_text())
for t in tg['sources']:
 u=t['url']
 if u not in seen:p['sources'].append({'id':'amsterdam-source-'+key(u),'name':'Public Telegram source review','url':u,'status':t['status'],'checkedAt':tg['checkedAt'],'note':t.get('note') or 'Public announcement or profile check only; incomplete candidates remain held. No joining or messaging.'});seen.add(u)
u='https://www.iamsterdam.com/en/whats-on/calendar';p['sources'].append({'id':'amsterdam-source-'+key(u),'name':'I amsterdam official calendar','url':u,'status':'partial_inconsistent_pagination','checkedAt':json.loads((S/'listing-audit.json').read_text())[-1]['checkedAt'],'note':'43 actual linked pages; initial1205/current686 totals differ, finalpage43empty.670unique observedcards; not complete catalogue.'})
for name,obj in [('amsterdam-packet',p),('amsterdam-research',raw),('amsterdam-exhibition-research',extra)]: (O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
r=json.loads((R/'data/city-expansion/registry.json').read_text())
if not any(c['id']=='amsterdam' for c in r['newCities']):
 c=copy.deepcopy(r['newCities'][-1]);c.update(id='amsterdam',canonicalCity='Amsterdam',countryCode='NL',name={'ru':'Амстердам','en':'Amsterdam','de':'Amsterdam'},ianaTimezone=TZ,path='amsterdam/index.html',currency='EUR',nameLocativeRu='Амстердаме',eventLanguages=[{'code':'EN','label':'Английский','terms':['English','английский']},{'code':'NL','label':'Нидерландский','terms':['Dutch','Nederlands','нидерландский']}]);r['newCities'].append(c);r['countries']['NL']={'ru':'Нидерланды','en':'Netherlands','de':'Niederlande'};(R/'data/city-expansion/registry.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(len(p['events']),len(p['places']),len(p['sources']),len(p['pending']))
