// Build the English mirror locally; Python-free hosts must use an exact checked snapshot.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=process.cwd(), manifest='data/i18n/english-build-sha256.json';
function run(cmd,args){const r=spawnSync(cmd,args,{stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)throw new Error(`Build step ${cmd} ${args.join(' ')} failed: exit=${r.status}, signal=${r.signal||'none'}`);}
function snapshot(){
 const files=[];function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())scan(p);else if(entry.isFile())files.push('scripts/build-seo-guides.mjs',p);}}
 scan('public');
 files.push('scripts/build-seo-guides.mjs','scripts/stamp-controls.mjs','scripts/sync-account-clients.py','scripts/interface-en.json','scripts/stamp-download-layout.mjs','scripts/share-preview-metadata.py','scripts/test-unified-share-metadata.cjs','scripts/merge-traffic-translations.mjs','scripts/install-traffic-pages.mjs','scripts/stamp-flensburg-assets.mjs','scripts/build-english.py','scripts/build-flensburg-german.cjs','data/i18n/flensburg-de-ui.json','scripts/complete-english.py','scripts/english-text-nodes.cjs','data/i18n/english-reviewed.json','data/i18n/english-memory.json');
 return Object.fromEntries(files.sort().map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
}
// Keep manually reviewed localized catalogues/audit history when their source feed
// has not changed since the last verified language build. UI still regenerates.
const previousSnapshot=fs.existsSync(manifest)?JSON.parse(fs.readFileSync(manifest,'utf8')):{};
const retainedCatalogues=new Map();
// Keep reviewed catalogue bytes on disk, not in the parent heap while Python runs.
const retainedDirectory=fs.mkdtempSync(path.join(process.env.TMPDIR||'/tmp','happymap-english-retained-'));
for(const [file,hash] of Object.entries(previousSnapshot)){
 if(!/^public\/(?!en\/|de\/|pt-br\/|fr-ca\/|guide\/)(?:.*\/)?[^/]+\.json$/.test(file)||!fs.existsSync(file))continue;
 const localized=file.replace(/^public\//,'public/en/');
 if(fs.existsSync(localized)&&crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')===hash){const backup=path.join(retainedDirectory,String(retainedCatalogues.size)+'.json');fs.copyFileSync(localized,backup);retainedCatalogues.set(localized,backup);}
}
function restoreReviewedCatalogues(){for(const [file,backup] of retainedCatalogues)fs.copyFileSync(backup,file);console.log('Preserved unchanged-source reviewed EN catalogues:',retainedCatalogues.size);fs.rmSync(retainedDirectory,{recursive:true,force:true});}
const probe=process.env.HAPPYMAP_USE_COMMITTED_EN==='1'?{status:null,error:{code:'ENOENT'}}:spawnSync('python3',['--version'],{stdio:'ignore'});
if(probe.status===0){
 run('node',['scripts/merge-traffic-translations.mjs']);
 run('node',['scripts/install-traffic-pages.mjs']);
 run('node',['scripts/build-seo-guides.mjs']);
 run('python3',['scripts/sync-account-clients.py']);
 try {run('python3',['scripts/build-english.py']);run('python3',['scripts/complete-english.py']);} finally {restoreReviewedCatalogues();}run('node',['scripts/check-english.cjs']);run('node',['scripts/build-flensburg-german.cjs']);run('node',['scripts/stamp-flensburg-assets.mjs']);run('node',['scripts/test-flensburg-languages.cjs']);
 run('node',['scripts/stamp-download-layout.mjs']);
 run('node',['scripts/stamp-controls.mjs']);
 run('node',['scripts/build-seo-guides.mjs']);
 run('node',['scripts/build-country-seo.mjs']);
 fs.writeFileSync(manifest,JSON.stringify(snapshot(),null,2)+'\n');
}else if(probe.error?.code==='ENOENT'){
 if(!fs.existsSync(manifest))throw Error('Python unavailable and no checked English build snapshot exists.');
 const expected=JSON.parse(fs.readFileSync(manifest,'utf8')),actual=snapshot();
 if(JSON.stringify(expected)!==JSON.stringify(actual))throw Error('English build inputs or outputs changed. Regenerate with Python before publishing.');
 run('node',['scripts/check-english.cjs']);run('node',['scripts/test-flensburg-languages.cjs']);console.log('Python-free build: exact committed English source/output snapshot verified.');
}else throw Error('Python failed unexpectedly; refusing to skip English generation.');

// Guard every existing localized share/entry page and app metadata export.
run('node',['scripts/test-unified-share-metadata.cjs']);
