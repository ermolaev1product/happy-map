import json,pathlib,copy,hashlib,datetime
from zoneinfo import ZoneInfo
from urllib.parse import urlsplit,urlunsplit,parse_qsl,urlencode
R=pathlib.Path(__file__).resolve().parents[1];S=pathlib.Path('/workspace/scratch/59f6a13c9f12/capitals-recovery/stockholm');O=R/'data/capitals-20261028';raw=json.loads((S/'stockholm-capital-candidates-20261028.json').read_text());ends=json.loads((S/'end-evidence.json').read_text());editorial=json.loads((S/'editorial.json').read_text());TZ='Europe/Stockholm'
def clean(u):
 if not u:return None
 z=urlsplit(u);return urlunsplit((z.scheme,z.netloc,z.path,urlencode([(k,v) for k,v in parse_qsl(z.query) if not k.startswith('utm_') and k not in ['fbclid','gclid']]),''))
def key(x):return hashlib.sha256(x.encode()).hexdigest()[:14]
p={'cityId':'stockholm','checkedAt':raw['checkedAt'],'window':{'startDate':raw['windowStart'],'endDate':raw['windowEnd']},'coverage':'Fresh initial Stockholm selection. Five actual calendar API pages, 481 occurrence cards and 406 unique source IDs were read; selected programmes received organizer, venue and access checks. This is not full curated coverage. Five later dates have no selected sessions; categories and districts have gaps. Unverified venue pins, sold-out and school-only sessions remain held. Telegram announcements and conversational chats are reviewed separately; no joining or automatic imports.','events':[],'places':[],'sources':[],'pending':copy.deepcopy(raw['holdsAndExclusions'])};places={};seen=set()
cat={'theatre':'theatre','tour':'city','workshop':'workshop','music':'music','festival':'city','market':'city','science':'talk','education':'talk','conference':'conference','comedy':'theatre','sport':'sport','food':'city','film':'cinema','talk':'talk','art':'art'}
for r in raw['programmes']:
 if r.get('latitude') is None or r.get('longitude') is None:
  p['pending'].append({'id':r['id'],'title':r['title'],'status':'held_for_recheck','reason':'Fresh verified venue coordinate missing.'});continue
 assert r['status']=='candidate_checked_not_published'
 pin=r['pinEvidence'];vid='stockholm-venue-'+key(r['address']+'|'+str(r['latitude'])+'|'+str(r['longitude']));pr=r['price'];amount=pr.get('min');minimum=amount is not None and (pr.get('max') is None or amount!=pr.get('max'));note=pr.get('details') or ('Free admission to the listed activity; see conditions.' if amount==0 else 'Mandatory booking fees not confirmed.');side=editorial[r['id']]
 b={'title':r['title'],'titleEn':r['title'],'venue':r['venue'],'venueEn':r['venue'],'venueId':vid,'address':r['address'],'category':cat.get(r['normalizedCategory'],r['normalizedCategory']),'lat':r['latitude'],'lng':r['longitude'],'coordinateSource':clean(pin['sourceUrl']),'coordinatePrecision':'venue_approximate','coordinateEvidence':pin['method']+'; '+pin['precision'],'source':'Visit Stockholm / official organizer','sourceUrl':clean(r['sourceUrl']),'sourceURLs':list(dict.fromkeys(clean(u) for u in r['sourceUrls'])),'ticketUrl':clean(r.get('ticketUrl')),'checkedAt':r['checkedAt'],'yearEvidence':r['yearEvidenceMethod']+' '+r['yearEvidenceUrl'],'currency':'SEK','timezone':TZ,'price':amount,'min':minimum,'priceMax':pr.get('max'),'priceNote':note,'priceNoteEn':note,'language':({'stockholm-16870':'EN','stockholm-16872':'EN','stockholm-16877':'EN','stockholm-18035':'EN','stockholm-17718':'SV','stockholm-18233':'IT'}.get(r['id'])),'status':'scheduled','description':side['summaryEn'],'descriptionEn':side['summaryEn'],'admission':side['accessEn'],'admissionEn':side['accessEn'],'programmeId':r['id']}
 places.setdefault(vid,{**{k:b[k] for k in ['address','lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence','source','sourceUrl','checkedAt','currency','timezone']},'id':vid,'title':r['venue'],'titleEn':r['venue'],'category':'city','operatingStatusVerified':False,'openingNote':'Venue identified in a current verified programme; ordinary visiting hours not independently confirmed.','openingNoteEn':'Venue identified in a current verified programme; ordinary visiting hours not independently confirmed.'})
 for o in r['occurrences']:
  x=copy.deepcopy(b);x.update(id=r['id']+'-'+o['date'].replace('-','')+'-'+o['startTime'].replace(':',''),date=o['date'],time=o['startTime'],end=None,startAt=datetime.datetime.fromisoformat(o['date']+'T'+o['startTime']).replace(tzinfo=ZoneInfo(TZ)).isoformat());ev=ends[r['id']];ev=({**ev,'preserveScheduledEnd':False} if 'json' in ev.get('classification','').lower() else ev)
  if ev.get('durationMinutes'):x['durationMinutes']=ev['durationMinutes']
  elif ev.get('preserveScheduledEnd') and o.get('endTime'):
   x['end']=o['endTime'];dt=datetime.datetime.fromisoformat(o['date']+'T'+o['endTime']).replace(tzinfo=ZoneInfo(TZ))
   if dt<=datetime.datetime.fromisoformat(x['startAt']):dt+=datetime.timedelta(days=1)
   x['endAt']=dt.isoformat()
  p['events'].append(x)
 for u in r['sourceUrls']:
  u=clean(u)
  if u in seen or not u.startswith('https://'):continue
  seen.add(u);p['sources'].append({'id':'stockholm-source-'+key(u),'name':'Read programme: '+r['title'],'url':u,'status':'read_programme_or_venue_evidence','type':'official_programme','checkedAt':r['checkedAt'],'note':'Fresh selected programme or named venue evidence; URL roles differ. Not a complete source import.'})
