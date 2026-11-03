// Proposed narrow follow-up: no event/source data or displayed guide body edits.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const check=process.argv.includes('--check'),root=path.resolve('public'),origin='https://happymap.app';
const sets=[['brasilia','pt-br','pt-BR'],['bern','de','de-CH'],['berlin','de','de'],['vienna','de','de'],['flensburg','de','de']];
const routes=new Set();let changed=0;
for(const [city,folder,tag] of sets){
 const variants=[['ru','ru'],['en','en'],[folder,tag]].map(([dir,lang])=>{const route='/guide/'+dir+'/'+city,file=path.join(root,route+'.html');assert(fs.existsSync(file),'Missing existing guide '+file);const html=fs.readFileSync(file,'utf8'),canonical=html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];assert.equal(canonical,origin+route,'Unexpected canonical '+file);routes.add(route);return {file,html,lang,canonical};});
 const links=variants.map(v=>`<link rel="alternate" hreflang="${v.lang}" href="${v.canonical}">`).join('')+`<link rel="alternate" hreflang="x-default" href="${origin}/guide/en/${city}">`;
 for(const v of variants){const expected=new Map([...variants.map(t=>[t.lang,t.canonical]),['x-default',origin+'/guide/en/'+city]]);const found=new Map([...v.html.matchAll(/<link\b[^>]*rel="alternate"[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"[^>]*>/g)].map(m=>[m[1],m[2]]));if(check){assert.deepEqual(found,expected,'hreflang mismatch '+v.file);continue;}const next=v.html.replace(/<link\b[^>]*rel="alternate"[^>]*hreflang=[^>]*>/g,'').replace('</head>',links+'</head>');if(next!==v.html){fs.writeFileSync(v.file,next);changed++;}}
}
for(const folder of ['de','pt-br'])if(fs.existsSync(path.join(root,'guide',folder,'index.html')))routes.add('/guide/'+folder+'/');
const sitemap=path.join(root,'sitemap.xml');let xml=fs.readFileSync(sitemap,'utf8');for(const route of routes){const loc='<loc>'+origin+route+'</loc>';if(check)assert(xml.includes(loc),'Missing sitemap route '+route);else if(!xml.includes(loc))xml=xml.replace('</urlset>','<url>'+loc+'</url></urlset>');}if(!check)fs.writeFileSync(sitemap,xml);console.log(JSON.stringify({mode:check?'check':'stamp',guidePages:15,changed,routes:routes.size}));
