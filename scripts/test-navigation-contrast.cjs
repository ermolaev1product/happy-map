const fs = require('node:fs');
const assert = require('node:assert/strict');
const cities = ['', 'belgrade/', 'moscow/', 'palo-alto/', 'paris/', 'london/'];
const css = fs.readFileSync('public/map-space.css', 'utf8');
const download = fs.readFileSync('public/assets/download.css', 'utf8');
function luminance(hex) {
 const rgb = hex.match(/[0-9a-f]{2}/g).map(c => parseInt(c,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
}
function contrast(fg,bg) {
 const a=luminance(fg),b=luminance(bg);
 return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}
const pairs = [
 ['Primary choice', '61420d','fff3d3'],
 ['Hovered choice', '61420d','ffe5a3'],
 ['Selected choice', '49310f','e5d2a8'],
 ['Download-page CTA', '49310f','f4b942'],
 ['Header download', '61420d','ffe4a0'],
 ['Mobile header download', '5b3c0b','ffe4a0'],
 ['Header download hover', '61420d','ffe5a3'],
 ['Download-page CTA hover', '49310f','e6a92d'],
 ['Focus outline', '765015','fff3d3'],
 ['Secondary add event', '4b554b','ffffff']
];
for (const [name,fg,bg] of pairs) {
 const ratio=contrast(fg,bg);assert(ratio>=4.5,`${name}: ${ratio}`);console.log(`${name}: ${ratio.toFixed(2)}:1 contrast`);
}
for (const lang of ['', 'en/']) {
 for (const city of cities) {
  const file=`public/${lang}${city}${city?'index.html':'map.html'}`;
  const html=fs.readFileSync(file,'utf8');
  for(const id of ['eventsLayer','cityLayer']) assert.match(html,new RegExp(`id="${id}"[^>]*aria-pressed="(?:true|false)"`), file+' '+id);
  assert.match(html,/map-space\.css\?v=[^" ]+/);
  assert.match(html,/download\.css\?v=[^" ]+/);
  assert.match(html,/<div class="layer-tabs" role="group" aria-label="[^"]+">/);
  const js=fs.readFileSync(`public/${lang}discovery.js`,'utf8');
  assert.match(js,/setAttribute\('aria-pressed',String\(on\)\)/);
 }
 assert.equal(fs.readFileSync(`public/${lang}map-space.css`,'utf8'),css);
 assert.equal(fs.readFileSync(`public/${lang}assets/download.css`,'utf8'),download);
}
assert.match(css,/button\[aria-pressed="true"\]::after\{/);
assert.match(css,/button:focus-visible\{/);
assert.match(css,/min-height:52px/);assert.match(css,/min-height:48px/);
assert.match(css,/\.map-first\.plan-view \.layer-tabs\{grid-template-columns:repeat\(2/);
assert(!/ed674f|ff826b|de5841/.test(download));
assert.match(fs.readFileSync('public/assets/download-page.css','utf8'),/\.cta\{[^}]*background:#f4b942[^}]*color:#49310f/);
console.log('Navigation styling and accessibility contracts passed for all six cities, RU and EN.');
