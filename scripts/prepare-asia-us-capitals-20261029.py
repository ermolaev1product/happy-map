import json,pathlib,copy,re
R=pathlib.Path('/workspace/scratch/59f6a13c9f12/overnight-20261029/site');BASE=R.parent;O=R/'data/capitals-20261029';reg=json.loads((R/'data/city-expansion/registry.json').read_text());reviewed=json.loads((R/'data/i18n/english-reviewed.json').read_text())
configs=[('bangkok', 'bangkok/publisher-packet.json', 'Bangkok', 'Бангкок', 'Бангкоке', 'Bangkok', 'TH', 'Asia/Bangkok', 'THB', ['THB']), ('singapore', 'singapore/publisher-packet.json', 'Singapore', 'Сингапур', 'Сингапуре', 'Singapur', 'SG', 'Asia/Singapore', 'SGD', ['SGD']), ('washington', 'preparation/washington/washington-publisher-packet.json', 'Washington, D.C.', 'Вашингтон', 'Вашингтоне', 'Washington, D.C.', 'US', 'America/New_York', 'USD', ['USD'])]
for cid,file,en,ru,loc,de,cc,tz,cur,currencies in configs:
 raw=json.loads((BASE/file).read_text());p=copy.deepcopy(raw)
 if cid=='singapore':
  p['researchDeltaAudit']=[]
  for df in ['singapore/victoria-publisher-delta.json','singapore/sccc-publisher-delta.json']:
   d=json.loads((BASE/df).read_text());p['researchDeltaAudit'].append(d)
   for key in ['events','places']:
    seen={x['id']for x in p[key]};p[key].extend(x for x in d[key]if x['id']not in seen)
   existing={s['url']:s for s in p['sources']}
   for s in d['sources']:
    if s['url']not in existing:p['sources'].append(s);existing[s['url']]=s
    else:existing[s['url']].setdefault('additionalAudit',[]).append(s)
   p['pending'].extend(d.get('pending',[]))
  p['checkedAt']=max(p['checkedAt'],*[d['checkedAt']for d in p['researchDeltaAudit']])
 if cid=='bangkok':p['matrix']=json.loads((BASE/'bangkok/matrix-correction.json').read_text())['matrix']
 if not isinstance(p.get('coverage'),str):p['coverage']='Selected verified city programmes; partial catalogue and later-date coverage. '+json.dumps(p['coverage'],ensure_ascii=False,separators=(',',':'))
 for typ in ['events','places']:
  for e in p[typ]:
   e['cityId']=cid;e.setdefault('timezone',tz);
   if not isinstance(e.get('yearEvidence',''),str):e['yearEvidence']=json.dumps(e['yearEvidence'],ensure_ascii=False,separators=(',',':'))
   e['category']={'sports':'sport','cinema':'film','festival':'city','family':'kids','tour':'city'}.get(e['category'],e['category'])
 for s in p['sources']:s['name']=' '.join(s['name'].split());s['cityId']=cid
 (O/(cid+'-packet.json')).write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n');(O/(cid+'-research-publisher.json')).write_text(json.dumps(raw,ensure_ascii=False,indent=2)+'\n')
 if not any(c['id']==cid for c in reg['newCities']):reg['newCities'].append({'id':cid,'canonicalCity':en,'countryCode':cc,'name':{'ru':ru,'en':en,'de':de},'ianaTimezone':tz,'path':cid+'/index.html','currency':cur,'allowedCurrencies':currencies,'interfaceLanguages':['ru','en'],'nameLocativeRu':loc,'defaultDateView':'week','defaultRadiusKm':0.5})
 reviewed['Map events в '+loc]=en+' event map';reviewed['Карта событий в '+loc]=en+' event map'
reg['countries'].update({'TH':{'ru':'Таиланд','en':'Thailand','de':'Thailand'},'SG':{'ru':'Сингапур','en':'Singapore','de':'Singapur'}})
(R/'data/city-expansion/registry.json').write_text(json.dumps(reg,ensure_ascii=False,indent=2)+'\n');(R/'data/i18n/english-reviewed.json').write_text(json.dumps(reviewed,ensure_ascii=False,indent=2)+'\n')
