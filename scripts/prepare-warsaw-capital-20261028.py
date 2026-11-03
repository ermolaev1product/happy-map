import json,hashlib,pathlib,datetime,copy,re
from zoneinfo import ZoneInfo
R=pathlib.Path(__file__).resolve().parents[1];S=pathlib.Path('/workspace/shared/warsaw-research');O=R/'data/capitals-20261028';TZ='Europe/Warsaw'
def read(name,archive):
 p=S/name;return json.loads((p if p.exists() else O/archive).read_text())
raw=read('frozen-candidates-0401.json','warsaw-research.json');rows=copy.deepcopy(raw['candidates']);deltas=[]
for name in ['qa-delta-0406.json','conference-delta-0408.json','radio-studio-delta.json']:
 p=S/name
 if p.exists():
  d=json.loads(p.read_text());deltas.append({'file':name,'data':d})
  for change in d.get('corrections',[]):
   row=rows[change['candidateIndex']]
   if change.get('title'):assert row['title']==change['title']
   if change['field']=='holidayHoursNote':row['holidayHoursNote']=change['value'];row['unconfirmedVisitDates']=['2026-11-01','2026-11-11']
   if change['field']=='coordinates.sourceUrl':
    assert row['coordinates']['sourceUrl']==change['old'];row['coordinates']['sourceUrl']=change['new'];row['coordinates']['checkedAt']=d['checkedAt']
  if d.get('candidates'):rows+=d['candidates']
  for new in d.get('newCandidates',[]):
   x=copy.deepcopy(new);x.update(id='warsaw-bielik-summit-20261126',localTime=x['startLocalTime'],localEndTime=x['endLocalTime'],timeZone=x['timezone'],priceQualifier=x['priceNote'],yearEvidence=x['yearEvidence']['text']);rows.append(x)
