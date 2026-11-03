"""Import saved public London listings. Fetch evidence separately; no schedule or login."""
import json,re,hashlib,urllib.request,urllib.parse,concurrent.futures
from pathlib import Path
from datetime import datetime,timezone
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1];B=ROOT/'work/paris-london-2026-10-11/london-research';OUT=ROOT/'public/london';OUT.mkdir(exist_ok=True)
NOW=datetime.now(timezone.utc).isoformat();START='2026-10-11';END='2026-10-17'; manifest=json.loads((B/'fetch-manifest.json').read_text());details={x['url']:BeautifulSoup((B/x['file']).read_text(),'html.parser') for x in manifest if 'file'in x}
def ident(s):return hashlib.sha256(s.encode()).hexdigest()[:16]
def clock(s):
 m=re.search(r'(\d{1,2})(?:[.:](\d\d))?\s*(am|pm)',s,re.I)
 if not m:return None
 h=int(m[1])%12+(12 if m[3].lower()=='pm'else 0);return f'{h:02d}:{int(m[2]or 0):02d}'
def category(s):
 s=s.lower()
 for c,words in [('music',['concert','piano','orchestra','jazz','music','recital','choir','singing']),('cinema',['film','cinema','screening']),('theatre',['theatre','performance','ballet','comedy']),('art',['exhibition','gallery','art ','painting','photo','sculpture']),('games',['game','chess','quiz']),('market',['market','fair']),('lecture',['lecture','talk','discussion','book','science','history','seminar','debate','archives'])]:
  if any(w in s for w in words):return c
 return 'meetup'
def base(title,date,time,venue,address,url,source,price=None):
 return dict(id='ldn-'+ident(url+date+str(time)),title=title,category=category(title),date=date,time=time,end=None,venue=venue,address=address,venueId='ldn-venue-'+ident(venue+address),lat=None,lng=None,price=price,currency='GBP',language='EN',timezone='Europe/London',source=source,sourceUrl=url,checkedAt=NOW,description='See the linked organizer or listing for the programme and current admission details.',accessType='unknown',accessNote='Check entry and booking requirements with the organizer.',registrationUrl=None,priceStatus='published' if price is not None else 'not_published',priceNote='Price shown by the source; booking fees or concessions may differ.' if price is not None else 'No ticket price was confirmed; this does not mean admission is free.',priceEvidenceUrl=url,priceCheckedAt=NOW)
