const fs=require('node:fs'),path=require('node:path'),{gunzipSync}=require('node:zlib'),{createHash}=require('node:crypto'),assert=require('node:assert/strict');
const sha=x=>createHash('sha256').update(x).digest('hex');const root=process.argv[2]||'public';let files=0,canonicalFacts=0;
function read(url){const file=path.join(root,url);return fs.existsSync(file)?fs.readFileSync(file,'utf8'):gunzipSync(fs.readFileSync(file+'.gz')).toString('utf8');}
const manifest=JSON.parse(read('/catalog/v1/manifest.json')),body={...manifest};delete body.revision;assert.equal(sha(JSON.stringify(body)),manifest.revision);
for(const [city,entry]of Object.entries(manifest.catalogs))for(const kind of ['events','places']){
 const d=entry[kind],raw=read(d.path),data=JSON.parse(raw),normalized=JSON.stringify(data);assert.equal(sha(normalized),d.sha256,d.path);assert.equal(Buffer.byteLength(normalized),d.bytes);const rows=Array.isArray(data)?data:data[kind];canonicalFacts+=rows.length;files++;
 for(const [locale,kinds]of Object.entries(entry.locales||{}))if(kinds[kind]){
  const ld=kinds[kind],text=read(ld.path),overlay=JSON.parse(text);assert.equal(sha(JSON.stringify(overlay)),ld.sha256);assert.equal(Buffer.byteLength(JSON.stringify(overlay)),ld.bytes);assert.equal(overlay.sourceSha256,d.sha256);assert.equal(overlay.cityId,city);assert.equal(overlay.kind,kind);const ids=new Set(rows.map(r=>r.id));for(const id of Object.keys(overlay.records))assert(ids.has(id),ld.path+' unknown ID '+id);files++;
 }
}
const source=read('/catalog-client.js');assert(!source.includes('localStorage.setItem'),'large catalogs never consume plan localStorage');
console.log(JSON.stringify({pass:true,root,revision:manifest.revision,cities:Object.keys(manifest.catalogs).length,files,canonicalFacts,digestsMatch:true}));
