const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const copy = {
 ru: {title: 'Happy Map — найдите, куда пойти', description: 'События и интересные места рядом: выставки, встречи, концерты и новые открытия — на одной карте.'},
 en: {title: 'Happy Map — discover where to go', description: 'Events and interesting places nearby: exhibitions, meetups, concerts and new discoveries, all on one map.'},
};
function meta(html, key) {
 const tag = html.match(new RegExp(`<meta[^>]*(?:name|property)="${key}"[^>]*>`, 'i'))?.[0];
 return tag?.match(/content="([^"]*)"/)?.[1];
}
const forbidden = /Тбилиси|Tbilisi|Белград|Belgrade|Москва|Moscow|Palo Alto|Пало-Альто|Paris|Париж|London|Лондон|\d+ (?:cities|город)|(?:three|six) cities|Визуальный прототип/i;
for (const lang of ['ru','en']) {
 const prefix = lang === 'en' ? 'en/' : '';
 for (const file of ['index.html','map.html','cities.html','share.html','android.html']) {
  const html = fs.readFileSync('public/'+prefix+file, 'utf8');
  for (const field of ['description','og:description','twitter:description']) assert.equal(meta(html, field), copy[lang].description, prefix+file+': '+field);
  for (const field of ['og:title','twitter:title']) assert.equal(meta(html, field), copy[lang].title, prefix+file+': '+field);
  for (const field of ['description','og:title','og:description','twitter:title','twitter:description']) assert(!forbidden.test(meta(html,field)), prefix+file+': generic copy has a city or fixed city count');
  assert(meta(html,'og:url').startsWith('https://happymap.app/'+prefix), prefix+file+': locale URL');
  assert(fs.existsSync('public/'+new URL(meta(html,'og:image')).pathname.slice(1)), prefix+file+': preview image missing');
 }
}
for (const file of ['app/layout.tsx','app/map/page.tsx']) {
 const code=fs.readFileSync(file,'utf8');
 assert(code.includes(copy.ru.title)); assert(code.includes(copy.ru.description));
}
const names={ru:{tbilisi:'Тбилиси',belgrade:'Белград',moscow:'Москва','palo-alto':'Пало-Альто и Stanford',paris:'Париж',london:'Лондон'},en:{tbilisi:'Tbilisi',belgrade:'Belgrade',moscow:'Moscow','palo-alto':'Palo Alto & Stanford',paris:'Paris',london:'London'}};
async function exercise(city,lang,mode) {
 const calls={share:[],copy:[],prompt:[],storage:[]};
 const button={textContent:'Share the selected city'},choose={};
 const prefix=lang==='en'?'en/':'';
 const href='https://technical-host.example/'+prefix+(city==='tbilisi'?'map.html':city+'/index.html')+'?radius=500#private-state';
 const context={URL,location:{href},localStorage:{setItem:(...a)=>calls.storage.push(a)},setTimeout:()=>0,
  document:{documentElement:{lang},querySelector:s=>s==='script[data-city]'?{dataset:{city}}:s==='#citySelect'?choose:s==='[data-share-city]'?button:null},
  navigator:{clipboard:{writeText:async text=>{if(mode==='prompt')throw Error('clipboard unavailable');calls.copy.push(text);}}},
  window:{prompt:(...a)=>calls.prompt.push(a)},
 };
 if(mode==='native'||mode==='cancel'||mode==='native-error')context.navigator.share=async payload=>{calls.share.push(payload);if(mode!=='native'){const e=Error('share interrupted');e.name=mode==='cancel'?'AbortError':'NotAllowedError';throw e;}};
 vm.runInNewContext(fs.readFileSync('public/'+prefix+'city-state.js','utf8'),context);
 await button.onclick();
 const url='https://happymap.app/'+prefix+city+'/invite.html';
 assert(fs.existsSync('public/'+prefix+city+'/invite.html'), 'Missing share target: '+url);
 const target=fs.readFileSync('public/'+prefix+city+'/invite.html','utf8');
 assert.equal(meta(target,'og:url'),url,'City preview retains the requested locale and city');
 if(mode==='native'||mode==='cancel'||mode==='native-error')assert.deepEqual(JSON.parse(JSON.stringify(calls.share)),[{title:'Happy Map — '+names[lang][city]+(lang==='en'?': Events and Places':': события и места'),text:copy[lang].description,url}]);
 if(mode==='copy'||mode==='native-error')assert.deepEqual(calls.copy,[url]);
 else assert.equal(calls.copy.length,0);
 if(mode==='prompt')assert.equal(calls.prompt[0][1],url);else assert.equal(calls.prompt.length,0);
 if(mode==='cancel')assert.equal(button.textContent,'Share the selected city');
 return {city,lang,mode,url};
}
(async()=>{
 const checks=[];
 for(const lang of ['ru','en'])for(const city of Object.keys(names[lang]))for(const mode of ['native','copy','cancel','native-error','prompt'])checks.push(await exercise(city,lang,mode));
 console.log(JSON.stringify({status:'passed',genericPages:10,shareFlows:checks.length,cities:Object.keys(names.en),languages:['ru','en'],copy},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