events=[];rejected=[]
# Daily listings establish the listed date. Individual pages supply venue/address and primary-source links.
for path in sorted(B.glob('ian-*.html')):
 day='2026-10-'+path.stem.split('-')[1]
 for card in BeautifulSoup(path.read_text(),'html.parser').select('.event_wrapper'):
  a=card.select_one('h3 a')
  if not a:continue
  title=a.get_text(' ',strip=True);url=a['href'];s=details.get(url)
  if not s:rejected.append({'url':url,'reason':'Detail unavailable'});continue
  if re.search('release of tickets|tickets to visit Big Ben|Railshow 2023',title,re.I):rejected.append({'url':url,'reason':'Ticket release announcement or conflicting title year'});continue
  article=s.select_one('article');text=article.get_text(' ',strip=True) if article else ''
  if re.search(r'(?:event|tour|talk) (?:has been |is )cancelled',text,re.I):rejected.append({'url':url,'reason':'Cancelled'});continue
  loc=s.find(itemprop='location');venueLink=loc.find('a') if loc else None;address=loc.get_text(', ',strip=True) if loc else ''
  if loc is None:
   header=next((h for h in s.find_all('h2')if h.get_text(strip=True)=='Location'),None)
   para=header.find_next('p') if header else None
   if para:
    parts=[]
    for node in para.children:
     if getattr(node,'name',None)=='p':break
     if getattr(node,'name',None)=='br':continue
     val=node.get_text(' ',strip=True) if hasattr(node,'get_text')else str(node).strip()
     if val:parts.append(val)
    address=', '.join(parts)
  venue=venueLink.get_text(' ',strip=True) if venueLink else (address.split(',')[0] if address else None) or (card.select_one('.event_location').get_text(' ',strip=True) if card.select_one('.event_location') else 'Venue not confirmed')
  d=card.find(itemprop='startDate');st=d.get('content') if d else None
  if st and not st.startswith(day):continue
  ct=card.select_one('.event_time');t=clock(ct.get_text(' ',strip=True)) if ct else None
  if t is None:
   exact=s.find(itemprop='startDate');stamp=exact.get('content','')if exact else ''
   if stamp.startswith(day+'T'):t=stamp[11:16]
  priceNode=card.find(itemprop='price');raw=priceNode.get('content') if priceNode else None
  try:price=float(raw) if raw not in (None,'') else None
  except:price=None
  if price is None and priceNode and priceNode.get_text(' ',strip=True).lower()=='free':price=0
  e=base(title,day,t,venue,address,url,'IanVisits',price)
  if ct:
   times=re.findall(r'\d{1,2}(?:[.:]\d\d)?\s*(?:am|pm)',ct.get_text(' ',strip=True),re.I)
   if len(times)>1:e['end']=clock(times[-1])
  sourceLink=article.find('a',itemprop='url') if article else None
  if sourceLink:e['registrationUrl']=sourceLink.get('href');e['primarySourceUrl']=sourceLink.get('href')
  if 'Booking is required' in text:e['accessType']='registration';e['accessNote']='The listing requires booking; confirm current availability at the linked page.'
  elif 'Booking is not required' in text:e['accessType']='public';e['accessNote']='The listing says booking is not required.'
  e['sources']=[{'name':'IanVisits','url':url,'checkedAt':NOW}]
  if sourceLink:e['sources'].append({'name':'Organizer link from listing','url':sourceLink.get('href'),'status':'linked','checkedAt':NOW})
  e['listingEvidenceUrl']=f'https://www.ianvisits.co.uk/calendar/date/2026/10/{day[-2:]}/'
  if venueLink:e['venueUrl']=venueLink.get('href')
  events.append(e)
# Official LSE dated search and individually saved programme pages.
for card in BeautifulSoup((B/'lse-search.html').read_text(),'html.parser').select('.card__content'):
 a=card.select_one('.card__title a');d=card.select_one('.card__description');loc=card.select_one('.card__location')
 if not a or not d:continue
 dt=d.get_text(' ',strip=True);match=re.search(r'(\d\d?) October 2026 (.+)',dt)
 if not match:continue
 day=f'2026-10-{int(match[1]):02d}'
 if not START<=day<=END:continue
 if 'to Thursday' in dt:continue # an exhibition range alone cannot establish daily opening hours
 url='https://www.lse.ac.uk'+a['href'];s=details.get(url);v=loc.get_text(' ',strip=True) if loc else 'LSE campus, venue tbc'
 address=''
 if 'Old Building' in v:address='Old Building, Houghton Street, London WC2A 2AE'
 if 'Cheng Kin Ku' in v:address='Cheng Kin Ku Building, 54 Lincoln’s Inn Fields, London WC2A 3LJ'
 if 'Marshall Building' in v:address='Marshall Building, 44 Lincoln’s Inn Fields, London WC2A 3LY'
 if 'Centre Building' in v:address='Centre Building, Houghton Street, London WC2A 2AE'
 if 'Library' in v:address='LSE Library, 10 Portugal Street, London WC2A 2HD'
 title=a.get_text(' ',strip=True);e=base(title,day,clock(match[2]),v,address,url,'LSE Public Events')
 times=re.findall(r'\d{1,2}(?:[.:]\d\d)?\s*(?:am|pm)',match[2],re.I)
 if len(times)>1:e['end']=clock(times[-1])
 if s:
  txt=s.get_text(' ',strip=True)
  if re.search(r'(free and open to all|event is free|free to attend)',txt,re.I):e.update(price=0,priceStatus='published',priceNote='The official page explicitly says attendance is free.')
  if re.search(r'(ticket is required|registration is required|register to attend|book your place)',txt,re.I):e.update(accessType='registration',accessNote='The official page requests tickets or registration; check availability.')
  else:e.update(accessType='public',accessNote='Listed by LSE as a public event; check the official page for seating and entry arrangements.')
 if 'tbc' in v:e['accessNote']+=' Exact venue is only given to ticket holders; no map marker is assigned.'
 events.append(e)
