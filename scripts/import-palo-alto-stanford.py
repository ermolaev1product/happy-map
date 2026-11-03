"""Import reviewed public calendar snapshots; no scheduler and no private access.
Usage: python scripts/import-palo-alto-stanford.py --snapshot-dir PATH
"""
import argparse,json,re,hashlib
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
from collections import defaultdict,Counter
ap=argparse.ArgumentParser();ap.add_argument('--snapshot-dir',required=True);args=ap.parse_args()
p=Path(args.snapshot_dir);out=Path('public/palo-alto');zone=ZoneInfo('America/Los_Angeles');checked=datetime.now(ZoneInfo('UTC')).isoformat()
d=json.loads((out/'events.json').read_text());old=d['events'];groups={};instances=defaultdict(dict);excluded=[]
for f in ['stanford-api.json','stanford-api-2.json','stanford-api-3.json','stanford-api-18.json']:
 for row in json.loads((p/f).read_text())['events']:
  e=row['event'];eid=str(e['id']);groups[eid]=e
  for v in e['event_instances']:
   i=v['event_instance'];instances[eid][str(i['id'])]=i
# Same programme cross-posted by different departments; use primary listing.
duplicates={'54118401146911','54134468570215','54136579302877'}
# Family Art Day already represented by its two verified reservation sessions.
skip={'53745488766611'}|duplicates
new=[]
restricted_override={'54109578748450':'Для входа в здание нужен Stanford ID; внешнее участие не подтверждено.', '54038249644275':'Для очного посещения нужен действующий Stanford ID. Публичный онлайн-вариант не означает доступ в зал.'}
for eid,e in groups.items():
 title=e['title'];desc=e.get('description_text') or '';types=[x['name'] for x in e.get('filters',{}).get('event_types',[])];aud=[x['name'] for x in e.get('filters',{}).get('event_audience',[])];custom=e.get('custom_fields') or {};restriction=str(custom.get('restricted_to') or '')
 reason=None
 if (e.get('geo') or {}).get('latitude') and not (37.38<float(e['geo']['latitude'])<37.49 and -122.22<float(e['geo']['longitude'])<-122.08):reason='outside_palo_alto_stanford'
 elif eid in skip:reason='duplicate_or_existing_sessions'
 elif e.get('experience')=='virtual':reason='online_only'
 elif e.get('private') or e.get('status')!='live' or re.search(r'cancelled|canceled',title,re.I):reason='cancelled_or_private'
 elif re.search(r'room request.*deadline|last day of clerkships|Flash Sale|Surgery M&M|Alcoholics Anonymous|Al-Anon|Living with OCD|Recovery Meeting|Mental Health|Support Group|Tea for the Soul|Fellowship Info Session|flu.*clinic|vaccin|financial.*counsel|tIAA|fidelity|abstract.*deadline|fusion.*go|submission.*deadline|open enrollment|benefits.*fair',title,re.I):reason='service_or_deadline'
 elif any(t in types for t in ['Exhibition']) and re.search(r'Rodin|Faces of Ruth Asawa|Permanent|Collection Highlights',title,re.I):reason='permanent_collection_place_layer'
 if reason:excluded.append({'id':eid,'title':title,'reason':reason});continue
 # Explicit restrictions take precedence over the broad calendar audience tag.
 access='unknown';note='Условия очного доступа уточняются у организатора; публичная страница сама по себе не разрешение на вход.'
 restricted=restriction or restricted_override.get(eid)
 if not restricted:
  m=re.search(r'.{0,60}(?:Stanford ID|open to Stanford affiliates|reserved for registered alumni|Stanford affiliates and alum).{0,120}',desc,re.I)
  if m:restricted=m.group(0).strip()
 if restricted:access='restricted';note=restricted
 elif aud and not any(x.lower() in ['everyone','general public'] for x in aud):access='restricted';note='Заявленная аудитория: '+', '.join(aud)+'. Возможность участия извне нужно подтвердить у организатора.'
 elif any(x.lower() in ['everyone','general public'] for x in aud):access='public';note='В календаре указана общая публика. Проверь регистрацию и условия входа по ссылке.'
 if re.search(r'reunion|alumni.*meet',title,re.I) and access=='public':access='restricted';note='Программа для сообщества Stanford и выпускников; участие извне не подтверждено.'
 registration=bool(e.get('has_register') or e.get('ticket_url') or re.search(r'RSVP|registration required|register to attend',desc,re.I))
 if access=='public' and registration:access='registration';note='Билет или регистрация через организатора. Наличие свободных мест проверяй по ссылке.'
 if 'Library' in (e.get('location_name') or '') and access=='public':note+=' Для посетителей библиотеки могут действовать отдельные правила входа.'
 cost=str(e.get('ticket_cost') or '');nums=re.findall(r'\$\s*(\d+(?:\.\d+)?)',cost);price=float(nums[0]) if nums else 0 if e.get('free') or re.search(r'\bfree\b',cost,re.I) else None
 cat='art' if 'Exhibition' in types or 'Book Display' in title else 'music' if re.search(r'concert|recital|music|quartet|piano|sing|karaoke',title,re.I) else 'theatre' if re.search(r'staged reading|performance|theater|theatre',title,re.I) else 'sport' if re.search(r'football|volleyball|soccer',title,re.I) else 'lecture' if any(re.search(r'lecture|seminar|conference|colloquium|talk',t,re.I) for t in types) or re.search(r'lecture|seminar|book talk|symposium|humanities|philosophy|literature',title,re.I) else 'other'
 geo=e.get('geo') or {};lat=float(geo['latitude']) if geo.get('latitude') else None;lng=float(geo['longitude']) if geo.get('longitude') else None
 base={'title':title,'category':cat,'venue':e.get('location_name') or e.get('location') or 'Stanford — место уточняется','venueId':'pa-stanford-venue-'+str(e.get('venue_id') or hashlib.sha1((e.get('location_name') or title).encode()).hexdigest()[:12]),'address':e.get('address') or '', 'lat':lat,'lng':lng,'coordinateSource':e.get('venue_url') or e['localist_url'],'coordinatePrecision':'official-building' if lat else None,'source':'Stanford Events','sourceUrl':e['localist_url'],'checkedAt':checked,'sourceUpdatedAt':e.get('updated_at'),'price':price,'currency':'USD','language':'EN','timezone':'America/Los_Angeles','accessType':access,'accessNote':note,'audience':aud,'registrationUrl':e.get('ticket_url'),'description':'Очная программа Stanford. '+('Тема и участники: '+title+'. ' if cat=='lecture' else '')+'Подробности программы и условия участия — у организатора.','priceNote':cost or 'Стоимость и наличие мест уточняй у организатора.','min':bool(nums and (len(nums)>1 or re.search(r'start|from',cost,re.I))),'registrationStatus':'check_source','room':e.get('room_number')}
 ii=sorted(instances[eid].values(),key=lambda i:i['start']);ii=[i for i in ii if '2026-10-10'<=i['start'][:10]<='2026-10-18']
 if not ii:continue
 if cat=='art':
  visits={}
  for i in ii:
   dt=datetime.fromisoformat(i['start']).astimezone(zone);end=datetime.fromisoformat(i['end']).astimezone(zone) if i.get('end') else None
   visits[dt.date().isoformat()]={'start':None if i['all_day'] else dt.strftime('%H:%M'),'end':end.strftime('%H:%M') if end else None}
  r=dict(base,id='pa-stanford-'+eid,date=min(visits),endDate=max(visits),time=None,end=None,validDates=sorted(visits),visitSchedule=visits,exhibitionStartDate=e.get('first_date'),exhibitionEndDate=e.get('last_date'),timeNote='Выставка: часы посещения и доступ в здание проверяй у организатора.');new.append(r)
 else:
  for i in ii:
   dt=datetime.fromisoformat(i['start']).astimezone(zone);end=datetime.fromisoformat(i['end']).astimezone(zone) if i.get('end') else None
   r=dict(base,id='pa-stanford-'+str(i['id']),date=dt.date().isoformat(),time=None if i['all_day'] else dt.strftime('%H:%M'),end=end.strftime('%H:%M') if end else None,timeNote='Местное время Калифорнии. '+('Очная часть гибридного события; условия входа смотри ниже.' if e.get('experience')=='hybrid' else ''))
   prior=next((v for v in old if v.get('sourceUrl')==r['sourceUrl'] and v['date']==r['date'] and v.get('time')==r['time']),None)
   if prior:
    r['id']=prior['id']
    if r['price'] is None and prior.get('price') is not None:r['price']=prior['price'];r['priceNote']=prior.get('priceNote',r['priceNote'])
   new.append(r)
