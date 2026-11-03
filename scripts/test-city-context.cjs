const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const cities=JSON.parse(fs.readFileSync('public/city-picker.json')).cities;
for(const prefix of ['', 'en/'])for(const city of cities){
 const file='public/'+prefix+city.path,h=fs.readFileSync(file,'utf8');
 assert(!h.includes('citySelect'),file);assert(!h.includes('city-menu-list'),file);
 assert.match(h,/<span class="current-city">[^<]+<\/span>/,file);
 assert.match(h,/<a class="change-city" href="\/(?:en\/)?cities.html">(?:Сменить город|Change city)<\/a>/,file);
 for(const id of ['eventsLayer','cityLayer'])assert(h.includes('id="'+id+'"'),file);
}
const de=fs.readFileSync('public/de/flensburg/index.html','utf8');assert(de.includes('Stadt wechseln'));assert(de.includes('class="change-city" href="/en/cities.html?lang=de"'));assert(!de.includes('citySelect'));
// Storage denial cannot abort city/share setup. Opening an explicit city only remembers it.
for(const city of cities)for(const blocked of [false,true]){
 const values={},location={href:'https://happymap.app/'+city.path};
 vm.runInNewContext(fs.readFileSync('public/city-state.js','utf8'),{document:{documentElement:{lang:'ru'},querySelector:s=>s==='script[data-city]'?{dataset:{city:city.id}}:null},URL,location,localStorage:{setItem:(k,v)=>{if(blocked)throw Error('blocked');values[k]=v;}}});
 assert.equal(location.href,'https://happymap.app/'+city.path);if(!blocked)assert.equal(values['morrow-city'],city.id);
}
console.log('PASS: all 27 RU/EN map routes + DE use current city + localized country/city link, no dropdown, explicit route unchanged, blocked storage safe.');
