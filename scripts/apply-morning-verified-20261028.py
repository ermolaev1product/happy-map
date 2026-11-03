"""Additive verified daily update, preserving v205 history and held packages."""
import json,re,copy,hashlib,datetime,math
from pathlib import Path
from zoneinfo import ZoneInfo
R=Path(__file__).resolve().parents[1];O=R/'data/morning-verified-20261028';O.mkdir(exist_ok=True)
NOW=datetime.datetime.now(datetime.timezone.utc);BATCH='morning-verified-20261028'
feeds={};added=[];held=[];duplicates=[];audits=[];corrections=[];newplaces=[];placesets={}
def path(c,what):return R/'public'/(''if c=='tbilisi'else c)/(what+'.json')
def feed(c):
 if c not in feeds:feeds[c]=json.loads(path(c,'events').read_text())
 return feeds[c]
def prows(c):
 if c not in placesets:placesets[c]=json.loads(path(c,'places').read_text())
 p=placesets[c];return p.get('places',[])if isinstance(p,dict)else p
def norm(s):return re.sub(r'[^\w]','',str(s)).casefold().replace('ё','е')
def near(a,b):return all(isinstance(a.get(k),(int,float))and isinstance(b.get(k),(int,float))for k in ['lat','lng'])and abs(a['lat']-b['lat'])<.0005 and abs(a['lng']-b['lng'])<.0007
packets=[]
for name in ['hm28-own','hm28-afisha','hm28-europe','hm28-global','hm28-eurasia']:
 p=Path('/workspace/shared')/(name+'.json');packet=json.loads(p.read_text());packets.append((name,packet));(O/(name+'.json')).write_text(json.dumps(packet,ensure_ascii=False,indent=2)+'\n')
