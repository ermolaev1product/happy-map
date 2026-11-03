import json,hashlib,pathlib,datetime,copy,re,urllib.parse
from zoneinfo import ZoneInfo
R=pathlib.Path(__file__).resolve().parents[1];S=pathlib.Path('/workspace/shared');O=R/'data/capitals-20261028';TZ='Europe/Tallinn'
def read(a,b):
 p=S/a;return json.loads((p if p.exists() else O/b).read_text())
raw=read('tallinn-capital-candidates-20261028.json','tallinn-research.json');audit=read('tallinn-capital-coverage-audit-20261028.json','tallinn-coverage-audit.json');geo=read('tallinn-research/address-geocoder-audit.json','tallinn-address-geocoder-audit.json');reserve=read('tallinn-reserve-venue-pins-20261028.json','tallinn-reserve-venue-pins.json')
originalRaw=copy.deepcopy(raw)
finalQA=read('tallinn-final-content-qa-delta-20261028.json','tallinn-final-content-qa-delta.json')
for correction in finalQA['sourceUrlCorrections']:
 for p in raw['programmes']:
  if p.get('sourceId')==correction['sourceId']:
   p['sourceUrl']=correction['preferredReadOrganizerUrl'];p['checkedAt']=finalQA['checkedAt']
for change in finalQA['changes']:
 for p in raw['programmes']:
  if p.get('sourceId')!=change['sourceId']:continue
  p['additionalEvidenceUrls']=list(dict.fromkeys(p.get('additionalEvidenceUrls',[])+[change['additionalEvidenceUrl']]))
  p['checkedAt']=finalQA['checkedAt']
  if change.get('price'):p['price']=change['price']
  if change.get('restrictions'):p['restrictions']=change['restrictions']
  for occ in p['occurrences']:
   if occ['date']!=change['occurrenceDate']:continue
   for k in ['endTime','doorsTime']:
    if k in change:occ[k]=change[k]
   if change.get('approximateEndTime'):
    p['notes']=(p.get('notes') or '')+' Approximate organiser finish '+change['approximateEndTime']+'; not a verified exact end.'
raw['checkedAt']=finalQA['checkedAt']
def key(s):return hashlib.sha256(s.encode()).hexdigest()[:14]
byaddress={}
for row in geo:
 q=row.get('response',{})
 if q.get('name2')=='Tallinn' and q.get('type')=='E' and q.get('quality') in ['tapne_nr','tapne_lahiaadress'] and 59.3<float(q['l'])<59.5 and 24.5<float(q['b'])<24.95:
  byaddress[row['address']]={'lat':q['l'],'lng':q['b'],'source':row['sourceUrl'],'precision':'address_building_representative_point','evidence':'Estonian Land and Spatial Development Board official geocoder: exact street and building number in Tallinn, type E, quality '+q['quality']+'. '+q['normaddress']+'. Building address representative point, not a room/entrance or postcode centroid.','checkedAt':row['checkedAt'],'addressId':q['adsoid']}
