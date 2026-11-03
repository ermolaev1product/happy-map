// Content-address the shared layout assets after locale generation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve('public');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const page of walk(root).filter(p=>p.endsWith('.html'))){
 const source=fs.readFileSync(page,'utf8');
 const result=source.replace(/((?:src|href)=["'])([^"']*(?:map-space\.(?:js|css)|city-state\.js|download\.css))(?:\?[^"']*)?(["'])/g,(all,attr,url,quote)=>{
  if(/^https?:/.test(url))return all;
  const file=url.startsWith('/')?path.join(root,url):path.resolve(path.dirname(page),url);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return all;
  const hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0,12);
  return attr+url+'?v='+hash+quote;
 });
 if(result!==source)fs.writeFileSync(page,result);
}
