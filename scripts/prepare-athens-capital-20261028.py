import json,pathlib,copy,hashlib,datetime
from zoneinfo import ZoneInfo
R=pathlib.Path(__file__).resolve().parents[1];S=R.parent/'capitals-wave3/athens';O=R/'data/capitals-20261028';TZ='Europe/Athens';raw=json.loads((S/'combined/athens-combined-canonical-20261028.json').read_text());key=lambda s:hashlib.sha256(s.encode()).hexdigest()[:14]
p={'cityId':'athens','checkedAt':raw['checkedAt'],'window':{'startDate':'2026-10-28','endDate':'2026-11-26'},'coverage':'Selective Athens programme from readable official cultural venues across12physical locations, not a complete city agenda. Main city-wide sources were blocked and not bypassed; independent organizer calendars and museums provide verified concerts, theatre, cinema, family programmes, workshops, lectures and temporary exhibitions.202actual starts and4ranges; visiting windows are not performances. Several later dates have exhibitions but no individual timed session. Course fees and family bundles are not per-person/session prices. Unknown ends remain unknown. Telegram unavailable, zero imports.','events':[],'places':[],'sources':[],'pending':copy.deepcopy(raw['held'])};places={};seen=set()
def source(u,checked,status,note):
 if not u or not u.startswith('https://') or u in seen:return
 seen.add(u);p['sources'].append({'id':'athens-source-'+key(u),'name':'Athens source: '+u.split('/')[2],'url':u,'status':status,'checkedAt':checked,'note':note})
def setprice(x,pr):
 pr=pr or {};amount=pr.get('standard');minimum=False
 if amount is None and pr.get('min') is not None:amount=pr['min'];minimum=True
 note=pr.get('text') or '';extra={k:v for k,v in pr.items() if k not in ['standard','min','max','currency','text','sourcePricingText','sourceUrl'] and v is not None};note+=' '+json.dumps(extra,ensure_ascii=False) if extra else '';x.update(price=amount,min=minimum,priceMax=pr.get('max'),priceNote=note,priceNoteEn=note)
