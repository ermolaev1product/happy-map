#!/usr/bin/env python3
"""Guard append-only source history and unchanged event facts against a source commit."""
import json, subprocess, sys
from pathlib import Path
base = sys.argv[1] if len(sys.argv) > 1 else 'HEAD'
changed = subprocess.check_output(['git','diff','--name-only',base,'--','public'], text=True).splitlines()
checks = {'files':0,'eventRows':0,'sourceRows':0,'oldObservations':0}
def retain(old,new,path,flensburg=False):
    if isinstance(old,dict):
        assert isinstance(new,dict), path
        for k,v in old.items():
            if flensburg and k in {'schedule','scheduledCheck','scheduledCheckTime','scheduledCheckTimezone'}:
                continue
            assert k in new, (path,k,'missing old field')
            if k in {'sources','sourceRegistry','researchObservations','searchHistory'} and isinstance(v,list):
                assert len(new[k])>=len(v),(path,k,'lost history')
                for i,item in enumerate(v):retain(item,new[k][i],path+'/'+k+'/'+str(i),flensburg)
                if k in {'sources','sourceRegistry'}:checks['sourceRows']+=len(v)
                if k=='researchObservations':checks['oldObservations']+=len(v)
            else:retain(v,new[k],path+'/'+k,flensburg)
    else:
        assert old==new, (path,'existing value changed')
for f in changed:
    if not f.endswith('.json'):continue
    try:old=json.loads(subprocess.check_output(['git','show',base+':'+f],text=True,stderr=subprocess.DEVNULL))
    except subprocess.CalledProcessError:continue
    new=json.loads(Path(f).read_text())
    if not isinstance(old,dict):continue
    if isinstance(old.get('events'),list):
        assert old['events']==new['events'],(f,'event facts or IDs changed')
        checks['eventRows']+=len(old['events'])
    if not any(k in old for k in ['sourceRegistry','sources']):continue
    retain(old,new,f,'/flensburg/' in f)
    checks['files']+=1
print(json.dumps({'result':'passed','baseline':base,**checks}))
