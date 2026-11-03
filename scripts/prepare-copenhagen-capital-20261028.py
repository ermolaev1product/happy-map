import json,pathlib,copy,hashlib,datetime
from zoneinfo import ZoneInfo
R=pathlib.Path(__file__).resolve().parents[1];S=pathlib.Path('/workspace/scratch/59f6a13c9f12/capitals-recovery/copenhagen');O=R/'data/capitals-20261028';raw=json.loads((S/'candidates.json').read_text());TZ='Europe/Copenhagen'
def key(x):return hashlib.sha256(x.encode()).hexdigest()[:14]
translations=json.loads((S.parent/'copenhagen-en-translations.json').read_text())['programmes']
endEvidence=json.loads((S/'end-evidence.json').read_text())
# Full source snapshot remains immutable; only independently reviewed fields below are normalized.
p={'cityId':'copenhagen','checkedAt':raw['checkedAt'],'window':{'startDate':raw['windowStart'],'endDate':raw['windowEnd']},'coverage':'Initial verified selection, not complete Copenhagen coverage. Earlier broad discovery and 11 listing pages preceded a workspace loss; this recovered publication uses fresh reads of 47 previously observed complete municipal programme URLs plus 27 official programme checks and fresh named/address geometry. The original listing pagination is not claimed newly reread. Later weeks rely substantially on explicitly dated recurring programmes. Commercial music and nightlife remain underrepresented. Public Telegram announcements were old or incomplete; chat messages behind Join Group were not read. No Telegram imports or access-control bypass.','events':[],'places':[],'sources':[],'pending':copy.deepcopy(raw['holdsAndExclusions'])};places={}
standard={'cph-11':90,'cph-120':130,'cph-127':50,'cph-90':110,'cph-96':80,'cph-L54':75,'cph-museum':110}
category={'tour':'city','museum':'art','exhibition':'art','family':'kids','food':'food','literature':'talk','concert':'music','theatre':'theatre','sport':'sport','workshop':'workshop','talk':'talk','dance':'workshop','music':'music','games':'city','community':'city','film':'film'}
for r in raw['programmes']:
 if r.get('status')!='candidate_checked_not_published':p['pending'].append(r);continue
 if r.get('rangeNeedsFreshPrimaryConfirmation'):raise ValueError('Range still needs fresh primary confirmation')
 if r['id'] in ['cph-72','cph-146']:
  p['pending'].append({'programme':r,'reason':'Doors-only start has not been confirmed' if r['id']=='cph-72' else 'Members-only programme not promoted as a public drop-in event','status':'held_for_recheck'});continue
 pin=r['pinEvidence'];vid='copenhagen-venue-'+key(r['address']+'|'+str(r['latitude'])+'|'+str(r['longitude']));price=r.get('price') or {};amount=standard.get(r['id'],price.get('min'));ismin=r['id'] not in standard and price.get('min')!=price.get('max');note=price.get('details','')+'; mandatory fees, if any, not independently verified.'
 # The English sidecar is supplied by the same source reader and checked separately before render.
 tr=translations.get(r['id'],{});desc=r.get('summary');admission=r.get('restrictions');descEn=tr.get('summary') or tr.get('summaryEn');admissionEn=tr.get('restrictions') or tr.get('restrictionsEn')
 b={'title':r['title'],'titleEn':r['title'],'venue':r['venue'],'venueEn':r['venue'],'venueId':vid,'address':r['address'],'category':category[r['categories'][0]],'lat':r['latitude'],'lng':r['longitude'],'coordinateSource':pin['sourceUrl'],'coordinatePrecision':'venue_approximate','coordinateEvidence':pin['method']+'; '+pin['precision'],'source':'Copenhagen municipal / official venue programme','sourceUrl':r['sourceUrl'],'sourceURLs':r['sourceUrls'],'ticketUrl':r.get('ticketUrl'),'checkedAt':r['checkedAt'],'yearEvidence':r['yearEvidenceMethod']+' '+r['yearEvidenceUrl'],'currency':'DKK','timezone':TZ,'price':amount,'min':ismin,'priceMax':price.get('max'),'priceNote':note,'language':None,'status':'scheduled','description':desc,'descriptionEn':descEn,'admission':admission,'admissionEn':admissionEn,'programmeId':r['id']}
 if r['id']=='cph-113':b['language']='en'
 if r['id']=='cph-L62':b['language']='German; English subtitles'
 places.setdefault(vid,{**{k:b[k] for k in ['address','lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence','source','sourceUrl','checkedAt','currency','timezone']},'id':vid,'title':r['venue'],'titleEn':r['venue'],'category':'city','operatingStatusVerified':False,'openingNote':'Venue named in a current verified programme; ordinary hours outside that programme not verified.','openingNoteEn':'Venue named in a current verified programme; ordinary hours outside that programme not verified.'})
 if r.get('startDate') and r.get('endDate') and not r['occurrences']:
  x=copy.deepcopy(b);x.update(id='copenhagen-'+r['id']+'-'+r['startDate'].replace('-',''),date=r['startDate'],endDate=r['endDate'],dateType='published_interval',time=None,end=None,openingHoursKnown=True,openingHours=r['openingHours'],openingHoursSource=(r.get('rangeEvidence') or {}).get('sourceUrl',r['sourceUrl']));x.pop('openingHours',None);x['visitSchedule']={};d=datetime.date.fromisoformat(raw['windowStart']);last=datetime.date.fromisoformat(raw['windowEnd'])
  while d<=last:
   h=r['openingHours'].get(['mon','tue','wed','thu','fri','sat','sun'][d.weekday()])
   if h:x['visitSchedule'][d.isoformat()]=h
   d+=datetime.timedelta(days=1)
  x['visitScheduleSource']=x['openingHoursSource'];x['admission']+=' Visiting hours verified for the current 30-day review window; later holiday exceptions not checked.';x['admissionEn']=x['admission'];p['events'].append(x);continue
 for o in r['occurrences']:
  start={'cph-96':'20:15','cph-L59':'18:30'}.get(r['id'],o['startTime']);x=copy.deepcopy(b);x.update(id='copenhagen-'+r['id']+'-'+o['date'].replace('-','')+'-'+start.replace(':',''),date=o['date'],time=start,end=None,startAt=datetime.datetime.fromisoformat(o['date']+'T'+start).replace(tzinfo=ZoneInfo(TZ)).isoformat())
  # Calendar end is retained in research, not asserted as an actual ending.
  ev=endEvidence.get(r['id'],{});actualEnd=ev.get('actualEndTime')
  if ev.get('byWeekday'):actualEnd=(ev['byWeekday'].get(['mon','tue','wed','thu','fri','sat','sun'][datetime.date.fromisoformat(o['date']).weekday()]) or [None,None])[1]
  if actualEnd:
   x['end']=actualEnd;endDt=datetime.datetime.fromisoformat(o['date']+'T'+actualEnd).replace(tzinfo=ZoneInfo(TZ))
   if endDt<=datetime.datetime.fromisoformat(x['startAt']):endDt+=datetime.timedelta(days=1)
   x['endAt']=endDt.isoformat()
  if ev.get('durationMinutes'):x['durationMinutes']=ev['durationMinutes']
  if ev.get('sourceUrl'):x['sourceURLs']=list(dict.fromkeys(x['sourceURLs']+[ev['sourceUrl']]))
  if r['id']=='cph-123':x['durationMinutes']=120
  if r['id']=='cph-135':x['durationMinutes']=40
  if r['id']=='cph-96':x.update(timeNote='Doors 20:00; introductory lesson 20:15; social dance 21:15. Closing time not independently confirmed.',timeNoteEn='Doors 20:00; introductory lesson 20:15; social dance 21:15. Closing time not independently confirmed.')
  if r['id']=='cph-L59':x.update(timeNote='Doors 18:00; shared meal starts 18:30.',timeNoteEn='Doors 18:00; shared meal starts 18:30.')
  p['events'].append(x)
