import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const ids=JSON.parse(fs.readFileSync('data/city-expansion/launched.json')).cityIds;
for(const id of ids)for(const prefix of ['', 'en/']){
 const folder=prefix+id;
 for(const page of ['index.html','map.html']){
  const html=fs.readFileSync(`public/${folder}/${page}`,'utf8');
  for(const [,value]of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)){
   if(/^(?:https?:|\/\/|data:|#)/.test(value))continue;
   const url=new URL(value,'https://happymap.app/'+folder+'/'+page);if(!/\.(?:js|css)$/.test(url.pathname))continue;
   const file=path.join('public',url.pathname);if(!fs.existsSync(file))continue;
   assert.equal(url.searchParams.get('v'),crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0,12),folder+'/'+page+' '+url.pathname);
  }
 }
 assert(/fetch\(['"][^'"]*places\.json['"],\{cache:'no-store'\}\)/.test(fs.readFileSync(`public/${folder}/discovery.js`,'utf8')),folder+' fresh place feed');
}
console.log('PASS: all launched city/localized asset cache keys match source content, and place feeds request fresh data.');
