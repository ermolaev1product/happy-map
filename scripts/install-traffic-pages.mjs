// Instrument public browsing pages only. Run before locale generation; no private pages or redirect stubs.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('public');
const cities=["tbilisi","belgrade","moscow","palo-alto","paris","london","flensburg","vienna","saint-petersburg","new-york","dubai","prague","batumi","berlin","limassol","antalya","tel-aviv","almaty","istanbul","barcelona","madrid","minsk","baku","tashkent","astana","bishkek","riga","oslo","buenos-aires","brasilia","tallinn","warsaw","lisbon","chisinau","vilnius","copenhagen","dublin","stockholm","helsinki","amsterdam","bratislava","sofia","rome","budapest","brussels","athens","bucharest","podgorica","zagreb","ljubljana","skopje","sarajevo","ankara","nicosia","abu-dhabi","tirana","valletta","doha","manama","tokyo","seoul","bangkok","singapore","washington","kuala-lumpur","ottawa","hanoi","mexico-city","new-delhi","lima","bogota","montevideo","santiago","quito","asuncion","guatemala-city","panama-city","san-salvador","santo-domingo","port-of-spain","rabat","bridgetown","dakar","tunis","accra","algiers","reykjavik","luxembourg","cape-town","bern","hamburg","munich","toronto","montreal","chicago","philadelphia","los-angeles","cologne","san-diego"];
const files=['map.html','cities.html','about.html','guide.html','android.html','sources.html','source-priorities.html','sources-audit.html','tbilisi-bars.html',...cities.flatMap(c=>['index.html','map.html','android.html','sources.html','nearby.html'].map(p=>c+'/'+p))];
const script='<script src="/assets/traffic.js?v=all-cities-20261014" defer></script>';
const privacy='<a data-traffic-privacy href="/traffic-privacy.html" style="display:block;text-align:center;font-size:12px;padding:12px;color:inherit">Visitor statistics &amp; privacy</a>';
let count=0;
for(const relative of files){
 const file=path.join(root,relative);if(!fs.existsSync(file))continue;
 let s=fs.readFileSync(file,'utf8');
 s=s.replace(/<script\b[^>]*\bsrc=["'][^"']*\/assets\/traffic\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script>\s*/gi,'');
 const extra=(s.includes('traffic-privacy.html')?'':privacy)+script;
 if(!/<\/body>/i.test(s))throw Error('Cannot instrument page without closing body: '+relative);
 s=s.replace(/<\/body>/i,extra+'</body>');fs.writeFileSync(file,s);count++;
}
console.log('First-party visitor statistics: '+count+' public source pages instrumented; locale builds inherit the same collector.');
