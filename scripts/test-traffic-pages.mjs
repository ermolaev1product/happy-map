import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'happymap-traffic-pages-'));const script=path.resolve('scripts/install-traffic-pages.mjs');
const rootPages=['map.html','cities.html','about.html','guide.html','android.html','sources.html','source-priorities.html','sources-audit.html','tbilisi-bars.html'];
const cities=['tbilisi','belgrade','moscow','palo-alto','paris','london','flensburg'];
const files=[...rootPages,...cities.flatMap(c=>['index.html','map.html','android.html','sources.html','nearby.html'].map(p=>c+'/'+p))];
try{
 for(const f of files){const p=path.join(temp,'public',f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,'<!doctype html><html><body>Map</body></html>');}
 for(const f of ['stats.html','friends.html','index.html','traffic-privacy.html'])fs.writeFileSync(path.join(temp,'public',f),'<!doctype html><html><body>Excluded</body></html>');
 const run=()=>{const r=spawnSync(process.execPath,[script],{cwd:temp,encoding:'utf8'});assert.equal(r.status,0,r.stderr);};run();
 const first=Object.fromEntries(files.map(f=>[f,fs.readFileSync(path.join(temp,'public',f),'utf8')]));run();
 for(const f of files){const text=fs.readFileSync(path.join(temp,'public',f),'utf8');assert.equal(text,first[f],'idempotent '+f);assert.equal((text.match(/traffic\.js/g)||[]).length,1);assert.equal((text.match(/traffic-privacy\.html/g)||[]).length,1);}
 for(const f of ['stats.html','friends.html','index.html','traffic-privacy.html'])assert(!fs.readFileSync(path.join(temp,'public',f),'utf8').includes('traffic.js'));
 console.log('PASS: public-page instrumentation, one collector and visible privacy link per page, private/redirect exclusion, repeat-build stability.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
