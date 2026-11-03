import json,pathlib,copy,hashlib,datetime
from zoneinfo import ZoneInfo
R=pathlib.Path(__file__).resolve().parents[1];S=R.parent/'capitals-wave3/brussels';O=R/'data/capitals-20261028';TZ='Europe/Brussels';raw=json.loads((S/'canonical-combined-candidate-v1.json').read_text());key=lambda s:hashlib.sha256(s.encode()).hexdigest()[:14]
original=copy.deepcopy(raw);sm={x['sourceId']:x for x in raw['sources']};now=datetime.datetime.now(datetime.timezone.utc).isoformat()
def normalizePrice(pr):
 pr=copy.deepcopy(pr or {});pr['min']=pr.get('min',pr.get('fromAmount'));pr['text']=pr.get('text') or '; '.join(str(k)+': '+str(v) for k,v in pr.items() if v is not None)
 if pr.get('scope','').startswith('child workshop'):pr['standard']=None;pr['min']=None
 return pr
for r in raw['programmes']:
 sr=sm[r['sourceId']];r.update(sourceUrl=sr['url'],checkedAt=sr.get('checkedAt') or now,sourceCheckedAt=sr.get('checkedAt'),status='candidate_checked_not_published',normalizedCategory={'theatre/dance':'theatre','talk/performance':'talk','exhibition':'art','festival/music':'music','family/workshop':'kids','lecture':'talk','guided tour':'city','family/exhibition/workshop':'kids'}.get(r['category'],r['category']),price=normalizePrice(r.get('price')))
 r['dateEvidence']='Dated2026 programme in read full primary source; exact source fetch time '+(sr.get('checkedAt') or 'not retained; original source audit preserves read window and this timestamp is local evidence review')
 co=r['verifiedCoordinates'];cs=sm.get(co.get('sourceId'),{});co['sourceUrl']=co.get('sourceUrl') or cs['url'];co['checkedAt']=co.get('checkedAt') or cs.get('checkedAt') or now
 for o in r.get('occurrences',[]):
  os=sm.get(o.get('sourceId'),sr);o['sourceUrl']=sr['url'];o['ticketUrl']=os['url'] if os['url']!=sr['url'] else None;o['price']=normalizePrice(o.get('price') or r['price'])
  o['hall']=o.get('room');o['admission']=' '.join(x for x in [r.get('restrictions'),r.get('accessEn'),o.get('restrictions')] if x)
raw['checkedAt']=now;raw['held']=json.loads((S/'audit/combined-disposition-delta-v1.json').read_text())['dispositions'];raw['unreadDetailAttempts']=[]
p={'cityId':'brussels','checkedAt':raw['checkedAt'],'window':{'startDate':'2026-10-28','endDate':'2026-11-26'},'coverage':'Selective Brussels programme across nine named venues and several districts, not comprehensive city coverage. Broad official/municipal calendars were read only to the documented reachable depth; stale/blocked remainder retained separately.25actualsessions plus2realexhibitions; visiting windows are not performances. Prices retain concession/package distinctions. Exact fetch timestamps missing for some full web reads are explicitly flagged; local evidence review is not a new source fetch. Telegram unavailable,0imports.','events':[],'places':[],'sources':[],'pending':copy.deepcopy(raw['held'])+[{**a,'reason':'Unread detail attempt after source transport failure; not an imported event.'} for a in raw['unreadDetailAttempts']]};places={};seen=set()
def source(u,checked,status,note):
 if not u or not u.startswith('https://') or u in seen or not checked:return
 seen.add(u);p['sources'].append({'id':'brussels-source-'+key(u),'name':'Brussels source: '+u.split('/')[2],'url':u,'status':status,'checkedAt':checked,'note':note})
def setprice(x,pr):
 pr=pr or {};amount=pr.get('standard');minimum=False
 if amount is None and pr.get('min') is not None:amount=pr['min'];minimum=True
 note=pr.get('text') or '';x.update(price=amount,min=minimum,priceMax=pr.get('max'),priceNote=note,priceNoteEn=note)
