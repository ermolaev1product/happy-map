#!/usr/bin/env python3
"""Finish English UI/data with a persisted translation memory; never rewrite RU originals.
Run with --translate and local CTranslate2 model to add missing translations.
Normal build is offline and fails on new untranslated copy.
"""
from pathlib import Path
from html.parser import HTMLParser
import json,re,html,sys,subprocess,collections,tempfile
R=Path(__file__).resolve().parents[1];P=R/'public/en';CACHE=R/'data/i18n/english-memory.json'
CYR=re.compile('[А-Яа-яЁё]');memory=json.loads(CACHE.read_text()) if CACHE.exists() else {}
reviewed=json.loads((R/'data/i18n/english-reviewed.json').read_text())
needed=set()
# Protect markup, template expressions, source URLs, and line breaks from translation.
protect=re.compile(r'(<[^>]+>|\$\{[^}]+\}|https?://[^\s<>"\']+|[\r\n]+)')
def parts(s):return protect.split(s)
def collect(s):
 if s in reviewed or s.strip() in reviewed:return
 for i,x in enumerate(parts(s)):
  if i%2==0 and CYR.search(x) and x.strip() not in memory:needed.add(x.strip())
def tr(s):
 if s in reviewed:return reviewed[s]
 if s.strip() in reviewed:return s[:len(s)-len(s.lstrip())]+reviewed[s.strip()]+s[len(s.rstrip()):]
 out=[]
 for i,x in enumerate(parts(s)):
  if i%2==0 and CYR.search(x):
   key=x.strip();y=memory.get(key)
   if y is None:raise ValueError('Missing English translation: '+key[:100])
   x=x[:len(x)-len(x.lstrip())]+y+x[len(x.rstrip()):]
  out.append(x)
 return ''.join(out)
attrs={'title','alt','placeholder','aria-label','aria-description','content','label'}
class Page(HTMLParser):
 def __init__(self,apply=False):super().__init__(convert_charrefs=False);self.out=[];self.raw=None;self.apply=apply
 def handle_starttag(self,tag,aa):
  s=self.get_starttag_text()
  if tag in ['script','style']:self.raw=tag
  for k,v in aa:
   if k in attrs and v and CYR.search(v):
    collect(v)
    if self.apply:s=s.replace(v,html.escape(tr(v),quote=True))
  self.out.append(s)
 def handle_startendtag(self,tag,aa):self.handle_starttag(tag,aa)
 def handle_endtag(self,tag):
  self.out.append('</'+tag+'>')
  if tag==self.raw:self.raw=None
 def handle_data(self,s):
  if not self.raw:
   collect(s)
   if self.apply:s=tr(s)
  self.out.append(s)
 def handle_entityref(self,n):self.out.append('&'+n+';')
 def handle_charref(self,n):self.out.append('&#'+n+';')
 def handle_decl(self,s):self.out.append('<!'+s+'>')
 def handle_comment(self,s):self.out.append('<!--'+s+'-->')
 def handle_pi(self,s):self.out.append('<?'+s+'>')
# Acorn provides exact JS string ranges, avoiding comments/identifiers.
subprocess.run(['node',str(R/'scripts/english-text-nodes.cjs')],cwd=R,check=True)
nodes=json.loads((Path(tempfile.gettempdir())/'happymap-js-text.json').read_text())
for n in nodes:collect(n['value'])
htmls=list(P.rglob('*.html'))
for f in htmls:Page().feed(f.read_text())
jsons=list(P.rglob('*.json'))
immutable={'id','venueId','slug','url','sourceUrl','sourceURL','website','email','sourceURLs','coordinateSource','evidenceURL','researchEvidenceUrl'}
# Preserve source-language search/provenance names only in boundary-verified Yerevan imports.
original_names={'nameRu','titleOriginal','alternateNames','aliases'}
def walk(v,key='',apply=False,preserve_original=False):
 if isinstance(v,str):
  if key in immutable or (preserve_original and key in original_names) or v.startswith(('https://','http://')):return v
  collect(v);return tr(v) if apply else v
 if isinstance(v,list):return [walk(x,key,apply,preserve_original) for x in v]
 if isinstance(v,dict):
  preserve_original=preserve_original or (v.get('cityId')=='yerevan' and v.get('boundaryVerified') is True and v.get('sourceSnapshot')=='2026-10-15T20:21:00Z') or (v.get('cityId') in ['prague','berlin','limassol'] and v.get('directoryResearchBatch')=='2026-10-16-osm' and v.get('sourceSnapshot')=='2026-10-15T20:21:00+00:00')
  if preserve_original and v.get('titleEn'):
   v={**v,'title':v['titleEn'],'venue':v['titleEn']}
  return {k:walk(x,k,apply,preserve_original) for k,x in v.items()}
 return v
