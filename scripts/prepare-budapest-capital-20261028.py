import json,pathlib,copy,hashlib,datetime
from zoneinfo import ZoneInfo
R=pathlib.Path(__file__).resolve().parents[1];S=R.parent/'capitals-wave3/budapest';O=R/'data/capitals-20261028';TZ='Europe/Budapest';raw=json.loads((S/'canonical-packet.json').read_text());key=lambda s:hashlib.sha256(s.encode()).hexdigest()[:14]
p={'cityId':'budapest','checkedAt':raw['asOf'],'window':{'startDate':'2026-10-28','endDate':'2026-11-26'},'coverage':' '.join(raw['limitations']),'events':[],'places':[],'sources':[],'pending':copy.deepcopy(raw['holds'])};places={};seen=set()
def source(u,checked,status,note):
 if not u or not u.startswith('https://') or u in seen:return
 seen.add(u);p['sources'].append({'id':'budapest-source-'+key(u),'name':'Budapest source: '+u.split('/')[2],'url':u,'status':status,'checkedAt':checked,'note':note})
def setprice(x,pr):
 pr=pr or {};amount=pr.get('standard');minimum=False
 if amount is None and pr.get('min') is not None:amount=pr['min'];minimum=True
 note=pr.get('text') or '';unit=pr.get('unit');note+='; price unit: '+unit if unit else '';
 if unit and unit not in ['ticket','adult']:amount=None;minimum=False
 x.update(price=amount,min=minimum,priceMax=pr.get('max'),priceNote=note,priceNoteEn=note)
