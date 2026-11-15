// Build the English mirror locally; Python-free hosts must use an exact checked snapshot.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {verifySnapshot,snapshotPath as manifest} from './english-build-snapshot.mjs';
function run(cmd,args){const r=spawnSync(cmd,args,{stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)throw new Error(`Build step ${cmd} ${args.join(' ')} failed: exit=${r.status}, signal=${r.signal||'none'}`);}
const probe=process.env.HAPPYMAP_USE_COMMITTED_EN==='1'?{status:null,error:{code:'ENOENT'}}:spawnSync('python3',['--version'],{stdio:'ignore'});
if(probe.error?.code==='ENOENT'){
 verifySnapshot();
 run('node',['scripts/check-english.cjs']);run('node',['scripts/test-flensburg-languages.cjs']);
 run('node',['scripts/test-unified-share-metadata.cjs']);
 console.log('Python-free build: exact final prepared-source snapshot verified.');
 process.exit(0);
}
if(probe.status!==0)throw Error('Python failed unexpectedly; refusing to skip English generation.');
// Keep manually reviewed localized catalogues/audit history when their source feed
// has not changed since the last verified language build. UI still regenerates.
const previousSnapshot=fs.existsSync(manifest)?JSON.parse(fs.readFileSync(manifest,'utf8')):{};
const retainedCatalogues=new Map();
// Keep reviewed catalogue bytes on disk, not in the parent heap while Python runs.
const retainedDirectory=fs.mkdtempSync(path.join(process.env.TMPDIR||'/tmp','happymap-english-retained-'));
for(const [file,hash] of Object.entries(previousSnapshot)){
 if(!/^public\/(?!en\/|de\/|sr\/|es\/|pt-br\/|fr-ca\/|guide\/)(?:.*\/)?[^/]+\.json$/.test(file)||!fs.existsSync(file))continue;
 const localized=file.replace(/^public\//,'public/en/');
 if(fs.existsSync(localized)&&crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')===hash){const backup=path.join(retainedDirectory,String(retainedCatalogues.size)+'.json');fs.copyFileSync(localized,backup);retainedCatalogues.set(localized,backup);}
}
function restoreReviewedCatalogues(){for(const [file,backup] of retainedCatalogues)fs.copyFileSync(backup,file);console.log('Preserved unchanged-source reviewed EN catalogues:',retainedCatalogues.size);fs.rmSync(retainedDirectory,{recursive:true,force:true});}
 run('node',['scripts/merge-traffic-translations.mjs']);
 run('node',['scripts/install-traffic-pages.mjs']);
 run('node',['scripts/build-seo-guides.mjs']);
 run('python3',['scripts/sync-account-clients.py']);
 try {run('python3',['scripts/build-english.py']);run('python3',['scripts/complete-english.py']);} finally {restoreReviewedCatalogues();}run('node',['scripts/check-english.cjs']);run('node',['scripts/build-flensburg-german.cjs']);run('node',['scripts/stamp-flensburg-assets.mjs']);run('node',['scripts/test-flensburg-languages.cjs']);
 run('node',['scripts/stamp-download-layout.mjs']);
 run('node',['scripts/stamp-controls.mjs']);
 run('node',['scripts/build-seo-guides.mjs']);
 run('node',['scripts/build-country-seo.mjs']);
 // Final sealing belongs to build-pipeline, after every later public generator.

// Guard every existing localized share/entry page and app metadata export.
run('node',['scripts/test-unified-share-metadata.cjs']);
