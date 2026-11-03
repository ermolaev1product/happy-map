import json,pathlib,copy,hashlib,datetime
from zoneinfo import ZoneInfo
R=pathlib.Path(__file__).resolve().parents[1];S=R.parent/'capitals-wave3/bucharest';O=R/'data/capitals-20261028';TZ='Europe/Bucharest';raw=json.loads((S/'reserve-delta/bucharest-combined-frozen-20261028.json').read_text());key=lambda s:hashlib.sha256(s.encode()).hexdigest()[:14]
delta=json.loads((S/'reserve-delta/price-unit-time-delta.json').read_text())
for r in raw['programmes']:
 r['normalizedCategory']={'exhibitions':'art','workshops':'workshop','dance':'theatre','conferences':'conference'}.get(r['normalizedCategory'],r['normalizedCategory']);r['status']='candidate_checked_not_published';r['hall']=r.get('room');r['visitSchedule']=r.get('visitingSlots') or [];r['summaryEn']=r['summary']
 if r['sourceId'] in delta['priceOverrides']:
  r['price']=copy.deepcopy(delta['priceOverrides'][r['sourceId']]['price'])
  for o in r['occurrences']+r['visitSchedule']:o['price']=copy.deepcopy(r['price'])
 for d in delta['occurrenceOverrides']:
  if d['sourceId']==r['sourceId']:
   for o in r['occurrences']:
    if all(o.get(k)==v for k,v in d['match'].items()):o.update(copy.deepcopy(d['set']))
 r['accessEn']=' '.join(str(n) for n in r.get('notes',[])) if isinstance(r.get('notes'),list) else (r.get('notes') or '')
 if r.get('registrationRequired'):r['accessEn']+=' Advance registration required.'
raw['held']=raw['holdsAndExclusions'];raw['appliedDelta']=delta
p={'cityId':'bucharest','checkedAt':raw['checkedAt'],'window':{'startDate':'2026-10-28','endDate':'2026-11-26'},'coverage':'Selective Bucharest launch from seven verified cultural venues: concerts, opera, theatre, family workshops, talks and temporary exhibitions.53actual sessions and4ranges; visiting windows are not performances. Primary organizer and ticket bodies were checked with unknown costs, tax conditions, ages, consent and room restrictions retained. Citywide catalogue coverage remains partial, east/south neighbourhoods and sport are weak, and not every date has a timed event. Four unverified presale minima are kept only as conditional notes; two doors/show corrections use actual21:00. A same-host stop error led to six post-denial MuzeulViu reads; all six and their derived facts are quarantined and excluded. Telegram unavailable, zero imports.','events':[],'places':[],'sources':[],'pending':copy.deepcopy(raw['held'])};places={};seen=set()
def source(u,checked,status,note):
 if not u or not u.startswith('https://') or u in seen:return
 seen.add(u);p['sources'].append({'id':'bucharest-source-'+key(u),'name':'Bucharest source: '+u.split('/')[2],'url':u,'status':status,'checkedAt':checked,'note':note})
def setprice(x,pr):
 pr=pr or {};amount=pr.get('standard');minimum=False
 if amount is None and pr.get('min') is not None:amount=pr['min'];minimum=True
 note=pr.get('text') or '';note+=(' Price unit: '+pr['unit']+'.') if pr.get('unit') else '';x.update(price=amount,min=minimum,priceMax=pr.get('max'),priceNote=note,priceNoteEn=note)