# Retain non-Stanford programmes and the verified family sessions.
keep=[e for e in old if e.get('source') not in ['Stanford Events','Meyhouse Jazz'] or 'art-for-all-family-day' in e.get('sourceUrl','')]
# API may use a slightly different source label in old selection; deduplicate by URL/date/time.
keys={(e['sourceUrl'],e['date'],e.get('time')) for e in new};keep=[e for e in keep if (e.get('sourceUrl'),e['date'],e.get('time')) not in keys]
for e in keep:e.setdefault('accessType','registration' if e.get('registrationStatus') in ['full','closed'] else 'unknown');e.setdefault('accessNote','Условия входа, билет и регистрацию проверяй на странице организатора.')
# Wix public programme: six separate reserved-seat bookings, not twelve invented concerts.
w=json.loads((p/'meyhouse-state.json').read_text())['appsWarmupData']['140603ad-af8d-84a5-2c80-a0f60cb47351']['widgetTPASection_m4cefc0w']['events']['events']
for e in w:
 c=e['scheduling']['config'];dt=datetime.fromisoformat(c['startDate'].replace('Z','+00:00')).astimezone(zone);end=datetime.fromisoformat(c['endDate'].replace('Z','+00:00')).astimezone(zone)
 if not '2026-10-10'<=dt.date().isoformat()<='2026-10-18':continue
 t=e['registration']['ticketing'];loc=e['location'];price=float(t['lowestTicketPrice']['value'])
 new.append(dict(id='pa-meyhouse-'+e['id'],title=e['title'],category='music',date=dt.date().isoformat(),time=dt.strftime('%H:%M'),end=end.strftime('%H:%M'),venue='Meyhouse Jazz Palo Alto',venueId='pa-meyhouse',address=loc['address'],lat=loc['coordinates']['lat'],lng=loc['coordinates']['lng'],coordinateSource='https://www.meyhousejazz.com/paloalto',coordinatePrecision='official-source-map',source='Meyhouse Jazz',sourceUrl='https://www.meyhousejazz.com/event-details/'+e['slug'],checkedAt=checked,sourceUpdatedAt=e['modified'],price=price,min=True,currency='USD',language='EN',timezone='America/Los_Angeles',soldOut=t.get('soldOut',False),accessType='registration',accessNote='Нужен билет на выбранную посадку; еда и напитки оплачиваются отдельно.',description='Живой джаз и ужин. Указано время бронирования посадки, а не начало музыкального выступления.',timeNote='Первое выступление обычно начинается около 18:30, второе около 20:30; уточни на странице выбранного билета.'))
