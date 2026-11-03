import json, hashlib, datetime, pathlib, copy, re
from urllib.parse import unquote, urlparse, parse_qs
from zoneinfo import ZoneInfo
ROOT=pathlib.Path(__file__).resolve().parents[1]
candidate=pathlib.Path('/workspace/shared/riga-capital-candidates-20261028.json')
raw=json.load(open(candidate if candidate.exists() else ROOT/'data/capitals-20261028/riga-research.json'))
pins=json.load(open(ROOT/'data/capitals-20261028/riga-venue-pins.json'))['venues']
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
raw['programmes']+= [
 {'title':'PULSE Forum','categories':['conference'],'sourceUrl':'https://www.liveriga.com/en/visit/events/festivals-festivities/pulse-forum','checkedAt':'2026-10-28T02:01:05Z','venue':'Hanzas Perons','address':'Hanzas iela 16a','occurrences':[{'date':'2026-10-28','startTime':'09:00','endTime':'20:00'},{'date':'2026-10-29','startTime':'09:00','endTime':'18:30'}],'price':{'min':100,'max':243.66},'restrictions':'International event-industry forum for event creators, agencies, brands and cultural organizations. Ticket inventory and mandatory fees not verified.'},
 {'title':'Evening concerts at Riga Dome Cathedral','categories':['concert'],'sourceUrl':'https://www.liveriga.com/en/visit/events/concerts-classical/evening-concerts-at-riga-dome-cathedral','checkedAt':'2026-10-28T02:02:07Z','venue':'Riga Dome Cathedral','address':'Herdera laukums 6','occurrences':[{'date':'2026-10-30','startTime':'19:00','endTime':None},{'date':'2026-11-06','startTime':'19:00','endTime':None}],'price':{'min':15,'max':25}}
]
raw['programmes']=list({p['sourceUrl']:p for p in raw['programmes']}.values())
# Source details are preserved as research; published rows carry only verified fields.
cat={'ballet':'theatre','opera':'music','market':'city','sport':'sport','concert':'music','tour':'city','circus':'kids','exhibition':'art','trade_fair':'city','theatre':'theatre','festival':'city','conference':'conference','food':'food','comedy':'theatre'}
shortdays={'Monday':'mon','Tuesday':'tue','Wednesday':'wed','Thursday':'thu','Friday':'fri','Saturday':'sat','Sunday':'sun'}
def stable(s): return hashlib.sha256(s.encode()).hexdigest()[:14]
packet={'cityId':'riga','checkedAt':raw['checkedAt'],'window':{'startDate':'2026-10-28','endDate':'2026-11-26'},'coverage':'Initial verified selection from LiveRiga, not complete city coverage. Main-source pagination, Telegram and other social coverage remain partial; ticket inventory and extra fees are not verified.','events':[],'places':[],'sources':[],'pending':[]}
venues={}
for p in raw['programmes']:
 if p.get('addressEvidenceStatus')=='search_snippet_only':
  packet['pending'].append({'title':p['title'],'sourceUrl':p['sourceUrl'],'reason':'Exact address only in search snippet; full venue confirmation required. Service windows must remain one dated programme, not invented separate performances.'});continue
 if not p.get('address'):
  packet['pending'].append({'title':p['title'],'sourceUrl':p['sourceUrl'],'reason':'Multiple venues; exact current address/venue list unresolved.'});continue
 pin=next((x for x in pins if x['address'].replace('ielā','iela') in p['address'].replace('ielā','iela')),None)
 if p.get('sourceMapHref'):
  mapurl=unquote(p['sourceMapHref']); q=parse_qs(urlparse(mapurl).query).get('query',[''])[0]; match=re.fullmatch(r'(-?\d+\.\d+),(-?\d+\.\d+)',q) or re.search(r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)',mapurl)
  if match:pin={'lat':float(match[1]),'lng':float(match[2]),'source':p['sourceUrl']}
 if p.get('latitude') is not None and p.get('longitude') is not None and p.get('coordinateSource'):
  pin={'lat':p['latitude'],'lng':p['longitude'],'source':p['coordinateSource']}
 if not pin:
  packet['pending'].append({'title':p['title'],'sourceUrl':p['sourceUrl'],'reason':'Venue coordinates awaiting official marker verification.'});continue
 venuekey=stable(p['address']); venueid='riga-venue-'+venuekey
 base={'title':p['title'],'titleEn':p['title'],'venue':p['venue'],'venueEn':p['venue'],'venueId':venueid,'address':p['address']+', Riga, Latvia','category':cat.get(p['categories'][0],'other'),'source':'LiveRiga · Riga Investment and Tourism Agency','sourceUrl':p['sourceUrl'],'checkedAt':p['checkedAt'],'lat':pin['lat'],'lng':pin['lng'],'coordinateSource':pin['source'],'coordinatePrecision':'venue','coordinateEvidence':'Named venue/address marker linked from official LiveRiga event page; not a city or viewport centre.','yearEvidence':'Official event detail explicitly lists the full dates with year 2026.','timezone':'Europe/Riga','currency':'EUR','status':'scheduled','soldOut':None,'language':None,'price':None,'admission':p.get('restrictions'),'description':p.get('restrictions') or '', 'descriptionEn':p.get('restrictions') or ''}
 price=p.get('price')
 if price:
  base['price']=price.get('min');base['priceMax']=price.get('max')
  base['priceNote']=price.get('text') or 'Published ticket price; inventory and any mandatory extra fees not verified.'
  if price.get('min')!=price.get('max'):base['min']=True
 if p['title']=='La Traviata':base['language']='IT';base['admission']='In Italian with Latvian and English surtitles.'
 if p['title'].startswith('Taste Latvia'):base['language']='EN';base['durationMinutes']=60
 if p['title']=='Stands what falls':base['durationMinutes']=60
 if p['title']=='Oracle':base['language']='LV'
 if venueid not in venues:
  venues[venueid]={k:v for k,v in base.items() if k in ['address','lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence','source','sourceUrl','checkedAt','timezone','currency']}
  venues[venueid].update({'id':venueid,'title':p['venue'],'titleEn':p['venue'],'category':'art' if base['category']=='art' else 'city','operatingStatusVerified':False,'openingNote':'Venue identified in a current official event announcement. Opening hours outside the programme are not verified.','openingNoteEn':'Venue identified in a current official event announcement. Opening hours outside the programme are not verified.'})
 occurrences=p.get('occurrences') or []
 if p.get('startDate') and p.get('endDate') and not occurrences:
  e=copy.deepcopy(base);e.update({'id':'riga-'+stable(p['sourceUrl']+'|'+p['startDate']),'date':p['startDate'],'endDate':p['endDate'],'dateType':'published_interval','time':None,'end':None,'openingHoursUnknown':not bool(p.get('openingHours')),'openingHoursKnown':bool(p.get('openingHours'))})
  if p.get('openingHours'):
   e['openingHours']={shortdays[k]:None if v=='closed' else v.split('–') for k,v in p['openingHours'].items()};e['openingHoursSource']=p['sourceUrl']
  packet['events'].append(e)
 for o in occurrences:
  if not '2026-10-28'<=o['date']<='2026-11-26':continue
  e=copy.deepcopy(base);e.update({'id':'riga-'+stable(p['sourceUrl']+'|'+o['date']+'|'+str(o['startTime'])),'date':o['date'],'time':o['startTime'],'end':o.get('endTime')})
  if o['startTime']:
   start=datetime.datetime.fromisoformat(o['date']+'T'+o['startTime']).replace(tzinfo=ZoneInfo('Europe/Riga'));e['startAt']=start.isoformat()
   if o.get('endTime'):e['endAt']=datetime.datetime.fromisoformat(o['date']+'T'+o['endTime']).replace(tzinfo=ZoneInfo('Europe/Riga')).isoformat()
  packet['events'].append(e)