for f in jsons:walk(json.loads(f.read_text()))
print('Missing unique text segments:',len(needed),flush=True)
if needed:
 print('Untranslated segments:',json.dumps(sorted(needed),ensure_ascii=False),flush=True)
 if '--translate' not in sys.argv:raise SystemExit('English translation memory incomplete; publication blocked.')
 import ctranslate2,sentencepiece as sp
 model='/private/tmp/happymap-ru-en-model/'
 source=sp.SentencePieceProcessor(model_file=model+'source.spm');target=sp.SentencePieceProcessor(model_file=model+'target.spm')
 engine=ctranslate2.Translator(model,compute_type='int8',intra_threads=4)
 # Split at sentences, then token boundaries to avoid silently truncating long source text.
 jobs=[]
 for text in sorted(needed):
  sentences=re.split(r'(?<=[.!?;])\s+',text);chunks=[]
  for sentence in sentences:
   tokens=source.encode(sentence,out_type=str)
   for i in range(0,len(tokens),180):chunks.append(tokens[i:i+180]+['</s>'])
  for idx,tokens in enumerate(chunks):jobs.append((text,idx,tokens))
 results=collections.defaultdict(dict)
 for start in range(0,len(jobs),16):
  batch=jobs[start:start+16]
  translated=engine.translate_batch([j[2] for j in batch],beam_size=3,max_decoding_length=384,repetition_penalty=1.1)
  for (text,idx,_),result in zip(batch,translated):results[text][idx]=target.decode(result.hypotheses[0])
  if start%160==0:print('Translated segments',start,'/',len(jobs),flush=True)
  # Persist complete entries so interrupted runs can resume.
  complete={text:' '.join(v[i] for i in sorted(v)) for text,v in results.items() if len(v)==sum(1 for j in jobs if j[0]==text)}
  memory.update(complete);CACHE.parent.mkdir(parents=True,exist_ok=True);CACHE.write_text(json.dumps(memory,ensure_ascii=False,indent=2)+'\n')
for f in jsons:f.write_text(json.dumps(walk(json.loads(f.read_text()),apply=True),ensure_ascii=False,indent=None if f.name=='places.json' else 2,separators=(',',':') if f.name=='places.json' else None)+'\n')
# JS offsets are UTF-16; Python offsets count Unicode code points. Convert boundaries explicitly.
byfile=collections.defaultdict(list)
for n in nodes:byfile[n['file']].append(n)
for name,items in byfile.items():
 f=Path(name);raw=f.read_text().encode('utf-16-le')
 for n in sorted(items,key=lambda x:-x['start']):
  val=tr(n['value']);replacement=json.dumps(val,ensure_ascii=False) if n['type']=='Literal' else val.replace('`','\\`')
  raw=raw[:n['start']*2]+replacement.encode('utf-16-le')+raw[n['end']*2:]
 f.write_text(raw.decode('utf-16-le'))
for f in htmls:
 parser=Page(True);parser.feed(f.read_text());f.write_text(''.join(parser.out))
print('English UI and listing data localized. Russian source files unchanged.',flush=True)

# BEGIN CONTEXT-AWARE DISPLAY LABEL NORMALIZATION 20261030
import re, html
NAME_IDS = frozenset(('tunis', 'algiers', 'guatemala-city', 'panama-city'))
BADGE_IDS = frozenset(('doha',))
def normalize_known_city_cards(source, registry):
    cities = {c['id']: c for c in registry['cities']}
    counts = {id: 0 for id in NAME_IDS | BADGE_IDS}
    def card(m):
        value = m.group(0)
        identity = re.search(r'\bdata-city="([^"]+)"', value)
        if not identity or identity[1] not in counts:
            return value
        id = identity[1]; counts[id] += 1
        name = cities[id]['name']['en']
        if id in NAME_IDS:
            value, n = re.subn(r'(<strong>)[^<]*(</strong>)',lambda x:x[1]+html.escape(name)+x[2],value)
        else:
            value, n = re.subn(r'(<span class="city-monogram">)[^<]*(</span>)',lambda x:x[1]+html.escape(name[:2])+x[2],value)
        if n != 1: raise ValueError('Unexpected city card shape: '+id)
        return value
    result = re.sub(r'<a\b[^>]*\bclass="city-card"[^>]*>.*?</a>',card,source,flags=re.S)
    if any(n != 1 for n in counts.values()): raise ValueError('Missing/duplicate target city cards: '+str(counts))
    return result