d['events']=sorted(keep+new,key=lambda e:(e['date'],e.get('time') or '00:00',e['title']));d['generatedAt']=checked;d['coverage']='Проверенные даты 10–18 октября: Пало-Альто и Stanford. Включены программы с ограничениями доступа; полный охват не заявляется.'
for s in d['sourceRegistry']:
 if s['name']=='Stanford Events Calendar':s.update(count=sum(e['source']=='Stanford Events' for e in d['events']),note='Датированные очные и гибридные программы из публичного Localist API; ограничения аудитории сохранены. Повторы выставок объединены; отмены и онлайн исключены.')
d['sourceRegistry']=[v for v in d['sourceRegistry'] if v['name']!='Meyhouse Jazz'];d['sourceRegistry'].append(dict(name='Meyhouse Jazz',url='https://www.meyhousejazz.com/paloalto',status='imported',count=6,note='Шесть бронирований концертов 10, 16, 17 октября; две посадки 10 октября распроданы.'))
(out/'events.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
a=json.loads((out/'audit.json').read_text());a['expandedAt']=checked;a['stanfordExpansion']={'method':'Public Localist API snapshots; manual bounded import, no scheduler','distinctSourcePrograms':len(groups),'excluded':excluded,'accessCounts':dict(Counter(e['accessType'] for e in d['events'])),'importedRecords':len(d['events']),'note':'Restricted programmes are visible options, not confirmation of external admission. Calendar audience tags are overridden by explicit Stanford ID requirements.'};(out/'audit.json').write_text(json.dumps(a,ensure_ascii=False,indent=2)+'\n')
s=json.loads((out/'sources.json').read_text());s['researchedAt']=checked;s['note']=d['coverage']+' Автоматического сбора нет.'
for v in s['sources']:
 if v['name']=='Stanford Events Calendar':v.update(status='imported',checkedAt=checked,acquisitionMethod='Публичный Localist API: пагинация и отдельная загрузка конечного дня. Очные программы, ограничения и отмены проверяются отдельно.',notes='Ограниченные события включены с условиями доступа. Выставки объединены; общий профиль не гарантирует вход.')
s['sources']=[v for v in s['sources'] if v['name']!='Meyhouse Jazz'];s['sources'].append(dict(name='Meyhouse Jazz',url='https://www.meyhousejazz.com/paloalto',type='Сайт',city='Пало-Альто',country='США',language='EN',status='imported',checkedAt=checked,notes='Использованы шесть датированных посадок; сохранены цены и sold out.',acquisitionMethod='Публичное JSON-состояние Wix на официальной странице.',researchEvidenceUrl='https://www.meyhousejazz.com/paloalto'))
(out/'sources.json').write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'records':len(d['events']),'access':a['stanfordExpansion']['accessCounts'],'excluded':len(excluded)},ensure_ascii=False))
