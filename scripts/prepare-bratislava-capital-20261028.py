import json,pathlib,copy,hashlib,datetime
from zoneinfo import ZoneInfo
R=pathlib.Path(__file__).resolve().parents[1];S=R.parent/'capitals-wave3/bratislava';O=R/'data/capitals-20261028';TZ='Europe/Bratislava'
raw=json.loads((S/'canonical-packet-v3.json').read_text());gap=json.loads((S/'final-gap-delta.json').read_text());raw['programmes']+=gap['programmes'];raw['sources']+=gap['sources'];raw['qa']=json.loads((S/'qa-v3-issue-delta.json').read_text())
if (S/'snd-delta.json').exists():
 d=json.loads((S/'snd-delta.json').read_text());raw['programmes']+=d['programmes'];raw['sources']+=d['sources']
raw['checkedAt']=gap['checkedAt'];
for s in raw['sources']:
 if s['id']=='a4-hradby':s.update(checkedAt='2026-10-28T10:04:43Z',fetchedAt='2026-10-28T09:39:06Z',readStatus='Full archived primary body reviewed at10:04:43Z; archive fetched09:39:06Z. Later robots denial respected, no refetch.')
for r in raw['programmes']:
 if r['id']=='linocut':
  for o in r['occurrences']:o['endEvidence']='Explicit start–end interval in the full venue event body.'
src={s['id']:s for s in raw['sources']};key=lambda s:hashlib.sha256(s.encode()).hexdigest()[:14]
p={'cityId':'bratislava','checkedAt':raw['checkedAt'],'window':{'startDate':'2026-10-28','endDate':'2026-11-26'},'coverage':'Initial verified Bratislava selection, not a complete city agenda. Six official calendar pages and 92 linked pages were retrieved; 80 date-bearing metadata entries were screened, with selected full bodies and primary theatre, gallery and venue programmes reviewed. Source retrieval does not mean every programme was verified. Separate performances and exhibition visiting hours are not interchangeable. Some dates and categories remain sparse; November 1 has no verified individual session in this selection. Sold-out programmes and unresolved boarding locations are held. Public Telegram attempts were unavailable, not readable conversations; no Telegram imports or joining.','events':[],'places':[],'sources':[],'pending':copy.deepcopy(raw.get('heldAddendum',[]))};places={};seen=set()
cat={'market':'city','family_theatre':'kids','workshop':'workshop','exhibition':'art','public_discussion':'talk','guided_tour':'city','music':'music','theatre':'theatre','food_market':'food','experimental_music':'music','ballet':'theatre'}
for r in raw['programmes']:
 if r['id'] in ['goose-feast','sculpture']:
  p['pending'].append({**r,'reason':'Boarding berth unresolved; published office is not confirmed boarding location.' if r['id']=='goose-feast' else 'Explicitly sold out; not published as available.'});continue
 pl=r['place'];co=pl['coordinates'];s=src[r['sourceId']];u=s['url'];checked=s.get('checkedAt') or gap['checkedAt'];vid='bratislava-venue-'+key(str(co['lat'])+'|'+str(co['lng']))
 admission=' '.join([r.get('restrictions',''),r.get('access','')]).strip()
 b={'title':r['title'],'titleEn':r['title'],'venue':pl['name'],'venueEn':pl['name'],'venueId':vid,'address':pl['address'],'category':cat[r['category']],'lat':co['lat'],'lng':co['lng'],'coordinateSource':co['sourceUrl'],'coordinatePrecision':'venue_approximate','coordinateEvidence':co['precision'],'source':'Bratislava official agenda / organizer','sourceUrl':u,'checkedAt':checked,'yearEvidence':'Explicit 2026 performance dates in read organizer programme; date range separately verified where applicable.','currency':'EUR','timezone':TZ,'price':None,'language':None,'status':'scheduled','description':r['summary'],'descriptionEn':r['summary'],'admission':admission,'admissionEn':admission,'programmeId':r['id']}
 places.setdefault(vid,{**{k:b[k] for k in ['address','lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence','source','sourceUrl','checkedAt','currency','timezone']},'id':vid,'title':pl['name'].split(', Veľká')[0],'titleEn':pl['name'].split(', Veľká')[0],'category':'city','operatingStatusVerified':False,'openingNote':'Programme venue; ordinary visiting hours and exact room entrance are not independently confirmed.','openingNoteEn':'Programme venue; ordinary visiting hours and exact room entrance are not independently confirmed.'})
 if r.get('exhibitionRange'):
  er=r['exhibitionRange'];x=copy.deepcopy(b);schedule={o['date']:{'start':o['startTime'],'end':o['endTime']} for o in r['visitingSlots'] if o['date'] not in ['2026-11-01','2026-11-17']};x.update(id='bratislava-'+r['id'],date=er['startDate'],endDate=er['endDate'],dateType='published_interval',time=None,end=None,price=8,priceNote='Adult single-palace admission EUR8; under18 free; eligible concessions50% off. First Wednesday free. Holiday visiting hours on November1/17 unconfirmed.',priceNoteEn='Adult single-palace admission EUR8; under18 free; eligible concessions50% off. First Wednesday free. Holiday visiting hours on November1/17 unconfirmed.',openingHoursKnown=True,visitSchedule=schedule,openingHoursSource=src['gmbaccess']['url']);p['events'].append(x)
 for o in r['occurrences']:
  if o.get('availability')=='sold_out':p['pending'].append({**r,'occurrences':[o],'reason':'Sold out'});continue
  x=copy.deepcopy(b);x.update(id='bratislava-'+r['id']+'-'+o['date'].replace('-','')+'-'+o['startTime'].replace(':',''),date=o['date'],time=o['startTime'],end=o.get('endTime'),startAt=datetime.datetime.fromisoformat(o['date']+'T'+o['startTime']).replace(tzinfo=ZoneInfo(TZ)).isoformat())
  if o.get('sourceUrl'):x['sourceUrl']=o['sourceUrl']
  if o.get('durationMinutes'):x['durationMinutes']=o['durationMinutes']
  if x['end']:
   dt=datetime.datetime.fromisoformat(o['date']+'T'+x['end']).replace(tzinfo=ZoneInfo(TZ))
   if dt<=datetime.datetime.fromisoformat(x['startAt']):dt+=datetime.timedelta(days=1)
   x['endAt']=dt.isoformat()
  pr=o.get('price') or {};amount=pr.get('amount',pr.get('admission'));note=pr.get('text') or pr.get('note') or ''
  if pr.get('tiers'):amount=min(pr['tiers']);x['priceMax']=max(pr['tiers']);x['min']=len(pr['tiers'])>1;note='Published seat tiers: '+', '.join(str(v) for v in pr['tiers'])+' EUR; fees not confirmed.'
  if pr.get('min') is not None:amount=pr['min'];x['priceMax']=pr.get('max');x['min']=True
  if r['id']=='trh-piac-markt':amount=0
  if pr.get('extras'):note+=' '+pr['extras']
  if pr.get('concessionAmount') is not None:note+=' Eligible concession EUR'+str(pr['concessionAmount'])+'.'
  x.update(price=amount,priceNote=note,priceNoteEn=note)
  p['events'].append(x)