# Additional official Southbank performances and Wigmore concert cards.
officialManifest=json.loads((B/'official-manifest.json').read_text()) if (B/'official-manifest.json').exists()else []
for rec in officialManifest:
 if 'file'not in rec:continue
 doc=BeautifulSoup((B/rec['file']).read_text(),'html.parser');url=rec['url']
 if 'wigmore-hall.org.uk/whats-on/2026' in url:
  stamp=url.rsplit('/',1)[-1];day=stamp[:4]+'-'+stamp[4:6]+'-'+stamp[6:8];time=stamp[8:10]+':'+stamp[10:12]
  if not START<=day<=END:continue
  title=doc.title.get_text(' ',strip=True);txt=doc.get_text(' ',strip=True)
  if 'Schools Concert' in title:rejected.append({'url':url,'reason':'School-only audience'});continue
  node=doc.find('dt',string=lambda x:x and x.strip()=='Tickets');dd=node.find_next('dd')if node else None
  prices=[float(v)for v in re.findall(r'£(\d+(?:\.\d+)?)',dd.get_text(' ',strip=True) if dd else '')]
  e=base(title,day,time,'Wigmore Hall','36 Wigmore Street, London W1U 2BP',url,'Wigmore Hall',min(prices)if prices else None);e.update(category='music',accessType='registration',accessNote='Book a concert ticket. Check current availability.',registrationUrl=url,venueUrl='https://www.wigmore-hall.org.uk/visit-us')
  if prices:e.update(priceMax=max(prices),priceNote='Published ticket tiers; current availability and booking conditions may vary.')
  events.append(e)
 if 'southbankcentre.co.uk/whats-on/' in url:
  for script in doc.find_all('script',type='application/ld+json'):
   try:data=json.loads(script.get_text())
   except:continue
   if isinstance(data,dict):data=data.get('@graph',[data])
   for row in data:
    if not isinstance(row,dict)or not row.get('startDate'):continue
    start=row['startDate'];end=row.get('endDate');day=start[:10]
    loc=row.get('location')or {};addr=loc.get('address')or {};venue=loc.get('name','Southbank Centre');address=', '.join(str(addr.get(k,''))for k in ['streetAddress','addressLocality','postalCode']if addr.get(k));offer=row.get('offers')or {};offer=offer[0]if isinstance(offer,list)and offer else offer
    raw=offer.get('lowPrice',offer.get('price'))
    try:price=float(raw)if raw is not None else None
    except:price=None
    geo=loc.get('geo')or {};title=row.get('name','')
    if not START<=day<=END or not 'T' in start:
     # Upgrade existing dated gallery listings with the venue's own location and price.
     for e in events:
      if e['title'].casefold()==title.casefold():
       if geo.get('latitude')is not None:e.update(lat=float(geo['latitude']),lng=float(geo['longitude']),coordinateSource=url,coordinatePrecision='official-venue',coordinateNote='Coordinates published by the venue.')
       if price is not None:e.update(price=price,priceStatus='published',priceEvidenceUrl=url)
       e.setdefault('sources',[]).append({'name':'Southbank Centre','url':url,'checkedAt':NOW})
     continue
    if 'Cancelled'in row.get('eventStatus',''):continue
    time=start[11:16];e=base(title,day,time,venue,address,url,'Southbank Centre',price);e.update(category='theatre'if row.get('@type')=='TheaterEvent'else 'art'if row.get('@type')=='VisualArtsEvent'else 'lecture'if row.get('@type')=='LiteraryEvent'else category(title),end=end[11:16]if end and 'T'in end else None,accessType='restricted'if 'members'in title.lower()else 'registration',accessNote='Members-only event; membership required.'if 'members'in title.lower()else 'Check tickets and admission with Southbank Centre.',registrationUrl=url)
    if geo.get('latitude')is not None:e.update(lat=float(geo['latitude']),lng=float(geo['longitude']),coordinateSource=url,coordinatePrecision='official-venue',coordinateNote='Coordinates published by the venue.')
    if loc.get('url'):e['venueUrl']=loc['url']
    if offer.get('highPrice'):e['priceMax']=float(offer['highPrice'])
    events.append(e)
