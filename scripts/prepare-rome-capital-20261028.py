import json,pathlib,copy,hashlib,datetime
from zoneinfo import ZoneInfo
R=pathlib.Path(__file__).resolve().parents[1];S=R.parent/'capitals-wave3/rome';O=R/'data/capitals-20261028';TZ='Europe/Rome';raw=json.loads((S/'rome-capital-candidates-20261028.json').read_text());key=lambda s:hashlib.sha256(s.encode()).hexdigest()[:14]
p={'cityId':'rome','checkedAt':raw['checkedAt'],'window':{'startDate':'2026-10-28','endDate':'2026-11-26'},'coverage':'Initial verified Rome selection, not a complete city agenda. Corrected municipal overlap calendar traversed23 real pages and841 unique cards;192 full announcement pages were retrieved before the transport reported403. A stop-handler defect continued309 failed requests without content; the host is now stopped and no failed record is imported. Selected readable municipal bodies plus independent official opera, concert and museum programmes were curated. Exhibition visiting windows are separate from sessions; unknown prices and finishes remain unknown. Telegram access was unavailable and zero Telegram events imported. Some dates/categories remain sparse, including no individual timed programme on November3 in this selection.','events':[],'places':[],'sources':[],'pending':copy.deepcopy(raw['held'])+[{**a,'reason':'Unread detail attempt after source transport failure; not an imported event.'} for a in raw['unreadDetailAttempts']]};places={};seen=set()
def source(u,checked,status,note):
 if not u or not u.startswith('https://') or u in seen:return
 seen.add(u);p['sources'].append({'id':'rome-source-'+key(u),'name':'Rome source: '+u.split('/')[2],'url':u,'status':status,'checkedAt':checked,'note':note})
def setprice(x,pr):
 pr=pr or {};amount=pr.get('standard');minimum=False
 if amount is None and pr.get('min') is not None:amount=pr['min'];minimum=True
 note=pr.get('text') or '';x.update(price=amount,min=minimum,priceMax=pr.get('max'),priceNote=note,priceNoteEn=note)
