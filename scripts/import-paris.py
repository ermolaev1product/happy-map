"""Bounded dated Paris Data import; explicit occurrences, no scheduler.
Derivative of Que Faire à Paris, Ville de Paris, ODbL1.0; attribution in published JSON.
"""
import urllib.request,urllib.parse,json,re,hashlib,time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from zoneinfo import ZoneInfo
from collections import Counter
from bs4 import BeautifulSoup
root=Path('work/paris-london-2026-10-11');out=Path('public/paris');out.mkdir(exist_ok=True)
checked=datetime.now(ZoneInfo('UTC')).isoformat();start='2026-10-11';end='2026-10-17';zone=ZoneInfo('Europe/Paris')
api='https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records'
where="date_end >= date'2026-10-11' AND date_start < date'2026-10-18'"
def fetch(offset):
 f=root/f'paris-filtered-{offset}.json'
 if f.exists():return json.loads(f.read_text())
 u=api+'?'+urllib.parse.urlencode({'where':where,'limit':100,'offset':offset,'order_by':'id'})
 for attempt in range(3):
  try:
   d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=60));f.write_text(json.dumps(d,ensure_ascii=False));return d
  except Exception:
   if attempt==2:raise
   time.sleep(2)
first=fetch(0);total=first['total_count'];results=first['results']
for d in ThreadPoolExecutor(max_workers=4).map(fetch,range(100,total,100)):results+=d['results']
# A stable ordering is mandatory across all pages, refetch page0 with same order.
f=root/'paris-filtered-0.json';d=json.loads(f.read_text());
u=api+'?'+urllib.parse.urlencode({'where':where,'limit':100,'offset':0,'order_by':'id'})
d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=60));f.write_text(json.dumps(d,ensure_ascii=False));results=d['results']+results[100:]
rows={str(e['id']):e for e in results}
def clean(s):return BeautifulSoup(s or '', 'html.parser').get_text(' ',strip=True)
def category(e):
 tags=str(e.get('qfap_tags') or '').lower()
 if 'expo' in tags:return 'art'
 if 'concert' in tags:return 'music'
 if 'théâtre' in tags:return 'theatre'
 if 'conférence' in tags or 'littérature' in tags:return 'lecture'
 s=(tags+' '+e['title']).lower()
 if re.search(r'conférence|débat|rencontre|philosoph|science|littér|lecture|livre|poési',s):return 'lecture'
 if re.search(r'concert|musique|jazz|orchestre|chante|opéra',s):return 'music'
 if re.search(r'théâtre|spectacle|danse|cirque',s):return 'theatre'
 if re.search(r'cinéma|projection|film',s):return 'film'
 if re.search(r'exposition|arts|dessin|photo|musée',s):return 'art'
 if re.search(r'sport|yoga|randonnée',s):return 'sport'
 if re.search(r'jeu|quiz|échecs',s):return 'games'
 if re.search(r'marché|brocante|festival|fête',s):return 'city'
 return 'other'
def prices(e):
 note=clean(e.get('price_detail'))
 if e.get('price_type')=='gratuit':return 0,None,False,note or 'Free admission according to the published listing.'
 # Preserve full terms. Use a single explicit numeric euro amount only, never ages or a discount as general price.
 ns=[float(v.replace(',','.')) for v in re.findall(r'(\d+(?:[.,]\d+)?)\s*(?:€|euros?\b)',note,re.I)]
 if len(ns)==1 and not re.search(r'réduit|enfant|étudiant|adhérent|abonné|moins|cotisation',note,re.I):return ns[0],None,bool(re.search(r'à partir|dès',note,re.I)),note
 return None,None,False,note or 'The public listing does not state a verified ticket price.'
