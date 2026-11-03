// Content-address city UI assets so returning browsers do not retain old labels.
// Existing city HTML and validated expansion routes; data and stored plans are untouched.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve('public');
const expansion=fs.existsSync('data/city-expansion/launched.json')?JSON.parse(fs.readFileSync('data/city-expansion/launched.json')).cityIds:[];
for(const city of ['','en','belgrade','en/belgrade','paris','en/paris','london','en/london','flensburg','en/flensburg','de/flensburg','moscow','en/moscow','palo-alto','en/palo-alto','yerevan','en/yerevan','vienna','en/vienna',...expansion.flatMap(id=>[id,'en/'+id])]){
 const dir=path.join(root,city);if(!fs.existsSync(dir))continue;
 for(const name of fs.readdirSync(dir).filter(x=>x.endsWith('.html'))){
  const file=path.join(dir,name),original=fs.readFileSync(file,'utf8');
  const stamped=original.replace(/\b(src|href)=(['"])([^'"<>]+)\2/g,(whole,attribute,quote,value)=>{
   if(/^(?:https?:|\/\/|data:|#)/.test(value))return whole;
   const url=new URL(value,'https://happymap.app/'+(city?city+'/':'')+name);
   if(!/\.(?:js|css)$/.test(url.pathname))return whole;
   const asset=path.resolve(root,'.'+url.pathname);
   if(!asset.startsWith(root+path.sep)||!fs.existsSync(asset))return whole;
   const hash=crypto.createHash('sha256').update(fs.readFileSync(asset)).digest('hex').slice(0,12);
   const plain=value.split(/[?#]/)[0];url.searchParams.set('v',hash);
   return attribute+'='+quote+plain+'?'+url.searchParams.toString()+url.hash+quote;
  });
  fs.writeFileSync(file,stamped);
 }
}
console.log('Existing and launched city UI asset cache keys match content hashes');