for r in raw['programmes']:
 assert r['status']=='candidate_checked_not_published' and not r.get('cancelled') and not r.get('soldOut')
 co=r['verifiedCoordinates'];vid='rome-venue-'+key(str(co['latitude'])+'|'+str(co['longitude']));ad=' '.join(str(x) for x in [r.get('restrictions'),r.get('accessEn'),r.get('addressNote')] if x);summary=r.get('summaryEn') or r.get('summary');dateev=r.get('dateEvidence') or {'method':'Explicit full2026 event date or temporary exhibition range in the read museum/organizer source.'};checked=r.get('sourceCheckedAt') or r['checkedAt']
 b={'title':r['title'],'titleEn':r['title'],'venue':r['venue'],'venueEn':r['venue'],'venueId':vid,'address':r['address'],'category':r['normalizedCategory'],'lat':co['latitude'],'lng':co['longitude'],'coordinateSource':co['sourceUrl'],'coordinatePrecision':'venue_approximate','coordinateEvidence':co['precision']+'; '+co.get('evidence',''),'source':'Rome municipal / official organizer','sourceUrl':r['sourceUrl'],'checkedAt':checked,'yearEvidence':(dateev.get('method') or json.dumps(dateev,ensure_ascii=False)) if isinstance(dateev,dict) else str(dateev),'currency':'EUR','timezone':TZ,'price':None,'status':'scheduled','description':summary,'descriptionEn':summary,'admission':ad,'admissionEn':ad,'programmeId':r['sourceId'],'ticketUrl':r.get('ticketUrl'),'language':r.get('eventLanguage'),'hall':r.get('hall'),'hallEn':r.get('hall')};setprice(b,r.get('price'))
 if r.get('fees'):b['priceNote']=b['priceNoteEn']=' '.join([b['priceNote'],str(r['fees'])])
 if b['price']==0 and not b['priceNote']:b['priceNote']=b['priceNoteEn']=ad or 'Free admission explicitly stated in the read programme.'
 places.setdefault(vid,{**{k:b[k] for k in ['address','lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence','source','sourceUrl','checkedAt','currency','timezone']},'id':vid,'title':r['venue'].split(' — ')[0],'titleEn':r['venue'].split(' — ')[0],'category':'city','operatingStatusVerified':False,'openingNote':'Named programme venue or campus; ordinary public hours and exact indoor hall entrance are not confirmed.','openingNoteEn':'Named programme venue or campus; ordinary public hours and exact indoor hall entrance are not confirmed.'})
 source(r['sourceUrl'],checked,'read_full_selected_programme',r.get('sourceType','Official event source')+'; selected facts, not complete host coverage.')
 source(co['sourceUrl'],co.get('checkedAt') or checked,'named_venue_coordinate_evidence',co['precision'])
 for u in r.get('additionalEvidenceUrls',[])+r.get('accessEvidenceUrls',[]):source(u,checked,'programme_evidence_reference','Referenced in the curated programme; independent fetch/review scope and timestamp are retained in research audit, not implied by this row.')
 if not r['occurrences']:
  vs=r.get('visitSchedule') or [];schedule={o['date']:{'start':o['startTime'],'end':o['endTime']} for o in vs};x=copy.deepcopy(b);x.update(id='rome-'+r['sourceId'].replace(':','-'),date=r['startDate'],endDate=r['endDate'],dateType='published_interval',time=None,end=None,openingHoursKnown=bool(schedule),openingHoursUnknown=not bool(schedule))
  if schedule:x.update(openingHoursSource=r.get('openingHoursSource') or r['sourceUrl'],visitSchedule=schedule)
  if r['sourceId'] in ['rome-cultura-elvi-ratti-aurea','rome-node-177428']:
   x['priceLabel']=x['priceLabelEn']='4 Nov free; other dates see conditions';x['priceNote']=x['priceNoteEn']=x['priceNote']+' Museum-wide free opening November4 confirmed; ordinary admission and concessions differ on other dates.'
  p['events'].append(x)
 for o in r['occurrences']:
  x=copy.deepcopy(b);x.update(id='rome-'+r['sourceId'].replace(':','-')+'-'+o['date'].replace('-','')+'-'+o['startTime'].replace(':',''),date=o['date'],time=o['startTime'],end=o.get('endTime'),startAt=datetime.datetime.fromisoformat(o['date']+'T'+o['startTime']).replace(tzinfo=ZoneInfo(TZ)).isoformat(),sourceUrl=o.get('sourceUrl') or r['sourceUrl'],ticketUrl=o.get('ticketUrl') or r.get('ticketUrl'))
  if o.get('price') is not None:setprice(x,o['price'])
  if r.get('durationMinutes'):x['durationMinutes']=r['durationMinutes']
  if x['end']:
   dt=datetime.datetime.fromisoformat((o.get('endDate') or o['date'])+'T'+x['end']).replace(tzinfo=ZoneInfo(TZ))
   if dt<=datetime.datetime.fromisoformat(x['startAt']):dt+=datetime.timedelta(days=1)
   x['endAt']=dt.isoformat()
  p['events'].append(x)
p['places']=list(places.values())
for s in json.loads((R.parent/'capitals-wave3/telegram/audit.json').read_text()):
 if s['city']=='rome':source(s['url'],s['checkedAt'],s['status'],s['reason'])
source('https://www.turismoroma.it/it/romalive',raw['checkedAt'],'partial_review_transport_stopped','23 overlap pages841cards,192 full details;309 unread failed requests retained; not complete editorial coverage. Check exact request times in raw audit.')
for name,obj in [('rome-packet',p),('rome-research',raw)]:(O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
r=json.loads((R/'data/city-expansion/registry.json').read_text())
if not any(c['id']=='rome' for c in r['newCities']):
 c=copy.deepcopy(r['newCities'][-1]);c.update(id='rome',canonicalCity='Rome',countryCode='IT',name={'ru':'Рим','en':'Rome','de':'Rom'},ianaTimezone=TZ,path='rome/index.html',currency='EUR',nameLocativeRu='Риме',eventLanguages=[{'code':'IT','label':'Итальянский','terms':['Italian','итальянский']},{'code':'EN','label':'Английский','terms':['English','английский']}]);r['newCities'].append(c);r['countries']['IT']={'ru':'Италия','en':'Italy','de':'Italien'};(R/'data/city-expansion/registry.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(len(p['events']),len(p['places']),len(p['sources']),len(p['pending']))