import copy
from urllib.parse import urlsplit
SOURCE_LABEL_TARGETS = {'santo-domingo-source-9318f0f88c8b46': 'https://www.padonde.net/eventos', 'santo-domingo-source-b3a7266c5dd6be': 'https://zonacolonial.do/actividades/', 'santo-domingo-source-4d69a7302c727a': 'https://cultura.gob.do/noticias/fenate-2026-llevara-75-funciones-a-escenarios-y-comunidades-de-todo-el-pais/', 'santo-domingo-source-17bd514460cab6': 'https://uepatickets.com/tickets/es-do/principal', 'santo-domingo-source-bd4faa5ef2901f': 'https://www.padonde.net/eventos?07cfef8e_page=2', 'santo-domingo-source-f55855da7ffbb3': 'https://www.padonde.net/eventos/jazz-night-29-octubre-the-green-room', 'santo-domingo-source-eac22543f26cc5': 'https://www.padonde.net/eventos/vino-tinta-30-octubre-centro-cultural-casa-libros', 'santo-domingo-source-46bc374382af4f': 'https://www.padonde.net/eventos/fdt-10x10-la-leyenda-de-robin-hood-casa-de-teatro', 'santo-domingo-source-ac342fe72c8baf': 'https://www.padonde.net/eventos/recital-palabra-de-mujer-teatro-las-mascaras', 'santo-domingo-source-57673a591ec3d0': 'https://tix.do/event/JAZZNIGHT-25', 'santo-domingo-source-4eedae681f45e5': 'https://ticketmax.org/evento/900119/', 'santo-domingo-source-239d887db861c0': 'https://ticketmax.org/evento/253550/', 'santo-domingo-source-61bbd6b7899989': 'https://teatronacional.gob.do/programacion/calendario/', 'santo-domingo-source-37443ef11a9c92': 'https://ccesd.aecid.es/w/la-memoria-de-las-frutas-de-claudia-claremi', 'santo-domingo-source-9d5c3a077a14de': 'https://ccesd.aecid.es/', 'santo-domingo-source-b859a3cc049c9a': 'https://butacard.gob.do/', 'santo-domingo-source-41dcfb44c9420c': 'https://ticketmax.org/', 'santo-domingo-source-d96684100bf2ff': 'https://www.padonde.net/eventos?07cfef8e_page=3', 'santo-domingo-source-ab6b631d908d4a': 'https://teatronacional.gob.do/events/', 'santo-domingo-source-94ac5f306cf4aa': 'https://ccesd.aecid.es/w/la-memoria-de-las-frutas-de-claudia-claremi#main-content', 'santo-domingo-source-fcff7e107a4754': 'https://ccesd.aecid.es/w/la-memoria-de-las-frutas-de-claudia-claremi#menu-desp', 'santo-domingo-source-2f70ddbb99bd1b': 'https://ccesd.aecid.es/w/espacios-de-ciudad-espacios-interiores-la-espacialidad-en-la-poes%C3%ADa-de-ren%C3%A9-del-risco', 'santo-domingo-source-f781793116ae74': 'https://ticketmax.org/evento/900042/', 'santo-domingo-source-6168889d958add': 'https://ccesd.aecid.es/w/futuras-ancestras-la-obra-de-denisse-espa%C3%B1ol%C2%A0', 'santo-domingo-source-5146d12c2fb63f': 'https://ticketmax.org/evento/900191/', 'santo-domingo-source-10d86e54d8ebcb': 'https://velvetroomsdq.com/', 'santo-domingo-source-4b01885bf962c8': 'https://ccesd.aecid.es/w/miradas-desde-espa%C3%B1a', 'santo-domingo-source-9271593daae004': 'https://ticketmax.org/evento/900016/', 'santo-domingo-source-56108344829342': 'https://www.waze.com/es-419/live-map/directions/teatro-guloya-calle-arzobispo-portes-ciudad-colonial?to=place.w.190120121.1901266743.3886220', 'santo-domingo-source-246db33b43b0dd': 'https://ticketmax.org/evento/900059/', 'santo-domingo-source-402520c06db86b': 'https://ccesd.aecid.es/w/eurocine-2026.-saben-aquell', 'santo-domingo-source-df53e3ef9427d1': 'https://ticketmax.org/evento/900189/', 'santo-domingo-source-23aa78098130ec': 'https://ccesd.aecid.es/w/membran%C3%B3fonos-del-verano', 'santo-domingo-source-1663ead7fd3774': 'https://ticketmax.org/evento/253522/', 'santo-domingo-source-aacef19cefca29': 'https://ticketmax.org/evento/900139/', 'santo-domingo-source-acfffc3d854a2c': 'https://ccesd.aecid.es/w/en-torno-a-la-sonrisa-de-audrey-hepburn-', 'santo-domingo-source-9dd051cf4c2384': 'https://ticketmax.org/evento/265957/', 'santo-domingo-source-e7288fa5e5f322': 'https://ccesd.aecid.es/w/inscr%C3%ADbete', 'santo-domingo-source-f64735d6a4ea23': 'https://ticketmax.org/evento/900193/', 'santo-domingo-source-2c4d53895b20bd': 'https://ccesd.aecid.es/w/pensar-y-recrear-la-mujer-en-la-imagen', 'santo-domingo-source-14c1701f822995': 'https://www.google.com/maps?q=Velvet%20Room%2C%20Av.%20Enriquillo%2028%2C%20Plaza%20Bloom%2C%20Santo%20Domingo&z=16&output=embed', 'santo-domingo-source-da31cd8621c8c6': 'https://ticketmax.org/evento/253716/', 'santo-domingo-source-78c6364df47577': 'https://ccesd.aecid.es/w/hablar-con-el-paisaje-la-video-poes%C3%ADa-como-forma-de-atenci%C3%B3n', 'santo-domingo-source-f62ba96ade3566': 'https://ccesd.aecid.es/cce/contacta-con-el-cce', 'santo-domingo-source-85588241d167af': 'https://ticketmax.org/evento/900176/', 'santo-domingo-source-3b0ebc22556e10': 'https://ccesd.aecid.es/w/la-construcci%C3%B3n-narrativa-de-la-novela-el-narrador-el-narratario-y-los-personajes', 'santo-domingo-source-eea88618f1589b': 'https://teatronacional.gob.do/contacto/', 'santo-domingo-source-d90617e672c7a5': 'https://ticketmax.org/evento/253727/', 'santo-domingo-source-9060bd051ccb32': 'https://ticketmax.org/evento/253999/', 'santo-domingo-source-9d94ddfdf5184f': 'https://booking.page/en/company/page/jardinsecretord', 'santo-domingo-source-8151f4d40fa4e4': 'https://ccesd.aecid.es/w/concierto-de-palo-ka%C3%B1uto%C2%A0', 'santo-domingo-source-80a1e08a182a26': 'https://ticketmax.org/evento/900058/', 'santo-domingo-source-568d5251bc8a6e': 'https://www.vamoseventos.com/venue/abf89570-5684-44f4-ab6c-6daa65a7fcb5', 'santo-domingo-source-2475e005e71d17': 'https://ticketmax.org/evento/254011/', 'santo-domingo-source-7d4fcded46facf': 'https://ticketmax.org/evento/900141/', 'santo-domingo-source-ca82e17f1b525b': 'https://ticketmax.org/evento/254179/', 'santo-domingo-source-5c84bd3eaf3f5f': 'https://ticketmax.org/evento/253308/', 'santo-domingo-source-aab6ed45034ce3': 'https://ticketmax.org/evento/254191/', 'santo-domingo-source-c4b2d7dd322954': 'https://www.openstreetmap.org/api/0.6/way/406853522/full', 'santo-domingo-source-d49a6599b55696': 'https://ticketmax.org/evento/900200/', 'santo-domingo-source-a684f187495a71': 'https://ticketmax.org/evento/254330/', 'santo-domingo-source-5f0349eac4c434': 'https://ticketmax.org/evento/264497/', 'santo-domingo-source-14f61a32cfd77b': 'https://ticketmax.org/evento/254338/', 'santo-domingo-source-7360d09eca286b': 'https://ticketmax.org/evento/900143/', 'santo-domingo-source-40689f938a04d6': 'https://ticketmax.org/evento/254658/', 'santo-domingo-source-b4f94fc040afdc': 'https://ticketmax.org/evento/254701/', 'santo-domingo-source-6165f7961a950b': 'https://ticketmax.org/evento/900002/', 'santo-domingo-source-187c05372d80af': 'https://ticketmax.org/evento/254776/', 'santo-domingo-source-4499c395bf6222': 'https://ticketmax.org/evento/254783/', 'santo-domingo-source-a6494f0f7dca08': 'https://ticketmax.org/evento/900147/', 'santo-domingo-source-e0ae7ea32d2a0e': 'https://www.waze.com/es-419/live-map/directions/do/distrito-nacional/santo-domingo/casa-san-pablo?to=place.ChIJh3zJ8B1ipY4RRHhhX0KZBIg', 'santo-domingo-source-c0916a5ca83a6a': 'https://www.teresaperalta.com/bibliotecas/biblioteca-pedro-mir', 'santo-domingo-source-5db0b2c55dba11': 'https://uasd.edu.do/biblioteca-pedro-mir/espacios/', 'santo-domingo-source-b336546ef6260f': 'https://linktr.ee/jardinsecretord', 'santo-domingo-source-ec28059793e338': 'https://www.openstreetmap.org/api/0.6/way/228040302/full', 'santo-domingo-source-22de2a684b988c': 'https://maps.app.goo.gl/nXBZDtf9gv2XKG2r6', 'santo-domingo-source-1762ac11d9b01b': 'https://ticketmax.org/evento/266538/', 'santo-domingo-source-2c125dcff2fcbc': 'https://ticketmax.org/evento/900074/', 'santo-domingo-source-283cb8caafe86b': 'https://smartticket.com.do/show-event?idEvent=363', 'santo-domingo-source-ebf00f25c57af3': 'https://smartticket.com.do/show-event?idEvent=284', 'santo-domingo-source-d848de318540a1': 'https://maps.google.com/maps?q=Casa%20Libros%20RD%2C%20Calle%20Mois%C3%A9s%20Garc%C3%ADa%20%233%2C%20en%20el%20sector%20de%20Gazcue%2C%20Santo%20Domingo&z=16&output=embed', 'santo-domingo-source-ed6c574e5d6651': 'https://www.waze.com/es/live-map/directions/casa-de-teatro-calle-arzobispo-merino-110-ciudad-colonial?to=place.w.190120121.1901332279.428015'}

