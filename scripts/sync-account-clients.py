#!/usr/bin/env python3
"""Keep existing English-root account clients on the reviewed common implementation."""
from pathlib import Path
import runpy,json,re
root=Path(__file__).resolve().parents[1]
module=runpy.run_path(str(root/'scripts/localize-palo-alto.py'))
module['COPY'].update(json.loads((root/'scripts/interface-en.json').read_text()))
def translate(s):
 for a,b in sorted(module['COPY'].items(),key=lambda x:-len(x[0])):
  b=b.replace("'",'’')
  s=re.sub(r'(?<![А-Яа-яЁё])'+re.escape(a)+r'(?![А-Яа-яЁё])',lambda m:b,s) if re.fullmatch('[А-Яа-яЁё]+',a.strip()) else s.replace(a,b)
 return s.replace("toLocaleString('ru'","toLocaleString('en-GB'").replace("toLocaleTimeString('ru'","toLocaleTimeString('en-GB'")
for city in ['palo-alto','paris','london','flensburg']:
 directory=root/'public'/city
 (directory/'social.en.js').write_text(translate((root/'public/social.js').read_text()))
 (directory/'plan-account.js').write_text(translate((root/'public/plan-account.js').read_text()))
 for name in ['index.html','map.html']:
  path=directory/name;s=path.read_text()
  if 'plan-account.js' not in s:s=re.sub(r'(<script[^>]*src="social.en.js[^\"]*"[^>]*></script>)',r'\1<script defer src="plan-account.js"></script>',s)
  path.write_text(s)
print('Shared account and plan clients synchronized for four English-root cities.')
