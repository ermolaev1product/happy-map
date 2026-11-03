// Narrow reviewed-asset refresh, without regenerating unrelated translations.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const assets=['language-switch.js','city-picker.js','entry-language.js','locale-policy.js'];
for(const asset of assets)fs.copyFileSync('public/'+asset,'public/en/'+asset);
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
for(const file of walk('public').filter(p=>p.endsWith('.html'))){let text=fs.readFileSync(file,'utf8'),next=text;if(!next.includes('/locale-policy.js')&&/src="(?:\/en)?\/(?:language-switch|entry-language)\.js/.test(next))next=next.replace(/(<script[^>]*src="(?:\/en)?\/(?:language-switch|entry-language)\.js)/,'<script src="/locale-policy.js"></script>$1');for(const asset of assets){const hash=crypto.createHash('sha256').update(fs.readFileSync('public/'+asset)).digest('hex').slice(0,12);next=next.replace(new RegExp('((?:src|href)="(?:/en)?/'+asset.replaceAll('.','\\.')+')(?:\\?[^"<>]*)?"','g'),'$1?v='+hash+'"');}if(next!==text)fs.writeFileSync(file,next);}
