import json,pathlib,copy,hashlib,datetime
from zoneinfo import ZoneInfo
R=pathlib.Path(__file__).resolve().parents[1];raw=json.loads((R.parent/'next-capitals/ankara/canonical-candidates.json').read_text());O=R/'data/capitals-20261029';TZ='Europe/Istanbul'
def key(s):return hashlib.sha256(s.encode()).hexdigest()[:14]
def txt(v):return v if isinstance(v,str) else json.dumps(v,ensure_ascii=False,separators=(',',':'))
p={'cityId':'ankara','checkedAt':raw['compiledAt'],'window':{'startDate':'2026-10-29','endDate':'2026-11-27'},'coverage':'Selected Ankara programmes: 98 full ticket announcements from 99 in-horizon leads in a 131-lead broad catalogue; only independently located venues imported. Not full city coverage. Multiple incorrect ticket API venue coordinates were corrected or held. Public Telegram feeds unavailable; no Telegram imports. CerModern reads occurred before a later access refusal; that host was then stopped. October29 holiday visiting hours unconfirmed and no window asserted. Later dates and categories remain uneven.','events':[],'places':[],'sources':[],'pending':copy.deepcopy(raw['holds'])};places={}
for r in raw['programmes']:
 pin=r['verifiedCoordinates'];vid='ankara-venue-'+key(str(round(pin['latitude'],6))+'|'+str(round(pin['longitude'],6)));pr=r['price'];amount=pr.get('standard');minimum=False
 if amount is None and pr.get('min') is not None:amount=pr['min'];minimum=True
 b={'title':r['title'],'venue':r['venue'],'venueId':vid,'placeId':vid,'address':r['address'],'category':r['normalizedCategory'],'lat':pin['latitude'],'lng':pin['longitude'],'coordinateSource':pin['sourceUrl'],'coordinatePrecision':pin['precision'],'coordinateEvidence':pin['evidence'],'coordinateCheckedAt':pin['checkedAt'],'source':r['sourceAttribution'],'sourceUrl':r['sourceUrl'],'sourceURLs':list(dict.fromkeys([r['sourceUrl']]+r.get('additionalEvidenceUrls',[]))),'checkedAt':r['checkedAt'],'yearEvidence':txt(r['yearEvidence']),'currency':'TRY','timezone':TZ,'price':amount,'min':minimum,'priceMax':pr.get('max'),'priceNote':pr.get('text'),'mandatoryFees':None,'language':None,'status':'scheduled','description':r['summaryEn'],'admission':r['restrictions'],'programmeId':r['programmeId'],'endEvidence':r.get('endEvidence')}
 places.setdefault(vid,{**{k:b[k] for k in ['address','lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence','coordinateCheckedAt','source','sourceUrl','checkedAt','currency','timezone']},'id':vid,'title':r['venue'],'category':'city','openingNote':'Named venue or campus identified independently. Ordinary visits and entrance location depend on programme; no entrance precision asserted.'})
 if not r.get('occurrences'):
  vs={x['date']:{'start':x['startTime'],'end':x['endTime']} for x in r.get('visitSchedule',[])};x=copy.deepcopy(b);x.update(id=r['sourceId']+'-range',date=r['startDate'],endDate=r['endDate'],dateType='published_interval',time=None,end=None,openingHoursKnown=bool(vs),openingHoursUnknown=not bool(vs),openingNote=r['restrictions'])
  if vs:x.update(visitSchedule=vs,openingHoursSource='https://cermodern.org/visit',visitScheduleSource='https://cermodern.org/visit',scheduleType='daily_opening_hours')
  p['events'].append(x)
 for o in r.get('occurrences',[]):
  pp=o.get('price') or pr;amount=pp.get('standard');minimum=False
  if amount is None and pp.get('min') is not None:amount=pp['min'];minimum=True
  x=copy.deepcopy(b);x.update(id=r['sourceId']+'-'+o['date'].replace('-','')+'-'+o['startTime'].replace(':',''),date=o['date'],time=o['startTime'],startAt=o['startAt'],end=None,price=amount,min=minimum,priceMax=pp.get('max'),priceNote=pp.get('text'),sourceUrl=o['sourceUrl'],checkedAt=o['checkedAt'],yearEvidence=txt(o['yearEvidence']))
  if r.get('durationMinutes'):x['durationMinutes']=r['durationMinutes']
  assert not o.get('actualEndAt') and not o.get('endTime'),'Unexpected end requires review'
  p['events'].append(x)
p['places']=list(places.values());seen=set()
for s in raw['sourceAudit']:
 u=s.get('url');t=s.get('checkedAt')
 if not u or not u.startswith('https://') or not t or u in seen:continue
 seen.add(u);p['sources'].append({'id':'ankara-source-'+key(u),'name':s.get('sourceId') or u.split('/')[2],'url':u,'checkedAt':t,'status':'read_full_source' if s.get('http')==200 else str(s.get('status') or s.get('http') or 'reviewed'),'note':s.get('note') or s.get('type') or 'Selected source check; not a complete catalogue import.'})
for r in raw['programmes']:
 for u,t,kind in [(r['sourceUrl'],r['checkedAt'],'Programme full body'),(r['verifiedCoordinates']['sourceUrl'],r['verifiedCoordinates']['checkedAt'],'Named venue coordinate evidence')]:
  if u in seen or not u.startswith('https://'):continue
  seen.add(u);p['sources'].append({'id':'ankara-source-'+key(u),'name':kind+' — '+r['title'],'url':u,'checkedAt':t,'status':'read_verified_evidence','note':kind+'; exact prior source check retained, not a new request.'})
for name,obj in [('ankara-packet',p),('ankara-research',raw)]: (O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
f=R/'data/city-expansion/registry.json';reg=json.loads(f.read_text())
if not any(c['id']=='ankara' for c in reg['newCities']):reg['newCities'].append({'id':'ankara','canonicalCity':'Ankara','countryCode':'TR','name':{'ru':'Анкара','en':'Ankara','de':'Ankara'},'ianaTimezone':TZ,'path':'ankara/index.html','currency':'TRY','interfaceLanguages':['ru','en'],'nameLocativeRu':'Анкаре','defaultDateView':'week','defaultRadiusKm':0.5});f.write_text(json.dumps(reg,ensure_ascii=False,indent=2)+'\n')
print(len(p['events']),len(p['places']),len(p['sources']),len(p['pending']))