events=[];excluded=[];venues={};duplicate_keys=set()
for eid,e in rows.items():
 title=clean(e['title']);loc=e.get('lat_lon') or {};lat=loc.get('lat');lng=loc.get('lon');city=clean(e.get('address_city')).lower();postcode=str(e.get('address_zipcode') or '')
 if not (city=='paris' or postcode.startswith('75')) or (lat and not(48.78<=lat<=48.92 and 2.20<=lng<=2.44)):
  excluded.append({'id':eid,'reason':'outside_Paris','title':title});continue
 if re.search(r'annul[ée]|cancelled|report[ée]',title,re.I):excluded.append({'id':eid,'reason':'cancelled_or_postponed','title':title});continue
 occurrences=[]
 for pair in str(e.get('occurrences') or '').split(';'):
  try:
   s,z=pair.split('_',1);s=datetime.fromisoformat(s).astimezone(zone);z=datetime.fromisoformat(z).astimezone(zone)
   if start<=s.date().isoformat()<=end:occurrences.append((s,z))
  except (ValueError,TypeError):pass
 if not occurrences:
  excluded.append({'id':eid,'reason':'no_explicit_occurrence_in_week','title':title});continue
 if not e.get('address_name') and not e.get('address_street'):
  excluded.append({'id':eid,'reason':'no_confirmed_in_person_venue','title':title});continue
 cat=category(e);price,price_max,minprice,price_note=prices(e);venue=clean(e.get('address_name')) or clean(e.get('address_street'));address=', '.join(filter(None,[clean(e.get('address_street')),postcode,clean(e.get('address_city'))]));venue_id='paris-venue-'+hashlib.sha1((venue+'|'+address).lower().encode()).hexdigest()[:14]
 desc=clean(e.get('lead_text'));audience=clean(e.get('audience'));accesslink=e.get('access_link') or None
 registration=e.get('access_type')=='oui' or bool(re.search(r'réservation|inscription',clean(e.get('price_detail'))+' '+clean(e.get('description')),re.I))
 base={'title':title,'category':cat,'venue':venue,'venueId':venue_id,'address':address,'lat':lat if isinstance(lat,(int,float)) else None,'lng':lng if isinstance(lng,(int,float)) else None,'coordinateSource':e['url'],'coordinatePrecision':'official-calendar' if lat else None,'source':'Que Faire à Paris · Ville de Paris','sourceUrl':e['url'],'checkedAt':checked,'sourceUpdatedAt':e.get('updated_at'),'price':price,'priceMax':price_max,'min':minprice,'priceNote':price_note,'currency':'EUR','language':'FR','timezone':'Europe/Paris','accessType':'registration' if registration else 'public','accessNote':('Check registration, ticket availability and eligibility on the organizer page. ' if registration else 'Public listing; check opening hours and admission conditions before visiting. ')+audience,'audience':audience,'registrationUrl':accesslink if registration else None,'description':desc,'scheduleNote':clean(e.get('date_description')),'sourceLicense':'ODbL-1.0','licenseUrl':'https://opendatacommons.org/licenses/odbl/1-0/'}
 # The listing may specify a non-French language. Never infer EN from a bilingual webpage.
 if re.search(r'en anglais|in English|English-speaking',desc+' '+clean(e.get('description')),re.I):base['language']='EN'
 elif re.search(r'en russe|in Russian',desc,re.I):base['language']='RU'
 if re.search(r'collection permanente|collections permanentes',title,re.I):
  excluded.append({'id':eid,'reason':'permanent_collection_place_layer','title':title});continue
 if cat=='art' and 'expo' in str(e.get('qfap_tags') or '').lower() and len(occurrences)>1:
  visits={}
  for a,b in occurrences:
   day=a.date().isoformat();visits.setdefault(day,[]).append({'start':a.strftime('%H:%M'),'end':b.strftime('%H:%M')})
  # UI supports one daily visit window; separate noncontinuous sessions remain individual.
  if all(len(v)==1 for v in visits.values()):
   visits={k:v[0] for k,v in visits.items()}
   events.append(dict(base,id='paris-qfap-'+eid,date=min(visits),endDate=max(visits),time=None,end=None,validDates=sorted(visits),visitSchedule=visits,timeNote='Exhibition or arts programme. Only explicitly published visit dates are shown. '+base['scheduleNote']))
  else:
   for a,b in occurrences:events.append(dict(base,id='paris-qfap-'+eid+'-'+a.strftime('%Y%m%d%H%M'),date=a.date().isoformat(),time=a.strftime('%H:%M'),end=b.strftime('%H:%M')))
 else:
  for a,b in occurrences:
   key=(title.lower(),address.lower(),a.isoformat())
   if key in duplicate_keys:continue
   duplicate_keys.add(key);events.append(dict(base,id='paris-qfap-'+eid+'-'+a.strftime('%Y%m%d%H%M'),date=a.date().isoformat(),time=a.strftime('%H:%M'),end=b.strftime('%H:%M'),endDate=b.date().isoformat() if b.date()!=a.date() else None))
 if venue_id not in venues:
  kinds={'music':['space'],'lecture':['books','space'],'art':['art','space'],'theatre':['space'],'games':['games','space']}.get(cat,['space'])
  venues[venue_id]=dict(id=venue_id,venueId=venue_id,kind='place',city='Paris',title=venue,venue=venue,category=kinds[0],categories=kinds,address=address,lat=base['lat'],lng=base['lng'],description='A venue listed in the official Paris cultural calendar. Open its programme for dated activities; a place is not an everyday event.',source='Que Faire à Paris · Ville de Paris',sourceUrl=e['url'],website=e.get('contact_url') or e['url'],coordinateSource=e['url'],checkedAt=checked,price=None,currency='EUR',timezone='Europe/Paris',openingNote='The event calendar does not establish the venue’s daily opening hours. Check its official programme before visiting.',sourceLicense='ODbL-1.0')
  if e.get('contact_instagram'):venues[venue_id]['instagram']=e['contact_instagram']
