import json,hashlib,pathlib,datetime,copy,re,unicodedata
from zoneinfo import ZoneInfo
R=pathlib.Path(__file__).resolve().parents[1];S=pathlib.Path('/workspace/shared');O=R/'data/capitals-20261028';CITY='buenos-aires';TZ='America/Argentina/Buenos_Aires'
def evidence(name,archive):
 p=S/name;return json.loads((p if p.exists() else O/archive).read_text())
raw=evidence(CITY+'-capital-candidates-20261028.json',CITY+'-research.json');pinraw=evidence(CITY+'-venue-pins-20261028.json',CITY+'-venue-pins.json');pins={p['venue']:p for p in pinraw['venues']}
def key(s):return hashlib.sha256(s.encode()).hexdigest()[:14]
def canon(s):return re.sub(r'[^a-z0-9]+','',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower())
packet={'cityId':CITY,'checkedAt':raw['checkedAt'],'window':{'startDate':'2026-10-28','endDate':'2026-11-26'},'coverage':'Initial verified selection from Buenos Aires official city agendas and organizers. All245 returned LINDA programme objects were screened; pagination responses duplicated the same set, not separate reviewed pages. Only verified future dates and mapped venues imported. Some programmes, addresses, fees, ticket availability and social-source coverage remain unresolved. Not complete city coverage.','events':[],'places':[],'sources':[],'pending':[]};places={};dedup={}
for p in raw['programmes']:
 reason=None;pin=pins.get(p.get('venue'))
 if p.get('publicationStatus','').startswith('hold') or p.get('cancelled') or p.get('soldOut'):reason='Research hold/cancellation/sold-out: '+p.get('publicationStatus','')
 elif not pin:reason='Named venue/address coordinates not verified; no guessed map point.'
 elif p.get('eventKind')=='exhibition' and not (p.get('startDate') and p.get('endDate')):reason='Full real exhibition range not established; month-only dates not expanded into invented dates.'
 elif not p.get('normalizedCategory'):reason='Programme-specific category not yet verified.'
 if reason:packet['pending'].append({'title':p['title'],'sourceUrl':p['sourceUrl'],'reason':reason});continue
 address=pin['address'];venueid=CITY+'-venue-'+key(pin['venue']+'|'+address);price=p.get('price') or {};amount=price.get('standard') if price.get('standard') is not None else price.get('min');note=price.get('text')
 base={'title':p['title'],'titleEn':p['title'],'venue':p['venue'],'venueEn':p['venue'],'venueId':venueid,'address':address,'category':p['normalizedCategory'],'lat':pin['lat'],'lng':pin['lng'],'coordinateSource':pin['coordinateSource'],'coordinatePrecision':pin['coordinatePrecision'],'coordinateEvidence':pin['coordinateEvidence'],'source':'Buenos Aires · LINDA official agenda','sourceUrl':p['sourceUrl'],'sourceURLs':list(dict.fromkeys([p['sourceUrl']]+p.get('additionalSourceUrls',[])+[u for u in [p.get('priceSourceUrl'),p.get('yearEvidenceUrl'),p.get('venueSourceUrl'),pin.get('additionalAddressSource')] if u])),'checkedAt':p['checkedAt'],'yearEvidence':p.get('dateEvidence',{}).get('method') or 'Explicit full-year2026 official dated announcement','currency':'ARS','timezone':TZ,'price':amount,'priceMax':price.get('max'),'priceNote':note,'language':p.get('language'),'status':'scheduled','admission':p.get('restrictions'),'description':p.get('restrictions') or '', 'descriptionEn':p.get('restrictions') or ''}
 if price.get('feeAdditional'):base['priceNote']=(note or '')+' Additional mandatory booking fee; amount not verified.'
 if venueid not in places:places[venueid]={**{k:base[k] for k in ['lat','lng','address','coordinateSource','coordinatePrecision','coordinateEvidence','source','sourceUrl','checkedAt','timezone','currency']},'id':venueid,'title':pin['venue'],'titleEn':pin['venue'],'category':'city','operatingStatusVerified':False,'openingNote':'Venue identified in a current dated programme; regular hours outside that programme not verified.','openingNoteEn':'Venue identified in a current dated programme; regular hours outside that programme not verified.'}
 if p.get('eventKind')=='exhibition':
  hours={};h=p.get('openingHours') or {};days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
  for day in days:
   val=h.get(day)
   if val is None and 'Monday–Saturday' in h and day!='Sunday':val=h['Monday–Saturday']
   hours[day[:3].lower()]=None if val=='closed' else val.split('–') if isinstance(val,str) and re.fullmatch(r'\d\d:\d\d–\d\d:\d\d',val) else 'unknown'
  e={**base,'id':CITY+'-'+key(p['sourceUrl']+'|range'),'date':p['startDate'],'endDate':p['endDate'],'dateType':'published_interval','time':None,'end':None,'openingHours':hours,'openingHoursKnown':all(v!='unknown' for v in hours.values()),'openingHoursSource':p['sourceUrl']}
  if not e['openingHoursKnown']:e['openingHours']={};e['openingHoursUnknown']=True
  packet['events'].append(e);continue
 for occurrence in p.get('occurrences',[]):
  date=occurrence['date'];time=occurrence.get('startTime')
  if not '2026-10-28'<=date<='2026-11-26' or not time:continue
  identity=canon(p['title'])+'|'+venueid+'|'+date+'|'+time
  if identity in dedup:
   ex=dedup[identity];ex['sourceURLs']=list(dict.fromkeys(ex['sourceURLs']+base['sourceURLs']));continue
  e=copy.deepcopy(base);start=datetime.datetime.fromisoformat(date+'T'+time).replace(tzinfo=ZoneInfo(TZ));e.update(id=CITY+'-'+key(identity),date=date,time=time,end=None if occurrence.get('endTimeApproximate') else occurrence.get('endTime'),startAt=start.isoformat())
  if occurrence.get('endTime') and not occurrence.get('endTimeApproximate'):
   end=datetime.datetime.fromisoformat(date+'T'+occurrence['endTime']).replace(tzinfo=ZoneInfo(TZ))
   if end<=start:end+=datetime.timedelta(days=1)
   e['endAt']=end.isoformat()
  if occurrence.get('endTimeApproximate'):e['timeNote']='Approximate duration only; no exact ending established.';e['timeNoteEn']=e['timeNote']
  if occurrence.get('doorsTime'):e['timeNote']='Doors '+occurrence['doorsTime']+'; performance '+time;e['timeNoteEn']=e['timeNote']
  dedup[identity]=e;packet['events'].append(e)
