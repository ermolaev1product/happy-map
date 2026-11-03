// Run from the project root; --root permits testing an isolated generated mirror.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=process.argv.includes('--root')?path.resolve(process.argv[process.argv.indexOf('--root')+1]):process.cwd();
const publicDir=path.join(root,'public');
const locales={ru:'ru_RU',en:'en_GB',de:'de_DE',fr:'fr_FR',it:'it_IT','de-CH':'de_CH','de-AT':'de_AT','pt-BR':'pt_BR','fr-CA':'fr_CA'};
const alts={ru:'Happy Map — События. Места. Планы.',en:'Happy Map — Events. Places. Plans.',de:'Happy Map — Veranstaltungen. Orte. Pläne.',fr:'Happy Map — Événements. Lieux. Sorties.',it:'Happy Map — Eventi. Luoghi. Programmi.'};
alts['de-CH']=alts.de;alts['de-AT']=alts.de;alts['pt-BR']=alts.en;alts['fr-CA']=alts.en;
const artwork=lang=>({'de-CH':'de','de-AT':'de','pt-BR':'en','fr-CA':'en'})[lang]||lang;
const asset=lang=>'https://happymap.app/assets/happy-map-unified-20261015-'+artwork(lang)+'.png';
const scan=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?scan(path.join(dir,e.name)):[path.join(dir,e.name)]);
function metadata(html){const found={};for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){const key=tag.match(/(?:property|name)=["']([^"']+)["']/)?.[1];if(!key)continue;assert(!found[key]||!key.startsWith('og:')&&!key.startsWith('twitter:'),'Duplicate social tag '+key);found[key]=tag.match(/content=["']([^"']*)["']/)?.[1];}return found;}
let htmlCount=0,appCount=0;const checked=new Set();
for(const file of scan(publicDir).filter(x=>x.endsWith('.html'))){const html=fs.readFileSync(file,'utf8'),m=metadata(html);if(!m['og:image']&&!m['twitter:image'])continue;const lang=html.match(/<html\b[^>]*lang=["']([^"']+)["']/)?.[1];assert(locales[lang],file+': unsupported language');
 for(const key of ['og:image','twitter:image'])assert.equal(m[key],asset(lang),file+': '+key);
 for(const key of ['og:image:alt','twitter:image:alt'])assert.equal(m[key],alts[lang],file+': '+key);
 assert.equal(m['og:locale'],locales[lang],file+': locale');assert.equal(m['og:image:width'],'1200');assert.equal(m['og:image:height'],'630');assert.equal(m['twitter:card'],'summary_large_image');
 assert(fs.existsSync(path.join(publicDir,new URL(asset(lang)).pathname)),file+': missing artwork');
 const allSocial=Object.entries(m).filter(([key])=>key.startsWith('og:')||key.startsWith('twitter:')).map(([,v])=>v).join('\n');
 assert(!/happy-map-(?:city-card|project-40|.*-invite-20261011|around-you-v2|flensburg-local|paris-20261011|london-20261011)/.test(allSocial),file+': legacy preview');
 checked.add(path.relative(publicDir,file));htmlCount++;
}
const cities=["tbilisi","belgrade","moscow","palo-alto","paris","london","yerevan","flensburg","vienna","saint-petersburg","new-york","dubai","prague","batumi","berlin","limassol","antalya","tel-aviv","almaty","istanbul","barcelona","madrid","minsk","baku","tashkent","astana","bishkek","riga","oslo","buenos-aires","brasilia","tallinn","warsaw","lisbon","chisinau","vilnius","copenhagen","dublin","stockholm","helsinki","amsterdam","bratislava","sofia","rome","budapest","brussels","athens","bucharest","podgorica","zagreb","ljubljana","skopje","sarajevo","ankara","nicosia","abu-dhabi","tirana","valletta","doha","manama","tokyo","seoul","bangkok","singapore","washington","kuala-lumpur","ottawa","hanoi","mexico-city","new-delhi","lima","bogota","montevideo","santiago","quito","asuncion","guatemala-city","panama-city","san-salvador","santo-domingo","port-of-spain","rabat","bridgetown","dakar","tunis","accra","algiers","reykjavik","luxembourg","cape-town","bern","hamburg","munich","toronto","montreal","chicago","philadelphia","los-angeles","cologne","san-diego"];
for(const prefix of ['','en/']){
 for(const name of ['index.html','map.html','cities.html','share.html','android.html'])assert(checked.has(prefix+name),'Missing entry preview '+prefix+name);
 for(const city of cities){for(const name of ['invite.html','share.html',...(city==='tbilisi'?[]:['index.html','map.html'])])assert(checked.has(prefix+city+'/'+name),'Missing city preview '+prefix+city+'/'+name);}
}
for(const name of ['index.html','map.html','share.html','invite.html','invite-en.html','invite-local.html'])assert(checked.has('de/flensburg/'+name),'Missing German preview '+name);
for(const file of scan(path.join(root,'app')).filter(x=>x.endsWith('.tsx'))){const s=fs.readFileSync(file,'utf8');const match=s.match(/export const metadata(?::\s*Metadata)?=([\s\S]*?);\s*(?:import|export)/);if(!match)continue;const m=vm.runInNewContext('('+match[1]+')');const lang=Object.keys(locales).find(x=>locales[x]===m.openGraph?.locale);assert(lang,file+': localized app metadata');
 assert.equal(m.openGraph.images.length,1);assert.equal(m.openGraph.images[0].url,asset(lang));assert.equal(m.openGraph.images[0].alt,alts[lang]);assert.equal(m.openGraph.images[0].width,1200);assert.equal(m.openGraph.images[0].height,630);
 assert.equal(m.twitter.card,'summary_large_image');assert.equal(m.twitter.images.length,1);assert.equal(m.twitter.images[0].url,asset(lang));assert.equal(m.twitter.images[0].alt,alts[lang]);appCount++;
}
assert.equal(appCount,101,'Every city app metadata export is tested');
for(const lang of ['de','fr','it']){
 const file=path.join(publicDir,lang,'share.html'),html=fs.readFileSync(file,'utf8'),m=metadata(html);
 assert(checked.has(lang+'/share.html'));
 assert.equal(m['og:url'],'https://happymap.app/'+lang+'/share.html');
 assert(!/language-switch|location.replace|http-equiv="refresh"/.test(html),'Share locale must not redirect to unsupported interface');
 assert(html.includes(lang==='de'?'/cities.html?lang=de':'/en/cities.html?lang=en'),'Honest existing interface fallback');
 if(lang!=='de')assert.deepEqual(fs.readdirSync(path.join(publicDir,lang)),['share.html'],'Share-only localization must not invent full interface');
 assert(!fs.existsSync(path.join(publicDir,'en',lang)),'No nested locale mirrors');
}
console.log(JSON.stringify({status:'passed',htmlPages:htmlCount,appMetadata:appCount,cities,locales:Object.keys(locales)}));
