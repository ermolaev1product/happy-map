const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'happymap-publication-test-')),script=path.resolve('scripts/build-shared-catalog.mjs');let checks=0;
function write(file,data){const dest=path.join(root,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,typeof data==='string'?data:JSON.stringify(data));}
function build(){const result=cp.spawnSync(process.execPath,[script],{cwd:root,encoding:'utf8'});assert.equal(result.status,0,result.stderr);return JSON.parse(fs.readFileSync(path.join(root,'public/catalog/v1/manifest.json')));}
try{
 write('public/city-picker.json',{cities:[{id:'paris',path:'paris/index.html'}]});write('public/catalog-client.js','/* shared client */');
 const data={events:[{id:'one',title:'One',date:'2026-11-20',price:1}]};write('public/paris/events.json',data);write('public/paris/places.json',{places:[]});
 const first=build(),same=build();assert.equal(first.publicationSequence,1);assert.equal(same.publicationSequence,first.publicationSequence);assert.equal(same.revision,first.revision);checks+=3;
 data.events[0].price=2;write('public/paris/events.json',data);const next=build();assert.equal(next.publicationSequence,2);assert.notEqual(next.contentRevision,first.contentRevision);assert.notEqual(next.revision,first.revision);checks+=3;
 write('public/en/paris/events.json',{events:[{id:'extra',title:'Extra',date:'2026-11-20'}]});const bad=cp.spawnSync(process.execPath,[script],{cwd:root,encoding:'utf8'});assert.notEqual(bad.status,0);assert(bad.stderr.includes('missing=["one"]')&&bad.stderr.includes('extra=["extra"]'));assert.equal(JSON.parse(fs.readFileSync(path.join(root,'public/catalog/v1/manifest.json'))).revision,next.revision);checks+=3;
 console.log(JSON.stringify({pass:true,checks,stableRebuildSequence:true,sequenceIncrementsOnDataChange:true,inventoryMismatchBlocksPublication:true}));
}finally{fs.rmSync(root,{recursive:true,force:true});}
