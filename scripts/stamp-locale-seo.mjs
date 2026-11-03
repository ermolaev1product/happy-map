import fs from 'node:fs';
const registry=JSON.parse(fs.readFileSync('data/i18n/market-locales.json'));
const origin='https://happymap.app',prefix=l=>registry.locales[l].prefix;
for(const city of registry.cities.filter(c=>['brasilia','berlin','vienna','bern','flensburg','new-york','prague','barcelona','madrid','hamburg','munich','toronto','montreal','chicago','philadelphia','los-angeles','san-diego','cologne'].includes(c.id))){
 for(const file of ['index.html','map.html','invite.html','share.html','sources.html']){
  const locales=city.availableLocales.filter(l=>fs.existsSync('public/'+(prefix(l)?prefix(l)+'/':'')+city.id+'/'+file));
  for(const locale of locales){const route='/'+(prefix(locale)?prefix(locale)+'/':'')+city.id+'/'+file,p='public'+route;let html=fs.readFileSync(p,'utf8');
   const alternatives=locales.map(l=>{const target='/'+(prefix(l)?prefix(l)+'/':'')+city.id+'/'+file,lang=l==='de'&&city.id==='bern'?'de-CH':l;const canonical=fs.readFileSync('public'+target,'utf8').match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)/)?.[1]||origin+target;return `<link rel="alternate" hreflang="${lang}" href="${canonical}">`;}).join('')+`<link rel="alternate" hreflang="x-default" href="${fs.readFileSync('public/en/'+city.id+'/'+file,'utf8').match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)/)?.[1]||origin+'/en/'+city.id+'/'+file}">`;
   html=html.replace(/<link\b[^>]*rel="alternate"[^>]*hreflang=[^>]*>/g,'');html=html.replace('</head>',alternatives+'</head>');
   if(['de','pt-BR'].includes(locale)&&fs.existsSync('public/guide/'+prefix(locale)+'/'+city.id+'.html')){const text=locale==='de'?'Veranstaltungen in '+({vienna:'Wien',bern:'Bern',berlin:'Berlin',flensburg:'Flensburg'})[city.id]:'Agenda de Brasília';html=html.replace(/<!-- locale-guide -->[\s\S]*?<!-- \/locale-guide -->/g,'');html=html.replace('</footer>',`<!-- locale-guide --><a class="text-button city-guide-link" href="/guide/${prefix(locale)}/${city.id}">${text}</a><!-- /locale-guide --></footer>`);}
   fs.writeFileSync(p,html);
  }
 }
}