p['places']=list(places.values())
for t in json.loads((S/'telegram-audit.json').read_text())['entries']:
 u=t['url'];p['sources'].append({'id':'stockholm-source-'+key(u),'name':'Public Telegram access check','url':u,'checkedAt':t['checkedAt'],'status':'unavailable','note':'Public feed unavailable; no dated announcement read or imported. Conversation profiles, where readable, do not confirm message contents.'})
u=raw['mainSource']['url'];p['sources'].append({'id':'stockholm-source-'+key(u),'name':'Visit Stockholm event calendar','url':u,'checkedAt':raw['checkedAt'],'status':'read_full_listing_pages','note':'Five actual pages; 481 occurrence cards, 406 unique IDs. Selected programmes curated, not full import.'})
for name,obj in [('stockholm-packet',p),('stockholm-research',raw),('stockholm-end-evidence',ends),('stockholm-editorial',editorial)]: (O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
r=json.loads((R/'data/city-expansion/registry.json').read_text())
if not any(c['id']=='stockholm' for c in r['newCities']):
 c=copy.deepcopy(r['newCities'][-1]);c.update(id='stockholm',canonicalCity='Stockholm',countryCode='SE',name={'ru':'Стокгольм','en':'Stockholm','de':'Stockholm'},ianaTimezone=TZ,path='stockholm/index.html',currency='SEK',nameLocativeRu='Стокгольме',eventLanguages=[{'code':'EN','label':'Английский','terms':['English','английский']},{'code':'SV','label':'Шведский','terms':['Swedish','Svenska','шведский']}]);r['newCities'].append(c);r['countries']['SE']={'ru':'Швеция','en':'Sweden','de':'Schweden'};(R/'data/city-expansion/registry.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(len(p['events']),len(p['places']),len(p['sources']),len(p['pending']))
