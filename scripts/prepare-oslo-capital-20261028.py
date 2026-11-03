import json,hashlib,pathlib,datetime,copy
from zoneinfo import ZoneInfo
R=pathlib.Path(__file__).resolve().parents[1];S=pathlib.Path('/workspace/shared');O=R/'data/capitals-20261028'
def evidence(name, archive):
 p=S/name
 return json.loads((p if p.exists() else O/archive).read_text())
raw=evidence('oslo-capital-candidates-20261028.json','oslo-research.json')
pins=[]
for p in evidence('oslo-launcher-venue-pins-20261028.json','oslo-launcher-venue-pins.json')['venues']:
 pins.append({**p,'name':p['venue'],'precision':p['coordinatePrecision'],'source':p['coordinateSource'],'evidence':p['coordinateEvidence']})
for p in evidence('oslo-world-venue-pins-20261028.json','oslo-world-venue-pins.json')['venues']:
 pins.append({'name':p['venue'],'address':p['officialAddress'],'lat':p['latitude'],'lng':p['longitude'],'precision':p['accuracy'],'source':p['sourceUrl'],'evidence':p['evidence']+' '+(p.get('notes') or '')})
exact={'Vinslottet':'Bøkkerveien 4','Vinkelplassen':'Kirkeveien 59','Norwegian School of Sport Sciences':'Sognsveien 220','Herr Nilsen':'C. J. Hambros plass 5','Universitetets aula':'Karl Johans gate 47'}
addressrows=evidence('oslo-kartverket-address-pins-20261028.json','oslo-kartverket-address-evidence.json')['rows']
for venue,address in exact.items():
 matches=[(a,row) for row in addressrows for a in row.get('response',{}).get('adresser',[]) if a['adressetekst']==address and a['kommunenavn']=='OSLO']
 if len(matches)==1:
  a,row=matches[0];pt=a['representasjonspunkt'];pins.append({'name':venue,'address':a['adressetekst']+', '+a['postnummer']+' Oslo','lat':pt['lat'],'lng':pt['lon'],'precision':'address_representative_point','source':row['url'],'evidence':'Kartverket official exact full street address and Oslo municipality matched; EPSG4258 representative address point, not a city/postcode centroid or surveyed venue entrance. Geodetic verification: '+str(a['stedfestingverifisert'])})
