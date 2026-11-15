import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
for(const [prefix,lang] of [['','ru'],['en/','en'],['sr/','sr-Latn'],['es/','es'],['de/','de'],['pt-br/','pt-BR']]){
 const text=fs.readFileSync('public/'+prefix+'traffic-privacy.html','utf8');assert(text.includes('lang="'+lang+'"'));if(lang!=='en')for(const phrase of ['Stop counting my visits in this browser','The daily browser identifier','counts page views on its public map','We respect Do Not Track'])assert(!text.includes(phrase),lang+' untranslated privacy copy');
 for(const fail of [false,true]){const nodes={off:{},status:{}},storage=new Map();const code=[...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');
 vm.runInNewContext(code,{document:{getElementById:id=>nodes[id]},localStorage:{setItem:(k,v)=>{if(fail)throw Error('unavailable');storage.set(k,v);}}});nodes.off.onclick();assert(nodes.status.textContent?.length>10);assert.equal(storage.get('happymap-stats-exclude'),fail?undefined:'1');
 }
}
console.log('PASS: privacy page language, opt-out storage key and unavailable-storage status in all six languages. No real visitor state changed.');
