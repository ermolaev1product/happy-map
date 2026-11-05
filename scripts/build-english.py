#!/usr/bin/env python3
"""Generate English client UI, preserving source listings and storage identifiers."""
from pathlib import Path
import json,re,runpy,shutil
r=Path(__file__).resolve().parents[1];p=r/'public';out=p/'en'
update_preview=runpy.run_path(str(r/'scripts/share-preview-metadata.py'))['update_preview']
module=runpy.run_path(str(r/'scripts/localize-palo-alto.py'));copy=module['COPY']
extra=r/'scripts/interface-en.json'
if extra.exists():copy.update(json.loads(extra.read_text()))
def translate(s):
 for a,b in sorted(copy.items(),key=lambda x:-len(x[0])):
  if not a:continue
  b=b.replace("'",'’')
  s=re.sub(r'(?<![А-Яа-яЁё])'+re.escape(a)+r'(?![А-Яа-яЁё])',lambda m:b,s) if re.fullmatch('[А-Яа-яЁё]+',a.strip()) else s.replace(a,b)
 return s
if out.exists():shutil.rmtree(out)
# The multilingual chooser registry is shared from the root, never translated or mirrored.
files=[f for f in p.rglob('*') if f.is_file() and f.name not in ['telegram.html','telegram-entry.js','telegram.js','telegram.css','city-picker.json','locale-registry.json','catalog-modes.js','robots.txt','sitemap.xml'] and not any(x in f.relative_to(p).parts for x in ['en','de','pt-br','fr','fr-ca','it','downloads','guide','countries'])]
for f in files:
 rel=f.relative_to(p);dest=out/rel;dest.parent.mkdir(parents=True,exist_ok=True)
 if 'maplibre' in rel.parts or f.suffix not in ['.html','.js','.css'] or f.name in ['language-switch.js','entry-language.js','locale-policy.js','leaflet.js']:
  shutil.copy2(f,dest);continue
 s=translate(f.read_text()).replace('country=Сербия','country=Serbia')
 s=s.replace('lang="ru"','lang="en"').replace("'ru-RU'","'en-GB'").replace('"ru-RU"','"en-GB"').replace("toLocaleDateString('ru'","toLocaleDateString('en-GB'").replace("toLocaleString('ru'","toLocaleString('en-GB'").replace("toLocaleTimeString('ru'","toLocaleTimeString('en-GB'")
 # City generators may emit either quote style for locale arguments.
 s=re.sub(r'(toLocale(?:DateString|TimeString|String)\()([\"\'])ru\2', r"\1'en-GB'", s)
 # Localize absolute static references; APIs, download links and external URLs stay intact.
 def local(m):
  quote,url=m.groups();path=url.split('?')[0].split('#')[0]
  if path.startswith(('/en/','/downloads/','/api/')):return m.group(0)
  if (p/path.lstrip('/')).is_file() and path not in ['/language-switch.js','/catalog-modes.js']:return quote+'/en'+url
  return m.group(0)
 s=re.sub(r'''(["'`])(/[^\s"'`<>]+)''',local,s)
 if f.suffix=='.html':
  # Canonical and preview identity follow the generated page's locale.
  # External source links and images remain untouched.
  s=re.sub(r'(<(?:link[^>]*rel="canonical"[^>]*href|meta[^>]*property="og:url"[^>]*content)=")https://happymap\.app/(?!en/)([^"]*)',r'\1https://happymap.app/en/\2',s)
 if f.suffix=='.html':s=re.sub(r'(src|href)="([^"<>]+\.(?:js|css))(?:\?[^"]*)?"',lambda m:m.group(0) if m[2].startswith('http') else m[1]+'="'+m[2]+'?v='+('phone-20261014' if m[2].endswith('download-page.css') else 'explore-menu-20261014' if m[2].endswith(('map-space.css','download.css')) else 'flensburg-de-20261014' if m[2].endswith('language-switch.js') else 'english-live-expiry-65')+'"',s)
 if f.suffix=='.html':s=re.sub(r'(src="[^"]*city-state\.js)\?[^"]*',r'\1?v=share-20261014',s)
 if rel.parts[0]=='vienna':
  s=s.replace("fetch('places.json')", "fetch('/vienna/places.json')")
  s=s.replace('href="/en/vienna/places.json"','href="/vienna/places.json"').replace('href="places.json"','href="/vienna/places.json"')
 if f.suffix=='.html':s=update_preview(s,'en')
 dest.write_text(s)
print('English client generated:',len(files),'files; listing JSON copied for the full translation pass')