def normalize_source_labels(payload):
    result = copy.deepcopy(payload)
    seen = set()
    for row in result['sourceRegistry']:
        identity = row['id']
        if identity not in SOURCE_LABEL_TARGETS:
            continue
        if identity in seen:
            raise ValueError('Duplicate source label target: ' + identity)
        seen.add(identity)
        if row['url'] != SOURCE_LABEL_TARGETS[identity]:
            raise ValueError('Source URL changed: ' + identity)
        label = urlsplit(row['url']).hostname
        if not label or row['name'] not in ('Santiago source', label):
            raise ValueError('Unexpected source label: ' + identity)
        row['name'] = label
    if seen != set(SOURCE_LABEL_TARGETS):
        raise ValueError('Missing source label targets')
    return result

ROUTE_HEADER_BAD_NAMES = {'tunis':'Tunisia', 'algiers':'Algeria', 'guatemala-city':'Guatemala', 'panama-city':'Panama'}
def normalize_city_route_header(source, city_id, registry):
    if city_id not in ROUTE_HEADER_BAD_NAMES:
        raise ValueError('Unapproved route header city')
    if not re.search(r'<html\s+lang="en"(?:\s|>)', source):
        raise ValueError('Not an EN route')
    cities = [c for c in registry['cities'] if c['id'] == city_id]
    if len(cities) != 1 or not cities[0]['name'].get('en'):
        raise ValueError('Missing or duplicate registry city')
    good = cities[0]['name']['en']
    pattern = r'(<span class="current-city">)([^<]*)(</span>)'
    matches = list(re.finditer(pattern, source))
    if len(matches) != 1 or matches[0][2] not in (ROUTE_HEADER_BAD_NAMES[city_id], good):
        raise ValueError('Unexpected current-city label/shape')
    return re.sub(pattern, lambda m: m[1]+html.escape(good)+m[3], source)

