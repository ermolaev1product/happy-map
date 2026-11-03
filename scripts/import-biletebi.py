#!/usr/bin/env python3
"""Public Biletebi SSR importer. No credentials. Partial coverage: homepage sections only.
Usage: python3 work/biletebi_import.py --date 2026-10-04 --days 7 --output work/biletebi-new.json
Inspect category listing SSR to broaden coverage; never claim the homepage is exhaustive.
"""
import argparse,datetime,json,pathlib,re,subprocess
from zoneinfo import ZoneInfo

def fetch(url):
    return subprocess.check_output(['curl','--fail','--location','--silent','--show-error','--max-time','20',url],text=True)

def rsc_objects(html,key):
    decoder=json.JSONDecoder()
    for match in re.finditer(r'self\.__next_f\.push\((.*?)\)</script>',html):
        try: chunk=json.loads(match[1])[1]
        except (ValueError,IndexError): continue
        if not isinstance(chunk,str):continue
        for item in re.finditer('"'+key+'":',chunk):
            try:yield decoder.raw_decode(chunk[item.end():])[0]
            except ValueError:continue

def main():
    p=argparse.ArgumentParser();p.add_argument('--date',default=datetime.datetime.now(ZoneInfo('Asia/Tbilisi')).date().isoformat());p.add_argument('--days',type=int,default=7);p.add_argument('--output',default='work/biletebi-new.json');args=p.parse_args()
    start=datetime.date.fromisoformat(args.date);end=start+datetime.timedelta(days=args.days)
    home=fetch('https://biletebi.ge/en');candidates={e['slug']:e for group in rsc_objects(home,'eventList') for e in group if e.get('slug') and e.get('locationTitle')}
    result=[]
    for slug,e in candidates.items():
        if e.get('startsAt','')[:10]>=end.isoformat() or e.get('endsAt','')[:10]<start.isoformat():continue
        url='https://biletebi.ge/en/'+e['mainCategorySlug']+'/'+slug
        details=list(rsc_objects(fetch(url),'eventData'))
        if not details:continue
        d=details[0];maps=d.get('locationExternalUrl')
        if not maps:continue
        try:resolved=subprocess.check_output(['curl','-L','-s','--max-time','15','-o','/dev/null','-w','%{url_effective}',maps],text=True)
        except subprocess.CalledProcessError:continue
        geo=re.search(r'!3d([\d.-]+)!4d([\d.-]+)',resolved)
        if not geo:continue
        lat,lng=map(float,geo.groups())
        if not (41.55<lat<41.90 and 44.60<lng<45.10):continue
        sessions={x.get('startsAt') for x in d.get('events',[]) if x.get('startsAt')} or {d['startsAt']}
        for instant in sorted(sessions):
            dt=datetime.datetime.fromisoformat(instant.replace('Z','+00:00')).astimezone(ZoneInfo('Asia/Tbilisi'))
            if not start<=dt.date()<end:continue
            prices=[x['minPrice'] for x in d.get('events',[]) if x.get('startsAt')==instant and not x.get('isSoldOut') and x.get('minPrice') is not None]
            result.append(dict(id='biletebi-'+slug+'-'+dt.date().isoformat(),title=d['title'],date=dt.date().isoformat(),time=dt.strftime('%H:%M'),end=None,venue=d['locationTitle'],address=d['locationTitle'],lat=lat,lng=lng,price=min(prices) if prices else None,min=True,currency='GEL',category={'concerts':'music','theatres':'theatre','sport':'sport'}.get(e['mainCategorySlug'],'other'),source='Biletebi.ge',sourceUrl=url,coordinateSource=resolved,checkedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),imageUrl=d.get('coverUrl')))
    pathlib.Path(args.output).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
    print(f'{len(result)} events written. Coverage: homepage only; geocoded Tbilisi-area venues.')
if __name__=='__main__':main()
