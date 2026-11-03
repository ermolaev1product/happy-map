// Preserve all data and URLs while keeping the expanded deployment below hosting limits.
import fs from 'node:fs';
import path from 'node:path';
let saved=0;
function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())visit(p);else if(entry.name.endsWith('.json')){const raw=fs.readFileSync(p,'utf8');const compact=JSON.stringify(JSON.parse(raw))+'\n';if(Buffer.byteLength(compact)<Buffer.byteLength(raw)){saved+=Buffer.byteLength(raw)-Buffer.byteLength(compact);fs.writeFileSync(p,compact);}}}}
visit('dist/client');console.log('JSON whitespace removed:',Math.round(saved/1024/1024)+' MiB; values unchanged.');

// Minify whitespace only: keep identifiers and semantics across classic scripts.
// No assets, download URLs or data records are removed to fit hosting limits.
const {transform}=await import('esbuild');
let codeSaved=0;
async function compactCode(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory()){await compactCode(p);continue;}const ext=path.extname(p);if(!['.js','.css'].includes(ext))continue;const raw=fs.readFileSync(p,'utf8');try{const result=await transform(raw,{loader:ext==='.css'?'css':'js',minifyWhitespace:true,minifyIdentifiers:false,minifySyntax:false,legalComments:'inline',target:'esnext'});if(Buffer.byteLength(result.code)<Buffer.byteLength(raw)){codeSaved+=Buffer.byteLength(raw)-Buffer.byteLength(result.code);fs.writeFileSync(p,result.code);}}catch{ /* Preserve files with unsupported syntax verbatim. */ }}}
await compactCode('dist/client');
console.log('JS/CSS whitespace removed:',Math.round(codeSaved/1024/1024)+' MiB; identifiers and assets retained.');


// Vienna's place data is language-neutral. The EN interface loads the canonical /vienna/places.json directly.
// Fail rather than silently discard a translated variant.
const common=fs.readFileSync('dist/client/vienna/places.json');
const localized=fs.readFileSync('dist/client/en/vienna/places.json');
if(!common.equals(localized))throw Error('Vienna places differ by locale; shared-data loading would lose translations.');
fs.unlinkSync('dist/client/en/vienna/places.json');
console.log('Vienna place data shared between locales; English controls link directly to the shared data.');

// Only byte-identical datasets are shared; the Worker preserves their old URLs.
for (const relative of ['research/bars-2026-10-14/bar-registry.json','research/bars-2026-10-14/bars.json','paris/paris-data-derived.json']) {
  const original=fs.readFileSync(path.join('dist/client',relative));
  const duplicatePath=path.join('dist/client/en',relative);
  if (!original.equals(fs.readFileSync(duplicatePath))) throw Error('Localized dataset differs: '+relative);
  fs.unlinkSync(duplicatePath);
}

// Losslessly store large city directories once per locale in compressed form.
// The Worker returns the identical ordinary JSON at each existing URL.
const {gzipSync,gunzipSync}=await import('node:zlib');
const {compressedAssetPaths}=await import('../lib/compressed-place-assets.mjs');
let packedSaved=0;
for(const relative of compressedAssetPaths){
 const file=path.join('dist/client',relative);const raw=fs.readFileSync(file);const packed=gzipSync(raw,{level:9});
 if(!gunzipSync(packed).equals(raw))throw Error('Lossless place compression failed: '+relative);
 fs.writeFileSync(file+'.gz',packed);fs.unlinkSync(file);packedSaved+=raw.length-packed.length;
}
console.log('Lossless place asset storage saved:',Math.round(packedSaved/1024/1024)+' MiB; all URLs, fields and translations preserved.');