ADDITIONAL_SOURCE_LABEL_TARGETS = {'bangkok': {'bangkok-source-7a3d4d668e20ba': {'url': 'https://www.bangkokartcity.org/th/discover-detail/art-in-motion-synchronicity-×-resonate', 'oldName': 'Doha source'}, 'bangkok-source-5d24e1078933d2': {'url': 'https://www.bangkokartcity.org/th/discover-detail/poise-disarray-(阴阳调和)', 'oldName': 'Doha source'}, 'bangkok-source-5582dfb2583781': {'url': 'https://www.bangkokartcity.org/th/discover-detail/beans-×-benzilla-when-coffee-meets-art', 'oldName': 'Doha source'}, 'bangkok-source-ff7b8b64731568': {'url': 'https://www.bangkokartcity.org/th/discover-detail/deco-boko-凸凹', 'oldName': 'Doha source'}}, 'kuala-lumpur': {'kuala-lumpur-source-51e59e98609f83': {'url': 'https://www.klpac.org/', 'oldName': 'Doha source'}, 'kuala-lumpur-source-462259c7517a96': {'url': 'https://www.cloudjoi.com/shows/7491-chandrabookhi', 'oldName': 'Doha source'}, 'kuala-lumpur-source-60df7c8bdea48d': {'url': 'https://amcham-malaysia.glueup.com/event/spotlight-beyond-compliance-turning-supply-chain-sustainability-data-into-business-value-197067/', 'oldName': 'Doha source'}, 'kuala-lumpur-source-2f923e3bec80af': {'url': 'https://www.klpac.org/shows/david-glasss-tempest/', 'oldName': 'Doha source'}, 'kuala-lumpur-source-bd6ebfdc2d74da': {'url': 'https://www.klpac.org/shows/malaysia-nextgen-dance-competition-2026/', 'oldName': 'Doha source'}, 'kuala-lumpur-source-9adb01b4452ed2': {'url': 'https://www.klpac.org/shows/pinball-monkeys-present-mr-secret-midnight-time/', 'oldName': 'Doha source'}, 'kuala-lumpur-source-5be263d8d827af': {'url': 'https://www.klpac.org/shows/a-fantasy-world-ii-anime-x-classical-with-the-klpac-string-orchestra/', 'oldName': 'Doha source'}, 'kuala-lumpur-source-533212597399d2': {'url': 'https://www.klpac.org/shows/%e9%81%99%e9%81%a0%e7%9a%84%e6%9d%b1%e6%96%b9%e6%9c%89%e4%b8%80%e7%be%a4%e9%ac%bc-the-ghosts-within/', 'oldName': 'Doha source'}, 'kuala-lumpur-source-ff7897d7cb4257': {'url': 'https://www.klpac.org/about-us/your-visit/', 'oldName': 'Doha source'}, 'kuala-lumpur-source-3191755d4e5f30': {'url': 'https://www.klpac.org/shows/tribute-to-brian-tan-with-the-klpac-orchestra/', 'oldName': 'Doha source'}}, 'guatemala-city': {'guatemala-city-source-43ccf3a923acec': {'url': 'https://noticias.mcd.gob.gt/agenda-cultural/', 'oldName': 'Santiago source'}, 'guatemala-city-source-60e166e5a9c944': {'url': 'https://eventos.guatemala.com/2026/10/29', 'oldName': 'Santiago source'}, 'guatemala-city-source-6ad46bc3f51cf8': {'url': 'https://eventos.guatemala.com/2026/10', 'oldName': 'Santiago source'}, 'guatemala-city-source-a7b063f4161517': {'url': 'https://teatroenguatemala.gt/cultura/', 'oldName': 'Santiago source'}, 'guatemala-city-source-d5574c99412506': {'url': 'https://guatemalacvb.com/eventos/mes/2026-11/', 'oldName': 'Santiago source'}, 'guatemala-city-source-be6d4c67ff6291': {'url': 'https://noticias.mcd.gob.gt/actividad/foro-miguel-angel-asturias-su-legado-historico-y-la-importancia-del-retorno-de-sus-restos/', 'oldName': 'Santiago source'}, 'guatemala-city-source-c09ad9eb0ebf2d': {'url': 'https://noticias.mcd.gob.gt/actividad/recorrido-noche-de-leyendas/', 'oldName': 'Santiago source'}, 'guatemala-city-source-3648afd4382fcb': {'url': 'https://noticias.mcd.gob.gt/actividad/la-tumba-del-gran-lengua-3/', 'oldName': 'Santiago source'}, 'guatemala-city-source-8cb170ce5846cf': {'url': 'https://noticias.mcd.gob.gt/actividad/homenaje-en-universidad-popular/', 'oldName': 'Santiago source'}, 'guatemala-city-source-7b15a043412f0d': {'url': 'https://noticias.mcd.gob.gt/actividad/misa-conmemorativa-y-velacion/', 'oldName': 'Santiago source'}, 'guatemala-city-source-fb99df89f7aa07': {'url': 'https://noticias.mcd.gob.gt/actividad/exposicion-de-la-revolucion-al-arte/', 'oldName': 'Santiago source'}, 'guatemala-city-source-5f0a00378fd2e8': {'url': 'https://cceguatemala.aecid.es/?p=1677', 'oldName': 'Santiago source'}, 'guatemala-city-source-9782b07563370d': {'url': 'https://fundacionpaiz.org.gt/', 'oldName': 'Santiago source'}, 'guatemala-city-source-13526878ea565a': {'url': 'https://eventos.guatemala.com/culturales/criptoarte-territorios-latentes-exposicion-de-arte-digital-ciudad-guatemala-2026.html', 'oldName': 'Santiago source'}, 'guatemala-city-source-dbd6af38593364': {'url': 'https://noticias.mcd.gob.gt/2026/10/27/festival-nacional-de-musica-camara-presenta-noches-de-rapsodia-con-el-quinteto-xocomil-y-el-pianista-jr-medina/', 'oldName': 'Santiago source'}, 'guatemala-city-source-31927e8f6d0d75': {'url': 'https://eventos.guatemala.com/musica-conciertos/hot-latin-fest.html', 'oldName': 'Santiago source'}, 'guatemala-city-source-762f1c510f92bb': {'url': 'https://eventos.guatemala.com/musica-conciertos/resonancias-de-guatemala.html', 'oldName': 'Santiago source'}, 'guatemala-city-source-7a11cecca68831': {'url': 'https://eventos.guatemala.com/musica-conciertos/concierto-timo-guatemala-2026.html', 'oldName': 'Santiago source'}, 'guatemala-city-source-6bd5e0fc33edab': {'url': 'https://cceguatemala.org/', 'oldName': 'Santiago source'}, 'guatemala-city-source-05fe7825a95681': {'url': 'https://fundacionpaiz.org.gt/exposicion-criptoarte-territorios-latentes/', 'oldName': 'Santiago source'}, 'guatemala-city-source-4a9205fdfa5ff8': {'url': 'https://cceguatemala.aecid.es/w/inauguracion_de_la_exposicion_con_ojos_propios', 'oldName': 'Santiago source'}, 'guatemala-city-source-3a1c7026f31978': {'url': 'https://fundacionpaiz.org.gt/workshop-digital-art-from-creation-to-circulation/', 'oldName': 'Santiago source'}, 'guatemala-city-source-68b58b86faf76b': {'url': 'https://cceguatemala.aecid.es/w/inauguracion_del_mural_hilos_que_hablan', 'oldName': 'Santiago source'}, 'guatemala-city-source-46f60e1f2ed97f': {'url': 'https://cceguatemala.aecid.es/w/josefinos', 'oldName': 'Santiago source'}, 'guatemala-city-source-cad328ec083ff5': {'url': 'https://fundacionpaiz.org.gt/programa-educativo/', 'oldName': 'Santiago source'}, 'guatemala-city-source-1a05ce6ed9d17b': {'url': 'https://cceguatemala.aecid.es/w/rutinas_domesticas_para_habitar_evitar_el_cuerpo', 'oldName': 'Santiago source'}, 'guatemala-city-source-531ae50dc55ff8': {'url': 'https://cceguatemala.aecid.es/w/t%C3%ADteres-cuentos-de-casi-miedo', 'oldName': 'Santiago source'}, 'guatemala-city-source-96781b62929963': {'url': 'https://cceguatemala.aecid.es/w/presentacion_el_canto_de_las_flores', 'oldName': 'Santiago source'}, 'guatemala-city-source-f277d2e292a369': {'url': 'https://cceguatemala.aecid.es/w/compa%C3%B1%C3%ADa-nacional-de-teatro-cl%C3%A1sico-versos-a-viva-voz-2', 'oldName': 'Santiago source'}, 'guatemala-city-source-fea29b9b28ad9b': {'url': 'https://www.waze.com/live-map/directions/gt/guatemala/guate/centro-cultural-de-espana-en-guatemala?to=place.ChIJ1xyfCBeiiYURq_qPwrB6qoE', 'oldName': 'Santiago source'}, 'guatemala-city-source-0b0f588c84c155': {'url': 'https://cceguatemala.aecid.es/eventos/buscador-de-eventos', 'oldName': 'Santiago source'}, 'guatemala-city-source-147b1a7326b234': {'url': 'https://www.waze.com/es/live-map/directions/fundacion-paiz-11-avenida-zona-5%2C-guatemala?to=place.w.176619666.1766131126.5053772', 'oldName': 'Santiago source'}, 'guatemala-city-source-1b3fc4b9c3c0ac': {'url': 'https://cceguatemala.aecid.es/w/ciclo_de_talento_espa%C3%B1ol_2026', 'oldName': 'Santiago source'}, 'guatemala-city-source-92398bca057921': {'url': 'https://maps.app.goo.gl/6UoRGMHVGMK9FcZZA', 'oldName': 'Santiago source'}, 'guatemala-city-source-8bc4889098ae09': {'url': 'https://hotlatinfest.com/', 'oldName': 'Santiago source'}, 'guatemala-city-source-388fc533d9cbf0': {'url': 'https://www.eticket.gt/masinformacion.aspx?idevento=8738', 'oldName': 'Santiago source'}, 'guatemala-city-source-3f615efbed0047': {'url': 'https://proticket.store/event/resonancias-de-guatemala-maestro-joaquin-orellana-4ddk/', 'oldName': 'Santiago source'}, 'guatemala-city-source-7c199a66015292': {'url': 'https://mcd.gob.gt/convocatoria-ccmaa/', 'oldName': 'Santiago source'}, 'guatemala-city-source-105f2b1b18d872': {'url': 'https://guatemala.gob.gt/palacio-nacional-de-la-cultura-ofrece-recorridos-guiados/', 'oldName': 'Santiago source'}}}

