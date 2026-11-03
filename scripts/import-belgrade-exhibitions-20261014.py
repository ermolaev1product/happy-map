from pathlib import Path
import json, datetime as dt, collections, shutil, re, unicodedata, subprocess

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data/research-exhibitions-20261014'
OUT.mkdir(exist_ok=True)
TODAY='2026-10-14'
CHECKED='2026-10-14T02:00:00Z'
days=['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
ru_days=['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
en_days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
memory_path=ROOT/'data/i18n/english-reviewed.json'
memory=json.loads(memory_path.read_text())
PRICE_RU={
 'Standard adult museum admission; concessions 300 RSD. Free on the first Wednesday of each month. No separately stated mandatory fees.':'Взрослый билет в музей — 600 RSD, льготный — 300 RSD. В первую среду месяца вход бесплатный. Отдельные обязательные сборы не указаны.',
 'Official visitor page says admission is free.':'Вход бесплатный по информации музея.',
 'Main museum adult ticket 600 RSD; concessions 300 RSD, family up to five 700 RSD. Mondays free. Price-tab labels verified in live HTML.':'Взрослый билет — 600 RSD, льготный — 300 RSD, семейный до пяти человек — 700 RSD. По понедельникам вход бесплатный.',
 'Standard 800 RSD; Serbia residents 600 RSD; students/school pupils 400 RSD, resident students/school pupils/pensioners 200 RSD. First Thursday of each month and state holidays free for individual visits. No separately stated fees.':'Обычный билет — 800 RSD, для жителей Сербии — 600 RSD. Школьникам и студентам — 400 RSD; школьникам, студентам и пенсионерам — жителям Сербии — 200 RSD. В первый четверг месяца и государственные праздники индивидуальные посещения бесплатны. Отдельные сборы не указаны.',
 'Museum admission: adult 200 RSD; concessions 100 RSD; family up to five 300 RSD. Source https://etnografskimuzej.rs/posetite-nas/ price tabs. No event-specific free entry confirmed.':'Взрослый билет — 200 RSD, льготный — 100 RSD, семейный до пяти человек — 300 RSD. Бесплатный вход именно на эту выставку не подтверждён.',
 'Official museum visitor page says admission is free. Sunday closes at 18:00, despite secondary listing saying 20:00.':'Вход бесплатный по информации музея. По воскресеньям площадка закрывается в 18:00; использовано официальное расписание.',
 'Official venue page says admission is free. Related evening workshops have separate times and are not the exhibition hours.':'Вход бесплатный по информации площадки. Вечерние мастер-классы имеют отдельное расписание.',
}
def tr(ru,en):
    memory[ru]=en
    return ru
def read_shared(name):
    path=Path('/workspace/shared')/name
    value=json.loads(path.read_text())
    shutil.copy2(path,OUT/name)
    return value
gallery=read_shared('belgrade_gallery_exhibitions_2026-10-14.json')
independent=read_shared('belgrade_independent_gallery_exhibitions_2026-10-14.json')
records=gallery['verified']+independent['records']
held=gallery.get('held',[])+independent.get('unverifiedLeads',[])
museum_path=Path('/workspace/shared/belgrade-museum-research/museum-exhibitions-2026-10-14.json')
if museum_path.exists():
    museum=json.loads(museum_path.read_text())
    shutil.copy2(museum_path,OUT/museum_path.name)
    for x in museum['confirmed']:
        v=x['venue'];op=x.get('openingCeremony')
        slug=re.sub('[^a-z0-9]+','-',unicodedata.normalize('NFKD',x['titleEn']).encode('ascii','ignore').decode().lower()).strip('-')
        records.append({**x,'id':slug,'titleEnglish':x['titleEn'],'venue':v['name'],'address':v['address'],'startDate':x['runStartDate'],'endDate':x['runEndDateInclusive'],'lat':v['latitude'],'lng':v['longitude'],'coordinateSource':v['coordinateSourceUrl'],'coordinatesEvidence':v['coordinateEvidence'],'weeklyHours':v['weeklyHours'],'price':v['standardAdultPrice'],'currency':v['currency'],'priceNote':v['priceNotes'],'supportingSources':list(dict.fromkeys(u['url'] for u in x['sourceEvidence'] if u.get('url') and u['url']!=x['sourceUrl'])),'opening':{'date':op['date'],'time':op['startTime'],'end':op.get('endTime')} if op else None})
    held+=museum['heldCandidates']
    held+=[{**x,'publicationHold':'Long-running collection display, not imported as a new temporary exhibition.'} for x in museum['longRunningCollectionDisplays']]
catalog_path=ROOT/'public/belgrade/events.json'
catalog=json.loads(catalog_path.read_text())
before={e['id']:e for e in catalog['events'] if e.get('researchBatch')!='belgrade-exhibitions-2026-10-14'}
catalog['events']=list(before.values())
reuse={
 'dob-afterimage-2026':(44.815407,20.462793,'https://en.wikipedia.org/wiki/Belgrade_Youth_Center'),
 'kolarac-svet-fantastike-na-papiru-2026':(44.819094,20.456261,'https://en.wikipedia.org/wiki/Ilija_M._Kolarac_Endowment'),
 'cervantes-arhitektura-introspekcije-2026':(44.8176471,20.4573014,'https://rutascervantes.es/lugar/instituto-cervantes-de-belgrado/'),
}
events=[]
def weekly(e):
    if e.get('weeklyHours') is not None:return e['weeklyHours']
    if e.get('hours') is not None:return e['hours']
    if e.get('visitorHours') is not None:
        closed=[x.lower() for x in (e.get('closedWeekdays') or [])]
        out={}
        for day,value in e['visitorHours'].items():
            out[day]=[value.replace('–','-').split('-')] if value else [] if day in closed else None
        return out
    return None
def schedule_text(hours):
    if not hours:return tr('Часы посещения не подтверждены. Перед визитом проверь расписание у площадки.','Visiting hours are unverified. Check the venue schedule before visiting.')
    groups=collections.defaultdict(list)
    for i,day in enumerate(days):
        h=hours.get(day)
        key='; '.join('–'.join(x) for x in h) if h else 'closed' if h==[] else 'unknown'
        groups[key].append(i)
    ru=[];en=[]
    for value,indices in groups.items():
        ru.append(', '.join(ru_days[i] for i in indices)+' '+('закрыто' if value=='closed' else 'часы не подтверждены' if value=='unknown' else value))
        en.append(', '.join(en_days[i] for i in indices)+' '+('closed' if value=='closed' else 'hours unverified' if value=='unknown' else value))
    return tr('Посещение: '+ '; '.join(ru)+'.','Visiting hours: '+ '; '.join(en)+'.')
for raw in records:
    e=dict(raw)
    lat=e.get('lat');lng=e.get('lng')
    coords=e.get('coordinates')
    if coords:
        lat=coords.get('latitude',coords.get('lat'));lng=coords.get('longitude',coords.get('lng'))
    cs=e.get('coordinatesSource') or e.get('coordinateSource')
    if isinstance(cs,dict):cs=cs.get('placeUrl') or cs.get('url')
    if e['id'] in reuse:lat,lng,cs=reuse[e['id']]
    if not isinstance(lat,(float,int)) or not isinstance(lng,(float,int)):
        held.append({**raw,'publicationHold':'Verified exhibition, but precise map coordinates not established in this pass.'})
        continue
    start=e.get('startDate') or e.get('date');end=e.get('endDate')
    if not start or not end or len(start)!=10 or len(end)!=10:
        held.append({**raw,'publicationHold':'Exact exhibition run endpoints are not confirmed.'});continue
    hours=weekly(e)
    src=e.get('sourceUrl') or e.get('officialAnnouncementUrl')
    supporting=e.get('supportingSources') or e.get('supportingSourceUrls') or []
    supporting=[x.get('url') if isinstance(x,dict) else x for x in supporting]
    evidence=list(dict.fromkeys([src]+supporting+([cs] if cs else [])))
    title=e['title']
    artists=e.get('artists') or ([e['artist']] if e.get('artist') else [])
    title_ru=title
    if e.get('titleEnglish'):memory[title_ru]=e['titleEnglish']
    # Original-language Latin titles are retained. Cyrillic source titles are translated explicitly upstream.
    desc=tr(f'Выставка с {start} по {end}.',f'Exhibition from {start} through {end}.')
    if artists:desc+=' '+tr('Участники: '+', '.join(artists)+'.','Artists: '+', '.join(artists)+'.')
    desc+=' '+schedule_text(hours)
    time_note=schedule_text(hours)
    opening=e.get('opening')
    if opening and opening.get('date') and opening.get('time'):
        time_note+=' '+tr(f"Открытие {opening['date']} в {opening['time']}. Время открытия не является ежедневным расписанием.",f"Opening on {opening['date']} at {opening['time']}. Reception time is separate from daily visiting hours.")
    memory[desc]=' '.join([f'Exhibition from {start} through {end}.']+(['Artists: '+', '.join(artists)+'.'] if artists else [])+[memory[schedule_text(hours)]])
    if time_note not in memory:
        memory[time_note]=memory[schedule_text(hours)]+' '+f"Opening on {opening['date']} at {opening['time']}. Reception time is separate from daily visiting hours."
    price=e.get('price')
    price_note=e.get('priceNote') or e.get('admissionNote')
    if isinstance(price,dict):
        price_note=price.get('note') or price_note
        price=price.get('amount',price.get('adult'))
    if price_note in PRICE_RU:price_note=tr(PRICE_RU[price_note],price_note)
    if price_note and not isinstance(price_note,str):price_note=json.dumps(price_note,ensure_ascii=False)
    if not price_note:price_note=tr('Цена входа не подтверждена.','Admission price is unverified.') if price is None else tr('Условия и льготы уточняйте у площадки.','Check the venue for admission terms and concessions.')
    event={'id':'bg-exhibition-'+e['id'],'kind':'event','city':'Belgrade','timezone':'Europe/Belgrade','category':'art','title':title_ru,'date':start,'endDate':end,'time':None,'end':None,'venue':e['venue'],'address':e['address'],'lat':lat,'lng':lng,'coordinateSource':cs,'coordinateEvidence':e.get('coordinatesEvidence') or e.get('coordinateSource') or 'Existing exact-address venue point retained; named-building coordinate source corroborates it.','price':price,'currency':e.get('currency') or 'RSD','min':False,'priceNote':price_note,'description':desc,'timeNote':time_note,'source':e.get('source') or e['venue'],'sourceUrl':src,'sources':[{'name':e.get('source') or e['venue'],'url':src,'price':price,'currency':e.get('currency') or 'RSD','checkedAt':e.get('checkedAt',CHECKED)}]+[{'name':'Visiting information / evidence','url':u} for u in supporting[:3]],'evidenceUrls':evidence,'checkedAt':e.get('checkedAt',CHECKED),'researchBatch':'belgrade-exhibitions-2026-10-14','availabilityVerified':False,'stale':False,'exhibitionRun':True,'opening':opening,'verificationNotes':e.get('notes') or e.get('verificationNote') or e.get('verificationNotes') or '', 'scheduleVerifiedFrom':TODAY}
    if e.get('description'):event['researchDescription']=e['description']
    if hours:
        visit={};date=dt.date.fromisoformat(max(TODAY,start));last=dt.date.fromisoformat(end)
        while date<=last:
            day=date.isoformat();slots=hours.get(days[date.weekday()]);opening_today=opening and opening.get('date')==day and opening.get('time')
            if opening_today:visit[day]={'start':opening['time'],'end':None,'type':'opening','endVerified':False}
            elif slots:visit[day]={'start':slots[0][0],'end':slots[-1][1]}
            date+=dt.timedelta(days=1)
        event['visitSchedule']=visit
        event['validDates']=list(visit)
        event['closedWeekdays']=[(days.index(day)+1)%7 for day,v in hours.items() if v==[]]
        event['weeklyVisitingHours']=hours
        starts=collections.Counter(v['start'] for v in visit.values() if v.get('type')!='opening')
        event['time']=starts.most_common(1)[0][0] if starts else None
        event['scheduleType']='dated_visiting_hours'
    else:
        # A verified full run can be discoverable with unknown daily hours; do not claim 24-hour opening.
        event['dailyHoursUnverified']=True
    events.append(event)

catalog['events']+=events
assert len({e['id'] for e in catalog['events']})==len(catalog['events'])
catalog['generatedAt']=CHECKED
catalog['endDate']=max(catalog['endDate'],'2026-10-21')
addition='Focused exhibition update October 14: verified full museum and gallery runs, with daily visiting schedules and closure days where published. Exhibition receptions remain distinct from normal visits. Unverified hours are labelled; this is not complete city coverage.'
if addition not in catalog['coverage']:catalog['coverage']+=' '+addition
base_en=json.loads(subprocess.check_output(['git','show','b9224f1e5fea571e97d24a50eacee19eebe24f2f:public/en/belgrade/events.json'],cwd=ROOT))
memory[catalog['coverage']]=base_en['coverage']+' '+addition
for e in events:
    note=e.get('coordinateEvidence')
    if isinstance(note,str) and 'Салон Музеја' in note:
        memory[note]='Nominatim exact-name result, OSM node 11085502701, tourism=gallery, Salon of the Belgrade City Museum at 30 Bulevar kralja Aleksandra. Independently corroborates the published coordinates.'
for e in events:
    if not any(x.get('url')==e['sourceUrl'] for x in catalog.get('sourceRegistry',[])):
        catalog.setdefault('sourceRegistry',[]).append({'name':e['source'],'url':e['sourceUrl'],'type':'official','status':'imported','checkedAt':e['checkedAt'],'note':'One verified exhibition run; visitor hours and coordinate evidence kept separately.','publicNote':'A verified exhibition run. Check the linked venue for current visiting conditions.','count':1})
source_counts=collections.Counter(e.get('source') for e in catalog['events'])
by_name={s['name']:s for s in catalog.get('sources',[])}
for e in events:by_name.setdefault(e['source'],{'name':e['source'],'url':e['sourceUrl']})
for name,s in by_name.items():s['count']=source_counts[name]
catalog['sources']=list(by_name.values())
catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
memory_path.write_text(json.dumps(memory,ensure_ascii=False,indent=2)+'\n')
result={'checkedAt':CHECKED,'baselineCommit':'b9224f1e5fea571e97d24a50eacee19eebe24f2f','baselineBelgradeEvents':len(before),'baselineArtRecords':sum(e.get('category')=='art' for e in before.values()),'addedCount':len(events),'totalBelgradeEvents':len(catalog['events']),'events':events,'held':held,'importedResearchIds':[x['id'].removeprefix('bg-exhibition-') for x in events]}
(OUT/'import-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'added':len(events),'held':len(held),'total':len(catalog['events'])}))
