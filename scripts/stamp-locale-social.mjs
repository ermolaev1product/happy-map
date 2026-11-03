// Reuse approved artwork; pt-BR intentionally retains the existing English artwork
// until a Portuguese visual is separately prepared. The image alt describes that image.
import fs from 'node:fs';import path from 'node:path';
const settings={ru:['ru','ru_RU','Happy Map — События. Места. Планы.'],en:['en','en_GB','Happy Map — Events. Places. Plans.'],de:['de','de_DE','Happy Map — Veranstaltungen. Orte. Pläne.'],'de-CH':['de','de_CH','Happy Map — Veranstaltungen. Orte. Pläne.'],'de-AT':['de','de_AT','Happy Map — Veranstaltungen. Orte. Pläne.'],'pt-BR':['en','pt_BR','Happy Map — Events. Places. Plans.'],'fr-CA':['en','fr_CA','Happy Map — Events. Places. Plans.']};
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
for(const file of walk('public').filter(p=>p.endsWith('.html'))){let html=fs.readFileSync(file,'utf8');const lang=html.match(/<html\b[^>]*lang="([^"]+)"/)?.[1],config=settings[lang];if(!config||!html.includes('og:image'))continue;const [art,locale,alt]=config;
 for(const [key,value]of Object.entries({'og:image':'https://happymap.app/assets/happy-map-unified-20261015-'+art+'.png','twitter:image':'https://happymap.app/assets/happy-map-unified-20261015-'+art+'.png','og:locale':locale,'og:image:alt':alt,'twitter:image:alt':alt}))html=html.replace(new RegExp('(<meta[^>]*(?:property|name)="'+key+'"[^>]*content=")[^"]*','g'),'$1'+value);
 fs.writeFileSync(file,html);
}