def key(s):return hashlib.sha256(s.encode()).hexdigest()[:14]
packet={'cityId':'warsaw','checkedAt':raw['audit']['checkedAt'],'window':{'startDate':'2026-10-28','endDate':'2026-11-26'},'coverage':'Initial verified selection, not complete Warsaw coverage. PIK music/theatre/exhibition pages and municipal calendars were partially reviewed first, then official venue programmes, public Telegram announcements and chat previews. Some calendar indexes linked to stale or conflicting details; those were held. Source pagination and late-November breadth remain incomplete. Exhibitions are real ranges, not daily sessions. No fresh Telegram event imported; Instagram/Threads not checked.','events':[],'places':[],'sources':[],'pending':copy.deepcopy(raw['audit']['holds'])};places={};dedup=set()
for p in rows:
 if p['status']!='candidate_checked_pending_integration' or p.get('soldOut') or not p.get('coordinates'):
  packet['pending'].append({'title':p['title'],'sourceUrl':p['sourceUrl'],'reason':p['status'],'candidate':p});continue
 pin=p['coordinates'];venueid='warsaw-venue-'+key(p['venue']+'|'+p['address']);amount=p.get('price');note=p.get('priceQualifier') or '';fee=p.get('mandatoryFees')
 if fee is not None:note+=' Mandatory fee PLN '+str(fee)+'.'
 elif amount is not None:note+=' Mandatory fees, if any, not independently verified.'
 if isinstance(amount,(int,float)) and isinstance(fee,(int,float)) and fee>0:amount+=fee;note+=' Displayed amount includes mandatory fee.'
 admission=' '.join(str(x) for x in [p.get('admission'),p.get('restrictions'),p.get('notes'),p.get('holidayHoursNote')] if x).replace('Venue address/pin pending. ','')
 urls=list(dict.fromkeys([p['sourceUrl']]+[v for v in [p.get('addressSource'),p.get('hoursSource'),p.get('closedDatesSource'),pin.get('addressSource'),(p.get('timeEvidence') or {}).get('url')] if v]))
 base={'id':p['id'],'title':p['title'],'titleEn':p['title'],'venue':p['venue'],'venueEn':p['venue'],'venueId':venueid,'address':p['address'],'category':{'concert':'music','lecture':'talk','tour':'city','exhibition':'art','family':'kids','cinema':'film','meetup':'city'}.get(p['category'],p['category']),'lat':pin['lat'],'lng':pin['lon'],'coordinateSource':pin['sourceUrl'],'coordinatePrecision':'venue_approximate','coordinateEvidence':pin['accuracy']+'; named venue/address matched, not a city/postcode centre.','source':'Warsaw local agenda / verified organizer','sourceUrl':p['sourceUrl'],'sourceURLs':urls,'ticketUrl':p.get('ticketUrl'),'checkedAt':p['checkedAt'],'yearEvidence':p['yearEvidence'],'currency':'PLN','timezone':TZ,'price':amount,'priceNote':note or None,'language':p.get('eventLanguage'),'status':'scheduled','admission':admission or None,'description':admission,'descriptionEn':admission}
 if (p.get('priceQualifier') or '').startswith('from'):base['min']=True
 if venueid not in places:places[venueid]={**{k:base[k] for k in ['lat','lng','address','coordinateSource','coordinatePrecision','coordinateEvidence','source','sourceUrl','checkedAt','timezone','currency']},'id':venueid,'title':p['venue'],'titleEn':p['venue'],'category':'city','operatingStatusVerified':False,'openingNote':'Venue named in a verified current programme; regular hours outside that programme not verified. Coordinates are building/venue approximations, not exact room or entrance.','openingNoteEn':'Venue named in a verified current programme; regular hours outside that programme not verified. Coordinates are building/venue approximations, not exact room or entrance.'}
 if p.get('recordType')=='date_range':
  
  for date in p.get('unconfirmedVisitDates',[]):packet['pending'].append({'title':p['title'],'date':date,'sourceUrl':p['sourceUrl'],'reason':'Holiday visiting hours unconfirmed; no ordinary open-window asserted. Not a confirmed closure.'})
  base.update(date=p['localDate'],endDate=p['endDate'],time=None,end=None,dateType='published_interval');hours=p.get('openingHours') or {};days=['mon','tue','wed','thu','fri','sat','sun'];week={k:None for k in days}
  for k,v in hours.items():
   parts=re.findall(r'\d{2}:\d{2}',v or '');value=parts if len(parts)==2 else None
   if k.lower()=='tue-sun':keys=days[1:]
   elif k.lower()=='sat,sun':keys=days[5:]
   else:keys=[x.lower()[:3] for x in k.split(',')]
   for day in keys:week[day]=value
  if hours:
   schedule={};d=datetime.date.fromisoformat(p['localDate']);end=datetime.date.fromisoformat(p['endDate'])
   while d<=end:
    h=week[days[d.weekday()]];date=d.isoformat()
    if h and date not in p.get('closedDates',[])+p.get('unconfirmedVisitDates',[]) and not(date==p['localDate'] and p.get('openingTime')):schedule[date]=h
    d+=datetime.timedelta(days=1)
   base.update(openingHoursKnown=True,visitSchedule=schedule,visitScheduleSource=p.get('hoursSource') or p['sourceUrl'],openingHoursSource=p.get('hoursSource') or p['sourceUrl'],closedDates=p.get('closedDates',[]))
   if p.get('openingTime'):base['admission']=(base.get('admission') or '')+' First-day vernissage is a separate timed listing; ordinary visiting windows begin the following day. No unverified vernissage end time.'
  else:base.update(openingHoursKnown=False,openingHoursUnknown=True)
  packet['events'].append(base);continue
 if not p.get('localTime') or not '2026-10-28'<=p['localDate']<='2026-11-26':continue
 ident=p['title'].lower()+'|'+venueid+'|'+p['localDate']+'|'+p['localTime']
 if ident in dedup:continue
 dedup.add(ident);base.update(date=p['localDate'],time=p['localTime'],end=p.get('localEndTime'),startAt=datetime.datetime.fromisoformat(p['localDate']+'T'+p['localTime']).replace(tzinfo=ZoneInfo(TZ)).isoformat())
 if p.get('localEndTime'):
  end=datetime.datetime.fromisoformat(p['localDate']+'T'+p['localEndTime']).replace(tzinfo=ZoneInfo(TZ))
  if end<=datetime.datetime.fromisoformat(base['startAt']):end+=datetime.timedelta(days=1)
  base['endAt']=end.isoformat()
 if p.get('durationMinutes'):base['durationMinutes']=p['durationMinutes']
 if p.get('doorsTime'):base['timeNote']='Doors '+p['doorsTime']+'; announced programme starts '+p['localTime'];base['timeNoteEn']=base['timeNote']
 packet['events'].append(base)
used={e['venueId'] for e in packet['events']};packet['places']=[v for k,v in places.items() if k in used]
for s in raw['audit']['sources']+raw['audit']['telegram']:
 packet['sources'].append({'id':'warsaw-source-'+key(s['url']),'name':s['url'].split('/')[2]+' '+s.get('scope','')[:70],'url':s['url'],'type':'telegram' if 't.me/' in s['url'] else 'city_agenda_or_organizer','status':s['status'],'checkedAt':raw['audit']['checkedAt'],'note':' '.join(x for x in [s.get('scope'),s.get('limitations')] if x)})
existing={s['url'] for s in packet['sources']}
for e in packet['events']:
 u=e['sourceUrl']
 if u not in existing:
  packet['sources'].append({'id':'warsaw-source-'+key(u),'name':'Read programme: '+e['title'],'url':u,'type':'direct_event_announcement','status':'read_dated_announcement','checkedAt':e['checkedAt'],'note':'Full named dated announcement read; not a claim of complete source/calendar coverage.'});existing.add(u)
for name,obj in [('warsaw-packet',packet),('warsaw-research',raw),('warsaw-deltas',deltas)]: (O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'events':len(packet['events']),'sessions':sum(e.get('dateType')!='published_interval' for e in packet['events']),'ranges':sum(e.get('dateType')=='published_interval' for e in packet['events']),'programmes':len({e['title'] for e in packet['events']}),'places':len(packet['places']),'pending':len(packet['pending'])}))
