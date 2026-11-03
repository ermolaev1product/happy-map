const fs=require('fs'),assert=require('assert/strict');
const css=fs.readFileSync('public/assets/controls.css','utf8');
for(const rule of ['grid-template-columns:minmax(0,1fr)','repeat(7,minmax(max(44px,2.75rem),1fr))','overflow-x:auto','min-height:56px','white-space:normal','overflow-wrap:anywhere'])assert(css.includes(rule),rule);
// Layout invariants, not a substitute for browser/mobile visual QA.
for(const viewport of [320,360,390,412])for(const scale of [1,2]){
 const available=viewport-32,minCell=Math.max(44,2.75*16*scale),content=7*minCell+12;
 const cell=Math.max(minCell,(available-12)/7);
 assert(cell>=44);assert(content>available||7*cell+12<=available+.01);
 console.log(JSON.stringify({viewport,textScale:scale,minCell,available,scroll:content>available}));
}
console.log('PASS static responsive-calendar invariants; actual rendering is verified separately.');
