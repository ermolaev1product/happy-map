import json,pathlib,copy,hashlib,datetime
from zoneinfo import ZoneInfo
R=pathlib.Path(__file__).resolve().parents[1];S=pathlib.Path('/workspace/scratch/59f6a13c9f12/capitals-recovery/dublin');O=R/'data/capitals-20261028';raw=json.loads((S/'candidates.json').read_text());ends=json.loads((S/'end-evidence.json').read_text());independent=json.loads((S/'independent-qa-0813.json').read_text());raw['telegramAudit']=independent['telegram'];raw['telegramAudit']['previousCheckedAt']=independent['telegram']['checkedAt'];TZ='Europe/Dublin'
def key(x):return hashlib.sha256(x.encode()).hexdigest()[:14]
p={'cityId':'dublin','checkedAt':raw['checkedAt'],'window':{'startDate':raw['windowStart'],'endDate':raw['windowEnd']},'coverage':'Initial verified Dublin City selection, not full coverage. Following a workspace loss, 55 known complete municipal announcements, 48 primary pages and 19 selected extra primary/ticket/reserve pages were freshly retrieved. Only selected programme facts were curated; this is not a new complete pagination crawl. Explicit current source intervals, admission and named venue pins are retained; uncertain endings are not asserted. Outer-county venues, sold-out programmes and conflicts remain held. Later dates and categories have gaps. Public Telegram review is separately dated; no automatic Telegram import or joining.','events':[],'places':[],'sources':[],'pending':copy.deepcopy(raw['holdsAndExclusions'])};places={};seen=set()
cat={'theatre':'theatre','tour':'city','workshop':'workshop','music':'music','festival':'city','market':'city','science':'talk','education':'talk','conference':'conference','comedy':'theatre','talk':'talk','art':'art'}
for r in raw['programmes']:
 assert r['status']=='candidate_checked_not_published'
 if r['id'] in ['dub-37','dub-martin-angolo-nov-2026','dub-bed-nov-2026','dub-better-call-solomons-james-joyce-and-the-solomons-family','dub-inclusive-accessible-tour-hilma-af-klint-artist-and-visionary-nov-2026']:r['pinEvidence']['method']='official_tourism_named_venue_embedded_map_marker'
 if r['id']=='dub-bed-nov-2026':r['restrictions']+=' Общий вход, только стоячие места.';r['restrictionsEn']+=' General admission; standing only.'
 if r['id']=='dub-57':ends[r['id']]['preserveScheduledEnd']=False;ends[r['id']]['classification']='explicit_official_municipal_event_body_access_window_primary_confirms_run_only'
 if r['id']=='dub-inclusive-accessible-tour-hilma-af-klint-artist-and-visionary-nov-2026':ends[r['id']]['sourceUrl']='https://www.nationalgallery.ie/whats-on/inclusive-accessible-tour-hilma-af-klint-artist-and-visionary'
 if r['id']=='dub-57':r['sourceUrl']='https://dublin.ie/whats-on/listings/art-source/'
 pin=r['pinEvidence'];vid='dublin-venue-'+key(r['address']+'|'+str(r['latitude'])+'|'+str(r['longitude']));pr=r['price'];amount=pr.get('min');minimum=amount is not None and (pr.get('max') is None or amount!=pr.get('max'));note=pr.get('details','')
 if r['id']=='dub-4':minimum=False
 if r['id']=='dub-martin-angolo-nov-2026':amount=24.40;minimum=False;note+=' Total including mandatory service charge: EUR24.40.'
 if r['id']=='dub-bed-nov-2026':amount=18.50;minimum=False;note+=' Total including mandatory service charge: EUR18.50.'
 if r['id']=='dub-37':amount=None;minimum=False
 b={'title':r['title'],'titleEn':r['title'],'venue':r['venue'],'venueEn':r['venue'],'venueId':vid,'address':r['address'],'category':cat[r['categories'][0]],'lat':r['latitude'],'lng':r['longitude'],'coordinateSource':pin['sourceUrl'],'coordinatePrecision':'venue_approximate','coordinateEvidence':pin['method']+'; '+pin['precision'],'source':'Dublin municipal / tourism / official organizer','sourceUrl':r['sourceUrl'],'sourceURLs':r['sourceUrls'],'ticketUrl':r.get('ticketUrl'),'checkedAt':r['checkedAt'],'yearEvidence':r['yearEvidenceMethod']+' '+r['yearEvidenceUrl'],'currency':'EUR','timezone':TZ,'price':amount,'min':minimum,'priceMax':amount if r['id'] in ['dub-martin-angolo-nov-2026','dub-bed-nov-2026'] else pr.get('max'),'priceNote':note,'priceNoteEn':note,'language':None,'status':'scheduled','description':r['summary'],'descriptionEn':r['summaryEn'],'admission':r['restrictions'],'admissionEn':r['restrictionsEn'],'programmeId':r['id']}
 places.setdefault(vid,{**{k:b[k] for k in ['address','lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence','source','sourceUrl','checkedAt','currency','timezone']},'id':vid,'title':r['venue'],'titleEn':r['venue'],'category':'city','operatingStatusVerified':False,'openingNote':'Venue identified in a current verified programme; ordinary visiting hours not independently confirmed.','openingNoteEn':'Venue identified in a current verified programme; ordinary visiting hours not independently confirmed.'})
 if not r['occurrences']:
  assert r['startDate'] and r['endDate'];x=copy.deepcopy(b);x.update(id='dublin-'+r['id']+'-'+r['startDate'].replace('-',''),date=r['startDate'],endDate=r['endDate'],dateType='published_interval',time=None,end=None,openingHoursKnown=False,openingHoursUnknown=True,openingNote='Published visiting windows 09:00–13:00 and 14:30–17:00; weekdays not confirmed, not evidence of open-now status.',openingNoteEn='Published visiting windows 09:00–13:00 and 14:30–17:00; weekdays not confirmed, not evidence of open-now status.');p['events'].append(x)
 for o in r['occurrences']:
  x=copy.deepcopy(b);x.update(id='dublin-'+r['id']+'-'+o['date'].replace('-','')+'-'+o['startTime'].replace(':',''),date=o['date'],time=o['startTime'],end=None,startAt=datetime.datetime.fromisoformat(o['date']+'T'+o['startTime']).replace(tzinfo=ZoneInfo(TZ)).isoformat());ev=ends[r['id']]
  if ev.get('durationMinutes'):x['durationMinutes']=ev['durationMinutes']
  elif ev.get('preserveScheduledEnd') and o.get('endTime'):
   x['end']=o['endTime'];dt=datetime.datetime.fromisoformat(o['date']+'T'+o['endTime']).replace(tzinfo=ZoneInfo(TZ))
   if dt<=datetime.datetime.fromisoformat(x['startAt']):dt+=datetime.timedelta(days=1)
   x['endAt']=dt.isoformat()
  p['events'].append(x)
 for u in r['sourceUrls']:
  if u in seen or not u.startswith('https://'):continue
  seen.add(u);p['sources'].append({'id':'dublin-source-'+key(u),'name':'Read programme: '+r['title'],'url':u,'status':'read_full_dated_announcement','type':'official_programme','checkedAt':r['checkedAt'],'note':'Fresh bounded recovery; selected programme facts verified, not a complete source import.'})
