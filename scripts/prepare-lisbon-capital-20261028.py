import json,hashlib,pathlib,datetime,copy,re,urllib.parse
from zoneinfo import ZoneInfo
R=pathlib.Path(__file__).resolve().parents[1];S=pathlib.Path('/workspace/shared');O=R/'data/capitals-20261028';TZ='Europe/Lisbon'
raw=json.loads((S/'lisbon-capital-candidates-20261028.json').read_text());originalRaw=copy.deepcopy(raw)
def key(s):return hashlib.sha256(s.encode()).hexdigest()[:14]
packet={'cityId':'lisbon','checkedAt':raw['checkedAt'],'window':{'startDate':'2026-10-28','endDate':'2026-11-26'},'coverage':'Initial verified selection, not complete Lisbon coverage. Five real VisitLisboa calendar pages read (101 live cards vs102 cached result count); full selected details and official organizer corrections. Telegram announcement then chat previews reviewed separately; no invented access or imports. Real exhibitions retain ranges and hours; permanent attractions are not daily events. Some source and coordinate conflicts held.','events':[],'places':[],'sources':[],'pending':copy.deepcopy(raw.get('holdsAndExclusions',[]))+copy.deepcopy(raw.get('reserveHolds',[]))};places={};dedup={};pinAudit=[]
for p in raw['programmes']:
 if p['title']=='Life is the Game':
  packet['pending'].append({'title':p['title'],'sourceUrl':p['sourceUrl'],'reason':'Booking-only immersive slots not verified; museum opening envelope must not imply current slot availability.'});continue
 if p.get('cancelled') or p.get('soldOut') or str(p.get('publicationStatus','')).startswith('hold'):
  packet['pending'].append({'title':p['title'],'sourceUrl':p['sourceUrl'],'reason':'Cancelled, sold out or unresolved content.'});continue
 pin=None;v=p.get('verifiedCoordinates');rp=None
 if v:pin={'lat':v['latitude'],'lng':v['longitude'],'source':v.get('sourceUrl') or v.get('coordinateSourceUrl'),'precision':'venue_approximate','evidence':v.get('evidence','Official organizer map target, matched exact venue address.')+' '+v.get('precision',''),'checkedAt':p['checkedAt']}
 elif rp:pin={'lat':rp['latitude'],'lng':rp['longitude'],'source':rp['sourceUrl'],'precision':'venue_approximate','evidence':rp['evidence']+' '+rp['precision'],'checkedAt':rp['checkedAt']}
 if not pin:
  packet['pending'].append({'title':p['title'],'sourceUrl':p['sourceUrl'],'reason':'Venue coordinates not verified.'});continue
 year=p.get('dateEvidence')
 if not year:
  packet['pending'].append({'title':p['title'],'sourceUrl':p['sourceUrl'],'reason':'Reliable full-year evidence not established.'});continue
 venueName=p['venue'];venueid='lisbon-venue-'+key(venueName+'|'+p['address']);pinAudit.append({'venue':p['venue'],'address':p['address'],**pin})
 admission=' '.join(str(v) for v in [p.get('restrictions'),p.get('notes'),('Last admission '+p['lastAdmission']) if p.get('lastAdmission') else None] if v)
 urls=list(dict.fromkeys([p['sourceUrl']]+p.get('sourceUrls',[])+p.get('additionalEvidenceUrls',[])+([p['sourceApiUrl']] if p.get('sourceApiUrl') else [])))
 base={'title':p['title'],'titleEn':p['title'],'venue':p['venue'],'venueEn':p['venue'],'venueId':venueid,'address':p['address'],'category':'cinema' if p['normalizedCategory']=='film' else p['normalizedCategory'],'lat':pin['lat'],'lng':pin['lng'],'coordinateSource':pin['source'],'coordinatePrecision':pin['precision'],'coordinateEvidence':pin['evidence'],'source':'VisitLisboa / verified organizer' if str(p.get('sourceId','')).startswith('visitlisboa-') else 'Lisbon official organizer','sourceUrl':p['sourceUrl'],'sourceURLs':urls,'checkedAt':p['checkedAt'],'yearEvidence':year if isinstance(year,str) else json.dumps(year,ensure_ascii=False),'currency':'EUR','timezone':TZ,'language':p.get('language'),'status':'scheduled','admission':admission or None,'description':admission,'descriptionEn':admission}
 def price_fields(price):
  price=price or {};amount=price.get('standard') if 'standard' in price else price.get('regular');note=price.get('text')
  if not note and price:
   labels={'standard':'Standard','regular':'Regular','discount':'Concession (eligibility required)','early':'Early ticket','earlyBird':'Early ticket','doorCash':'At door, cash','coupleWithWine':'Two people with wine','duo':'Two people','singleWithoutMat':'One person without mat','singleWithMat':'One person with mat','pairWithoutMats':'Two people without mats','pairWithMats':'Two people with mats','family':'Family','possibleServiceFee':'Possible booking fee'}
   parts=[label+' EUR '+str(price[k]) for k,label in labels.items() if price.get(k) is not None]
   z=price.get('zonePrices') or {};vals=[v for k,v in z.items() if k.endswith('_price') and v is not None]
   if vals:parts.append('Seat-zone prices EUR '+', '.join(vals)+'; choose actual seat with organizer')
   for option in price.get('specialPrices') or []:parts.append('Special category '+option.get('name','')+' EUR '+str(option.get('price'))+'; eligibility not established')
   if price.get('type'):parts.append(price['type'])
   if price.get('fees') is None:parts.append('Mandatory fees, if any, not verified')
   note='; '.join(parts) or None
  extra={k:v for k,v in price.items() if k not in ['standard','regular','text','currency'] and v is not None}
  if extra: note=(note+'; ' if note else '')+json.dumps(extra,ensure_ascii=False)
  return {'price':amount,'priceNote':note,'priceMax':None}
 base.update(price_fields(p.get('price')))
 if p['title'] in ['English-language exhibition tours at Niguliste Museum','Winter Wellness Cooking Workshop']:base['language']='English'
 if p.get('id')=='opera-ajalooloengute-sari-estonia-teatri-jalgedes-2':base['language']='Estonian'
 if venueid not in places:places[venueid]={**{k:base[k] for k in ['lat','lng','address','coordinateSource','coordinatePrecision','coordinateEvidence','source','sourceUrl','checkedAt','timezone','currency']},'id':venueid,'title':venueName,'titleEn':venueName,'category':'city','operatingStatusVerified':False,'openingNote':'Venue identified in a dated current programme; regular hours outside the programme not verified. Building-level point, not a specific room or entrance.','openingNoteEn':'Venue identified in a dated current programme; regular hours outside the programme not verified. Building-level point, not a specific room or entrance.'}
 if p['eventKind']=='exhibition':
  h=p.get('openingHours') or {};hours={};schedule={}
  for name,abbr in [('Monday','mon'),('Tuesday','tue'),('Wednesday','wed'),('Thursday','thu'),('Friday','fri'),('Saturday','sat'),('Sunday','sun')]:
   value=h.get(name);parts=re.findall(r'\d{2}:\d{2}',value or '')
   if value=='closed':hours[abbr]=None;schedule[name]=None
   elif len(parts)==2:hours[abbr]=parts;schedule[name]=parts
  if not p.get('startDate') or not p.get('endDate') or len(hours)!=7:
   packet['pending'].append({'title':p['title'],'sourceUrl':p['sourceUrl'],'reason':'Exhibition range or complete visiting hours not established.'});continue
  if p.get('closedDates'):
   schedule={};day=datetime.date.fromisoformat(p['startDate']);last=datetime.date.fromisoformat(p['endDate'])
   while day<=last:
    date=day.isoformat(); h=hours.get(day.strftime('%a').lower())
    if h and date not in p['closedDates']:schedule[date]=h
    day+=datetime.timedelta(days=1)
  e={**base,'id':'lisbon-'+key(p['sourceUrl']+'|'+p['title']),'date':p['startDate'],'endDate':p['endDate'],'time':None,'end':None,'dateType':'published_interval','openingHours':hours,'openingHoursKnown':True,'openingHoursSource':next((u for u in urls if 'visitlisbon' not in u),p['sourceUrl']),'visitSchedule':schedule,'visitScheduleSource':next((u for u in urls if 'visitlisbon' not in u),p['sourceUrl'])}
  if p.get('closedDates'):
   e.pop('openingHours',None);e['closedDates']=p['closedDates']
  packet['events'].append(e)
 for occ in p.get('occurrences',[]):
  if occ.get('cancelled') or occ.get('soldOut'):
   packet['pending'].append({'title':p['title'],'occurrence':occ,'reason':'Cancelled or sold out'});continue
  date,time=occ['date'],occ.get('startTime')
  if not time or not '2026-10-28'<=date<='2026-11-26':continue
  ident=re.sub(r'\W+','',p['title'].lower())+'|'+venueid+'|'+date+'|'+time
  if ident in dedup:
   dedup[ident]['sourceURLs']=list(dict.fromkeys(dedup[ident]['sourceURLs']+urls));continue
  e=copy.deepcopy(base);e.update(id='lisbon-'+key(ident),date=date,time=time,startAt=datetime.datetime.fromisoformat(date+'T'+time).replace(tzinfo=ZoneInfo(TZ)).isoformat(),end=None)
  if occ.get('price'):e.update(price_fields(occ['price']))
  if occ.get('sourceUrl'):e['sourceUrl']=occ['sourceUrl'];e['sourceURLs']=list(dict.fromkeys([occ['sourceUrl']]+urls))
  if occ.get('language'):e['language']=occ['language']
  e['admission']=' '.join(x for x in [e.get('admission'),occ.get('booking'),('Limited tickets remaining at source check.' if occ.get('lastTickets') else None)] if x)
  if occ.get('ticketUrl') and not occ.get('ticketUrlWarning'):e['ticketUrl']=occ['ticketUrl']
  if occ.get('endTime') and not occ.get('endTimeApproximate'):
   end=datetime.datetime.fromisoformat(date+'T'+occ['endTime']).replace(tzinfo=ZoneInfo(TZ))
   if end<=datetime.datetime.fromisoformat(e['startAt']):end+=datetime.timedelta(days=1)
   e['end']=occ['endTime'];e['endAt']=end.isoformat()
  if occ.get('durationMinutes') or p.get('durationMinutes'):e['durationMinutes']=occ.get('durationMinutes') or p['durationMinutes']
  notes=[]
  if occ.get('doorsTime'):notes.append('Doors '+occ['doorsTime']+'; performance '+time)
  if occ.get('programmeStartTime'):notes.append('Public practice opens '+time+'; main competition '+occ['programmeStartTime']+'. Final activity time is not a verified ending.')
  if occ.get('endTimeApproximate'):notes.append('Organizer approximate finish '+occ['endTime']+'; not treated as exact end time.')
  if occ.get('programmeTitle'):notes.append(occ['programmeTitle'])
  if notes:e['timeNote']=' '.join(notes);e['timeNoteEn']=e['timeNote']
  packet['events'].append(e);dedup[ident]=e