for r in raw['programmes']:
 assert r['status']=='candidate_checked_not_published' and not r.get('cancelled') and not r.get('soldOut')
 co=r['verifiedCoordinates'];vid='brussels-venue-'+key(str(co['latitude'])+'|'+str(co['longitude']));ad=' '.join(str(x) for x in [r.get('restrictions'),r.get('accessEn'),r.get('addressNote'),r.get('addressCaveat')] if x);summary=r.get('summaryEn') or r.get('summary');dateev=r.get('dateEvidence') or {'method':'Explicit full2026 event date or temporary exhibition range in the read museum/organizer source.'};checked=r.get('sourceCheckedAt') or r['checkedAt']
 b={'title':r['title'],'titleEn':r['title'],'venue':r['venue'],'venueEn':r['venue'],'venueId':vid,'address':r['address'],'category':r['normalizedCategory'],'lat':co['latitude'],'lng':co['longitude'],'coordinateSource':co['sourceUrl'],'coordinatePrecision':'venue_approximate','coordinateEvidence':co['precision']+'; '+co.get('evidence',''),'source':'Brussels official organizer','sourceUrl':r['sourceUrl'],'checkedAt':checked,'yearEvidence':(dateev.get('method') or json.dumps(dateev,ensure_ascii=False)) if isinstance(dateev,dict) else str(dateev),'currency':'EUR','timezone':TZ,'price':None,'status':'scheduled','description':summary,'descriptionEn':summary,'admission':ad,'admissionEn':ad,'programmeId':r['sourceId'],'ticketUrl':r.get('ticketUrl'),'language':r.get('eventLanguage'),'hall':r.get('hall'),'hallEn':r.get('hall')};setprice(b,r.get('price'))
 if r.get('fees'):b['priceNote']=b['priceNoteEn']=' '.join([b['priceNote'],str(r['fees'])])
 if b['price']==0 and not b['priceNote']:b['priceNote']=b['priceNoteEn']=ad or 'Free admission explicitly stated in the read programme.'
 places.setdefault(vid,{**{k:b[k] for k in ['address','lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence','source','sourceUrl','checkedAt','currency','timezone']},'id':vid,'title':r['venue'].split(' — ')[0],'titleEn':r['venue'].split(' — ')[0],'category':'city','operatingStatusVerified':False,'openingNote':'Named programme venue or campus; ordinary public hours and exact indoor hall entrance are not confirmed.','openingNoteEn':'Named programme venue or campus; ordinary public hours and exact indoor hall entrance are not confirmed.'})
 source(r['sourceUrl'],checked,'read_full_selected_programme',r.get('sourceType','Official event source')+'; selected facts, not complete host coverage. '+('Source fetch timestamp not retained; checkedAt is local review of the recorded source evidence, not a fresh fetch.' if r.get('sourceCheckedAt') is None else ''))
 source(co['sourceUrl'],co.get('checkedAt') or checked,'named_venue_coordinate_evidence',co['precision'])
 for u in r.get('additionalEvidenceUrls',[])+r.get('accessEvidenceUrls',[]):source(u,checked,'programme_evidence_reference','Referenced in the curated programme; independent fetch/review scope and timestamp are retained in research audit, not implied by this row.')
 if not r['occurrences']:
  vs=r.get('visitSchedule') or [];schedule={o['date']:{'start':o['startTime'],'end':o['endTime']} for o in vs};x=copy.deepcopy(b);x.update(id='brussels-'+r['sourceId'].replace(':','-'),date=r['startDate'],endDate=r['endDate'],dateType='published_interval',time=None,end=None,openingHoursKnown=bool(schedule),openingHoursUnknown=not bool(schedule))
  if r.get('additionalOpeningWindows'):x['additionalOpeningWindows']=copy.deepcopy(r['additionalOpeningWindows'])
  if schedule:x.update(openingHoursSource=r.get('openingHoursSource') or r['sourceUrl'],visitSchedule=schedule)
  p['events'].append(x)
 for o in r['occurrences']:
  x=copy.deepcopy(b);x.update(id='brussels-'+r['sourceId'].replace(':','-')+'-'+o['date'].replace('-','')+'-'+o['startTime'].replace(':',''),date=o['date'],time=o['startTime'],end=o.get('endTime'),startAt=datetime.datetime.fromisoformat(o['date']+'T'+o['startTime']).replace(tzinfo=ZoneInfo(TZ)).isoformat(),sourceUrl=o.get('sourceUrl') or r['sourceUrl'],ticketUrl=o.get('ticketUrl') or r.get('ticketUrl'))
  if o.get('price') is not None:setprice(x,o['price'])
  x['hall']=x['hallEn']=o.get('hall');x['admission']=x['admissionEn']=o.get('admission') or x['admission']
  if o.get('availability'):
   x['availability']=o['availability']
   if o['availability']=='last_tickets':x['admission']=x['admissionEn']=x['admission']+' Only a few tickets remained at the recorded source review; check current availability.'
  if r.get('addressCaveat'):x['admission']=x['admissionEn']=x['admission']+' '+r['addressCaveat']
  if r.get('durationMinutes'):x['durationMinutes']=r['durationMinutes']
  if x['end']:
   dt=datetime.datetime.fromisoformat((o.get('endDate') or o['date'])+'T'+x['end']).replace(tzinfo=ZoneInfo(TZ))
   if dt<=datetime.datetime.fromisoformat(x['startAt']):dt+=datetime.timedelta(days=1)
   x['endAt']=dt.isoformat()
  p['events'].append(x)
p['places']=list(places.values())
for s in json.loads((R.parent/'capitals-wave3/telegram/audit.json').read_text()):
 if s['city']=='brussels':source(s['url'],s['checkedAt'],s['status'],s['reason'])
for sr in original['sources']:source(sr['url'],sr.get('checkedAt'),sr['status'],sr.get('checkedAtBasis') or 'Exact archived/read source details retained in originalresearch.')
for name,obj in [('brussels-packet',p),('brussels-research',raw)]:(O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
r=json.loads((R/'data/city-expansion/registry.json').read_text())
if not any(c['id']=='brussels' for c in r['newCities']):
 c=copy.deepcopy(r['newCities'][-1]);c.update(id='brussels',canonicalCity='Brussels',countryCode='BE',name={'ru':'Брюссель','en':'Brussels','de':'Brüssel'},ianaTimezone=TZ,path='brussels/index.html',currency='EUR',nameLocativeRu='Брюсселе',eventLanguages=[{'code':'FR','label':'Французский','terms':['French','французский']},{'code':'NL','label':'Нидерландский','terms':['Dutch','нидерландский']},{'code':'EN','label':'Английский','terms':['English','английский']}]);r['newCities'].append(c);r['countries']['BE']={'ru':'Бельгия','en':'Belgium','de':'Belgien'};(R/'data/city-expansion/registry.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(len(p['events']),len(p['places']),len(p['sources']),len(p['pending']))
