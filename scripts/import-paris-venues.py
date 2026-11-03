"""Append explicit independent official venue programmes to the Paris selection."""
import json,re,hashlib,urllib.request
from pathlib import Path
from bs4 import BeautifulSoup
from datetime import datetime
from zoneinfo import ZoneInfo
p=Path('work/paris-london-2026-10-11');out=Path('public/paris');d=json.loads((out/'events.json').read_text());s=json.loads((out/'sources.json').read_text());checked=datetime.now(ZoneInfo('UTC')).isoformat();zone=ZoneInfo('Europe/Paris');events=[]
d['events']=[e for e in d['events'] if e['source'] not in ['Collège de France','Philharmonie de Paris']]
d['sourceRegistry']=[e for e in d['sourceRegistry'] if e['name'] not in ['Collège de France','Philharmonie de Paris']]
s['sources']=[e for e in s['sources'] if e['name'] not in ['Collège de France','Philharmonie de Paris']]
college=next(e for e in d['events'] if e['venue']=='Collège de France')
for filename in ['college-animal','college-tintin']:
 soup=BeautifulSoup((p/(filename+'.txt')).read_text(),'html.parser')
 for script in soup.select('script[type="application/ld+json"]'):
  js=json.loads(script.get_text());js=js if isinstance(js,list) else [js]
  for row in js:
   for v in row.get('subEvent',[]):
    a=datetime.fromisoformat(v['startDate']).astimezone(zone);b=datetime.fromisoformat(v['endDate']).astimezone(zone)
    events.append(dict(id='paris-college-'+hashlib.sha1(v['url'].encode()).hexdigest()[:16],title=v['name'],date=a.date().isoformat(),time=a.strftime('%H:%M'),end=b.strftime('%H:%M'),category='lecture',venue=college['venue'],venueId=college['venueId'],address=college['address'],lat=college['lat'],lng=college['lng'],coordinateSource=college['sourceUrl'],coordinatePrecision='official-calendar',source='Collège de France',sourceUrl=v['url'],checkedAt=checked,price=0,priceEvidenceUrl='https://www.college-de-france.fr/fr/enseignements/tous-les-enseignements',currency='EUR',language='FR',timezone='Europe/Paris',accessType='registration' if filename=='college-tintin' else 'public',accessNote='Use the official registration link for this conference.' if filename=='college-tintin' else 'Seats are first come, first served. The venue recommends arriving at least 45 minutes early; overflow may be directed to a relay room.',priceNote='College teaching and conferences are free to the public under its official admission policy; specific registration and capacity rules still apply.',description='Conference session on literature and comics.' if filename=='college-tintin' else 'A conference session on animals, science, literature, philosophy or ethics.',room='Amphithéâtre Marguerite-de-Navarre',sources=[dict(name='Collège de France',url=v['url'])]))
# Philharmonie direct public concert pages; exact schema/visible date, price and availability.
urls=['https://philharmoniedeparis.fr/fr/activite/concert-symphonique/29427-un-americain-paris','https://philharmoniedeparis.fr/fr/activite/concert/29364-terrenoire-lorchestre-du-nouveau-monde','https://philharmoniedeparis.fr/fr/activite/recital-piano/29177-krystian-zimerman']
for url in urls:
 f=p/('philharmonie-'+url.split('/')[-1]+'.html')
 if not f.exists():
  try:f.write_bytes(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=45).read())
  except Exception as ex:print('Fetch failed',url,str(ex));continue
 soup=BeautifulSoup(f.read_text(),'html.parser');text=soup.get_text(' ',strip=True);title=soup.select_one('h1.title').get_text(' ',strip=True);date=re.search(r'(?:Dimanche|Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi)\s+(\d+)\s+octobre\s+2026\s*[—–-]\s*(\d{1,2})h(\d{2})?',text)
 if not date:print('No exact date',url);continue
 date_str='2026-10-'+date[1].zfill(2);t=date[2].zfill(2)+':'+(date[3] or '00');pv=next(e for e in d['events'] if e['venue']=='Philharmonie de Paris')
 # Extract ticket pricing from the programme pricing area, avoiding unrelated offers in header.
 prices=[]
 for z in soup.find_all(['p','div','li']):
  txt=z.get_text(' ',strip=True)
  if len(txt)<180 and re.search(r'(?:\d+\s*€|\d+\s*euros)',txt,re.I) and not re.search(r'Abonnement|concerts du soir|moins de|18 ans|26 ans|formule',txt,re.I):prices.append(txt)
 note=' · '.join(dict.fromkeys(prices))[:500];ns=[float(x.replace(',','.')) for x in re.findall(r'(\d+(?:[.,]\d+)?)\s*€',note)]
 price=min(ns) if ns else None;maxprice=max(ns) if ns else None
 events.append(dict(id='paris-philharmonie-'+url.split('/')[-1],title=title,date=date_str,time=t,end=None,category='music',venue='Philharmonie de Paris',venueId=pv['venueId'],address=pv['address'],lat=pv['lat'],lng=pv['lng'],coordinateSource=pv['sourceUrl'],coordinatePrecision='venue-complex',source='Philharmonie de Paris',sourceUrl=url,checkedAt=checked,price=price,priceMax=maxprice,min=bool(ns),priceNote=note or 'Ticket price was not verified on this page; check the ticket office.',currency='EUR',language=None,timezone='Europe/Paris',accessType='registration',accessNote='A concert ticket is required. Availability and seat category must be checked with the venue.',soldOut=bool(re.search(r'Complet|Épuisé',text)),description='Concert from the official Philharmonie programme.',sources=[dict(name='Philharmonie de Paris',url=url)]))
# Consolidate duplicate listings by venue/date/time/title across independent sources.
keys={(e['title'].casefold(),e['date'],e.get('time'),e.get('venueId')) for e in d['events']};fresh=[]
for e in events:
 k=(e['title'].casefold(),e['date'],e.get('time'),e.get('venueId'))
 if k in keys:continue
 keys.add(k);fresh.append(e)
d['events']+=fresh;d['events'].sort(key=lambda e:(e['date'],e.get('time') or '',e['title']))
for name,url in [('Collège de France','https://www.college-de-france.fr/fr/agenda'),('Philharmonie de Paris','https://philharmoniedeparis.fr/fr/agenda')]:
 n=sum(e['source']==name for e in fresh);d['sourceRegistry'].append(dict(name=name,url=url,status='imported',count=n,note='Selected dated official programme entries, not the entire season.'))
 s['sources'].append(dict(name=name,url=url,type='Official venue',city='Paris',country='France',language='FR',status='imported',importedCount=n,checkedAt=checked,notes='Selected dated official programme entries. Exact local times and admission conditions preserved. Full coverage not claimed.',acquisitionMethod='Public programme HTML and structured dates.',researchEvidenceUrl=url))
(out/'events.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');(out/'sources.json').write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n');print('Independent official sessions',len(fresh),'total',len(d['events']))