p['places']=list(places.values())
for s in [raw['mainSource'],raw['reserveSource']]+raw['telegramAudit']['announcements']+raw['telegramAudit']['chats']:
 u=s['url']
 if u not in seen:p['sources'].append({'id':'dublin-source-'+key(u),'name':u.split('/')[2]+' source review','url':u,'status':s['status'],'checkedAt':raw['telegramAudit']['previousCheckedAt'] if 't.me/' in u else raw['checkedAt'],'note':s.get('note') or s.get('limitations') or s.get('freshness') or s.get('description') or 'Selected details only; pagination not freshly rechecked.'});seen.add(u)
for name,obj in [('dublin-packet',p),('dublin-research',raw),('dublin-end-evidence',ends)]: (O/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
r=json.loads((R/'data/city-expansion/registry.json').read_text())
if not any(c['id']=='dublin' for c in r['newCities']):
 c=copy.deepcopy(r['newCities'][-1]);c.update(id='dublin',canonicalCity='Dublin',countryCode='IE',name={'ru':'Дублин','en':'Dublin','de':'Dublin'},ianaTimezone=TZ,path='dublin/index.html',currency='EUR',nameLocativeRu='Дублине',eventLanguages=[{'code':'EN','label':'Английский','terms':['English','английский']},{'code':'GA','label':'Ирландский','terms':['Irish','Gaeilge','ирландский']}]);r['newCities'].append(c);r['countries']['IE']={'ru':'Ирландия','en':'Ireland','de':'Irland'};(R/'data/city-expansion/registry.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(len(p['events']),len(p['places']),len(p['sources']),len(p['pending']))
