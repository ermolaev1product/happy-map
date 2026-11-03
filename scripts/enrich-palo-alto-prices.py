"""Extract prices from official event HTML and structured offers.
Manual, bounded enrichment. Unknown prices are never converted to zero.
Usage: python scripts/enrich-palo-alto-prices.py --snapshot-dir PATH
"""
import argparse,json,re,html
from pathlib import Path
from datetime import datetime,timezone
ap=argparse.ArgumentParser();ap.add_argument('--snapshot-dir',required=True);args=ap.parse_args();p=Path(args.snapshot_dir);out=Path('public/palo-alto');d=json.loads((out/'events.json').read_text());checked=datetime.now(timezone.utc).isoformat();lookup={};exact={}
for f in list(p.glob('*.html'))+list((p/'prices').glob('*.html')):
 text=f.read_text()
 for raw in re.findall(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',text,re.S):
  try:obj=json.loads(raw)
  except (ValueError,TypeError):continue
  arr=obj if isinstance(obj,list) else [obj];es=[e for e in arr if isinstance(e,dict) and e.get('@type')=='Event']
  for e in es:
   if e.get('url'):
    if e.get('offers'):lookup[e['url']]=e['offers']
    if len(es)==1:exact[e['url']]=text
api={r['event']['localist_url']:r['event'] for f in p.glob('stanford-api*.json') for r in json.loads(f.read_text())['events']}
library={};retrieval=p/'prices/retrieval.json'
if retrieval.exists():
 for row in json.loads(retrieval.read_text()):
  if row.get('status')!='read' or 'bibliocommons.com' not in row['url']:continue
  text=Path(row['path']).read_text();exact[row['url']]=text
  for raw in re.findall(r'<script[^>]*>(.*?)</script>',text,re.S):
   if not raw.startswith('{"app"'):continue
   def walk(o):
    if isinstance(o,dict):
     if isinstance(o.get('title'),str) and o.get('description'):library.setdefault(row['url'],[]).append(re.sub('<[^>]+>',' ',html.unescape(o['description'])))
     for v in o.values():walk(v)
    elif isinstance(o,list):
     for v in o:walk(v)
   walk(json.loads(raw))
before=sum(e['price'] is not None for e in d['events']);updates=[]
for e in d['events']:
 if e['price'] is not None:
  e.setdefault('priceStatus','free' if e['price']==0 else 'published');continue
 url=e['sourceUrl'];offer=lookup.get(url);offer=offer[0] if isinstance(offer,list) and offer else offer;value=offer.get('price') if isinstance(offer,dict) else None;desc=api.get(url,{}).get('description_text') or '';method=None;price=None
 if value is not None and (str(value).upper()=='FREE' or re.fullmatch(r'\d+(?:\.\d+)?',str(value))):price=0 if str(value).upper()=='FREE' else float(value);method='Official event JSON-LD Offer.price'
 elif re.search(r'<strong>\s*Free Event\s*</strong>',exact.get(url,''),re.I):price=0;method='Official event HTML: Free Event'
 elif re.search(r'admission\s+is\s+free|tours[^.]*free of charge|registration\s+is\s+free|free\s*&\s*open to the public|part of the FREE Contemplation',desc,re.I):price=0;method='Explicit free admission in official event description'
 if not method and any(re.search(r'(?:this class|it) is free and open|free (?:program|workshop|class|event)',v,re.I) for v in library.get(url,[])):price=0;method='Explicit free participation in official BiblioCommons event description'
 if method:
  e.update(price=price,priceStatus='free' if price==0 else 'published',priceEvidenceUrl=url,priceCheckedAt=checked,priceMethod=method,priceNote='Организатор указывает бесплатное участие; ограничения доступа и регистрация действуют отдельно.' if price==0 else 'Цена опубликована организатором; окончательную сумму и сборы проверь при покупке.')
  if isinstance(offer,dict) and offer.get('url'):e['registrationUrl']=offer['url']
  updates.append({'id':e['id'],'price':price,'sourceUrl':url,'method':method})
 else:
  e.update(priceStatus='not_published' if url in exact else 'not_verified',priceEvidenceUrl=url,priceCheckedAt=checked)
  e['priceNote']='На проверенной странице стоимость не указана. Это не означает бесплатный вход.' if url in exact else 'Стоимость пока не подтверждена; проверь билетную страницу организатора.'
 # Extra paid option is not the admission price; keep it visible.
 if 'brunch buffet is $25' in desc:e['priceNote']+=' Бранч оплачивается отдельно: 25 USD.'
 if 'Student Participation Fee Agreement' in desc:e['priceNote']+=' Для студентов предусмотрено списание 50 USD при неполном участии; это не обычная цена входа.'
# Official 2026–27 brochure: standard single ticket, not subscription or student price.
brochure='https://irp.cdn-website.com/f7c1c903/files/uploaded/2627-Season-Brochure-Complete-070726.pdf'
performance={'2026-10-11':'11838659','2026-10-17':'11838658','2026-10-18':'11838660'}
for e in d['events']:
 if e['source']=='West Bay Opera':
  e.update(price=126,priceMax=141,min=True,priceStatus='published',priceEvidenceUrl=brochure,priceCheckedAt=checked,priceMethod='Official season 2026–27 brochure, Single Tickets table',priceNote='Обычный разовый билет: задние ряды 126 USD, передние 141 USD. Для senior 101–116 USD, student 51–57 USD. Возможные сборы и доступные места — в билетной форме.',registrationUrl='https://ci.ovationtix.com/35609/performance/'+performance[e['date']],accessType='registration',accessNote='Публичный спектакль; нужен билет на конкретную дату.')
  updates.append({'id':e['id'],'price':126,'priceMax':141,'sourceUrl':brochure,'method':e['priceMethod']})
 if e['source']=='Meyhouse Jazz':e.update(priceMax=49.20,priceStatus='published',priceEvidenceUrl=e['sourceUrl'],priceCheckedAt=checked,priceNote='Билет 38.95–49.20 USD в зависимости от посадки. Еда и напитки отдельно; наличие мест — в билетной форме.')
 if e['title'].startswith(('Tangling the Digital','Touch Me Not')):e.update(accessType='public',accessNote='В описании прямо указаны общая публика и бесплатный вход; правила посещения здания — у организатора.')
prior=json.loads((out/'price-audit.json').read_text()) if (out/'price-audit.json').exists() else None
if prior:
 before=prior['beforeKnown'];updates=list({r['id']:r for r in prior['updates']+updates}.values())
audit={'checkedAt':checked,'beforeKnown':before,'afterKnown':sum(e['price'] is not None for e in d['events']),'total':len(d['events']),'updates':updates,'method':'Exact official event pages, structured ticket offers, explicit free admission and official opera brochure. No guessed zero prices.','limitations':'Not published is different from free. Paid optional brunch and penalty fee are not standard admission prices.'}
(out/'price-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n');(out/'events.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');print({k:audit[k] for k in ['beforeKnown','afterKnown','total']})