# Verified Telegram discoveries; times/prices checked against organizer ticket pages.
manual=json.loads((B/'telegram-verified-events.json').read_text()) if (B/'telegram-verified-events.json').exists() else []
for m in manual:
 e=base(m['title'],m['date'],m['time'],m['venue'],m['address'],m['sourceUrl'],'Telegram / Afisha London',m.get('price'));e.update(m);e['sources']=[{'name':'Afisha London Telegram','url':'https://t.me/afishalondon/11036','checkedAt':NOW},{'name':'Organizer or linked event page','url':m['sourceUrl'],'checkedAt':NOW}];events.append(e)
# Prefer official exhibition occurrence lists over duplicate aggregator gallery listings.
officialArt={e['title'].casefold()for e in events if e['source']=='Southbank Centre'and e['category']=='art'}
events=[e for e in events if not(e['source']=='IanVisits'and e['title'].casefold()in officialArt)]
# Deduplicate identical sessions; combine date-listed ongoing programmes using actual daily listings, without inventing times.
seen={};
for e in events:
 k=(e['title'].casefold(),e['date'],e['time'],e['venue'].casefold())
 if k not in seen:seen[k]=e
 else:seen[k].setdefault('sources',[]).extend(e.get('sources',[]))
events=list(seen.values())
# Public postal-coordinate service: postal centroid is approximate, never a claimed building coordinate.
# An ongoing exhibition is one programme with explicitly listed visit dates, not invented daily events.
programmes={}
for e in events:
 key=e['sourceUrl']+'|'+str(e['time']) if e['source']=='IanVisits' or(e['source']=='Southbank Centre'and e['category']=='art')else e['id']
 if key not in programmes:programmes[key]=e
 else:
  first=programmes[key];dates=set(first.get('validDates',[first['date']]));dates.add(e['date']);first['validDates']=sorted(dates);first['endDate']=max(dates);first.setdefault('visitSchedule',{first['date']:{'start':first['time'],'end':first['end']}})[e['date']]={'start':e['time'],'end':e['end']};first['timeNote']='Multi-date programme. Visit dates and hours come from the source’s dated listings; confirm with the gallery.'
events=list(programmes.values())
postcodePattern=r'\b(?:[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b';postcodes=set()
for e in events:
 matches=re.findall(postcodePattern,e['address'].upper());e['postcode']=matches[-1] if matches else None
 if e['postcode']:postcodes.add(e['postcode'])
cachePath=B/'postcode-coordinates.json';cache=json.loads(cachePath.read_text()) if cachePath.exists() else {}
def lookup(pc):
 try:
  u='https://api.postcodes.io/postcodes/'+urllib.parse.quote(pc);r=urllib.request.urlopen(u,timeout=20);return pc,json.loads(r.read())
 except Exception as err:return pc,{'error':str(err)}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
 for pc,result in ex.map(lookup,sorted(postcodes-set(cache))):cache[pc]=result
cachePath.write_text(json.dumps(cache,indent=2))
accepted=[]
for e in events:
 r=cache.get(e['postcode'],{}).get('result') or {}
 if r and r.get('region')!='London':rejected.append({'url':e['sourceUrl'],'reason':'Postal data outside Greater London','address':e['address']});continue
 if e['lat'] is None and r.get('latitude') is not None:
  e.update(lat=r['latitude'],lng=r['longitude'],coordinatePrecision='postcode-centroid',coordinateSource='https://api.postcodes.io/postcodes/'+urllib.parse.quote(e['postcode']),coordinateNote='Approximate marker for the venue’s verified postcode. Follow the street address for the entrance.')
 # An address lacking London confirmation is excluded rather than presented as a London venue.
 if not r and e['address'] and not re.search(r'\bLondon\b|\bLSE\b',e['address'],re.I):rejected.append({'url':e['sourceUrl'],'reason':'London location not established','address':e['address']});continue
 accepted.append(e)