for r in raw['programmes']:
 if r['sourceId'] in ['nt-ritual','nt-omonoia']:
  for field in ['accessEn','restrictions']:
   if r.get(field):
    r[field]=r[field].replace('Booking fees not established.','').replace('booking fees not established.','').replace('Booking fees are not established.','')
  if r['sourceId']=='nt-ritual':r['accessEn']=(r.get('accessEn') or '')+' Visitor entrance from Menandrou Street; marker is the named Ziller building, not an exact entrance.'
  for occurrence in r['occurrences']:
   if occurrence.get('price'):
    occurrence['price']['text']=occurrence['price'].get('text','').replace('fees unknown.','').replace('Fees unknown.','')
 assert r['status']=='candidate_checked_not_published' and not r.get('cancelled') and not r.get('soldOut')
 co=r['verifiedCoordinates'];vid='athens-venue-'+key(str(co['latitude'])+'|'+str(co['longitude']));ad=' '.join(str(x) for x in [r.get('restrictions'),r.get('accessEn'),r.get('addressNote')] if x);summary=r.get('summaryEn') or r.get('summary');dateev=r.get('dateEvidence') or {'method':'Explicit full2026 event date or temporary exhibition range in the read museum/organizer source.'};checked=r.get('sourceCheckedAt') or r['checkedAt']
 b={'title':r['title'],'titleEn':r['title'],'venue':r['venue'],'venueEn':r['venue'],'venueId':vid,'address':r['address'],'category':r['normalizedCategory'],'lat':co['latitude'],'lng':co['longitude'],'coordinateSource':co['sourceUrl'],'coordinatePrecision':'venue_approximate','coordinateEvidence':co['precision']+'; '+co.get('evidence',''),'source':'Athens municipal / official organizer','sourceUrl':r['sourceUrl'],'checkedAt':checked,'yearEvidence':(dateev.get('method') or json.dumps(dateev,ensure_ascii=False)) if isinstance(dateev,dict) else str(dateev),'currency':'EUR','timezone':TZ,'price':None,'status':'scheduled','description':summary,'descriptionEn':summary,'admission':ad,'admissionEn':ad,'programmeId':r['sourceId'],'ticketUrl':r.get('ticketUrl'),'language':r.get('eventLanguage'),'hall':r.get('hall'),'hallEn':r.get('hall')};setprice(b,r.get('price'))
 if r.get('fees'):b['priceNote']=b['priceNoteEn']=' '.join([b['priceNote'],str(r['fees'])])
 details=[]
 for k in ['ageMinimum','ageMaximum','recommendedAgeMinimum','recommendedAgeMaximum','recommendedAgeMinimumMonths','recommendedAgeText','requiresSeriesBooking','bookingOpensDate','availability']:
  if r.get(k) is not None:details.append(k+': '+str(r[k]))
 if r.get('notes'):details.extend(str(n) for n in r['notes'])
 if details:b['admission']=b['admissionEn']=b['admission']+' '+ '; '.join(details)
 if b['price']==0 and not b['priceNote']:b['priceNote']=b['priceNoteEn']=ad or 'Free admission explicitly stated in the read programme.'
 places.setdefault(vid,{**{k:b[k] for k in ['address','lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence','source','sourceUrl','checkedAt','currency','timezone']},'id':vid,'title':r['venue'].split(' — ')[0],'titleEn':r['venue'].split(' — ')[0],'category':'city','operatingStatusVerified':False,'openingNote':'Named programme venue or campus; ordinary public hours and exact indoor hall entrance are not confirmed.','openingNoteEn':'Named programme venue or campus; ordinary public hours and exact indoor hall entrance are not confirmed.'})
 source(r['sourceUrl'],checked,'read_full_selected_programme',r.get('sourceType','Official event source')+'; selected facts, not complete host coverage.')
 source(co['sourceUrl'],co.get('checkedAt') or checked,'named_venue_coordinate_evidence',co['precision'])
 for u in r.get('additionalEvidenceUrls',[])+r.get('accessEvidenceUrls',[]):source(u,checked,'programme_evidence_reference','Referenced in the curated programme; independent fetch/review scope and timestamp are retained in research audit, not implied by this row.')
 if not r['occurrences']:
  vs=r.get('visitSchedule') or [];schedule={o['date']:{'start':o['startTime'],'end':o['endTime']} for o in vs};x=copy.deepcopy(b);x.update(id='athens-'+r['sourceId'].replace(':','-'),date=r['startDate'],endDate=r['endDate'],dateType='published_interval',time=None,end=None,openingHoursKnown=bool(schedule),openingHoursUnknown=not bool(schedule))
  if schedule:x.update(openingHoursSource=r.get('openingHoursSource') or r['sourceUrl'],visitSchedule=schedule)
  p['events'].append(x)
 for o in r['occurrences']:
  x=copy.deepcopy(b);x.update(id='athens-'+r['sourceId'].replace(':','-')+'-'+o['date'].replace('-','')+'-'+o['startTime'].replace(':',''),date=o['date'],time=o['startTime'],end=o.get('endTime'),startAt=datetime.datetime.fromisoformat(o['date']+'T'+o['startTime']).replace(tzinfo=ZoneInfo(TZ)).isoformat(),sourceUrl=o.get('sourceUrl') or r['sourceUrl'],ticketUrl=o.get('ticketUrl') or r.get('ticketUrl'))
  if o.get('price') is not None:setprice(x,o['price'])
  if o.get('surtitles'):x['admission']=x['admissionEn']=x['admission']+' Surtitles: '+o['surtitles']+'.'
  if o.get('availability'):x['availability']=o['availability'];x['admission']=x['admissionEn']=x['admission']+' Availability at source review: '+o['availability']+'.'
  if o.get('hall'):x['hall']=x['hallEn']=o['hall']
  if r.get('fees'):x['priceNote']=x['priceNoteEn']=x['priceNote']+' '+str(r['fees'])
  if o.get('fees'):x['priceNote']=x['priceNoteEn']=x['priceNote']+' '+str(o['fees'])
  if r.get('durationMinutes'):x['durationMinutes']=r['durationMinutes']
  if x['end']:
   dt=datetime.datetime.fromisoformat((o.get('endDate') or o['date'])+'T'+x['end']).replace(tzinfo=ZoneInfo(TZ))
   if dt<=datetime.datetime.fromisoformat(x['startAt']):dt+=datetime.timedelta(days=1)
   x['endAt']=dt.isoformat()
  p['events'].append(x)
p['places']=list(places.values())
for s in json.loads((R.parent/'capitals-wave3/telegram/audit.json').read_text()):
 if s['city']=='athens':source(s['url'],s['checkedAt'],s['status'],s['reason'])

for name,obj in [('athens-packet',p),('athens-research',raw)]:(O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
r=json.loads((R/'data/city-expansion/registry.json').read_text())
if not any(c['id']=='athens' for c in r['newCities']):
 c=copy.deepcopy(r['newCities'][-1]);c.update(id='athens',canonicalCity='Athens',countryCode='GR',name={'ru':'Афины','en':'Athens','de':'Athen'},ianaTimezone=TZ,path='athens/index.html',currency='EUR',nameLocativeRu='Афинах',eventLanguages=[{'code':'EL','label':'Греческий','terms':['Greek','греческий']},{'code':'EN','label':'Английский','terms':['English','английский']}]);r['newCities'].append(c);r['countries']['GR']={'ru':'Греция','en':'Greece','de':'Griechenland'};(R/'data/city-expansion/registry.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(len(p['events']),len(p['places']),len(p['sources']),len(p['pending']))
