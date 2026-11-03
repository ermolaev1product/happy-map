// Reproducible code-native SVG artwork. Based on the existing Happy Map share
// layout; the map is deliberately schematic, with no real city or event claims.
import fs from 'node:fs';
import sharp from 'sharp';
const copy = {
 ru:{headline:['Открой свой','город'],sub:['Места. События.','Твои планы на вечер.'],category:'ЖИВАЯ МУЗЫКА',event:['Джазовый','вечер'],detail:'Музыка. Друзья. Впечатления.',sample:'Пример события',map:'Схематичная карта'},
 en:{headline:['Discover','your city'],sub:['Places. Events.','Your next great evening.'],category:'LIVE MUSIC',event:['An evening','of jazz'],detail:'Music. Friends. Good moments.',sample:'Example event',map:'Illustrative map'},
 de:{headline:['Entdecke','deine Stadt'],sub:['Orte. Events.','Dein nächster schöner Abend.'],category:'LIVEMUSIK',event:['Ein Abend','voll Jazz'],detail:'Musik. Freunde. Schöne Momente.',sample:'Beispielveranstaltung',map:'Schematische Karte'},
 fr:{headline:['Découvre','ta ville'],sub:['Lieux. Événements.','Ta prochaine belle soirée.'],category:'MUSIQUE LIVE',event:['Une soirée','jazz'],detail:'Musique. Amis. Bons moments.',sample:'Exemple d’événement',map:'Carte illustrative'},
 it:{headline:['Scopri','la tua città'],sub:['Luoghi. Eventi.','La tua prossima bella serata.'],category:'MUSICA DAL VIVO',event:['Una serata','jazz'],detail:'Musica. Amici. Bei momenti.',sample:'Evento di esempio',map:'Mappa illustrativa'},
};
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const text=(x,y,s,size=24,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" ${extra}>${escape(s)}</text>`;
function map(){
 let blocks='';
 for(let row=-2;row<9;row++)for(let col=-2;col<11;col++){
  const x=col*88+row*17,y=row*89;
  blocks+=`<rect x="${x+7}" y="${y+8}" width="62" height="61" rx="7" fill="${(row+col)%7===0?'#dbe3d2':'#e0e2dc'}" stroke="#d8dcd3"/>`;
  if((row+col)%7!==0)blocks+=`<path d="M${x+18} ${y+20}h40v34h-40z" fill="none" stroke="#eceee8" stroke-width="9"/>`;
 }
 return `<g transform="translate(410 -65) rotate(18 400 320)">${blocks}<path d="M410 -140C160 150 650 230 445 440S210 670 520 850" fill="none" stroke="#cadbdc" stroke-width="62"/><path d="M410 -140C160 150 650 230 445 440S210 670 520 850" fill="none" stroke="#dce6e5" stroke-width="47"/><path d="M-100 150L850 535M-50 445L900 40M290 -130L360 800" fill="none" stroke="#d4d9cf" stroke-width="22"/><path d="M-100 150L850 535M-50 445L900 40M290 -130L360 800" fill="none" stroke="#fff" stroke-width="14"/></g>`;
}
function render(c){
 const pins=[[545,88],[611,185],[557,269],[513,376],[579,466],[664,555],[739,91],[1137,91],[1140,473],[1038,553],[748,554]];
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="fade"><stop offset="0" stop-color="#f7f7f2"/><stop offset=".36" stop-color="#f7f7f2" stop-opacity=".99"/><stop offset=".59" stop-color="#f7f7f2" stop-opacity="0"/></linearGradient><filter id="shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#26312b" flood-opacity=".2"/></filter><filter id="pinShadow"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#26312b" flood-opacity=".14"/></filter></defs><rect width="1200" height="630" fill="#f2f3ee"/>${map()}<circle cx="873" cy="490" r="125" fill="#6d80c7" fill-opacity=".055" stroke="#8294cb" stroke-opacity=".55" stroke-width="2"/>${pins.map(([x,y])=>`<g transform="translate(${x} ${y})" filter="url(#pinShadow)"><circle r="16" fill="#fff"/><circle r="11" fill="#89937f"/><circle r="3" fill="#fff"/></g>`).join('')}<rect width="1200" height="630" fill="url(#fade)"/><g font-family="DejaVu Sans,Arial,sans-serif" fill="#26302a">${text(55,86,'Happy Map',35,'font-weight="700"')}${text(278,85,'✳',31,'fill="#ee6655"')}${c.headline.map((s,i)=>text(55,223+i*55,s,46,'font-weight="700"')).join('')}${c.sub.map((s,i)=>text(57,335+i*35,s,23,'fill="#677064"')).join('')}<rect x="55" y="484" width="229" height="54" rx="27" fill="#29382c"/>${text(169.5,519,'happymap.app',22,'text-anchor="middle" fill="white"')}<g filter="url(#shadow)"><rect x="641" y="126" width="496" height="319" rx="27" fill="white"/><path d="M848 443L873 471L898 443" fill="white"/></g><rect x="672" y="154" width="242" height="31" rx="15.5" fill="#ecf0e4"/>${text(793,175,c.category,13,'text-anchor="middle" font-weight="700" letter-spacing="1" fill="#526145"')}${c.event.map((s,i)=>text(675,243+i*48,s,40,'font-weight="700"')).join('')}${text(676,335,c.detail,19,'fill="#6a7169"')}<line x1="675" y1="362" x2="1103" y2="362" stroke="#e8ebe5"/>${text(676,407,c.sample,19,'fill="#6a7169"')}<circle cx="873" cy="499" r="31" fill="#e6b951" stroke="white" stroke-width="5" filter="url(#pinShadow)"/>${text(873,511,'♪',34,'text-anchor="middle" fill="#514224"')}<rect x="935" y="599" width="265" height="31" fill="#f7f7f2" fill-opacity=".9"/>${text(1181,620,c.map,12,'text-anchor="end" fill="#7a8274"')}</g></svg>`;
}
fs.mkdirSync('data/share-art/unified',{recursive:true});
for(const [locale,c] of Object.entries(copy)){
 const svg=render(c);fs.writeFileSync(`data/share-art/unified/${locale}.svg`,svg);
 await sharp(Buffer.from(svg)).png().toFile(`public/assets/happy-map-unified-20261015-${locale}.png`);
}
fs.writeFileSync('data/share-art/unified/copy.json',JSON.stringify(copy,null,2)+'\n');
console.log('Rendered five 1200×630 unified sharing previews.');