p['places']=list(places.values());seen=set()
for r in raw['programmes']:
 ev=endEvidence.get(r['id'],{})
 if ev.get('sourceUrl') and ev['sourceUrl'] not in r['sourceUrls']:r['sourceUrls'].append(ev['sourceUrl'])
for r in raw['programmes']:
 for u in r['sourceUrls']:
  if u in seen:continue
  seen.add(u);p['sources'].append({'id':'copenhagen-source-'+key(u),'name':'Read programme: '+r['title'],'url':u,'status':'read_full_dated_announcement','type':'official_programme','checkedAt':(endEvidence.get(r['id'],{}).get('checkedAt') if endEvidence.get(r['id'],{}).get('sourceUrl')==u else r['checkedAt']),'note':'Explicit dated occurrences read; source coverage is partial. Held programmes are not imported.'})
for s in [raw['mainSource'],raw['reserveSource']]+raw['telegramAudit']['announcements']+raw['telegramAudit']['chats']:
 u=s['url']
 if u not in seen:p['sources'].append({'id':'copenhagen-source-'+key(u),'name':u.split('/')[2]+' source review','url':u,'status':s['status'],'checkedAt':raw['checkedAt'],'note':s.get('finding') or s.get('limitations') or s.get('pagination') or 'Partial source review; not full import.'});seen.add(u)
for name,obj in [('copenhagen-packet',p),('copenhagen-research',raw),('copenhagen-translation-delta',translations)]: (O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
r=json.loads((R/'data/city-expansion/registry.json').read_text())
if not any(c['id']=='copenhagen' for c in r['newCities']):
 c=copy.deepcopy(r['newCities'][-1]);c.update(id='copenhagen',canonicalCity='Copenhagen',countryCode='DK',name={'ru':'Копенгаген','en':'Copenhagen','de':'Kopenhagen'},ianaTimezone=TZ,path='copenhagen/index.html',currency='DKK',nameLocativeRu='Копенгагене',eventLanguages=[{'code':'DA','label':'Датский','terms':['Danish','dansk','датский']},{'code':'EN','label':'Английский','terms':['English','английский']},{'code':'RU','label':'Русский','terms':['Russian','русский']}]);r['newCities'].append(c);r['countries']['DK']={'ru':'Дания','en':'Denmark','de':'Dänemark'};(R/'data/city-expansion/registry.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(len(p['events']),len(p['places']),len(p['sources']),len(p['pending']))
