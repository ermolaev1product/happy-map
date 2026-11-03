import json,pathlib,subprocess,re,hashlib,datetime,copy,collections
from zoneinfo import ZoneInfo
R=pathlib.Path('/workspace/scratch/59f6a13c9f12/happymap-oct24/repo');base='6c460a54232755eab9e5adac3201833795a1618f';out=R/'data/morning-control-20261024';out.mkdir(exist_ok=True)
cs=json.load(open(R/'public/city-picker.json'))['cities'];basefeeds={};adds=[];held=[];dups=[];audits=[];corrections=[]
def norm(s):return re.sub(r'\W','',str(s).lower())
def urlkey(u):
 u=re.sub(r'^https?://(?:www\.)?','',u).split('?')[0].rstrip('/');m=re.search(r'tomsarkgh.am/(?:en|ru|hy)/event/(\d+)',u)
 if m:return 'toms:'+m[1]
 return u.replace('biletebi.ge/en/','biletebi.ge/')
for c in cs:
 p='public/'+('' if c['id']=='tbilisi' else c['id']+'/')+'events.json';basefeeds[c['id']]=json.loads(subprocess.check_output(['git','show',base+':'+p],cwd=R))
# Explicit semantic equivalences confirmed by source + venue + local datetime, not title similarity alone.
skip_titles={'Halloween Horror Circus','Halloween at Astral Game Bar','Infamous Offspring — Ultima Vez','Fröken Julie','Is That a Man?!','Mozart and Salieri','The Kugelmass','Three Ties and an Angel','God Save Us and People','Symphonic Europe — Alice Sara Ott','The Sound of Time','Darispan’s Trouble','OPUS: Classic Music Evening | Season Opening','The Train Has Already Left','Flight LP 43-20','Waiting for Godot','Night Show Band - Batumi'}
skip_titles.update({'Chinchraka', 'We Are Performing Kvachi Kvachantiradze', 'Bandits of the Dense Forest', 'Mother of Leuville', 'I See the Sun', 'The Chief of Red Skins', 'Spineless', 'Համերգ. «Վիվա Վերդի»', 'Aladdin — Youth Theatre', 'The Three Little Pigs — Youth Theatre', 'Matchmaker', 'Flying Lizard Qartula', 'Refugee Pass', 'Թիմ Բարթոնի տիեզերքը․ Mystery Ensemble'})

skip_titles.update({'Halloween Rave','Naturtalent 2026 — Preisverleihung und Saatguttauschbörse'})

skip_titles.update({'Hamlet — Youth Theatre','First They Died, Then They Got Married','Oh My God','Project Malome — Live Music'})

