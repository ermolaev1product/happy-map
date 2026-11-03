import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';
import {compressedPlacePaths,compressedDataPaths,compressedAssetPaths,compressedPlaceResponse} from '../lib/compressed-place-assets.mjs';
let checks=0;const check=(x,msg)=>{assert(x,msg);checks++};
for(const relative of compressedAssetPaths){
 const file=path.join('dist/client',relative);const packed=fs.readFileSync(file+'.gz');const sourceBytes=fs.readFileSync(path.join('public',relative));const compactBytes=Buffer.from(JSON.stringify(JSON.parse(sourceBytes))+'\n');const expected=compactBytes.length<sourceBytes.length?compactBytes:sourceBytes;
 check(gunzipSync(packed).equals(expected),'All JSON bytes retained '+relative);
 const assets={fetch:async req=>{check(new URL(req.url).pathname===relative+'.gz','Exact asset path');return new Response(req.method==='HEAD'?null:packed,{status:200,headers:{'Content-Type':'application/gzip','Content-Length':String(packed.length),'Cache-Control':'public, max-age=0, must-revalidate','ETag':'test-packed-validator'}})}};
 const r=await compressedPlaceResponse(new Request('https://happymap.app'+relative+'?v=147'),assets);check(r.status===200,'GET status');check(r.headers.get('cache-control')===(compressedDataPaths.includes(relative)?'public, max-age=0, must-revalidate':'public, max-age=60, must-revalidate'),'Cache policy preserved');check(Buffer.from(await r.arrayBuffer()).equals(expected),'Stream output bytes exact');check(r.headers.get('content-type').startsWith('application/json'),'JSON content type');check(!r.headers.has('Content-Encoding')&&!r.headers.has('Content-Length'),'No stale compressed headers');
 const h=await compressedPlaceResponse(new Request('https://happymap.app'+relative,{method:'HEAD'}),assets);check(h.status===200&&h.body===null,'HEAD has no body');
 check((await compressedPlaceResponse(new Request('https://happymap.app'+relative),{fetch:async()=>new Response('missing',{status:404})})).status===503,'Missing asset fails honestly');
 check((await compressedPlaceResponse(new Request('https://happymap.app'+relative),undefined)).status===503,'Missing binding fails honestly');
 check(await compressedPlaceResponse(new Request('https://happymap.app'+relative,{method:'POST'}),assets)===null,'Other methods untouched');
}
for(const p of ['/','/api/profile','/unknown/events.json','/berlin/places.json/extra'])check(await compressedPlaceResponse(new Request('https://happymap.app'+p),{})===null,'Unrelated route untouched');
let bytes=0;function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else bytes+=fs.statSync(p).size;}}walk('dist');check(bytes<250*1024*1024,'Build comfortably below 256 MiB expanded hosting limit');
const config=JSON.parse(fs.readFileSync('dist/server/wrangler.json'));check(config.assets.binding==='ASSETS','Assets binding included in built deployment');
console.log(JSON.stringify({pass:true,checks,paths:compressedAssetPaths.length,legacyPaths:compressedPlacePaths.length,expandedBuildBytes:bytes,identicalOrdinaryJSON:true,streamedNotBuffered:true}));