# Any later explicit venue resolution can augment, never overwrite by fuzzy address.
extra=S/'oslo-extra-venue-pins-20261028.json'
if extra.exists():pins+=json.loads(extra.read_text())['venues']
byname={p['name']:p for p in pins}
def key(s):return hashlib.sha256(s.encode()).hexdigest()[:14]
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
packet={'cityId':'oslo','checkedAt':raw['checkedAt'],'window':{'startDate':'2026-10-28','endDate':'2026-11-26'},'coverage':'Initial verified selection, not complete coverage. VisitOslo main and category pages were partially reviewed; pagination beyond visible results was unavailable. Oslo World and NMH official details supplement the calendar. Telegram profiles/limited public posts yielded no imported event; Instagram/Threads not reviewed. Some dates and categories remain sparse.','events':[],'places':[],'sources':[],'pending':[]}
cats={'market':'city','food':'food','family':'kids','sport':'sport','sports':'sport','concert':'music','classical':'music','talk':'talk','dance':'theatre','theatre':'theatre','exhibition':'art','light_art':'art','festival':'city','guided_tour':'city'}
places={};dedup=set()
for p in raw['programmes']:
 hold=p.get('publicationStatus','').startswith('hold')
 if p['title'].startswith('Edvard Munch:'):hold=True
 # Festival alternate entrance is resolved only by full official venue address evidence; retain existing hold until researcher acknowledges resolution.
 if hold or p.get('cancelled') or p.get('soldOut'):
  packet['pending'].append({'title':p['title'],'sourceUrl':p['sourceUrl'],'reason':p.get('publicationStatus') or 'Exhibition real range/visiting hours not established, or cancellation/sold-out flag.'});continue
 pin=byname.get(p['venue']) or (byname.get('Norges musikkhøgskole') if p['venue'].startswith('Norges musikkhøgskole') else None)
 if not pin:
  packet['pending'].append({'title':p['title'],'sourceUrl':p['sourceUrl'],'reason':'Named venue coordinates awaiting verification; not published with guessed pin.'});continue
 year=p.get('yearEvidenceMethod') or p.get('dateEvidence',{}).get('yearEvidence')
 if not year:
  packet['pending'].append({'title':p['title'],'sourceUrl':p['sourceUrl'],'reason':'Reliable full-year evidence absent.'});continue
 address=pin.get('address') or p['address']; venueid='oslo-venue-'+key(pin['name']+'|'+address)
 # Keep precise event room/entrance from original announcement in venue/admission, shared institution point is not room-precision.
 price=p.get('price') or {};amount=price.get('min');note=price.get('text') or price.get('details')
 if p['title']=='Halloween Frøyas Have Oslo 2026':amount=300;note=(note or '')+' Standard adult ticket NOK300; free admission applies only to ages0–3.'
 if amount==0 and not note:note='Source explicitly lists free admission (Gratis). Verify any separate booking conditions in the direct announcement.'
 if price.get('feeAdditional'):note=(note or '')+' Mandatory booking fee additional; amount not verified.'
 base={'title':p['title'],'titleEn':p['title'],'venue':p['venue'],'venueEn':p['venue'],'venueId':venueid,'address':p['address'],'category':cats.get(p['categories'][0],p['categories'][0]),'lat':pin['lat'],'lng':pin['lng'],'coordinateSource':pin['source'],'coordinatePrecision':pin['precision'],'coordinateEvidence':pin['evidence'],'source':'Oslo World' if 'osloworld' in p['sourceUrl'] else 'Norwegian Academy of Music' if 'nmh.no' in p['sourceUrl'] else 'VisitOslo','sourceUrl':p['sourceUrl'],'sourceURLs':list(dict.fromkeys([p['sourceUrl']]+p.get('additionalSourceUrls',[])+[u for u in [p.get('yearEvidenceUrl'),p.get('venueSourceUrl'),p.get('dateEvidence',{}).get('yearSource')] if u])),'checkedAt':p['checkedAt'],'yearEvidence':year,'currency':'NOK','timezone':'Europe/Oslo','price':amount,'priceMax':price.get('max'),'priceNote':note,'language':p.get('language'),'status':'scheduled','admission':p.get('restrictions'),'description':p.get('restrictions') or '', 'descriptionEn':p.get('restrictions') or ''}
 if amount is not None and price.get('max') is not None and amount!=price.get('max'):base['min']=True
 if venueid not in places:places[venueid]={**{k:base[k] for k in ['lat','lng','address','coordinateSource','coordinatePrecision','coordinateEvidence','source','sourceUrl','checkedAt','timezone','currency']},'id':venueid,'title':pin['name'],'titleEn':pin['name'],'category':'city','operatingStatusVerified':False,'openingNote':'Venue identified in a dated current programme; regular opening hours outside that programme not verified.','openingNoteEn':'Venue identified in a dated current programme; regular opening hours outside that programme not verified.'}
 for occurrence in p.get('occurrences',[]):
  date=occurrence['date'];time=occurrence.get('startTime')
  if not '2026-10-28'<=date<='2026-11-26' or not time:continue
  identity=p['sourceUrl']+'|'+date+'|'+time
  if identity in dedup:continue
  dedup.add(identity);e=copy.deepcopy(base);e.update(id='oslo-'+key(identity),date=date,time=time,end=occurrence.get('endTime'),startAt=datetime.datetime.fromisoformat(date+'T'+time).replace(tzinfo=ZoneInfo('Europe/Oslo')).isoformat())
  if occurrence.get('endTime'):e['endAt']=datetime.datetime.fromisoformat(date+'T'+occurrence['endTime']).replace(tzinfo=ZoneInfo('Europe/Oslo')).isoformat()
  if occurrence.get('doorsTime'):e['timeNote']='Doors '+occurrence['doorsTime']+'; performance starts '+time;e['timeNoteEn']=e['timeNote']
  packet['events'].append(e)
packet['places']=list(places.values())
for name,url,kind,status,note in [('VisitOslo main city calendar',raw['mainSource'],'official_city_calendar','partial_detail_review','Main and7category first-visible pages reviewed; next controls had no accessible link. Not complete pagination/import.'),('Oslo World official festival programme','https://osloworld.no/festival/program','official_festival','partial_detail_review','Read full details; year established via official2026festival range. Cancelled/soldout/conflicting records held.'),('Norwegian Academy of Music programme','https://nmh.no/arrangementer','official_organizer','partial_detail_review','Explicit2026dated programme and event details; correct organizer09:00 beats VisitOslo10:00 CoffeeSchmoffee.'),('Hei Norway public Telegram','https://t.me/s/hei_norway','telegram','no_relevant_dated_announcements','Public channel concerns Trondheim/Norway; no target-window Oslo event established.'),('Oslo Norway chat','https://t.me/norway_oslo_chat','telegram_chat','profile_only','Conversation history unavailable; no join/login/outreach.'),('Oslo chat','https://t.me/oslochat','telegram_chat','profile_only','Profile only, not read conversation or confirmed announcement.')]:packet['sources'].append({'id':'oslo-source-'+key(url),'name':name,'url':url,'type':kind,'status':status,'checkedAt':raw['checkedAt'],'note':note})
packet['pending']+=raw.get('holdsAndExclusions',[])
for name,obj in [('oslo-packet',packet),('oslo-research',raw),('oslo-venue-pins',{'checkedAt':now,'venues':pins})]:(O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'events':len(packet['events']),'programmes':len(set(e['sourceUrl'] for e in packet['events'])),'venues':len(places),'pending':len(packet['pending'])}))
