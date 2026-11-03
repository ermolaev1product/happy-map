import json
from pathlib import Path
R=Path(__file__).resolve().parents[1]; O=R/'data/morning-verified-20261027'
x=json.loads(Path('/workspace/shared/hm27-minsk-category-patches.json').read_text());(O/'category-audit.json').write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
f=json.loads((R/'public/minsk/events.json').read_text());d=json.loads((O/'delta.json').read_text())
for p in x['patches']:
 for rows in [f['events'],d['added']]:
  e=next(v for v in rows if v['id']==p['id']);e.update(p['patch']);e['editorialSubtype']=p['editorialSubtype']
(R/'public/minsk/events.json').write_text(json.dumps(f,ensure_ascii=False,separators=(',',':'))+'\n');(O/'delta.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
