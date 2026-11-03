#!/usr/bin/env python3
"""Apply a reviewed, source-backed event bundle without dropping existing records.

Usage: python scripts/import-reviewed-research.py data/reviewed-events-YYYY-MM-DD.json
This is an editorial import, not a scraper. Pending examples never become events.
"""
import copy, datetime, json, math, re, sys, unicodedata
from pathlib import Path
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
CITY={'tbilisi':('public/events.json','Тбилиси','Грузия'), 'belgrade':('public/belgrade/events.json','Белград','Сербия'), 'moscow':('public/moscow/events.json','Москва','Россия'), 'yerevan':('public/yerevan/events.json','Ереван','Армения'), 'barcelona':('public/barcelona/events.json','Барселона','Испания'), 'madrid':('public/madrid/events.json','Мадрид','Испания')}
def load(p): return json.loads(p.read_text())
def write(p,d):
 compact=p.exists() and len(p.read_text().splitlines())<=2
 p.write_text(json.dumps(d,ensure_ascii=False,**({'separators':(',',':')} if compact else {'indent':2}))+'\n')
def norm(s): return re.sub(r'[^\w]','',unicodedata.normalize('NFKD',s or '').lower())
def url_key(url):
 u=urlsplit(url);host=u.netloc.lower().removeprefix('www.');path=u.path.rstrip('/')
 if host in ('telegram.me','t.me'): host='t.me';path='/'+path.removeprefix('/s/').lstrip('/')
 return host,path,u.query