def normalize_additional_source_labels(payload, city_id, registry_key):
    if city_id not in ADDITIONAL_SOURCE_LABEL_TARGETS or registry_key not in ('sourceRegistry','sources'):
        raise ValueError('Unapproved source-label scope')
    targets = ADDITIONAL_SOURCE_LABEL_TARGETS[city_id]
    result = copy.deepcopy(payload)
    seen = set()
    for row in result[registry_key]:
        identity = row['id']
        if identity not in targets:
            continue
        if identity in seen or row['url'] != targets[identity]['url']:
            raise ValueError('Duplicate target or changed source URL: '+identity)
        seen.add(identity)
        label = urlsplit(row['url']).hostname
        if not label or row['name'] not in (targets[identity]['oldName'],label):
            raise ValueError('Unexpected source name: '+identity)
        row['name'] = label
    if seen != set(targets):
        raise ValueError('Missing additional source-label target')
    return result

def apply_context_display_labels(root):
    # EN-only generator postpass: never opens/writes RU event originals.
    # Root multilingual picker is read-only; never refresh source clocks.
    root = Path(root)
    registry = json.loads((root/'public/city-picker.json').read_text())
    cardpath = root/'public/en/cities.html'
    before = cardpath.read_text()
    outputs = [(cardpath, before, normalize_known_city_cards(before, registry))]
    for relative in ['public/en/santo-domingo/events.json']:
        p = root/relative
        before = p.read_text()
        data = json.loads(before)
        revised = normalize_source_labels(data)
        after = before if revised == data else json.dumps(revised, ensure_ascii=False, indent=2)+'\n'
        outputs.append((p,before,after))
    for city_id in ROUTE_HEADER_BAD_NAMES:
        for page in ['index.html', 'map.html']:
            p = root/('public/en/'+city_id+'/'+page)
            before = p.read_text()
            outputs.append((p,before,normalize_city_route_header(before,city_id,registry)))
    # EN-only: one-time RU correction is intentionally not part of generation.
    for city_id in ADDITIONAL_SOURCE_LABEL_TARGETS:
        for filename,key in [('events.json','sourceRegistry'),('source-registry.json','sources')]:
            p = root/('public/en/'+city_id+'/'+filename)
            before = p.read_text()
            data = json.loads(before)
            revised = normalize_additional_source_labels(data,city_id,key)
            after = before if revised == data else json.dumps(revised,ensure_ascii=False,indent=2)+'\n'
            outputs.append((p,before,after))
    for p,before,after in outputs:
        if after != before:
            p.write_text(after)
    return [str(p.relative_to(root)) for p,before,after in outputs if after != before]

apply_context_display_labels(R)
# END CONTEXT-AWARE DISPLAY LABEL NORMALIZATION 20261030
