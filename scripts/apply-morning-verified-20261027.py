import json,re,copy,hashlib,datetime
from pathlib import Path
from zoneinfo import ZoneInfo
R=Path(__file__).resolve().parents[1]
O=R/'data/morning-verified-20261027';O.mkdir(exist_ok=True)
NOW=datetime.datetime.now(datetime.timezone.utc)
BATCH='morning-verified-20261027'
paths=['hm27-own','hm27-eurasia','hm27-europe','hm27-global','hm27-gap-followup','hm27-gap-followup-audit']
feeds={};added=[];held=[];duplicates=[];audits=[]
patches={p['suggestedId']:p for p in json.loads(Path('/workspace/shared/hm27-europe-coordinates.json').read_text())['patches']}
def norm(s):return re.sub(r'[^\w]','',str(s)).casefold().replace('ё','е')
def canon(s):return str(s).split('?')[0].rstrip('/')
for name in paths:
 p=Path('/workspace/shared')/(name+'.json')
 if not p.exists():continue
 packet=json.loads(p.read_text());(O/(name+'.json')).write_text(json.dumps(packet,ensure_ascii=False,indent=2)+'\n')
 audits+=packet.get('sourceCheckAudit',[]) if isinstance(packet.get('sourceCheckAudit',[]),list) else [{'packet':name,'audit':packet.get('sourceCheckAudit')}]
 held+=packet.get('held',[])+packet.get('heldOrExcluded',[])
 audits+=packet.get('sourceChecks',[])+packet.get('sourceAudit',[])
 for raw in packet.get('candidates',[]):
  e=copy.deepcopy(raw);c=e.get('cityId') or e.get('city');e['cityId']=c;date=e.get('date');time=e.get('time')
  patch=patches.get(e.get('suggestedId'))
  if patch:
   for k in ['lat','lng','address','coordinateSource','coordinatePrecision','coordinateEvidence']:e[k]=patch[k]
   e['qualityFlags']=[q for q in e.get('qualityFlags',[]) if q!='Coordinates not verified; do not invent.'];e['coordinateCheckedAt']=patch['checkedAt'];e['sourceURLs']=list(dict.fromkeys(e.get('sourceURLs',[])+patch.get('extraSourceUrls',[])))
  if e.get('dateEnd'):e['endDate']=e['dateEnd']
  if e.get('id')=='minsk-research27-4a3a59f27f2f':
   held.append({'candidate':e,'reason':'Cancelled: official Ticketpro House of Officers venue calendar explicitly Отменен for Brendon Stone13Nov19:00.','sourceUrl':'https://www.ticketpro.by/koncertnye-ploshhadki/centralnyj-dom-oficerov/','checkedAt':'2026-10-27T05:27:51Z'});continue
  if e.get('verificationLevel') in ['indexed_announcement','search_snippet','indexed_announcement_only']:
   held.append({'candidate':e,'reason':'Indexed announcement, direct source not read'});continue
  if not c or not date:held.append({'candidate':e,'reason':'Missing city/date'});continue
  fp=R/'public'/('' if c=='tbilisi' else c)/'events.json'
  if not fp.exists():held.append({'candidate':e,'reason':'Unpublished city'});continue
  if c not in feeds:
   feeds[c]=json.loads(fp.read_text());feeds[c]['events']=[v for v in feeds[c]['events'] if v.get('researchBatch')!=BATCH]
  missing=[k for k in ['title','venue','address','timezone','sourceUrl','checkedAt','coordinateSource'] if not e.get(k)]
  if missing or not all(isinstance(e.get(k),(float,int)) for k in ['lat','lng']):held.append({'candidate':e,'reason':'Missing required evidence: '+','.join(missing or ['coordinates'])});continue
  if e.get('status') in ['cancelled','held_for_recheck','held'] or e.get('verificationStatus') in ['held','conflict']:
   held.append({'candidate':e,'reason':'Held status'});continue
  if not e.get('yearEvidence') and not (e.get('evidence') or e.get('evidenceUrls')):held.append({'candidate':e,'reason':'Missing year evidence'});continue
  if time:
   try: start=datetime.datetime.fromisoformat(date+'T'+time).replace(tzinfo=ZoneInfo(e['timezone']))
   except Exception as ex:held.append({'candidate':e,'reason':'Invalid local start: '+str(ex)});continue
   e['startAt']=start.isoformat()
   if start<NOW and not (e.get('endDate') and e['endDate']>=NOW.astimezone(ZoneInfo(e['timezone'])).date().isoformat()):held.append({'candidate':e,'reason':'Already started before this publication preparation; audit only'});continue
  elif e.get('endDate',date)<NOW.astimezone(ZoneInfo(e['timezone'])).date().isoformat():
   held.append({'candidate':e,'reason':'Past date'});continue
  same=next((v for v in feeds[c]['events'] if e.get('id') and v['id']==e['id'] or (v.get('date')==date and v.get('time')==time and ((norm(v.get('title'))==norm(e['title']) and (norm(v.get('venue'))==norm(e['venue']) or abs((v.get('lat') or 0)-e['lat'])<0.0004 and abs((v.get('lng') or 0)-e['lng'])<0.0004)) or (canon(v.get('sourceUrl'))==canon(e['sourceUrl']) and norm(v.get('venue'))==norm(e['venue']))))),None)
  if same:duplicates.append({'cityId':c,'title':e['title'],'date':date,'time':time,'existingId':same['id'],'candidateId':e.get('id')});continue
  e.setdefault('id',e.get('suggestedId') or 'm27v-'+c+'-'+hashlib.sha256((e['sourceUrl']+'|'+date+'|'+str(time)+'|'+e['venue']).encode()).hexdigest()[:14])
  e['kind']='event';e['status']='scheduled';e['publicationStatus']='verified';e['researchBatch']=BATCH
  originalCategory=e.get('category')
  aliases={'children':'kids','family':'kids','concert':'music','concerts':'music','theatres':'theatre','standup':'theatre','comedy':'theatre','dance':'theatre','tour':'city','culture':'talk','lecture':'talk','festival':'city','party':'music','nightlife':'music','gorod':'city','fashion':'art','exhibitions':'art','sports':'sport','tech':'talk'}
  e['category']=aliases.get(originalCategory,originalCategory)
  if originalCategory:e['sourceCategory']=originalCategory
  if not e['category']:
   t=e['title'].lower()
   e['category']='games' if 'квиз' in t or 'бункер' in t else 'talk' if 'сквернослов' in t else 'theatre' if any(a in t for a in ['строптив','бобур','stand-up','дикань','жизель','мюзикл']) else 'music'
  if 'FINNEXT' in e['title']:e['category']='talk';e['format']='conference';e['topics']=['finance','business']
  if e.get('sourceCategory')=='tech':e['topics']=e.get('topics') or ['startup','technology'];e['format']=e.get('format') or 'networking'

  e.setdefault('price',e.get('priceFrom',e.get('priceMin')));e.setdefault('mandatoryFees',None);e.setdefault('language',None);e.setdefault('availabilityVerified',False)
  e['sourceURLs']=list(dict.fromkeys(e.get('sourceURLs',[])+e.get('supportingUrls',[])+[e['sourceUrl']]))
  e.setdefault('accessNote',e.get('admission') or e.get('notes') or e.get('accessEvidence') or e.get('publicAccess') or e.get('access'))
  e.setdefault('programmeId','programme-'+hashlib.sha256((c+'|'+norm(e['title'])+'|'+norm(e['venue'])).encode()).hexdigest()[:16])
  if e.get('category') in ['cinema','film']:e['cinemaSession']=True
  if e.get('durationMinutes') and time:e['endAt']=(start+datetime.timedelta(minutes=e['durationMinutes'])).isoformat()
  elif e.get('endTime') and time:e['endAt']=datetime.datetime.fromisoformat(e.get('endDate',date)+'T'+e['endTime']).replace(tzinfo=ZoneInfo(e['timezone'])).isoformat()
  elif e.get('end') and 'T' in e['end']:e['endAt']=e['end']
  else:e.setdefault('endAt',None)
  feeds[c]['events'].append(e);added.append(e)
for c,f in feeds.items():
 if any(e['cityId']==c for e in added):
  f['editorialUpdatedAt']=NOW.isoformat();f['latestResearchBatch']=BATCH
  (R/'public'/('' if c=='tbilisi' else c)/'events.json').write_text(json.dumps(f,ensure_ascii=False,separators=(',',':'))+'\n')
result={'preparedAt':NOW.isoformat(),'baseCommit':'526291cc4ae86693dcb3c105e9c1aa4e94858fe7','added':added,'held':held,'duplicates':duplicates,'sourceAudit':audits,'fullThirtyDayCoverageVerified':False}
(O/'delta.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'added':len(added),'held':len(held),'duplicates':len(duplicates),'byCity':{c:sum(e['cityId']==c for e in added) for c in feeds}},ensure_ascii=False))
