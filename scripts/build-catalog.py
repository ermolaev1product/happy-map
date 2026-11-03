#!/usr/bin/env python3
"""Validate and merge fetched, source-backed data; never generate event fixtures."""
import json,datetime as dt,math,re,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def norm(s):return re.sub(r'[^\w]+','',unicodedata.normalize('NFKD',s).casefold())
def distance(a,b):
    if any(x.get(k) is None for x in (a,b) for k in ('lat','lng')):return float('inf')
    return math.hypot((a['lat']-b['lat'])*111000,(a['lng']-b['lng'])*83000)
# Confirmed same performance by date/time/venue and translated title.
REVIEWED={
 'biletebi-witelquda-2026-10-04':'tkt:507091',
 'biletebi-shvlis-nukris-naambobi-2026-10-04':'tkt:507092',
 'biletebi-sulis-identifikacia-16-2026-10-04':'tkt:506919',
 'pochill-10272':'tkt:507373',
}
def offer(e):return {'name':e['source'],'url':e['sourceUrl'],'price':e.get('price'),'min':e.get('min',True),'soldOut':e.get('soldOut'),'checkedAt':e['checkedAt']}
base=json.loads((ROOT/'data/tkt.json').read_text())
extras=json.loads((ROOT/'data/additional.json').read_text())
result=[];merges=[]
for original in base['events']+extras:
    e=dict(original)
    assert e['date']>=base['startDate'] and e['date']<=base['endDate'],e['id']
    assert e['sourceUrl'].startswith('https://'),e['id']
    assert e.get('price') is None or e['price']>=0,e['id']
    if re.search(r'masterclass|workshop',e['title'],re.I) and e.get('category')!='kids':e['category']='workshop'
    e['title']=e['title'].strip();e['end']=e.get('end') or None
    if e.get('time'):e['startAt']=e.get('startAt') or f"{e['date']}T{e['time']}:00+04:00"
    else:e['startAt']=None
    e['sources']=[offer(e)];e['soldOut']=bool(e.get('soldOut'));e['language']=e.get('language')
    e['locationPrecision']=e.get('locationPrecision') or ('source' if e.get('lat') is not None else 'unknown')
    e['priceNote']=e.get('priceNote') or 'Цена по данным источника. Условия участия уточняйте перед посещением.'
    if e.get('address')==e['venue']:e['address']=None
    match=next((x for x in result if x['id']==REVIEWED.get(e['id'])),None)
    if match:
        assert e['date']==match['date'] and e['time']==match['time'] and distance(e,match)<200
    if not match:
        match=next((x for x in result if x['date']==e['date'] and x.get('time')==e.get('time') and norm(x['title'])==norm(e['title']) and distance(x,e)<150),None)
    if match:
        match['sources']+=e['sources'];match['soldOut']=all(s.get('soldOut') is True for s in match['sources'])
        prices=[s['price'] for s in match['sources'] if s.get('price') is not None and s.get('soldOut') is not True]
        if prices:match['price']=min(prices);match['min']=match['price']>0
        match['priceNote']='Цены и наличие различаются у источников; сравните предложения ниже.'
        if e['source']=='Pochill' and e.get('description'):match['description']=e['description']
        merges.append({'duplicate':e['id'],'canonical':match['id']});continue
    result.append(e)
assert len({e['id'] for e in result})==len(result)
result.sort(key=lambda e:(e['date'],e.get('time') or '00:00',e['title']))
snapshot={'generatedAt':dt.datetime.now(dt.timezone.utc).isoformat(),'startDate':base['startDate'],'endDate':base['endDate'],
 'updateMode':'snapshot','coverage':'Проверенная подборка из TKT.ge, Biletebi.ge, Pochill и программы Тбилисобы (1TV). Это не все события города; полный репертуар сетевых кинотеатров пока не загружен.',
 'events':result,'merges':merges,'sources':[{'name':'TKT.ge','url':'https://tkt.ge/en','count':sum(any(s['name']=='TKT.ge' for s in e['sources']) for e in result),'checkedAt':base['checkedAt']},
 {'name':'Biletebi.ge','url':'https://biletebi.ge/en','count':sum(any(s['name']=='Biletebi.ge' for s in e['sources']) for e in result),'checkedAt':max((e['checkedAt'] for e in extras if e['source']=='Biletebi.ge'),default=None)},
 {'name':'Pochill','url':'https://pochill.site/en/tbilisi/events','count':sum(any(s['name']=='Pochill' for s in e['sources']) for e in result),'checkedAt':max((e['checkedAt'] for e in extras if e['source']=='Pochill'),default=None)}]}
snapshot['sources'].append({'name':'1TV','url':'https://1tv.ge/lang/en/news/tbilisi-celebrates-tbilisoba-2026/','count':sum(e['source'] not in ('TKT.ge','Biletebi.ge','Pochill') for e in result)})
output=ROOT/'public/events.json';temp=output.with_suffix('.tmp');temp.write_text(json.dumps(snapshot,ensure_ascii=False,separators=(',',':')));temp.replace(output)
print(json.dumps({'total':len(result),'merges':len(merges),'daily':{(dt.date.fromisoformat(base['startDate'])+dt.timedelta(days=i)).isoformat():sum(e['date']==(dt.date.fromisoformat(base['startDate'])+dt.timedelta(days=i)).isoformat() for e in result) for i in range(7)}},ensure_ascii=False))