for r in raw['programmes']:
 assert not r.get('cancelled') and not r.get('soldOut')
 co=r['verifiedCoordinates'];vid='budapest-venue-'+key(str(co['latitude'])+'|'+str(co['longitude']));ad=' '.join(str(x) for x in [r.get('restrictions'),r.get('accessEn'),r.get('addressNote')] if x);summary=r.get('summaryEn') or r.get('summary');dateev=r.get('dateEvidence') or {'method':'Explicit full2026 event date or temporary exhibition range in the read museum/organizer source.'};checked=r.get('sourceCheckedAt') or r['checkedAt']
 b={'title':r['title'],'titleEn':r['title'],'venue':r['venue'],'venueEn':r['venue'],'venueId':vid,'address':r['address'],'category':{'exhibition':'art','cinema':'film','tour':'city','festival':'city','meetup':'talk'}.get(r['normalizedCategory'],r['normalizedCategory']),'lat':co['latitude'],'lng':co['longitude'],'coordinateSource':co['sourceUrl'],'coordinatePrecision':'venue_approximate','coordinateEvidence':co['precision']+'; '+co.get('evidence',''),'source':'We Love Budapest editorial agenda' if 'welovebudapest.com' in r['sourceUrl'] else 'Budapest official organizer','sourceUrl':r['sourceUrl'],'checkedAt':checked,'yearEvidence':(dateev.get('method') or json.dumps(dateev,ensure_ascii=False)) if isinstance(dateev,dict) else str(dateev),'currency':'HUF','timezone':TZ,'price':None,'status':'scheduled','description':summary,'descriptionEn':summary,'admission':ad,'admissionEn':ad,'programmeId':r['sourceId'],'ticketUrl':r.get('ticketUrl'),'language':r.get('eventLanguage'),'hall':r.get('hall') or r.get('room'),'hallEn':r.get('hall') or r.get('room')};setprice(b,r.get('price'))
 if r.get('fees'):b['priceNote']=b['priceNoteEn']=' '.join([b['priceNote'],str(r['fees'])])
 if b['price']==0 and not b['priceNote']:b['priceNote']=b['priceNoteEn']=ad or 'Free admission explicitly stated in the read programme.'
 places.setdefault(vid,{**{k:b[k] for k in ['address','lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence','source','sourceUrl','checkedAt','currency','timezone']},'id':vid,'title':r['venue'].split(' — ')[0],'titleEn':r['venue'].split(' — ')[0],'category':'city','operatingStatusVerified':False,'openingNote':'Named programme venue or campus; ordinary public hours and exact indoor hall entrance are not confirmed.','openingNoteEn':'Named programme venue or campus; ordinary public hours and exact indoor hall entrance are not confirmed.'})
 source(r['sourceUrl'],checked,'read_full_selected_programme',('Editorial city agenda, not an official organizer' if 'welovebudapest.com' in r['sourceUrl'] else r.get('sourceType','Official event source'))+'; selected facts, not complete host coverage.')
 source(co['sourceUrl'],co.get('checkedAt') or checked,'named_venue_coordinate_evidence',co['precision'])
 for u in r.get('additionalEvidenceUrls',[])+r.get('accessEvidenceUrls',[]):source(u,checked,'programme_evidence_reference','Referenced in the curated programme; independent fetch/review scope and timestamp are retained in research audit, not implied by this row.')
 if not r['occurrences']:
  vs=r.get('visitSchedule') or [];schedule={o['date']:{'start':o['startTime'],'end':o['endTime']} for o in vs};x=copy.deepcopy(b);x.update(id='budapest-'+r['sourceId'].replace(':','-'),date=r['startDate'],endDate=r['endDate'],dateType='published_interval',time=None,end=None,openingHoursKnown=bool(schedule),openingHoursUnknown=not bool(schedule))
  if schedule:x.update(openingHoursSource=r.get('openingHoursSource') or r['sourceUrl'],visitSchedule=schedule)
  p['events'].append(x)
 for o in r['occurrences']:
  x=copy.deepcopy(b);x.update(id='budapest-'+r['sourceId'].replace(':','-')+'-'+o['date'].replace('-','')+'-'+o['startTime'].replace(':',''),date=o['date'],time=o['startTime'],end=o.get('endTime'),startAt=datetime.datetime.fromisoformat(o['date']+'T'+o['startTime']).replace(tzinfo=ZoneInfo(TZ)).isoformat(),sourceUrl=o.get('sourceUrl') or r['sourceUrl'],ticketUrl=o.get('ticketUrl') or r.get('ticketUrl'))
  if o.get('price') is not None:setprice(x,o['price'])
  if r.get('durationMinutes'):x['durationMinutes']=r['durationMinutes']
  if x['end']:
   dt=datetime.datetime.fromisoformat((o.get('endDate') or o['date'])+'T'+x['end']).replace(tzinfo=ZoneInfo(TZ))
   if dt<=datetime.datetime.fromisoformat(x['startAt']):dt+=datetime.timedelta(days=1)
   x['endAt']=dt.isoformat()
  p['events'].append(x)
p['places']=list(places.values())
for s in json.loads((R.parent/'capitals-wave3/telegram/audit.json').read_text()):
 if s['city']=='budapest':source(s['url'],s['checkedAt'],s['status'],s['reason'])
source('https://welovebudapest.com/en/events/',raw['asOf'],'partial_review_rate_limit_stopped','Editorial agenda: prior19 EN and74 HU details read before429; remaining18 unread. No retry. Actual fetch times retained in research audit.')
for name,obj in [('budapest-packet',p),('budapest-research',raw)]:(O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
r=json.loads((R/'data/city-expansion/registry.json').read_text())
if not any(c['id']=='budapest' for c in r['newCities']):
 c=copy.deepcopy(r['newCities'][-1]);c.update(id='budapest',canonicalCity='Budapest',countryCode='HU',name={'ru':'Будапешт','en':'Budapest','de':'Budapest'},ianaTimezone=TZ,path='budapest/index.html',currency='HUF',nameLocativeRu='Будапеште',eventLanguages=[{'code':'HU','label':'Венгерский','terms':['Hungarian','венгерский']},{'code':'EN','label':'Английский','terms':['English','английский']}]);r['newCities'].append(c);r['countries']['HU']={'ru':'Венгрия','en':'Hungary','de':'Ungarn'};(R/'data/city-expansion/registry.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(len(p['events']),len(p['places']),len(p['sources']),len(p['pending']))