byvenue={p['venue']:p for p in reserve['venues'] if p.get('status')=='verified'}
packet={'cityId':'tallinn','checkedAt':raw['checkedAt'],'window':{'startDate':'2026-10-28','endDate':'2026-11-26'},'coverage':'Initial verified selection across Tallinn, not complete coverage. Full103-row public VisitTallinn agenda response screened, deduplicated to91 programme IDs/51 overlapping the30-day horizon, followed by current organizer programmes and public Telegram previews. Exhibitions are real date ranges, not fabricated daily sessions. Some late-November dates have no timed programme in this selection. Telegram yearless/old material and inaccessible chat history imported nothing; Instagram/Threads not reviewed.','events':[],'places':[],'sources':[],'pending':copy.deepcopy(raw['holdsAndExclusions'])};places={};dedup={};pinAudit=[]
for p in raw['programmes']:
 if p.get('cancelled') or p.get('soldOut') or str(p.get('publicationStatus','')).startswith('hold'):
  packet['pending'].append({'title':p['title'],'sourceUrl':p['sourceUrl'],'reason':'Cancelled, sold out or unresolved content.'});continue
 pin=byaddress.get(p['address']);v=p.get('verifiedCoordinates');rp=byvenue.get(p['venue']) or (byvenue.get('Eesti Noorsooteater') if p['venue'].startswith('Eesti Noorsooteater') else None)
 if v:pin={'lat':v['latitude'],'lng':v['longitude'],'source':v['sourceUrl'],'precision':'venue_approximate','evidence':v.get('evidence','Official organizer map target, matched exact venue address.')+' '+v.get('precision',''),'checkedAt':p['checkedAt']}
 elif rp:pin={'lat':rp['latitude'],'lng':rp['longitude'],'source':rp['sourceUrl'],'precision':'venue_approximate','evidence':rp['evidence']+' '+rp['precision'],'checkedAt':rp['checkedAt']}
 if not pin:
  packet['pending'].append({'title':p['title'],'sourceUrl':p['sourceUrl'],'reason':'Venue coordinates not verified.'});continue
 year=p.get('dateEvidence')
 if not year:
  packet['pending'].append({'title':p['title'],'sourceUrl':p['sourceUrl'],'reason':'Reliable full-year evidence not established.'});continue
 venueName='Estonian National Opera' if p['venue'].startswith('Estonian National Opera') else p['venue'];venueid='tallinn-venue-'+key(venueName+'|'+p['address']);pinAudit.append({'venue':p['venue'],'address':p['address'],**pin})
 admission=' '.join(str(v) for v in [p.get('restrictions'),p.get('notes'),('Last admission '+p['lastAdmission']) if p.get('lastAdmission') else None] if v)
 if p.get('accessibilityRef')=='venueAccessNotes.opera':admission+=' '+raw['venueAccessNotes']['opera']['text']
 urls=list(dict.fromkeys([p['sourceUrl']]+p.get('sourceUrls',[])+p.get('additionalEvidenceUrls',[])+([p['sourceApiUrl']] if p.get('sourceApiUrl') else [])))
 base={'title':p['title'],'titleEn':p['title'],'venue':p['venue'],'venueEn':p['venue'],'venueId':venueid,'address':p['address'],'category':p['normalizedCategory'],'lat':pin['lat'],'lng':pin['lng'],'coordinateSource':pin['source'],'coordinatePrecision':pin['precision'],'coordinateEvidence':pin['evidence'],'source':'VisitTallinn / verified organizer' if p.get('sourceId') else 'Estonian National Opera' if 'opera.ee' in p['sourceUrl'] else 'Tallinn official organizer','sourceUrl':p['sourceUrl'],'sourceURLs':urls,'checkedAt':p['checkedAt'],'yearEvidence':year if isinstance(year,str) else json.dumps(year,ensure_ascii=False),'currency':'EUR','timezone':TZ,'language':p.get('language'),'status':'scheduled','admission':admission or None,'description':admission,'descriptionEn':admission}
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
  return {'price':amount,'priceNote':note,'priceMax':None}
 base.update(price_fields(p.get('price')))
 if p['title'] in ['English-language exhibition tours at Niguliste Museum','Winter Wellness Cooking Workshop']:base['language']='English'
 if p.get('id')=='culture-lab':base['admission']='Ages 11–15. Advance enrolment for the entire team programme is required; limited places. Not drop-in. Nov7/21 are workshops; Nov17/19/24 are studio continuation sessions for enrolled teams.'
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
  e={**base,'id':'tallinn-'+key(p['sourceUrl']+'|'+p['title']),'date':p['startDate'],'endDate':p['endDate'],'time':None,'end':None,'dateType':'published_interval','openingHours':hours,'openingHoursKnown':True,'openingHoursSource':next((u for u in urls if 'visittallinn' not in u),p['sourceUrl']),'visitSchedule':schedule,'visitScheduleSource':next((u for u in urls if 'visittallinn' not in u),p['sourceUrl'])};packet['events'].append(e)
 for occ in p.get('occurrences',[]):
  if occ.get('cancelled') or occ.get('soldOut'):
   packet['pending'].append({'title':p['title'],'occurrence':occ,'reason':'Cancelled or sold out'});continue
  date,time=occ['date'],occ.get('startTime')
  if not time or not '2026-10-28'<=date<='2026-11-26':continue
  ident=re.sub(r'\W+','',p['title'].lower())+'|'+venueid+'|'+date+'|'+time
  if ident in dedup:
   dedup[ident]['sourceURLs']=list(dict.fromkeys(dedup[ident]['sourceURLs']+urls));continue
  e=copy.deepcopy(base);e.update(id='tallinn-'+key(ident),date=date,time=time,startAt=datetime.datetime.fromisoformat(date+'T'+time).replace(tzinfo=ZoneInfo(TZ)).isoformat(),end=None)
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
for name,url,typ,status,note in [('VisitTallinn broad official calendar','https://www.visittallinn.ee/eng/visitor/see-do/events','official_city_calendar','complete_api_list_partial_organizer_review','Full103-row public API screened;91uniqueIDs51overlap. PublicUI fetches one list then filters; no claimed invented pagination. Not all eligible source programmes imported.'),('VisitTallinn public event feed',raw['coverageAudit']['sourceApiUrl'],'official_city_calendar','full_public_api_read','Full published announcement content read; raw coordinate and date conflicts corrected with organizer evidence or held.'),('Estonian Art Museum programmes','https://kunstimuuseum.ekm.ee/en/','official_organizer','partial_detail_review','Kumu, Niguliste, Kadriorg and Mikkel full programme/admission pages; true ranges, closures and special prices retained.'),('Estonian National Opera programme','https://opera.ee/en/','official_organizer','full_window_api_and_details','Public calendar and full production details; cancelled/sold-out sessions excluded, access/group requirements retained.'),('Fienta Tallinn organizer events','https://fienta.com/','official_linked_ticket','selected_full_details','Selected full dated organizer listings; not whole platform coverage.'),('Tallinn municipal activity calendar','https://huvi.tallinn.ee/en','official_city_calendar','selected_full_details','Named programme details; not full pagination.')]:packet['sources'].append({'id':'tallinn-source-'+key(url),'name':name,'url':url,'type':typ,'status':status,'checkedAt':raw['checkedAt'],'note':note})
for row in raw['coverageAudit']['telegram']:packet['sources'].append({'id':'tallinn-source-'+key(row['sourceUrl']),'name':'Tallinn public Telegram '+row['sourceUrl'].split('/')[-1],'url':row['sourceUrl'],'type':'telegram','status':row['status'],'checkedAt':raw['checkedAt'],'note':row['result']})
for name,obj in [('tallinn-packet',packet),('tallinn-research',originalRaw),('tallinn-final-content-qa-delta',finalQA),('tallinn-coverage-audit',audit),('tallinn-address-geocoder-audit',geo),('tallinn-reserve-venue-pins',reserve),('tallinn-venue-pins',pinAudit)]: (O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'events':len(packet['events']),'sessions':sum(e.get('dateType')!='published_interval' for e in packet['events']),'ranges':sum(e.get('dateType')=='published_interval' for e in packet['events']),'programmes':len({e['title'] for e in packet['events']}),'places':len(packet['places']),'pending':len(packet['pending'])}))