p['places']=list(places.values())
for s in raw['sources']:
 u=s['url']
 if u in seen:continue
 seen.add(u);p['sources'].append({'id':'bratislava-source-'+key(u),'name':s.get('role','Official programme')+': '+s['id'],'url':u,'status':s['readStatus'],'checkedAt':s.get('checkedAt') or gap['checkedAt'],'note':'Selected programme facts checked; not a complete source import. Exact source-access limitations retained in research audit.'})
for s in json.loads((R.parent/'capitals-wave3/telegram/audit.json').read_text()):
 if s['city']=='bratislava':p['sources'].append({'id':'bratislava-source-'+key(s['url']),'name':'Telegram public source attempt','url':s['url'],'status':s['status'],'checkedAt':s['checkedAt'],'note':s['reason']})
for name,obj in [('bratislava-packet',p),('bratislava-research',raw)]: (O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
r=json.loads((R/'data/city-expansion/registry.json').read_text())
if not any(c['id']=='bratislava' for c in r['newCities']):
 c=copy.deepcopy(r['newCities'][-1]);c.update(id='bratislava',canonicalCity='Bratislava',countryCode='SK',name={'ru':'Братислава','en':'Bratislava','de':'Bratislava'},ianaTimezone=TZ,path='bratislava/index.html',currency='EUR',nameLocativeRu='Братиславе',eventLanguages=[{'code':'SK','label':'Словацкий','terms':['Slovak','словацкий']},{'code':'EN','label':'Английский','terms':['English','английский']}]);r['newCities'].append(c);r['countries']['SK']={'ru':'Словакия','en':'Slovakia','de':'Slowakei'};(R/'data/city-expansion/registry.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(len(p['events']),len(p['places']),len(p['sources']),len(p['pending']))
