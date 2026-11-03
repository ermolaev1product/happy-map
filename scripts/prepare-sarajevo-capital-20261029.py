import json,pathlib,copy,hashlib,datetime
from zoneinfo import ZoneInfo
R=pathlib.Path(__file__).resolve().parents[1];S=R.parent/'preparation/sarajevo/canonical-frozen-v2.json';raw=json.loads(S.read_text());O=R/'data/capitals-20261029';O.mkdir(exist_ok=True);TZ='Europe/Sarajevo'
def key(s):return hashlib.sha256(s.encode()).hexdigest()[:14]
p={'cityId':'sarajevo','checkedAt':raw['compiledAt'],'window':{'startDate':raw['horizon']['start'],'endDate':raw['horizon']['end']},'coverage':'Selected verified Sarajevo programmes from local agendas and organizers. Partial source pagination and later-date/category coverage; not a complete city import. Public Telegram discovery is separate from imported events. Four real exhibition ranges have unknown visiting hours and do not establish open-now status. Named building or campus pins are not precise entrances.','events':[],'places':[],'sources':[],'pending':copy.deepcopy(raw['holds'])};places={}
for r in raw['programmes']:
 pin=r['verifiedCoordinates'];vid='sarajevo-venue-'+r.get('venueId',key(r['address']));pr=r['price'];amount=pr.get('standard',pr.get('amount'));minimum=False
 if amount is None and pr.get('min') is not None:amount=pr['min'];minimum=True
 b={'title':r['title'],'titleEn':r['title'],'venue':r['venue'],'venueId':vid,'placeId':vid,'address':r['address'],'category':r.get('normalizedCategory',r['category']),'lat':pin['latitude'],'lng':pin['longitude'],'coordinateSource':pin['sourceUrl'],'coordinatePrecision':pin['precision'],'coordinateEvidence':pin.get('evidence'),'coordinateCheckedAt':pin['checkedAt'],'source':'Sarajevo local agenda / official organizer','sourceUrl':r['sourceUrl'],'checkedAt':r['checkedAt'],'yearEvidence':r['yearEvidence'],'currency':'BAM','timezone':TZ,'price':amount,'min':minimum,'priceNote':pr.get('text') or pr.get('note') or ('Published amount: '+str(amount)+' BAM per '+pr.get('unit','person') if amount is not None else None),'mandatoryFees':None,'feeStatus':pr.get('feeStatus'),'language':None,'status':'scheduled','description':r['summaryEn'],'admission':r['restrictions'],'programmeId':'sarajevo-'+r['id']}
 places.setdefault(vid,{**{k:b[k] for k in ['address','lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence','coordinateCheckedAt','source','sourceUrl','checkedAt','currency','timezone']},'id':vid,'title':r['venue'],'category':'city','openingNote':'Venue identified in a current verified programme; ordinary visiting hours not independently confirmed.'})
 if not r.get('occurrences'):
  x=copy.deepcopy(b);x.update(id='sarajevo-'+r['id']+'-range',date=r['startDate'],endDate=r['endDate'],dateType='published_interval',time=None,end=None,openingHoursKnown=False,openingHoursUnknown=True,openingNote='Published exhibition period; visiting hours and holiday exceptions unconfirmed. This does not establish open-now status.');p['events'].append(x)
 for o in r.get('occurrences',[]):
  tm=o.get('startTime') or o.get('time');x=copy.deepcopy(b);x.update(id='sarajevo-'+r['id']+'-'+o['date'].replace('-','')+'-'+tm.replace(':',''),date=o['date'],time=tm,end=None,startAt=datetime.datetime.fromisoformat(o['date']+'T'+tm).replace(tzinfo=ZoneInfo(TZ)).isoformat(),sourceUrl=o.get('sourceUrl') or r['sourceUrl'],checkedAt=o.get('checkedAt') or r['checkedAt'])
  if r['id']=='sloga40':x['admission']='Event-specific rule restricts entry to ages 35+ until 23:30; general event rule is 18+. Reservations via venue profile. Mandatory 2 BAM booking fee is included in the 12 BAM total.';x['mandatoryFees']=2
  if o.get('price'):
   pp=o['price'];x['price']=pp.get('standard',pp.get('amount'));x['min']=bool(pp.get('isMinimum'));x['priceNote']=pp.get('text') or pp.get('note') or x['priceNote'];x['feeStatus']=pp.get('feeStatus')
  if o.get('durationMinutes'):x['durationMinutes']=o['durationMinutes'];x['durationEvidence']=o.get('durationEvidence')
  if o.get('endTime') and o.get('endEvidence'):
   x['end']=o['endTime'];ed=o.get('endDate') or o['date'];dt=datetime.datetime.fromisoformat(ed+'T'+o['endTime']).replace(tzinfo=ZoneInfo(TZ));st=datetime.datetime.fromisoformat(x['startAt']);
   if dt<=st:dt+=datetime.timedelta(days=1)
   x['endAt']=dt.isoformat();x['endEvidence']=o['endEvidence']
  if pr.get('isMinimum'):x['price']=pr['min'];x['min']=True;x['priceNote']=pr.get('text') or pr.get('note')
  p['events'].append(x)
p['places']=list(places.values());seen=set()
for s in raw['sources']:
 u=s.get('url');t=s.get('checkedAt')
 if not u or not u.startswith('https://') or u in seen or not t:continue
 seen.add(u);p['sources'].append({'id':'sarajevo-source-'+key(u),'name':s.get('sourceId') or u.split('/')[2],'url':u,'status':'read_full_source' if s.get('status')==200 else str(s.get('status','reviewed')),'checkedAt':t,'note':'Source-specific retrieval retained; selected verified programme facts only. Not evidence of complete source import.'})
for name,obj in [('sarajevo-packet',p),('sarajevo-research',raw)]: (O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
f=R/'data/city-expansion/registry.json';reg=json.loads(f.read_text())
if not any(c['id']=='sarajevo' for c in reg['newCities']):
 c={'id':'sarajevo','canonicalCity':'Sarajevo','countryCode':'BA','name':{'ru':'Сараево','en':'Sarajevo','de':'Sarajevo'},'ianaTimezone':TZ,'path':'sarajevo/index.html','currency':'BAM','interfaceLanguages':['ru','en'],'nameLocativeRu':'Сараево','defaultDateView':'week','defaultRadiusKm':0.5};reg['newCities'].append(c);reg['countries']['BA']={'ru':'Босния и Герцеговина','en':'Bosnia and Herzegovina','de':'Bosnien und Herzegowina'};f.write_text(json.dumps(reg,ensure_ascii=False,indent=2)+'\n')
print(len(p['events']),len(p['places']),len(p['sources']),len(p['pending']))
