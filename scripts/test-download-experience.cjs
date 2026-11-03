// Download pages describe the current website and the real, unchanged APK separately.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const release=JSON.parse(fs.readFileSync('public/android-release.json','utf8'));
assert.equal(release.version,'2.4.9');assert.equal(release.versionCode,23);
assert.equal(release.sha256,'ac9371b2f01dedf8123340742ec41ff6abf311b661a890b9afbfc4dd100b7fd4');
const apk=fs.readFileSync('public/downloads/'+release.file);
assert.equal(apk.byteLength,release.sizeBytes);assert.equal(crypto.createHash('sha256').update(apk).digest('hex'),release.sha256);
assert.match(fs.readFileSync('app/android/page.tsx','utf8'),/redirect\('\/android.html'\)/);
const pages=['android.html','en/android.html',...['palo-alto','london','paris','flensburg'].flatMap(c=>[`${c}/android.html`,`en/${c}/android.html`]),'de/flensburg/android.html'];
for(const file of pages){
 const html=fs.readFileSync('public/'+file,'utf8');
 assert.match(html,/<body class="download-page">/);assert.equal((html.match(/<h1\b/g)||[]).length,1,file+' one main heading');
 for(const id of ['web','android','iphone'])assert(html.includes(`id="${id}"`),file+' '+id+' choice');
 assert(html.includes(release.url),file+' real download URL');assert(html.includes('download="Happy-Map-2.4.9.apk"'),file+' downloaded filename');assert(html.includes(release.sha256),file+' integrity hash');
 assert.match(html,/Build 23|Сборка 23/,file+' actual build number');
 assert.match(html,/earlier interface|более ранний интерфейс|frühere Oberfläche/,file+' honest interface distinction');
 assert.match(html,/shortcut to the website|ярлык веб-сайта|Verknüpfung zur Website/,file+' iOS is a website shortcut');
 assert(!/older interface and three cities|neue signierte Android|not been released yet|offline PWA|native iPhone app/i.test(html),file+' no obsolete or unsupported claims');
 assert.equal((html.match(/<details\b/g)||[]).length,3,file+' install/file disclosure controls');
 assert(!/Happy-Karte-2\.4\.9\.apk/.test(html),file+' filename is not translated');
 if(file.includes('flensburg/'))assert.match(html,/Flensburg is available in the web version\. It is not included in this APK\.|Flensburg ist in der Webversion verfügbar\. Diese APK enthält Flensburg noch nicht\./);
 if(file.includes('palo-alto/')){assert(html.includes('14-day date window'));assert(html.includes('/en/palo-alto/?lang=en'));}
 for(const [,href] of html.matchAll(/(?:href|src)="([^"]+)"/g)){
  if(href.startsWith('#')){assert(html.includes(`id="${href.slice(1)}"`),file+' valid anchor '+href);continue;}
  const url=new URL(href,'https://happymap.app/'+file);
  if(url.origin!=='https://happymap.app'||url.pathname.startsWith('/downloads/'))continue;
  const local=path.join('public',decodeURIComponent(url.pathname));
  assert(fs.existsSync(local),file+' local link exists: '+href);
 }
 const map=file.replace(/android\.html$/,'index.html').replace(/^(en\/)?index\.html$/,'$1map.html');
 assert(html.includes('href="/'+map+'"'),file+' city/locale back link');
}
const css=fs.readFileSync('public/assets/download-page.css','utf8');
assert.equal(fs.readFileSync('public/en/assets/download-page.css','utf8'),css);
for(const token of [':focus-visible','prefers-reduced-motion','@media(max-width:600px)','overflow-wrap:anywhere'])assert(css.includes(token),token);
function lum(hex){const v=hex.match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];}
for(const [fg,bg] of [['49310f','f4b942'],['fffdf4','304b39'],['344734','f0eee4'],['5c665b','fffaf0'],['59654e','e9eee0'],['77541c','fff1cf']]){
 const [a,b]=[lum(fg),lum(bg)].sort((a,b)=>b-a);assert((a+.05)/(b+.05)>=4.5,fg+' on '+bg+' contrast');
}
console.log(`PASS: ${pages.length} polished Download pages; real APK 2.4.9/build 23, byte size and SHA-256; web/iOS/Flensburg disclosures; city and locale links; keyboard/reduced-motion styles and text contrast.`);
