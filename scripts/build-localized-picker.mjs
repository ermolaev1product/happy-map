import fs from 'node:fs';
import {createLocalePolicy} from '../lib/locale-routing.mjs';
const registry=JSON.parse(fs.readFileSync('data/i18n/market-locales.json')),policy=createLocalePolicy(registry);
const data=JSON.parse(fs.readFileSync('public/city-picker.json'));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const locale of ['de','pt-BR']){
 const prefix=policy.prefix(locale),file='public/'+prefix+'/cities.html',names=new Intl.DisplayNames([locale],{type:'region'});
 const dictionary=JSON.parse(fs.readFileSync('data/i18n/'+(locale==='de'?'de-ui':'pt-BR-ui')+'.json'));
 let html=fs.readFileSync(file,'utf8');
 const cards=data.cities.map(city=>{const name=city.name[locale]||dictionary[city.name.en]||city.name.en,country=names.of(city.country);return `<a href="${policy.path(city.path,policy.choose(city.id,locale,null))}" class="city-card" data-city="${city.id}" data-country="${city.country}"><span class="city-monogram">${esc(name.slice(0,2))}</span><span><strong>${esc(name)}</strong><small>${esc(country)}</small></span><span>↗</span></a>`;}).join('');
 const fallback=locale==='de'?{title:'Was ist in der Stadt los?',intro:'Entdecke Veranstaltungen dieser Woche und speichere deine Pläne. Oder finde einen interessanten Ort in deiner Nähe.',note:'Wir merken uns deine Auswahl auf diesem Gerät. Du kannst die Stadt jederzeit über der Karte wechseln.'}:{title:'O que está acontecendo na cidade?',intro:'Explore os eventos desta semana e salve seus planos. Ou encontre um lugar interessante por perto.',note:'Vamos lembrar sua escolha neste dispositivo. Você pode mudar de cidade a qualquer momento acima do mapa.'};
 html=html.replace(/(<section class="choose-intro">[\s\S]*?<h1>)[\s\S]*?(<\/h1><p>)[\s\S]*?(<\/p><\/section>)/,'$1'+esc(fallback.title)+'$2'+esc(fallback.intro)+'$3').replace(/(<p class="city-note">)[\s\S]*?(<\/p>)/,'$1'+esc(fallback.note)+'$2');
 html=html.replace(/(<div class="city-cards">)[\s\S]*?(<\/div><p class="city-note">)/,'$1'+cards+'$2');
 html=html.replace(/(?:\/en)?\/city-picker\.js(?:\?[^"<>]*)?/g,'/city-picker.js');
 html=html.replace(/(?:\/en)?\/language-switch\.js(?:\?[^"<>]*)?/g,'/language-switch.js');
 html=html.replace(/<!-- guide-directory -->[\s\S]*?<!-- \/guide-directory -->/g,`<!-- guide-directory --><p><a href="/guide/${prefix}/">${esc(locale==='de'?'Veranstaltungskalender der Städte':'Agenda de eventos por cidade')}</a></p><!-- /guide-directory -->`);
 fs.writeFileSync(file,html);
}