registry=[dict(name='Que Faire à Paris · Ville de Paris',url='https://opendata.paris.fr/explore/dataset/que-faire-a-paris-/',status='imported',count=len(events),note='Public official API; exact occurrences for 11–17 October 2026, Paris city only. No full coverage claim. Source updates and retrieval timestamps remain separate. ODbL1.0 attribution retained.')]
data=dict(city='Paris',generatedAt=checked,startDate=start,endDate=end,timezone='Europe/Paris',currency='EUR',coverage='Paris: explicitly scheduled occurrences, 11–17 October 2026. A bounded manual collection, not all events or an automatic daily feed.',sourceRegistry=registry,licenseAttribution='Que Faire à Paris — Ville de Paris, retrieved '+checked[:10]+', Open Database License (ODbL1.0). This derived Paris Data selection is available in paris-data-derived.json under ODbL1.0.',licenseUrl='https://opendatacommons.org/licenses/odbl/1-0/',events=sorted(events,key=lambda v:(v['date'],v.get('time') or '',v['title'])))
(out/'events.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');(out/'paris-data-derived.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');(out/'places.json').write_text(json.dumps(dict(city='Paris',generatedAt=checked,places=list(venues.values())),ensure_ascii=False,indent=2)+'\n')
(out/'audit.json').write_text(json.dumps(dict(checkedAt=checked,method='Public Paris Data API, paginated, exact occurrences only; no scheduler',sourceRecords=total,uniqueFetched=len(rows),includedRecords=len(events),distinctPrograms=len(set(v['sourceUrl'] for v in events)),exclusions=excluded,categoryCounts=dict(Counter(e['category'] for e in events)),license=data['licenseAttribution']),ensure_ascii=False,indent=2)+'\n')
(out/'sources.json').write_text(json.dumps(dict(researchedAt=checked,note=data['coverage'],sources=[dict(name=registry[0]['name'],url=registry[0]['url'],city='Paris',country='France',language='FR',type='Official open data',status='imported',importedCount=len(events),checkedAt=checked,notes=registry[0]['note'],acquisitionMethod='Paginated public API, explicit occurrences; dataset licence ODbL1.0.',researchEvidenceUrl=api)]),ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'fetched':len(rows),'events':len(events),'programs':len(set(v['sourceUrl'] for v in events)),'places':len(venues),'categories':dict(Counter(e['category'] for e in events))}))