events=sorted(accepted,key=lambda e:(e['date'],e['time']or '',e['title']))
registry=[{'name':'IanVisits','url':'https://www.ianvisits.co.uk/calendar/','type':'aggregator','status':'imported','note':'Selected dated listings from 11–17 October 2026, with saved detail pages. Organizer links retained. Partial coverage; independently check cancellations. Postal markers are approximate.','count':sum(e['source']=='IanVisits' for e in events),'checkedAt':NOW},{'name':'LSE Public Events','url':'https://www.lse.ac.uk/events/search-events','type':'venue','status':'imported','note':'Dated public lectures and concert listings. Venue TBC stays without coordinates. An exhibition date range was excluded because daily opening hours were not verified.','count':sum(e['source']=='LSE Public Events' for e in events),'checkedAt':NOW},{'name':'Afisha London — Telegram','url':'https://t.me/afishalondon','type':'telegram','status':'imported','note':'Public posts read; selected announcements verified against linked event or organizer pages. This is not the whole channel or a continuous feed.','count':len(manual),'checkedAt':NOW}]
registry.extend([dict(name=name,url=url,type='venue',status='imported',note='Selected performances read from dated official event cards; full programme not imported.',checkedAt=NOW,count=sum(e['source']==name for e in events))for name,url in [('Southbank Centre','https://www.southbankcentre.co.uk/whats-on/'),('Wigmore Hall','https://www.wigmore-hall.org.uk/whats-on')]])
extras=json.loads((B/'additional-sources.json').read_text()) if (B/'additional-sources.json').exists()else []
for x in extras:x.setdefault('checkedAt',NOW)
registry.extend(extras)
for e in events:
 if e.get('primarySourceUrl') and not any(x['url']==e['primarySourceUrl']for x in registry):registry.append(dict(name=e['venue']+' — programme link',url=e['primarySourceUrl'],type='organizer',status='linked',note='Direct organizer URL supplied by the dated IanVisits listing; this linked page has not been independently imported.',checkedAt=NOW))
places=[];venues={}
for e in events:
 if e['lat']is not None and e.get('venueUrl'):venues.setdefault(e['venueId'],e)
for k,e in venues.items():places.append(dict(id=k,name=e['venue'],title=e['venue'],kind='place',city='London',venue=e['venue'],venueId=k,website=e['venueUrl'],timezone='Europe/London',category='space',concept='Cultural venue listed in dated London programmes. See its site for current visiting arrangements.',description='Permanent venue, separate from the dated event layer.',address=e['address'],lat=e['lat'],lng=e['lng'],coordinateSource=e['coordinateSource'],coordinatePrecision=e['coordinatePrecision'],coordinateNote=e['coordinateNote'],source=e['source']+' — venue information',sourceUrl=e['venueUrl'],checkedAt=NOW,price=None,beerPrice=None,currency='GBP'))

for item in events:
 if item['source']=='LSE Public Events' and 'piano' not in item['title'].lower():item['category']='lecture'
(OUT/'events.json').write_text(json.dumps(dict(city='London',timezone='Europe/London',currency='GBP',generatedAt=NOW,startDate=START,endDate=END,coverage='Partial verified selection for Greater London, 11–17 October 2026. No automatic collection. Postal markers are approximate; unknown locations have no marker.',sourceRegistry=registry,events=events),ensure_ascii=False,indent=2))
(OUT/'places.json').write_text(json.dumps(dict(city='London',generatedAt=NOW,places=places),ensure_ascii=False,indent=2));(OUT/'sources.json').write_text(json.dumps(dict(city='London',generatedAt=NOW,sources=registry),ensure_ascii=False,indent=2));(B/'rejected.json').write_text(json.dumps(rejected,indent=2));print(json.dumps({'events':len(events),'mapped':sum(e['lat']is not None for e in events),'pricesKnown':sum(e['price']is not None for e in events),'places':len(places),'sources':len(registry),'byDate':{d:sum(e['date']==d for e in events)for d in sorted(set(e['date']for e in events))}},indent=2))