used={e['venueId'] for e in packet['events']};packet['places']=[p for id,p in places.items() if id in used]
packet['sources']=[{'id':CITY+'-source-'+key(url),'name':name,'url':url,'type':kind,'status':status,'checkedAt':raw['checkedAt'],'note':note} for name,url,kind,status,note in [('Buenos Aires Tourism events','https://turismo.buenosaires.gob.ar/es/eventos','official_city_calendar','partial_review','Broad official event index reviewed; archives and completed events excluded.'),('LINDA Buenos Aires official agenda','https://linda.buenosaires.gob.ar/agenda','official_city_calendar','full_returned_api_set_screened','Public official API returned245programmes; page1/page2 repeated identical IDs, not distinct pages. Content and dates screened; uncertain records held; no claim of complete internet coverage.'),('Teatro Colón official programme','https://teatrocolon.org.ar/','official_organizer','partial_detail_review','Selected organizer details crosschecked; no full venue calendar claim.'),('Museo Moderno','https://museomoderno.org/','official_organizer','partial_detail_review','Admission/real exhibition range reviewed; month-only ranges held.')]]
audit=evidence(CITY+'-coverage-audit-20261028.json',CITY+'-coverage-audit.json')
for row in audit.get('telegramAudit',{}).get('attempts',[]):
 packet['sources'].append({'id':CITY+'-source-'+key(row['url']),'name':'Buenos Aires Telegram '+row['url'].split('/')[-1],'url':row['url'],'type':'telegram_chat' if 'chat' in row['url'].lower() else 'telegram','status':row['status'],'checkedAt':audit['checkedAt'],'note':row['result']})
(O/(CITY+'-coverage-audit.json')).write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
packet['pending']+=raw.get('holdsAndExclusions',[])
for name,obj in [(CITY+'-packet',packet),(CITY+'-research',raw),(CITY+'-venue-pins',pinraw)]:(O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'events':len(packet['events']),'programmes':len(set(e['sourceUrl'] for e in packet['events'])),'venues':len(packet['places']),'pending':len(packet['pending'])}))
