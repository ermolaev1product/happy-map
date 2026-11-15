import assert from 'node:assert/strict';
import fs from 'node:fs';
import {copy,clean,pageIdentity,stampHtml} from './stamp-city-coverage-notice.mjs';
const cities=new Set(JSON.parse(fs.readFileSync('public/city-picker.json')).cities.map(c=>c.id));
const fixture='<html><head></head><body><main><div id="eventList"></div><div id="map"></div><button id="plansTab">Plans</button></main></body></html>';
let checks=0;
for(const [locale,t] of Object.entries(copy))for(const city of ['tbilisi','palo-alto','berlin','oslo','vilnius']){
 const file='public/'+(locale==='ru'?'':locale+'/')+(city==='tbilisi'?'':city+'/')+'map.html';
 const id=pageIdentity(file,cities);assert.deepEqual(id,{city,locale});
 const html=stampHtml(fixture,id,'fixture');assert.equal((html.match(/id="cityCoverageNotice"/g)||[]).length,1);
 assert(html.includes('data-coverage-status="conditional"'));assert(html.includes('href="/'+(locale==='ru'?'':locale+'/')+(city==='tbilisi'?'':city+'/')+'sources.html"'));assert(html.includes('id="eventList"')&&html.includes('id="map"')&&html.includes('id="plansTab"'));
 assert(html.includes(t.title.replaceAll('’','’')));assert(!/<form|<input|fetch\(|localStorage|sendBeacon/.test(html));
 assert.equal(stampHtml(html,id,'fixture'),html);assert.equal(clean(html),fixture);checks++;
}
assert.equal(stampHtml('<html><head></head><main>Directory</main></html>',{city:'berlin',locale:'ru'},'x').includes('cityCoverageNotice'),false);
assert.equal(pageIdentity('public/not-a-city/map.html',cities).city,null);
assert.equal(stampHtml(fixture,{city:'<bad>',locale:'en'},'x').includes('data-coverage-city="&lt;bad&gt;"'),true);
for(const locale of Object.keys(copy))assert(!stampHtml(fixture,{city:'flensburg',locale,timezone:'Europe/Berlin'},'x').includes('cityCoverageNotice'));
console.log(`PASS ${checks+10} city coverage notice cases: localized, non-blocking, idempotent, escaped, no contact collection or notification promise.`);
