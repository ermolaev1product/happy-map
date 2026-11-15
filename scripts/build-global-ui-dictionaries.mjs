// Extend reviewed shell translations with consistent city-specific metadata.
import fs from 'node:fs';
const common=JSON.parse(fs.readFileSync('data/i18n/global-shell-copy.json'));
const cities=JSON.parse(fs.readFileSync('public/city-picker.json')).cities;
for(const [locale,t] of Object.entries(common)){
 const file=`data/i18n/${locale}-ui.json`,d=JSON.parse(fs.readFileSync(file));
 d['Event descriptions are translated into English. Each listing links to the original announcement.']=t.sourceNotice;
 const extras={de:{'Happy Map — Dein Flensburg. Deine Pläne.':'Happy Map — Dein Flensburg. Deine Pläne.','Konzerte, Cafés und neue Lieblingsorte in Flensburg. Entdecke, was in deiner Nähe los ist.':'Konzerte, Cafés und neue Lieblingsorte in Flensburg. Entdecke, was in deiner Nähe los ist.','Waitlist only':'Nur Warteliste','Loading city places…':'Ortsverzeichnis wird geladen…','Retry loading':'Erneut laden','Event listings · sources and updates ↗':'Veranstaltungen · Quellen und Updates ↗','Let’s see where the day takes you.':'Mal sehen, wohin dich der Tag führt.','Try the event card preview. This is a demo form: the event will not be published.':'Probiere die Vorschau der Veranstaltungskarte. Dies ist ein Demoformular; die Veranstaltung wird nicht veröffentlicht.','Listing preview':'Veranstaltungsvorschau'},'pt-BR':{'Happy Map — Dein Flensburg. Deine Pläne.':'Happy Map — Flensburg. Seus planos.','Konzerte, Cafés und neue Lieblingsorte in Flensburg. Entdecke, was in deiner Nähe los ist.':'Shows, cafés e novos lugares favoritos em Flensburg. Descubra o que acontece por perto.','Waitlist only':'Somente lista de espera','Loading city places…':'Carregando lugares da cidade…','Retry loading':'Tentar carregar novamente','Event listings · sources and updates ↗':'Eventos · fontes e atualizações ↗','Let’s see where the day takes you.':'Veja aonde o dia vai levar você.','Try the event card preview. This is a demo form: the event will not be published.':'Experimente a prévia do cartão do evento. Este formulário é uma demonstração: o evento não será publicado.','Listing preview':'Prévia do anúncio'},es:{'Happy Map — Dein Flensburg. Deine Pläne.':'Happy Map — Flensburg. Tus planes.','Konzerte, Cafés und neue Lieblingsorte in Flensburg. Entdecke, was in deiner Nähe los ist.':'Conciertos, cafés y nuevos lugares favoritos en Flensburg. Descubre lo que hay cerca.','Waitlist only':'Solo lista de espera','Loading city places…':'Cargando lugares de la ciudad…','Retry loading':'Volver a cargar','Event listings · sources and updates ↗':'Eventos · fuentes y actualizaciones ↗','Let’s see where the day takes you.':'A ver adónde te lleva el día.','Try the event card preview. This is a demo form: the event will not be published.':'Prueba la vista previa de la ficha. Es un formulario de demostración: el evento no se publicará.','Listing preview':'Vista previa del anuncio'},sr:{'Happy Map — Dein Flensburg. Deine Pläne.':'Happy Map — Flenzburg. Tvoji planovi.','Konzerte, Cafés und neue Lieblingsorte in Flensburg. Entdecke, was in deiner Nähe los ist.':'Koncerti, kafići i nova omiljena mesta u Flenzburgu. Otkrij šta se dešava u blizini.','Waitlist only':'Samo lista čekanja','Loading city places…':'Učitavanje gradskih mesta…','Retry loading':'Pokušaj ponovo','Event listings · sources and updates ↗':'Događaji · izvori i ažuriranja ↗','Let’s see where the day takes you.':'Pogledaj kuda će te dan odvesti.','Try the event card preview. This is a demo form: the event will not be published.':'Isprobaj pregled kartice događaja. Ovo je probni obrazac: događaj neće biti objavljen.','Listing preview':'Pregled objave'}};Object.assign(d,extras[locale]);
 d['Open']={de:'Öffnen','pt-BR':'Abrir',es:'Abrir',sr:'Otvori'}[locale];
 d['About']=t.about; d['and download the app ↗']=t.downloadMore;
 d['Portuguese']=locale==='de'?'Portugiesisch':locale==='pt-BR'?'Português':locale==='es'?'Portugués':'Portugalski';
 d['Spanish']=locale==='de'?'Spanisch':locale==='pt-BR'?'Espanhol':locale==='es'?'Español':'Španski';
 d['Serbian']=locale==='de'?'Serbisch':locale==='pt-BR'?'Sérvio':locale==='es'?'Serbio':'Srpski';
 for(const city of cities){
  const en=city.name.en,name=t.names[city.id]||city.name[locale]||d[en]||en;
  const x=key=>t[key].replaceAll('{city}',name);
  d[en]=name;
  const country=new Intl.DisplayNames([locale==='sr'?'sr-Latn':locale],{type:'region'}).of(city.country);
  d[en.toUpperCase()+' · '+city.country]=name.toLocaleUpperCase(locale)+' · '+country.toLocaleUpperCase(locale);
  d[`${en} sources and verification ↗`]=x('sources')+' ↗';
  const englishCountry=new Intl.DisplayNames(['en'],{type:'region'}).of(city.country);d[en.toUpperCase()+', '+englishCountry.toUpperCase()+' / 2026']=name.toLocaleUpperCase(locale)+', '+country.toLocaleUpperCase(locale)+' / 2026';
  d[`Things to do in ${en} today and this week | Happy Map`]=x('title');
  d[`What to do in ${en} tonight and this weekend: dated concerts, talks, theatre and exhibitions with venues and direct announcement links.`]=x('description');
  d[`Discover verified events and interesting places in ${en}. Choose where to go and save your plans.`]=x('discover');
  for(const suffix of ['Events and Places','events and places'])d[`Happy Map — ${en}: ${suffix}`]=`Happy Map — ${name}: ${t.suffix}`;
  d[`Discover concerts, talks, theatre, exhibitions and meetups in ${en}. Check admission details and save your plans.`]=x('discover');
  for(const suffix of ['Events and Places','events and places'])d[`— ${en}: ${suffix}`]=`— ${name}: ${t.suffix}`;
  d[`${en} event map`]=x('map'); d[`Share this map · ${en}`]=x('share');d[`City event guides · ${en}`]=x('guides');
  d[`${en} · sources and last update ↗`]=x('updated')+' ↗';d[`${en} sources · Happy Map`]=x('sources')+' · Happy Map';d[`← Open ${en} map`]='← '+x('open');d[`${en}: sources and coverage`]=x('coverage');
  // Non-declined labels avoid false grammatical endings for city names.
 }
 fs.writeFileSync(file,JSON.stringify(d,null,2)+'\n');
}
