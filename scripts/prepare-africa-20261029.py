import json,pathlib,copy,re
R=pathlib.Path('/workspace/scratch/59f6a13c9f12/overnight-20261029/site');BASE=R.parent;O=R/'data/capitals-20261029';reg=json.loads((R/'data/city-expansion/registry.json').read_text());reviewed=json.loads((R/'data/i18n/english-reviewed.json').read_text())
configs=[('dakar','dakar/publisher-packet.json','Dakar','Дакар','Дакаре','Dakar','SN','Africa/Dakar','XOF',['XOF']),('tunis','tunis/publisher-packet.json','Tunis','Тунис','Тунисе','Tunis','TN','Africa/Tunis','TND',['TND']),('accra','report/accra/publisher-packet.json','Accra','Аккра','Аккре','Accra','GH','Africa/Accra','GHS',['GHS','USD']),('algiers','preparation/algiers/algiers-publisher-packet.json','Algiers','Алжир','Алжире','Algier','DZ','Africa/Algiers','DZD',['DZD'])]
for cid,file,en,ru,loc,de,cc,tz,cur,currencies in configs:
 raw=json.loads((BASE/file).read_text());p=copy.deepcopy(raw)
 if not isinstance(p.get('coverage'),str):p['coverage']='Selected verified city programmes; partial catalogue and later-date coverage. '+json.dumps(p['coverage'],ensure_ascii=False,separators=(',',':'))
 if cid=='dakar':
  held=next(e for e in p['events'] if e['id']=='dakar-ina-thiam-range');p['events']=[e for e in p['events'] if e['id']!=held['id']];p['pending'].append({'id':held['id'],'cityId':cid,'reason':'Exhibition end not independently explicit: wider Sen Sensations programme span cannot establish actual exhibition end','candidate':held})
 for typ in ['events','places']:
  for e in p[typ]:
   e['cityId']=cid;e.setdefault('timezone',tz);
   if not isinstance(e.get('yearEvidence',''),str):e['yearEvidence']=json.dumps(e['yearEvidence'],ensure_ascii=False,separators=(',',':'))
   if e.get('dateType')=='published_interval' and e.get('visitSchedule')=={}:e.pop('visitSchedule')
   e['category']={'sports':'sport','cinema':'film','festival':'city','family':'kids','tour':'city','literature':'talk'}.get(e['category'],e['category'])
 for s in p['sources']:s['name']=' '.join(s['name'].split());s['cityId']=cid
 (O/(cid+'-packet.json')).write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n');(O/(cid+'-research-publisher.json')).write_text(json.dumps(raw,ensure_ascii=False,indent=2)+'\n')
 if not any(c['id']==cid for c in reg['newCities']):reg['newCities'].append({'id':cid,'canonicalCity':en,'countryCode':cc,'name':{'ru':ru,'en':en,'de':de},'ianaTimezone':tz,'path':cid+'/index.html','currency':cur,'allowedCurrencies':currencies,'interfaceLanguages':['ru','en'],'nameLocativeRu':loc,'defaultDateView':'week','defaultRadiusKm':0.5})
 reviewed[en+' event mapе']=en+' event map';reviewed['Map events в '+loc]=en+' event map';reviewed['Карта событий в '+loc]=en+' event map'
reg['countries'].update({'SN':{'ru':'Сенегал','en':'Senegal','de':'Senegal'},'TN':{'ru':'Тунис','en':'Tunisia','de':'Tunesien'},'GH':{'ru':'Гана','en':'Ghana','de':'Ghana'},'DZ':{'ru':'Алжир','en':'Algeria','de':'Algerien'}})
(R/'data/city-expansion/registry.json').write_text(json.dumps(reg,ensure_ascii=False,indent=2)+'\n');(R/'data/i18n/english-reviewed.json').write_text(json.dumps(reviewed,ensure_ascii=False,indent=2)+'\n')
