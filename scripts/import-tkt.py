#!/usr/bin/env python3
"""Read TKT public catalogue into a reviewed snapshot. No customer credentials.

Usage: python3 scripts/import-tkt.py --start 2026-10-04 --cache /absolute/path
Produces data/tkt.json; combine with other sources before publishing.
The public web client identifier is discovered from TKT's served scripts and is
kept in memory. Private/account/payment APIs are never used.
"""
import argparse, concurrent.futures, datetime as dt, html, json, re, time
import urllib.parse, urllib.request
from html.parser import HTMLParser
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
class Text(HTMLParser):
    def __init__(self): super().__init__(); self.parts=[]; self.skip=0
    def handle_starttag(self, tag, attrs):
        if tag in ('script','style'): self.skip+=1
        if tag in ('p','br','div','li'): self.parts.append(' ')
    def handle_endtag(self, tag):
        if tag in ('script','style') and self.skip: self.skip-=1
    def handle_data(self, text):
        if not self.skip: self.parts.append(text)
def plain(value):
    p=Text(); p.feed(value or ''); return re.sub(r'\s+',' ',''.join(p.parts)).strip()
def read_url(url):
    request=urllib.request.Request(url,headers={'Accept-Language':'en','User-Agent':'Morrow/0.4 (public event catalogue)'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request,timeout=35) as response:return response.read()
        except Exception:
            if attempt==2: raise
            time.sleep(1+attempt)
def client_id():
    page=read_url('https://tkt.ge/en').decode()
    paths=re.findall(r'<script[^>]+src="(/_next/static/chunks/[^"]+)"',page)
    for path in paths:
        code=read_url('https://tkt.ge'+path).decode()
        match=re.search(r'"API_KEY",0,"([^"]+)"',code)
        if match:return match.group(1)
    raise RuntimeError('TKT client format changed; previous snapshot must be retained.')
def category(categories):
    ids={c['id'] for c in categories}
    if ids & {17}:return 'kids'
    if ids & {5,91}:return 'sport'
    if ids & {2,89}:return 'music'
    # An explicit Master Class describes the activity, while Theatre/Gabriadze
    # can describe its host. Hobby alone also labels theatre tours, so retain
    # their existing priority rather than reclassifying every mixed listing.
    if ids & {73}:return 'workshop'
    if ids & {16,18,59,22,63,64}:return 'theatre'
    if ids & {94,74}:return 'workshop'
    if ids & {92}:return 'talk'
    if ids & {75}:return 'city'
    return 'other'
def normalize(row,doc,checked):
    item=next((e for e in doc.get('events',[]) if e.get('id')==row['eventId']),None)
    if not item:return None,'missing_detail'
    venue=item.get('venue') or {}; coords=venue.get('coordinates') or {}
    lat=coords.get('latitude'); lng=coords.get('longitude')
    # Bounding envelope includes Tbilisi's northern venues and Kiketi; rejects
    # the explicitly out-of-city locations. Exact source coordinates are kept.
    if lat is not None and lng is not None and not (41.60<=lat<=41.86 and 44.60<=lng<=45.05):return None,'outside_tbilisi'
    if lat is None and 'tbilisi' not in ((venue.get('address','')+' '+venue.get('name','')).lower()):return None,'unresolved_city'
    standard=[t['price']['amount'] for t in item.get('ticketTypes',[]) if t.get('price',{}).get('amount') is not None and not t.get('discount') and not t.get('isSoldByAccessCode')]
    price=min(standard) if standard else (item.get('minPrice') or {}).get('amount',row.get('minPrice'))
    price_note='Обычная минимальная цена; сборы и условия — у продавца.' if standard else 'Минимальная цена источника может включать льготы или специальные условия.'
    raw=plain(item.get('description') or doc.get('description'))
    time_note=None
    jazz=re.search(r'Live jazz starts at\s*[-–:]?\s*(\d{1,2}:\d{2})',raw,re.I)
    if jazz:time_note='Начало музыки — '+jazz.group(1)+'. Указанное время — открытие дверей.'
    start=item.get('date') or row['eventDate']
    url=item.get('eventUrl') or 'https://tkt.ge/event/'+str(row['eventId'])
    return {'id':'tkt:'+str(row['eventId']),'title':item.get('name') or row['eventName'],
        'date':start[:10],'time':start[11:16],'startAt':start[:19]+'+04:00','end':None,
        'venue':venue.get('name',row['venueName']),'venueId':'tkt:'+str(venue.get('id','')),
        'address':venue.get('address') or None,'lat':lat,'lng':lng,
        'locationPrecision':'source' if lat is not None else 'unknown',
        'price':price,'min':price is not None and price>0,'priceNote':price_note,'currency':'GEL',
        'category':category(item.get('subCategories') or doc.get('subCategories',[])),
        'language':None,'description':raw[:420]+('…' if len(raw)>420 else ''),
        'timeNote':time_note,'soldOut':bool(item.get('isSoldOut')),
        'source':'TKT.ge','sourceUrl':url,'sources':[{'name':'TKT.ge','url':url}],
        'checkedAt':checked,'imageUrl':item.get('poster') or None},None
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--start',default=dt.datetime.now(ZoneInfo('Asia/Tbilisi')).date().isoformat());parser.add_argument('--cache',type=Path);parser.add_argument('--cached-only',action='store_true');args=parser.parse_args()
    cache=args.cache or ROOT/'data'/'raw-tkt';cache.mkdir(parents=True,exist_ok=True)
    checked=dt.datetime.now(dt.timezone.utc).isoformat(); start=dt.date.fromisoformat(args.start)
    days=[(start+dt.timedelta(days=i)).isoformat() for i in range(7)]
    def day(date):
        p=cache/f'tkt-{date}.json'
        if args.cached_only:return json.loads(p.read_text())
        data=read_url('https://gateway.tkt.ge/Events/Day?date='+date); value=json.loads(data)
        if not isinstance(value,list):raise ValueError('Unexpected day response')
        p.write_bytes(data);return value
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:groups=list(pool.map(day,days))
    rows={r['eventId']:r for group in groups for r in group}
    key=None if args.cached_only else client_id()
    def detail(eid):
        p=cache/f'detail-{eid}.json'
        if args.cached_only:return eid,json.loads(p.read_text())
        url='https://gateway.tkt.ge/Shows/new?'+urllib.parse.urlencode({'itemId':eid,'category':'Event','api_key':key})
        data=read_url(url);value=json.loads(data)
        if not isinstance(value.get('events'),list):raise ValueError('Unexpected detail response')
        p.write_bytes(data);return eid,value
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:details=dict(pool.map(detail,rows))
    records=[];excluded=[]
    for eid,row in rows.items():
        record,reason=normalize(row,details[eid],checked)
        if record:records.append(record)
        else:excluded.append({'id':eid,'reason':reason})
    result={'source':'TKT.ge','checkedAt':checked,'startDate':days[0],'endDate':days[-1],'events':records,'excluded':excluded,'rawDailyCounts':dict(zip(days,map(len,groups)))}
    out=ROOT/'data'/'tkt.json';out.parent.mkdir(exist_ok=True);temp=out.with_suffix('.tmp');temp.write_text(json.dumps(result,ensure_ascii=False,indent=2));temp.replace(out)
    print(json.dumps({'events':len(records),'excluded':len(excluded),'output':str(out)},ensure_ascii=False))
if __name__=='__main__':main()
