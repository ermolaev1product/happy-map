import json,pathlib,copy,hashlib,datetime
from zoneinfo import ZoneInfo
R=pathlib.Path(__file__).resolve().parents[1];S=R.parent/'capitals-wave3/sofia';O=R/'data/capitals-20261028';TZ='Europe/Sofia';raw=json.loads((S/'sofia-capital-candidates-20261028.json').read_text());key=lambda s:hashlib.sha256(s.encode()).hexdigest()[:14]
p={'cityId':'sofia','checkedAt':raw['checkedAt'],'window':{'startDate':raw['windowStart'],'endDate':raw['windowEnd']},'coverage':'Initial verified Sofia selection, not a complete city agenda. Municipal and tourism sources were checked first, then full official opera, philharmonic, gallery and festival programmes. The tourism origin presented a challenge; accessible municipal reference pages and independent organizer evidence are distinguished in the research audit. Calendar-only expected endings are not actual finishes. Exhibition visiting windows are separate from performances. Some categories and dates remain sparse. Public Telegram announcement and chat attempts returned unavailable pages, not readable posts; zero imports and no joining.','events':[],'places':[],'sources':[],'pending':copy.deepcopy(raw['holdsAndExclusions'])};places={};seen={}
def addsource(u,checked,status,note):
 if not u or not u.startswith('https://') or u in seen:return
 seen[u]=True;p['sources'].append({'id':'sofia-source-'+key(u),'name':'Sofia source review: '+u.split('/')[2],'url':u,'status':status,'checkedAt':checked,'note':note})
def prices(x,pr):
 pr=pr or {}
 amount=pr.get('standard');minimum=False
 if amount is None and pr.get('categories'):amount=min(pr['categories']);minimum=len(pr['categories'])>1
 note=pr.get('text') or 'Price not established from the read source.'
 x.update(price=amount,min=minimum,priceMax=pr.get('max'),priceNote=note,priceNoteEn=note)
for r in raw['programmes']:
 assert r['publicationStatus']=='content_checked_coordinate_verified' and not r.get('cancelled') and not r.get('soldOut')
 co=r['verifiedCoordinates'];vid='sofia-venue-'+key(str(co['latitude'])+'|'+str(co['longitude']));ad=r.get('restrictions') or ''
 b={'title':r['title'],'titleEn':r['title'],'venue':r['venue'],'venueEn':r['venue'],'venueId':vid,'address':r['address'],'category':r['normalizedCategory'],'lat':co['latitude'],'lng':co['longitude'],'coordinateSource':co['sourceUrl'],'coordinatePrecision':'venue_approximate','coordinateEvidence':co['precision']+'; '+co['evidence'],'source':'Sofia official organizer / municipal reference','sourceUrl':r['sourceUrl'],'checkedAt':r['checkedAt'],'yearEvidence':r['dateEvidence']['method'],'currency':'EUR','timezone':TZ,'price':None,'status':'scheduled','description':r['summary'],'descriptionEn':r['summary'],'admission':ad,'admissionEn':ad,'programmeId':r['sourceId'],'ticketUrl':r.get('ticketUrl')};prices(b,r['price'])
 places.setdefault(vid,{**{k:b[k] for k in ['address','lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence','source','sourceUrl','checkedAt','currency','timezone']},'id':vid,'title':r['venue'].replace(' — Main Hall','').replace(' — Chamber Hall',''),'titleEn':r['venue'].replace(' — Main Hall','').replace(' — Chamber Hall',''),'category':'city','operatingStatusVerified':False,'openingNote':'Named programme venue; pin identifies a building or meeting point, not a surveyed indoor room. Ordinary hours not established.','openingNoteEn':'Named programme venue; pin identifies a building or meeting point, not a surveyed indoor room. Ordinary hours not established.'})
 addsource(r['sourceUrl'],r['checkedAt'],'full_primary_programme_reviewed','Selected programme facts checked, not every programme on this host.')
 addsource(co['sourceUrl'],co['checkedAt'],'named_venue_coordinate_evidence',co['precision']+'; '+co.get('retrievalMethod',''))
 if not r['occurrences']:
  x=copy.deepcopy(b);x.update(id='sofia-'+r['sourceId'],date=r['startDate'],endDate=r['endDate'],dateType='published_interval',time=None,end=None,openingHoursKnown=True,openingHoursSource=r['openingHours']['sourceUrl'],visitSchedule={o['date']:{'start':o['startTime'],'end':o['endTime']} for o in r['visitingSlots']});
  if r['sourceId']=='sof-sghg-wust':
   x['priceLabel']=x['priceLabelEn']='EUR4; 12 Nov free';x['priceNote']=x['priceNoteEn']=x['priceNote']+' Admission is free on 12 November 2026. The listed EUR4 is the ordinary adult tariff, not a charge on that free day.'
  p['events'].append(x)
 for o in r['occurrences']:
  x=copy.deepcopy(b);x.update(id='sofia-'+r['sourceId']+'-'+o['date'].replace('-','')+'-'+o['startTime'].replace(':',''),date=o['date'],time=o['startTime'],end=o.get('endTime'),startAt=datetime.datetime.fromisoformat(o['date']+'T'+o['startTime']).replace(tzinfo=ZoneInfo(TZ)).isoformat(),sourceUrl=o.get('sourceUrl') or r['sourceUrl'],ticketUrl=o.get('ticketUrl') or r.get('ticketUrl'));prices(x,o.get('price') or r['price'])
  if r.get('durationMinutes'):x['durationMinutes']=r['durationMinutes']
  if x['end']:
   dt=datetime.datetime.fromisoformat((o.get('endDate') or o['date'])+'T'+x['end']).replace(tzinfo=ZoneInfo(TZ))
   if dt<=datetime.datetime.fromisoformat(x['startAt']):dt+=datetime.timedelta(days=1)
   x['endAt']=dt.isoformat()
  if (o.get('price') or {}).get('checkedAt'):addsource(o['price'].get('sourceUrl'),o['price']['checkedAt'],'read_ticket_price_page','Published categories read; no seat selection, booking, or purchase.')
  p['events'].append(x)
p['places']=list(places.values())
for s in raw['sourceAudit']:
 status='retrieved_full_http200_content_scope_in_research_audit' if s.get('status')==200 and '__superjs/' not in s.get('finalUrl','') else 'unavailable_or_challenge_not_imported'
 addsource(s['url'],s['checkedAt'],status,'Transport status is not a claim that every event was curated. '+str(s.get('error') or ''))
for s in raw['telegramAudit']['records']:addsource(s['url'],s['checkedAt'],s['status'],s['reason'])
for name,obj in [('sofia-packet',p),('sofia-research',raw)]:(O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
r=json.loads((R/'data/city-expansion/registry.json').read_text())
if not any(c['id']=='sofia' for c in r['newCities']):
 c=copy.deepcopy(r['newCities'][-1]);c.update(id='sofia',canonicalCity='Sofia',countryCode='BG',name={'ru':'София','en':'Sofia','de':'Sofia'},ianaTimezone=TZ,path='sofia/index.html',currency='EUR',nameLocativeRu='Софии',eventLanguages=[{'code':'BG','label':'Болгарский','terms':['Bulgarian','болгарский']},{'code':'EN','label':'Английский','terms':['English','английский']}]);r['newCities'].append(c);r['countries']['BG']={'ru':'Болгария','en':'Bulgaria','de':'Bulgarien'};(R/'data/city-expansion/registry.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(len(p['events']),len(p['places']),len(p['sources']),len(p['pending']))