for name,packet in packets:
 held+=packet.get('held',[])+packet.get('excluded',[])
 for key in ['sourceAudit','sourceChecks','sourceCheckAudit','audit']:
  a=packet.get(key,[]);audits+=a if isinstance(a,list)else[{'packet':name,'audit':a}]
 for raw in packet.get('candidates',[]):
  e=copy.deepcopy(raw);c=e.get('cityId');date=e.get('date');tm=e.get('time')
  if not c or not path(c,'events').exists():held.append({'candidate':e,'reason':'Unknown/unpublished city'});continue
  missing=[k for k in ['title','date','venue','address','timezone','sourceUrl','checkedAt','coordinateSource','yearEvidence']if not e.get(k)]
  if missing or not all(isinstance(e.get(k),(int,float))for k in ['lat','lng']):held.append({'candidate':e,'reason':'Missing required evidence '+str(missing)});continue
  if e.get('status')in ['held','held_for_recheck','cancelled'] or e.get('verificationStatus')in ['held','conflict']:held.append({'candidate':e,'reason':'Held/conflict'});continue
  if e.get('dateEnd'):e['endDate']=e['dateEnd']
  if tm:
   try:start=datetime.datetime.fromisoformat(date+'T'+tm).replace(tzinfo=ZoneInfo(e['timezone']))
   except Exception as ex:held.append({'candidate':e,'reason':'Invalid start '+str(ex)});continue
   e['startAt']=start.isoformat()
   if start<NOW:held.append({'candidate':e,'reason':'Already started; not added to public feed'});continue
  elif e.get('endDate',date)<NOW.astimezone(ZoneInfo(e['timezone'])).date().isoformat():held.append({'candidate':e,'reason':'Past'});continue
  rows=feed(c)['events']
  same=next((v for v in rows if (e.get('id')and e['id']==v['id'])or(v.get('date')==date and v.get('time')==tm and (norm(v.get('title'))==norm(e['title'])or(e.get('programmeId')and e['programmeId']==v.get('programmeId')))and(norm(v.get('venue'))==norm(e['venue'])or near(v,e)))),None)
  if same:duplicates.append({'cityId':c,'candidateTitle':e['title'],'date':date,'time':tm,'existingId':same['id'],'candidateId':e.get('id')});continue
  e.setdefault('id','morning28-'+c+'-'+hashlib.sha256((e['sourceUrl']+'|'+date+'|'+str(tm)+'|'+e['title']+'|'+e['venue']).encode()).hexdigest()[:14])
  e.update(kind='event',status='scheduled',publicationStatus='verified',researchBatch=BATCH)
  e['category']={'lecture':'talk','exhibition':'art','exhibitions':'art','party':'nightlife','children':'kids','family':'kids','concert':'music'}.get(e.get('category'),e.get('category'))
  for k in ['price','currency','mandatoryFees','language']:e.setdefault(k,None)
  if e.get('language')=='':e['language']=None
  for old,new in [('titleEN','titleEn'),('venueEN','venueEn'),('addressEN','addressEn')]:
   if e.get(old):e[new]=e.pop(old)
  e.setdefault('programmeId','programme-'+hashlib.sha256((c+'|'+norm(e['title'])+'|'+norm(e['venue'])).encode()).hexdigest()[:16]);e.setdefault('availabilityVerified',False)
  e.setdefault('accessNote',e.get('admission')or e.get('access'))
  e['sourceURLs']=list(dict.fromkeys(e.get('sourceURLs',[])+e.get('evidenceUrls',[])+[e['sourceUrl']]))
  if e.get('category')=='cinema':e['category']='film'
  if e.get('category')=='film':e['cinemaSession']=True
  if e.get('endTime')or(e.get('end')and re.fullmatch(r'\d\d:\d\d',e['end'])):
   endtm=e.get('endTime')or e['end'];end=datetime.datetime.fromisoformat(e.get('endDate',date)+'T'+endtm).replace(tzinfo=ZoneInfo(e['timezone']));e['endAt']=end.isoformat()
  elif e.get('end')and'T'in e['end']:e['endAt']=e['end']
  else:e.setdefault('endAt',None)
  # Prefer current place identity; never replace existing places from fresh research.
  pr=prows(c);pv=next((p for p in pr if p.get('id')in[e.get('placeId'),e.get('venueId')] and near(p,e)),None)
  if not pv:pv=next((p for p in pr if norm(p.get('title')or p.get('venue'))==norm(e['venue'])and near(p,e)),None)
  if not pv:
   pid=e.get('placeId')or e.get('venueId')or'venue-'+hashlib.sha256((c+'|'+norm(e['venue'])+'|'+norm(e['address'])).encode()).hexdigest()[:16]
   if any(p['id']==pid for p in pr):pid+='-verified28'
   pv={'id':pid,'cityId':c,'kind':'place','title':e['venue'],'venue':e['venue'],'address':e['address'],'category':'space','source':e.get('source'),'sourceUrl':e.get('addressSource')or e['coordinateSource'],'checkedAt':e['checkedAt'],'openingNote':'Часы посещения и ограничения — по программе площадки; не проверены отдельно.'}
   for k in ['lat','lng','coordinateSource','coordinatePrecision','coordinateEvidence','venueEn','addressEn']:
    if k in e:pv[k]=e[k]
   if e.get('venueEn'):pv['titleEn']=e['venueEn']
   pr.append(pv);newplaces.append(pv)
  e['placeId']=e['venueId']=pv['id'];rows.append(e);added.append(e)
 for patch in packet.get('corrections',[]):
  c=patch.get('cityId');eid=patch.get('eventId');e=next((v for v in feed(c)['events']if v['id']==eid),None)
  if not e:held.append({'correction':patch,'reason':'Target ID missing'});continue
  if patch.get('action')=='verified_field_patch':
   before=copy.deepcopy(e);e.update(patch['patch']);e['checkedAt']=before.get('checkedAt') if patch.get('keepCheckedAt') else patch['checkedAt'];e.setdefault('verificationHistory',[]).append({'checkedAt':patch['checkedAt'],'action':'verified_field_patch','sourceUrl':patch['sourceUrl'],'evidence':patch['evidence']});corrections.append({'cityId':c,'id':eid,'before':before,'after':copy.deepcopy(e),'evidence':patch})
  if patch.get('action')=='cancel_or_exclude_active':
   before=copy.deepcopy(e);e['status']='cancelled';e['publicationStatus']='cancelled';e['cancelled']=True;e['checkedAt']=patch['checkedAt'];e.setdefault('verificationHistory',[]).append({'checkedAt':patch['checkedAt'],'action':'cancelled','sourceUrl':patch['sourceUrl'],'evidence':patch['evidence']});corrections.append({'cityId':c,'id':eid,'before':before,'after':copy.deepcopy(e),'evidence':patch})
for c,f in feeds.items():
 if any(e['cityId']==c for e in added)or any(e['cityId']==c for e in corrections):
  f['editorialUpdatedAt']=NOW.isoformat();f['latestResearchBatch']=BATCH;path(c,'events').write_text(json.dumps(f,ensure_ascii=False,separators=(',',':'))+'\n')
for c,p in placesets.items():
 if any(v['cityId']==c for v in newplaces):path(c,'places').write_text(json.dumps(p,ensure_ascii=False,separators=(',',':'))+'\n')
result={'preparedAt':NOW.isoformat(),'baseCommit':'bba92a3a2a616b2438c8fd8e9e23c8854ce305cb','added':added,'newPlaces':newplaces,'corrections':corrections,'held':held,'duplicates':duplicates,'sourceAudit':audits,'fullThirtyDayCoverageVerified':False}
(O/'delta.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'added':len(added),'newPlaces':len(newplaces),'corrections':len(corrections),'held':len(held),'duplicates':len(duplicates),'byCity':{c:sum(e['cityId']==c for e in added)for c in feeds}},ensure_ascii=False))
