// One shared, content-addressed control system across existing localized pages.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const root='public',asset='assets/controls.css';
const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,asset))).digest('hex').slice(0,12);
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);}
let count=0;
for(const p of walk(root).filter(p=>p.endsWith('.html'))){
 let s=fs.readFileSync(p,'utf8');
 if(!s.includes('</head>')||!/(<button|class="cta"|city-cards|download-page\.css)/.test(s))continue;
 s=s.replace(/<link[^>]*href="\/assets\/controls\.css(?:\?[^"<>]*)?"[^>]*>\s*/g,'');
 s=s.replace('</head>',`<link rel="stylesheet" href="/assets/controls.css?v=${hash}"></head>`);
 fs.writeFileSync(p,s);count++;
}
console.log(`Shared controls stamped on ${count} existing pages (${hash})`);