for r in raw['programmes']:
 assert r['status']=='candidate_checked_not_published' and not r.get('cancelled') and not r.get('soldOut')
 co=r['verifiedCoordinates'];vid='bucharest-venue-'+key(str(co['latitude'])+'|'+str(co['longitude']));ad=' '.join(str(x) for x in [r.get('restrictions'),r.get('accessEn'),r.get('addressNote')] if x);summary=r.get('summaryEn') or r.get('summary');dateev=r.get('dateEvidence') or {'method':'Explicit full2026 event date or temporary exhibition range in the read museum/organizer source.'};checked=r.get('sourceCheckedAt') or r['checkedAt']
 b={'title':r['title'],'titleEn':r['title'],'venue':r['venue'],'venueEn':r['venue'],'venueId':vid,'address':r['address'],'category':r['normalizedCategory'],'lat':co['latitude'],'lng':co['longitude'],'coordinateSource':co['sourceUrl'],'coordinatePrecision':'venue_approximate','coordinateEvidence':co['precision']+'; '+co.get('evidence',''),'source':'Bucharest municipal / official organizer','sourceUrl':r['sourceUrl'],'checkedAt':checked,'yearEvidence':(dateev.get('method') or json.dumps(dateev,ensure_ascii=False)) if isinstance(dateev,dict) else str(dateev),'currency':'RON','timezone':TZ,'price':None,'status':'scheduled','description':summary,'descriptionEn':summary,'admission':ad,'admissionEn':ad,'programmeId':r['sourceId'],'ticketUrl':r.get('ticketUrl'),'language':r.get('eventLanguage'),'hall':r.get('hall'),'hallEn':r.get('hall')};setprice(b,r.get('price'))
 if r.get('fees'):b['priceNote']=b['priceNoteEn']=' '.join([b['priceNote'],str(r['fees'])])
 if b['price']==0 and not b['priceNote']:b['priceNote']=b['priceNoteEn']=ad or 'Free admission explicitly stated in the read programme.'
 places.setdefault(vid,{**{k:b[k] for k in ['address','lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence','source','sourceUrl','checkedAt','currency','timezone']},'id':vid,'title':r['venue'].split(' — ')[0],'titleEn':r['venue'].split(' — ')[0],'category':'city','operatingStatusVerified':False,'openingNote':'Named programme venue or campus; ordinary public hours and exact indoor hall entrance are not confirmed.','openingNoteEn':'Named programme venue or campus; ordinary public hours and exact indoor hall entrance are not confirmed.'})
 source(r['sourceUrl'],checked,'read_full_selected_programme',r.get('sourceType','Official event source')+'; selected facts, not complete host coverage.')
 source(co['sourceUrl'],co.get('checkedAt') or checked,'named_venue_coordinate_evidence',co['precision'])
 for u in r.get('additionalEvidenceUrls',[])+r.get('accessEvidenceUrls',[]):source(u,checked,'programme_evidence_reference','Referenced in the curated programme; independent fetch/review scope and timestamp are retained in research audit, not implied by this row.')
 if not r['occurrences']:
  vs=r.get('visitSchedule') or [];schedule={o['date']:{'start':o['startTime'],'end':o['endTime']} for o in vs};x=copy.deepcopy(b);x.update(id='bucharest-'+r['sourceId'].replace(':','-'),date=r['startDate'],endDate=r['endDate'],dateType='published_interval',time=None,end=None,openingHoursKnown=bool(schedule),openingHoursUnknown=not bool(schedule))
  if schedule:x.update(openingHoursSource=r.get('openingHoursSource') or r['sourceUrl'],visitSchedule=schedule)
  p['events'].append(x)
 for o in r['occurrences']:
  x=copy.deepcopy(b);x.update(id='bucharest-'+r['sourceId'].replace(':','-')+'-'+o['date'].replace('-','')+'-'+o['startTime'].replace(':',''),date=o['date'],time=o['startTime'],end=o.get('endTime'),startAt=datetime.datetime.fromisoformat(o['date']+'T'+o['startTime']).replace(tzinfo=ZoneInfo(TZ)).isoformat(),sourceUrl=o.get('sourceUrl') or r['sourceUrl'],ticketUrl=o.get('ticketUrl') or r.get('ticketUrl'))
  if o.get('price') is not None:setprice(x,o['price'])
  if o.get('restrictions'):x['admission']=x['admissionEn']=x['admission']+' '+str(o['restrictions'])
  if o.get('room'):x['hall']=x['hallEn']=o['room']
  if o.get('doorsTime'):x['admission']=x['admissionEn']=x['admission']+' Doors '+o['doorsTime']+'; programme '+o['startTime']+'.'
  if o.get('availability'):x['availability']=o['availability']
  if o.get('timeSourceUrl'):x['yearEvidence']+=' Actual start corrected from full linked ticket prose: '+o['timeSourceUrl']
  if r.get('fees'):x['priceNote']=x['priceNoteEn']=x['priceNote']+' '+str(r['fees'])
  if r['sourceId']=='buc-control-veils':
   x['min']=True;x['priceLabel']=x['priceLabelEn']='95 RON + taxes';x['priceNote']=x['priceNoteEn']=x['priceNote']+' RON95 is the published base, not a verified all-in total.'
  if r.get('durationMinutes'):x['durationMinutes']=r['durationMinutes']
  if x['end']:
   dt=datetime.datetime.fromisoformat((o.get('endDate') or o['date'])+'T'+x['end']).replace(tzinfo=ZoneInfo(TZ))
   if dt<=datetime.datetime.fromisoformat(x['startAt']):dt+=datetime.timedelta(days=1)
   x['endAt']=dt.isoformat()
  p['events'].append(x)
p['places']=list(places.values())
for s in json.loads((R.parent/'capitals-wave3/telegram/audit.json').read_text()):
 if s['city']=='bucharest':source(s['url'],s['checkedAt'],s['status'],s['reason'])
for sr in raw['sourceAudit']:
 if 'muzeulviu.platformademediu.ro' not in sr['url']:source(sr['url'],sr.get('checkedAt'),'source_access_'+str(sr.get('status')),'HTTP/access audit, not an assertion that every page was manually curated; exact content scope and errors retained in research.')
for name,obj in [('bucharest-packet',p),('bucharest-research',raw)]:(O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
r=json.loads((R/'data/city-expansion/registry.json').read_text())
if not any(c['id']=='bucharest' for c in r['newCities']):
 c=copy.deepcopy(r['newCities'][-1]);c.update(id='bucharest',canonicalCity='Bucharest',countryCode='RO',name={'ru':'Бухарест','en':'Bucharest','de':'Bukarest'},ianaTimezone=TZ,path='bucharest/index.html',currency='RON',nameLocativeRu='Бухаресте',eventLanguages=[{'code':'RO','label':'Румынский','terms':['Romanian','румынский']},{'code':'EN','label':'Английский','terms':['English','английский']}]);r['newCities'].append(c);r['countries']['RO']={'ru':'Румыния','en':'Romania','de':'Rumänien'};(R/'data/city-expansion/registry.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(len(p['events']),len(p['places']),len(p['sources']),len(p['pending']))