used={e['venueId'] for e in packet['events']};packet['places']=[v for k,v in places.items() if k in used]

sourceRows=[('VisitLisboa official broad calendar','https://www.visitlisboa.com/en/events','official_city_calendar','five_actual_pages_read','101live cards vs102cached. Five pages, not a claim of full city coverage.'),('AgendaLX','https://www.agendalx.pt/','official_city_calendar','unavailable','Reader520/direct errorbody; no bypass.')]
for name,url,typ,status,note in sourceRows:packet['sources'].append({'id':'lisbon-source-'+key(url),'name':name,'url':url,'type':typ,'status':status,'checkedAt':raw['checkedAt'],'note':note})
for u in sorted({e['sourceUrl'] for e in packet['events']}):packet['sources'].append({'id':'lisbon-source-'+key(u),'name':'Lisbon verified dated announcement','url':u,'type':'official_announcement','status':'full_detail_read','checkedAt':next(e['checkedAt'] for e in packet['events'] if e['sourceUrl']==u),'note':'Full programme read; access and price restrictions retained. Not full venue coverage.'})
tg=json.loads((S/'lisbon-telegram-audit-20261028.json').read_text())
for row in tg['announcementChannels']+tg['conversationalChats']:
 packet['sources'].append({'id':'lisbon-source-'+key(row['url']),'name':'Lisbon public Telegram '+row['url'].split('/')[-1],'url':row['url'],'type':'telegram','status':row['status'],'checkedAt':tg['checkedAt'],'note':row.get('scope') or row.get('read') or 'Public profile only; no verified event import.'})
for name,obj in [('lisbon-packet',packet),('lisbon-research',originalRaw),('lisbon-venue-pins',pinAudit)]: (O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'events':len(packet['events']),'sessions':sum(e.get('dateType')!='published_interval' for e in packet['events']),'ranges':sum(e.get('dateType')=='published_interval' for e in packet['events']),'programmes':len({e['title'] for e in packet['events']}),'places':len(packet['places']),'pending':len(packet['pending'])}))
