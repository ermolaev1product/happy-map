from pathlib import Path
import json,datetime,hashlib
from urllib.parse import urlsplit,parse_qsl,urlencode
root=Path(__file__).resolve().parents[1]
p=root/'public/palo-alto/sources.json';r=json.loads(p.read_text());events=json.loads((root/'public/palo-alto/events.json').read_text())['events']
def canon(u):
 try:
  p=urlsplit(u); return p.netloc.lower().removeprefix('www.')+p.path.rstrip('/')+('?' + urlencode(sorted((k,v) for k,v in parse_qsl(p.query) if not k.startswith('utm_') and k not in ['fbclid','gclid','hl'])) if p.query and any(not k.startswith('utm_') and k not in ['fbclid','gclid','hl'] for k,v in parse_qsl(p.query)) else '')
 except: return ''
def urls(e):
 a=[e.get(k,'') for k in ['sourceUrl','primarySourceUrl','sourceListingUrl','supportingSourceUrl']]
 a += [s if isinstance(s,str) else s.get('url','') for s in e.get('sources',[])]; return {canon(u) for u in a if u}
def scope(s):
 p=urlsplit(s['url']);host=p.netloc.lower().removeprefix('www.');path=p.path.rstrip('/')
 if host=='events.stanford.edu' and path=='': return ('domain',host)
 if host=='paloalto.bibliocommons.com' and path=='/v2/events':return ('domain',host)
 if host=='meyhousejazz.com' and path=='/paloalto':return ('domain',host)
 if host=='meetup.com' and path.endswith('/events') and len(path.split('/'))==3:return ('group',host+path[:-7])
 if host=='paloaltomuseum.org' and path=='/events':return ('domain',host)
 if host=='pacificartleague.org' and path=='/community-events':return ('programme',canon(s['url']))
 return ('exact_url',canon(s['url']))
changes=[]
for s in r['sources']:
 old=s.get('importedCount',0);kind,target=scope(s)
 exact=sum(canon(s['url']) in urls(e) for e in events)
 if kind=='domain': n=sum(urlsplit(e.get('sourceUrl','')).netloc.lower().removeprefix('www.')==target for e in events)
 elif kind=='group': n=sum(canon(e.get('sourceUrl','')).startswith(target+'/') for e in events)
 elif kind=='programme':n=sum(any(u==target or u.startswith(target+'/') for u in urls(e)) for e in events)
 else:n=exact
 if old!=n:changes.append({'url':s['url'],'before':old,'after':n,'scope':kind})
 if old!=n or s.get('importedCountScope')!=kind:s.setdefault('countHistory',[]).append({'importedCount':old,'scope':s.get('importedCountScope','legacy_unspecified')})
 s['importedCount']=n;s['importedCountScope']=kind;s['exactUrlCount']=exact
 s['countMethod']='Unique stored event records linked to this exact URL' if kind=='exact_url' else 'Unique stored event records linked to this parent programme path' if kind=='programme' else 'Unique stored event records whose primary source is this '+('domain' if kind=='domain' else 'Meetup group')+'; not a count from this single page'
 s['countCheckedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
r['countingNote']='Detail-page counts are exact-link matches. Calendar overview totals are explicitly labelled by domain or Meetup group. Counts overlap across sources and must not be added together; none claims complete programme coverage.'
p.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
manifest={'schema':'palo-alto-source-count-correction-v1','baselineVersion':104,'eventRecordsUnchanged':495,'changes':changes,'sourceRows':len(r['sources']),'publication':{'status':'prepared'}}

print(json.dumps(manifest,indent=2))
