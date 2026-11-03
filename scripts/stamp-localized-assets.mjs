// Cache invalidation for reviewed locale assets only; does not translate or edit data.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const roots=['public/de','public/pt-br',...['new-york','prague','berlin','barcelona','madrid','flensburg'].map(c=>'public/'+c)];
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
for(const f of walk('public').filter(f=>f.endsWith('.html'))){let s=fs.readFileSync(f,'utf8');const scoped=roots.some(r=>f.startsWith(r+'/'));
const next=s.replace(/\b(src|href)=(['"])([^'"?#]+)(?:\?[^'"#]*)?\2/g,(m,attr,q,url)=>{if(!/\.(?:js|css)$/.test(url)||/^(?:https?:|\/\/)/.test(url))return m;const p=url.startsWith('/')?'public'+url:path.resolve(path.dirname(f),url);if(!fs.existsSync(p)||(!scoped&&!/\/(?:en\/)?assets\/traffic\.js$/.test(url)))return m;return attr+'='+q+url+'?v='+crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0,12)+q;});if(next!==s)fs.writeFileSync(f,next);
}
