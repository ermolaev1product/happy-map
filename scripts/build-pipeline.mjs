// Source generation is separate from packaging an exact reviewed source tree.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifySnapshot,writeSnapshot} from './english-build-snapshot.mjs';

export const preparation=[
 ['scripts/stamp-city-coverage-notice.mjs','--clean'],
 ['scripts/ensure-english-build.mjs'],
 ['scripts/build-place-catalog.mjs'],
 ['scripts/build-social-auth.mjs'],
 ['scripts/build-six-language-ui.mjs'],
 ['scripts/stamp-city-coverage-notice.mjs'],
 ['scripts/build-shared-catalog.mjs'],
];
export const validations=[
 ['scripts/check-english.cjs'],
 ['scripts/test-flensburg-languages.cjs'],
 ['scripts/test-unified-share-metadata.cjs'],
 ['scripts/test-six-language-ui.mjs'],
 ['scripts/test-six-language-plans.mjs'],
 ['scripts/test-android-catalog-refresh.cjs'],
 ['scripts/test-shared-catalog.cjs'],
 ['scripts/test-shared-catalog-build.cjs','public'],
];
export const packaging=[
 ['scripts/build-place-catalog.mjs'], // Derived server index only; does not change public/.
 ['scripts/prepare-compressed-assets.mjs'],
 ['scripts/run-framework.mjs','build'],
 ['scripts/compact-built-json.mjs'],
 ['scripts/test-shared-catalog-build.cjs','dist/client'],
];

function hasPython(){
 const result=spawnSync('python3',['--version'],{stdio:'ignore'});
 if(result.status===0)return true;
 if(result.error?.code==='ENOENT')return false;
 throw Error('Python failed unexpectedly; refusing to change build modes.');
}

export function chooseMode(requested,env=process.env,python=hasPython){
 if(requested&&!['prepare','prepared','seal','check'].includes(requested))throw Error('Expected --prepare, --prepared, --seal or --check.');
 if(requested==='prepare'){
  if(env.HAPPYMAP_USE_COMMITTED_EN==='1')throw Error('--prepare conflicts with HAPPYMAP_USE_COMMITTED_EN=1.');
  if(!python())throw Error('Source preparation requires Python. Use --prepared only for a verified sealed source.');
 }
 if(requested)return requested;
 return env.HAPPYMAP_USE_COMMITTED_EN==='1'||!python()?'prepared':'prepare';
}

export async function runPipeline({root=process.cwd(),mode,run=async args=>{
 const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error('Build step failed: node '+args.join(' ')+' (exit '+result.status+')');
}}={}){
 if(!['prepare','prepared','seal','check'].includes(mode))throw Error('Explicit valid pipeline mode required.');
 if(mode==='check')return {mode,...verifySnapshot(root)};
 if(mode==='prepared')verifySnapshot(root); // Before even non-public derived work.
 if(mode==='prepare')for(const args of preparation)await run(args);
 if(mode==='prepare'||mode==='seal'){
  for(const args of validations)await run(args);
  writeSnapshot(root); // All public generation and semantic checks finished.
 }
 if(mode==='seal')return {mode,...verifySnapshot(root)};
 const beforePackaging=verifySnapshot(root);
 for(const args of packaging)await run(args);
 const afterPackaging=verifySnapshot(root);
 if(afterPackaging.sealSha256!==beforePackaging.sealSha256)throw Error('Prepared-source seal changed during packaging. Refusing a rewritten build baseline.');
 return {mode,...afterPackaging}; // Packaging must not change reviewed source or its seal.
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length>1||(args.length&&!/^--(?:prepare|prepared|seal|check)$/.test(args[0])))throw Error('Expected one pipeline mode flag.');
 console.log(JSON.stringify(await runPipeline({mode:chooseMode(args[0]?.slice(2))})));
}