for file in sorted(pathlib.Path('/workspace/shared').glob('oct24-*.json'),key=lambda p:(0 if p.name=='oct24-tkt-reviewed.json' else 1,p.name)):
 if file.name in {'oct24-east-supplement.json','oct24-workbook-map.json'}:continue
 try:packet=json.load(open(file))
 except:continue
 if not any(k in packet for k in ['events','sourceAudit','sourceAudits','sourceChecks']):continue
 (out/file.name).write_text(json.dumps(packet,ensure_ascii=False,indent=2))
 for fix in packet.get('existingCorrections',[]):
  if fix.get('id')=='ldn-c7d455c966c6ea66':fix['updates'].update(kind='event',ongoing=True,scheduleType='daily_opening_hours',visitingHours={'start':'10:00','end':'23:00','weekdays':[0,2,3,4,5,6]})
  corrections.append(fix)
 audits+=packet.get('sourceAudit',packet.get('sourceAudits',packet.get('sourceChecks',[])))
 held+=packet.get('holds',packet.get('held',[]))
 for e0 in packet.get('events',[]):
  e=copy.deepcopy(e0);city=e.get('cityId');city={'tel-aviv':'tel-aviv'}.get(city,city);date=e.get('date');title=e.get('title','');reason=None
  if (city=='tbilisi' and date=='2026-11-12' and title in {'The Cricket and the Ant','Bandits of the Dense Forest'}) or e.get('id') in {'tkt:508282','tkt:508288','tkt:508289'}:reason='same venue/time activities lack independent-room/programme clarification; held pending organizer'
  elif title in {'August. Okrokhana','Watch Out, the Addamses','Vera Ufoma Ukuwrere — Wurzeln im Wind'}:reason='unresolved programme identity conflict against current source; organizer check required'
  elif e.get('publicationStatus')=='held_for_recheck':reason='source conflict held for recheck'
  elif city not in basefeeds:reason='unknown city'
  elif not date:reason='missing date'
  elif (e.get('endDate') or date)<'2026-10-24' or date>'2026-11-22':reason='outside 30-day target window'
  elif not all(isinstance(e.get(k),(int,float)) for k in ['lat','lng']):reason='unverified venue coordinates'
  elif not e.get('coordinateSource') or not e.get('address') or not e.get('venue'):reason='missing venue/address/coordinate evidence'
  elif not e.get('sourceUrl') or not e.get('checkedAt'):reason='missing source evidence'
  if reason:held.append({'event':e,'reason':reason});continue
  existing=basefeeds[city]['events']+[x for x in adds if x['cityId']==city]
  match=[b for b in existing if e.get('id') and b.get('id')==e.get('id')]
  match +=[b for b in existing if b.get('date')==date and b.get('time')==e.get('time') and ((urlkey(b.get('sourceUrl',''))==urlkey(e['sourceUrl']) and urlkey(e['sourceUrl'])) or norm(b.get('title'))==norm(title))]
  if e.get('timeBasis')=='doors' or e.get('doors'):
   match +=[b for b in existing if b.get('date')==date and urlkey(b.get('sourceUrl',''))==urlkey(e['sourceUrl'])]
  if title in skip_titles:
   match +=[b for b in existing if b.get('date')==date and b.get('time')==e.get('time') and isinstance(b.get('lat'),(int,float)) and abs(b['lat']-e['lat'])+abs(b['lng']-e['lng'])<.003]
  if match:
   for b in match:
    if b in adds:b['sourceURLs']=list(dict.fromkeys(b.get('sourceURLs',[])+[e['sourceUrl']]));b.setdefault('additionalEvidence',[]).append({'url':e['sourceUrl'],'checkedAt':e['checkedAt'],'title':e['title']})
   dups.append({'candidate':e,'existingIds':list({b['id'] for b in match})});continue
  if e.get('timeBasis')=='doors':
   e['doors']=e.get('time');e['time']=None;e['startAt']=None
  identity='|'.join([city,urlkey(e['sourceUrl']),date,str(e.get('time')),norm(e['venue']),norm(title)])
  e['id']=e.get('id') or 'm24-'+city+'-'+hashlib.sha256(identity.encode()).hexdigest()[:14]
  e['programmeId']=e.get('programmeId') or 'programme-'+hashlib.sha256((city+'|'+urlkey(e['sourceUrl'])+'|'+norm(title)+'|'+norm(e['venue'])).encode()).hexdigest()[:16]
  e['sourceCategory']=e.get('category');e['category']={'family':'kids','exhibition':'art','lecture':'talk','theater':'theatre','comedy':'theatre','cinema':'film','community':'other','city':'other','festival':'other','dance':'theatre'}.get(e.get('category'),e.get('category'))
  e['kind']='event';e['status']='scheduled';e['publicationStatus']='verified';e['availabilityVerified']=False
  e['sourceURLs']=list(dict.fromkeys([e['sourceUrl']]+e.get('sourceURLs',[])));e['source']=e.get('source') or re.sub(r'^https?://','',e['sourceUrl']).split('/')[0]
  e['placeId']=e.get('placeId') or e.get('venueId') or 'venue-'+hashlib.sha256((city+'|'+norm(e['venue'])+'|'+norm(e['address'])).encode()).hexdigest()[:16]
  e['venueId']=e.get('venueId') or e['placeId'];e['language']=e.get('language') or None
  if e.get('time') and not e.get('startAt'):e['startAt']=datetime.datetime.fromisoformat(date+'T'+e['time']).replace(tzinfo=ZoneInfo(e['timezone'])).isoformat()
  if e.get('restrictions'):e['accessNote']=e['restrictions']
  if e.get('endAt'):
   end=datetime.datetime.fromisoformat(e['endAt'].replace('Z','+00:00')).astimezone(ZoneInfo(e['timezone']));e['endDate']=end.date().isoformat();e['end']=end.strftime('%H:%M')
  if e.get('price') is None:e['price']=None
  if e.get('price') is not None:e['priceLabel']=('from ' if e.get('min') else '')+str(e['price'])+' '+e.get('currency','')
  if isinstance(e.get('openingHours'),dict) and e.get('endDate'):
   names=['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];e['visitSchedule']={};e['ongoing']=True;e['scheduleType']='daily_opening_hours'
   d=datetime.date.fromisoformat(e['date']);last=datetime.date.fromisoformat(e['endDate'])
   while d<=last:
    hours=e['openingHours'].get(names[d.weekday()])
    for span,h in e.get('openingHoursExceptions',{}).items():
     bounds=span.split('/')
     if len(bounds)==2 and bounds[0]<=d.isoformat()<=bounds[1]:hours=h
    matchhours=re.fullmatch(r'(\d{2}:\d{2})[–—-](\d{2}:\d{2})',hours or '')
    if matchhours:e['visitSchedule'][d.isoformat()]={'start':matchhours[1],'end':matchhours[2]}
    d+=datetime.timedelta(days=1)
   e.pop('startAt',None)
  if e.get('openingHours') and title=='Andrés Galeano: Himmelsstudien':
   e.update(ongoing=True,scheduleType='daily_opening_hours',time='09:00',end='17:00',closedWeekdays=[0,6],visitingHours={'start':'09:00','end':'17:00','weekdays':[1,2,3,4,5]});e.pop('startAt',None)
  if title=='Cayetana. Grande de España':
   e['ongoing']=True;e['time']=None;e.pop('startAt',None);e.pop('end',None);e.pop('visitSchedule',None)
   e['visitingHoursNote']=e['openingHours']+'; afternoon break 14:00–16:00. Consult venue hours; not marked open now.'
  if title=='La transición estética. España, 1960-2020':
   e['scheduleType']='daily_opening_hours';e['ongoing']=True;e['closedDates']=['2027-01-01','2027-01-06'];e['visitSchedule']={}
   d=datetime.date.fromisoformat(e['date']);end=datetime.date.fromisoformat(e['endDate'])
   while d<=end:
    e['visitSchedule'][d.isoformat()]={'start':'10:00','end':'14:00' if d.weekday()==6 else '20:00'};d+=datetime.timedelta(days=1)
  for k in ['duplicateCandidates','existingMatches','dedupeStatus','match']:e.pop(k,None)
  adds.append(e)
for c in cs:
 city=c['id'];a=[e for e in adds if e['cityId']==city]
 if not a:continue
 for locale in ['', 'en/']:
  p='public/'+locale+('' if city=='tbilisi' else city+'/')+'events.json';feed=json.loads(subprocess.check_output(['git','show',base+':'+p],cwd=R));localized=copy.deepcopy(a)
  if locale or city=='palo-alto':
   for e in localized:
    if e.get('titleEn'):e['title']=e['titleEn']
  for fix in corrections:
   if fix.get('cityId')==city:
    for old in feed['events']:
     if old['id']==fix['id']:
      old.setdefault('verificationHistory',[]).append({'previousValues':{k:old.get(k) for k in fix.get('updates',{'publicationStatus':None})},'action':'source_verified_correction' if fix.get('updates') else 'held_for_recheck','reason':fix['reason'],'evidence':fix['evidence']})
      if fix.get('updates'):old.update(fix['updates'])
      else:old['publicationStatus']='held_for_recheck';old['recheckReason']=fix['reason'];old['recheckEvidence']=fix['evidence']
  feed['events']+=localized;feed['generatedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();feed['lastPartialRefresh']={'batch':'morning-primary-afisha-20261024','baseCommit':base,'added':len(a),'coverage':'Only verified detailed announcements; primary-source coverage partial. See dated source audit; unchanged sources not rechecked.'}
  (R/p).write_text(json.dumps(feed,ensure_ascii=False,indent=2)+'\n')
for n,d in [('added-events',adds),('held-candidates',held),('deduplication',dups),('source-checks',audits),('existing-corrections',corrections)]: (out/(n+'.json')).write_text(json.dumps(d,ensure_ascii=False,indent=2))
print(json.dumps({'added':len(adds),'byCity':dict(collections.Counter(e['cityId'] for e in adds)),'held':len(held),'duplicates':len(dups),'sourceChecks':len(audits)}))
