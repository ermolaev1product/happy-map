import json,subprocess,math
from pathlib import Path
R=Path(__file__).resolve().parents[1]
old=json.loads(subprocess.check_output(['git','show','66ee2485bd859a3c91e57618f9272081ebb3f07c:public/belgrade/events.json'],cwd=R));new=json.loads((R/'public/belgrade/events.json').read_text())
a={e['id']:e for e in old['events']};b={e['id']:e for e in new['events']}
assert len(a)==385 and len(b)==411
assert all(b[k]==v for k,v in a.items()),'Existing event changed'
adds=[v for k,v in b.items() if k not in a];assert len(adds)==26
for e in adds:
 assert e['date']>'2026-10-12' and e['date']<='2026-11-11'
 assert all(e.get(k) is not None for k in ['time','price','currency','coordinateSource','sourceUrl','address'])
 assert e['category'] in {'talk','film','music','workshop','games','tour','theatre'}
 assert math.isfinite(e['lat']) and math.isfinite(e['lng'])
# All unrelated files must retain the latest source state, including APKs and both UIs.
allowed={'data/i18n/english-reviewed.json','public/belgrade/events.json','public/en/belgrade/events.json','scripts/complete-english.py','scripts/english-text-nodes.cjs','lib/place-catalog.json','package.json','scripts/ensure-english-build.mjs','data/i18n/english-build-sha256.json','scripts/check-belgrade-expansion-20261012.py','data/reviewed-events-belgrade-telegram-2026-10-12.json','public/research-belgrade-telegram-2026-10-12.json','public/en/research-belgrade-telegram-2026-10-12.json'}
changed=set(subprocess.check_output(['git','diff','--name-only','66ee2485bd859a3c91e57618f9272081ebb3f07c'],cwd=R,text=True).splitlines())
assert changed<=allowed,changed-allowed
print('PASS: 26 future additions; all 385 prior records and unrelated tracked UI/data/APK files unchanged.')

p="lib/place-catalog.json"
pa=json.loads(subprocess.check_output(["git","show","66ee2485bd859a3c91e57618f9272081ebb3f07c:"+p],cwd=R));pb=json.loads((R/p).read_text())
assert all(pb[c]==pa[c] for c in pa if c!="belgrade")
assert all(pb["belgrade"][k]==v for k,v in pa["belgrade"].items())
assert len(pb["belgrade"])-len(pa["belgrade"])==6
print("PASS: derived social registry adds six event meeting points only; prior places preserved.")
