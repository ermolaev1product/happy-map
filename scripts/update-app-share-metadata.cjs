// Narrow, idempotent migration: preserve current titles, descriptions, links and UI.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.cwd();
const files=['app/layout.tsx',...fs.readdirSync('app',{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>'app/'+x.name+'/page.tsx').filter(x=>fs.existsSync(x))];
let count=0;
for(const file of files){let s=fs.readFileSync(file,'utf8');const match=s.match(/export const metadata(?::\s*Metadata)?=([\s\S]*?);(?=\s*(?:import|export))/);if(!match)continue;const m=vm.runInNewContext('('+match[1]+')');
const lang=m.openGraph?.locale?.startsWith('de')?'de':/\p{Script=Cyrillic}/u.test(m.title)?'ru':'en';
const alt={ru:'Happy Map — События. Места. Планы.',en:'Happy Map — Events. Places. Plans.',de:'Happy Map — Veranstaltungen. Orte. Pläne.'}[lang];
const url='https://happymap.app/assets/happy-map-unified-20261015-'+lang+'.png';
m.openGraph={title:m.title,description:m.description,...m.openGraph,locale:{ru:'ru_RU',en:'en_GB',de:'de_DE'}[lang],images:[{url,width:1200,height:630,alt}]};
m.twitter={title:m.title,description:m.description,...m.twitter,card:'summary_large_image',images:[{url,alt}]};
const replacement=match[0].slice(0,match[0].indexOf('=')+1)+JSON.stringify(m,null,2)+';';
const updated=s.replace(match[0],replacement);if(updated!==s){fs.writeFileSync(file,updated);count++;}
}
console.log('Updated social-preview metadata in '+count+' app exports');