def main(bundle_path):
 bundle=load(bundle_path); timestamp=bundle['checkedAt']; report={'checkedAt':timestamp,'batchId':bundle['batchId'],'events':[],'sources':{},'examples':bundle.get('examples',[])}
 catalogs={city:load(ROOT/path) for city,(path,_,_) in CITY.items()}
 imported_sources={city:{} for city in CITY}
 for item in bundle['items']:
  city=item['city']; action=item['action'];result={k:copy.deepcopy(v) for k,v in item.items() if k in ('example','city','reason','evidenceUrls')}
  if action=='pending': result['status']='pending';report['events'].append(result);continue
  event=copy.deepcopy(item['event']);verified_offers=copy.deepcopy(event.get('sources',[]));existing=next((e for e in catalogs[city]['events'] if e['id']==event['id']),None)
  if action=='update':
   assert existing is not None, f"Update target missing: {event['id']}"
   assert existing['date']==item['expectedDate'],f"Date changed: {event['id']}"
  elif action=='add':
   assert all(event.get(k) for k in ('id','title','date','venue','address','source','sourceUrl','coordinateSource')),event
   assert all(isinstance(event.get(k),(int,float)) and math.isfinite(event[k]) for k in ('lat','lng')),event
   assert event.get('time') is not None or event.get('ongoing'),f"Exact session time missing: {event['id']}"
   duplicate=next((e for e in catalogs[city]['events'] if e['id']!=event['id'] and e['date']==event['date'] and e.get('time')==event.get('time') and norm(e['title'])==norm(event['title']) and norm(e['venue'])==norm(event['venue']) and (not (e.get('cinemaSession') and event.get('cinemaSession')) or (e.get('hall')==event.get('hall') and e.get('language')==event.get('language')))),None)
   assert duplicate is None, f"Semantic duplicate: {duplicate}"
  else: raise ValueError(action)
  if existing:
   offers=copy.deepcopy(existing.get('sources') or [])
   for offer in event.pop('sources',[]):
    match=next((s for s in offers if url_key(s['url'])==url_key(offer['url'])),None)
    if match:match.update(offer)
    else:offers.append(offer)
   existing.update(event);existing['sources']=offers;target=existing;result['status']='updated' if action=='update' else 'already_present'
  else:
   catalogs[city]['events'].append(event);target=event;result['status']='added'
  if item.get('refreshOfferPrices'):
   for offer in target.get('sources',[]):
    if offer.get('checkedAt')==timestamp:
     offer.update({k:target.get(k) for k in ('price','min','priceLabel')})
    else:
     offer['price']=None;offer['min']=False;offer['supersededBy']=target['sourceUrl'];offer['priceNote']='Прежняя цена не переподтверждена; актуальные условия — в официальном источнике.'
  result['eventId']=target['id'];result['title']=target['title'];result['date']=target['date'];result['time']=target.get('time')
  report['events'].append(result)
  for offer in verified_offers:
   if offer.get('checkedAt'): imported_sources[city][offer['name']]=offer['url']
 # Save only editorial metadata for this partial addition; retain original horizon,
 # original per-record checks and stale flags. A few future entries do not extend city coverage.
 for city,catalog in catalogs.items():
  changed=[r for r in report['events'] if r['city']==city and r['status']!='pending']
  if changed:
   catalog['editorialUpdatedAt']=timestamp;catalog['generatedAt']=timestamp;catalog['latestResearchBatch']=bundle['batchId']
   suffix=bundle.get('coverageNote', ' Дополнение 9 октября: отдельные анонсы и уточнения из проверенных источников; остальные записи в этом проходе не перепроверялись. Более поздние события сохранены заранее, карта показывает ближайшие семь дней.')
   if suffix not in catalog.get('coverage',''):catalog['coverage']=catalog.get('coverage','')+suffix
   for name,url in imported_sources[city].items():
    count=sum(any(s['name']==name for s in e.get('sources',[])) for e in catalog['events'])
    entry=next((r for r in catalog.get('sourceRegistry',[]) if r['name']==name),None)
    fields={'name':name,'url':url,'status':'imported','type':'curated' if 't.me/' not in url else 'telegram','count':count,'checkedAt':timestamp,'publicNote':'Отдельные проверенные анонсы и уточнения. Это не полный импорт источника.'}
    if entry: entry.update(fields)
    else: catalog.setdefault('sourceRegistry',[]).append(fields)
    summary=next((r for r in catalog.get('sources',[]) if r['name']==name),None)
    if summary:summary.update({'url':url,'count':count})
    else:catalog.setdefault('sources',[]).append({'name':name,'url':url,'count':count})
   ids=[e['id'] for e in catalog['events']]; assert len(set(ids))==len(ids)
   write(ROOT/CITY[city][0],catalog)
 # Full source catalog is separate from event/venue collections.
 if bundle.get('sourceResearchFile'):
  source_bundle=load(ROOT/bundle['sourceResearchFile']);registry=load(ROOT/'public/sources.json');added=updated=0
  for r in source_bundle['sources']:
   country=next(v[2] for v in CITY.values() if v[1]==r['city']);key=(r['city'],url_key(r['url']))
   matches=[s for s in registry['sources'] if (s['city'],url_key(s['url']))==key]
   status=r['verification_original']
   if status in ('verified_current_programme','verified_current_event_posts','verified_current','current_dated_listing','current_dated_listing_in_search','current_schedule_in_search','current_program_listing'): mapped='dated_program'
   elif 'past' in status or 'archive' in status or status=='closed_venue_do_not_ingest':mapped='archive'
   elif any(x in status for x in ('not_read','not_fetched','unconfirmed','unknown','needs_check','not_extracted','untested','bad_date','requires_validation','freshness')):mapped='candidate'
   elif 'fetch' in status:mapped='blocked'
   else:mapped='reviewed'
   fields={'researchCheckedAt':r['checked_at'],'researchStatus':status,'researchEvidenceUrl':r['evidence_url'],'researchNotes':r['notes'],'priority':r['priority'],'categories':r['categories'],'languages':r['languages']}
   if matches:
    for s in matches:s.update(fields)
    updated+=1
   else:
    registry['sources'].append({'name':r['name'],'url':r['url'],'country':country,'city':r['city'],'type':'Telegram' if url_key(r['url'])[0]=='t.me' else 'Сайт','status':mapped,'notes':r['notes'],'checkedAt':r['checked_at'],**fields});added+=1
  registry['researchedAt']=timestamp
  registry['note']='Каталог открытых источников, не обещание полного импорта. Источники с неуточнёнными датами, ограниченным доступом или неподтверждённой программой отмечены отдельно. URL источника не является точкой на карте.'
  write(ROOT/'public/sources.json',registry)
  report['sources']={'added':added,'reviewedExisting':updated,'total':len(registry['sources']),'unit':'страницы / каналы, не независимые поставщики и не географические точки'}
 else:
  report['sources']={'added':0,'reviewedExisting':0,'total':len(load(ROOT/'public/sources.json')['sources']),'unchanged':True}
 write(ROOT/bundle['reportFile'],report)
 print(json.dumps({'batch':bundle['batchId'],'events':{s:sum(r['status']==s for r in report['events']) for s in ('added','updated','already_present','pending')},'sources':report['sources']},ensure_ascii=False))
if __name__=='__main__': main(Path(sys.argv[1]))
