"""Merge research access points without upgrading unread sources into imports."""
import json
from pathlib import Path
root=Path('work/paris-london-2026-10-11')
research=json.loads((root/'social-sources.json').read_text())['sources']+json.loads((root/'website-source-audit.json').read_text())['sources']
for slug,city,country,lang in [('paris','Paris','France','FR'),('london','London','United Kingdom','EN')]:
 p=Path('public')/slug/'sources.json';d=json.loads(p.read_text());by={}
 for r in d['sources']+[r for r in research if r['city']==city]:
  r=dict(r);key=r['url'].rstrip('/');r['city']=city;r['country']=country;r['language']=str(r.get('language') or lang).upper();r['sourceType']=r.get('sourceType',r.get('type','Website'));t=r.get('type','').lower();r['type']='Telegram' if 'telegram' in t or 't.me/' in r['url'] else 'Instagram' if 'instagram' in t or 'instagram.com' in r['url'] else 'Website';r['checkedAt']=r.get('checkedAt') or d.get('researchedAt') or d.get('generatedAt');r['notes']=r.get('notes') or r.get('note') or '';r['acquisitionMethod']=r.get('acquisitionMethod') or r.get('acquisition') or ('Selected dated public programme pages; no automatic collection.' if r['status']=='imported' else 'Public source research; dates and access require separate verification.');r['researchEvidenceUrl']=r.get('researchEvidenceUrl') or r.get('evidenceURL') or r['url']
  if r.get('count') is not None and r['status']=='imported':r['importedCount']=r['count']
  if key in by:
   if by[key]['status']=='imported':continue
   if r['status']=='imported' or r.get('notes'):by[key]=r
  else:by[key]=r
 d['sources']=list(by.values());d['researchedAt']=d.get('researchedAt') or d['generatedAt'];d['note']='Bounded source review and published selection, 11–17 October 2026. An access point is not an independent provider. No automatic daily import is configured.';p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');print(slug,len(d['sources']))
