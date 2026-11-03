const fs=require('fs'),assert=require('assert/strict'),cp=require('child_process'),crypto=require('crypto');
const css=fs.readFileSync('public/assets/controls.css','utf8');
assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length);
for(const s of ['.layer-tabs','.app-download','.category','.day','.social-button','.picker-back','.cta','.close-dialog','prefers-reduced-motion','focus-visible'])assert(css.includes(s),s);
const lum=h=>h.match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
for(const [a,b] of [['49310f','f5c45e'],['49310f','edb645'],['536159','f3f5f1'],['ffffff','293c32'],['28352e','ffffff']]){const ratio=(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);assert(ratio>=4.5);console.log(a,b,ratio.toFixed(2));}
const files=cp.execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim().split('\n');
for(const p of files){if(p.endsWith('events.json')||p.includes('/downloads/')||p.endsWith('hosting.json')||p==='public/catalog-modes.js'||p==='public/social.js'||p==='public/app.js')throw Error('Out-of-scope change '+p)}
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):[d+'/'+e.name]);
const hash=crypto.createHash('sha256').update(css).digest('hex').slice(0,12);let pages=0;
for(const p of walk('public').filter(p=>p.endsWith('.html'))){const s=fs.readFileSync(p,'utf8');if(!s.includes('</head>')||!/(<button|class="cta"|city-cards|download-page\.css)/.test(s))continue;assert(s.includes('/assets/controls.css?v='+hash),p);pages++;}
console.log('PASS shared modern controls',pages,'pages; WCAG text contrast, motion/focus selectors and unchanged data/behavior scope.');