packet['places']=list(venues.values())
packet['sources']=[{'id':'riga-liveriga-events','name':'LiveRiga official city calendar','url':'https://www.liveriga.com/en/3-events','checkedAt':raw['checkedAt'],'status':'partial_detail_review','type':'official_city_calendar','note':'Selected full dated event details reviewed across multiple categories; not a complete import of all 340 listed results. Fields with unresolved dates or venues held.'}]
packet['sources'] += [
 {'id':'riga-latvia-travel-reserve','name':'Latvia Travel event guide','url':'https://www.latvia.travel/en/autumn-and-winter-event-guide-latvia','checkedAt':raw['checkedAt'],'status':'partial','type':'official_tourism_reserve','note':'Reserve source identified; city-specific event imports still rely on individual LiveRiga details.'},
 {'id':'riga-telegram-announcements','name':'Riga Events Telegram','url':'https://t.me/s/rigaevents','checkedAt':raw['checkedAt'],'status':'stale_public_posts','type':'telegram','note':'Public feed inspected; visible announcements dated2023/2024, no fresh confirmed programme imported.'},
 {'id':'riga-telegram-chat','name':'RigaRusChat','url':'https://t.me/RigaRusChat','checkedAt':raw['checkedAt'],'status':'profile_only','type':'telegram_chat','note':'Public profile only; conversation history not exposed. No join, login or outreach.'}
]
packet['pending']+=raw.get('excluded',[])
(ROOT/'data/capitals-20261028/riga-research.json').write_text(json.dumps(raw,ensure_ascii=False,indent=2)+'\n')
(ROOT/'data/capitals-20261028/riga-packet.json').write_text(json.dumps(packet,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'events':len(packet['events']),'venues':len(venues),'pending':len(packet['pending'])}))
