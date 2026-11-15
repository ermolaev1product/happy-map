import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {snapshot,snapshotPath,verifySnapshot,writeSnapshot} from './english-build-snapshot.mjs';
import {chooseMode,runPipeline,preparation,validations,packaging} from './build-pipeline.mjs';

const root=fs.mkdtempSync(path.join(os.tmpdir(),'happymap-prepared-build-'));
let checks=0;
const check=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
function write(relative,value){const file=path.join(root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);}
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const sealed=()=>read(snapshotPath);
const argsKey=args=>args.join(' ');
try{
 for(const directory of ['public','scripts','data/i18n','data/seo'])fs.mkdirSync(path.join(root,directory),{recursive:true});
 for(const file of ['package.json','package-lock.json','scripts/build-pipeline.mjs','scripts/english-build-snapshot.mjs','scripts/build-shared-catalog.mjs'])write(file,'{}\n');
 write('public/guide/en/paris.html','Reviewed guide: retain this exact prose and event order.');
 write('public/countries/en/france.html','Reviewed country page.');
 write('public/map.html','<main><!-- city-coverage-notice -->Prepared notice<!-- /city-coverage-notice --></main>');
 write('public/paris/events.json','{"events":[{"id":"one","title":"Reviewed"}]}');
 write('public/catalog-client.js','/* reviewed client */');
 write('public/catalog/v1/manifest.json','{"publicationSequence":2}');
 write('public/catalog/v1/locales/en/paris/events.json','{"records":{}}');
 write('data/seo/paris.json','{"reviewed":true}');
 write('data/i18n/english-reviewed.json','{}');
 writeSnapshot(root);
 const original=snapshot(root),originalSeal=sealed();
 let commands=[];
 const packageOnly=async args=>{
  assert(packaging.some(step=>argsKey(step)===argsKey(args)),'Prepared build invoked a public generator: '+argsKey(args));
  verifySnapshot(root);commands.push(argsKey(args));
  write('dist/client/build.txt','packaged');write('lib/generated-compressed-assets.mjs','/* derived only */');
 };
 await runPipeline({root,mode:'prepared',run:packageOnly});
 await runPipeline({root,mode:'prepared',run:packageOnly});
 check(commands.length,packaging.length*2,'Two full prepared command sequences');
 check(snapshot(root),original,'Prepared packaging preserves every sealed source byte');
 check(sealed(),originalSeal,'Prepared builds never reseal');
 check(read('public/guide/en/paris.html'),'Reviewed guide: retain this exact prose and event order.','Restored reviewed guides unchanged');
 check(read('public/map.html').includes('city-coverage-notice'),true,'Prepared check precedes and avoids coverage cleaning');

 for(const file of ['public/paris/events.json','public/catalog-client.js','public/map.html','public/catalog/v1/locales/en/paris/events.json','scripts/build-shared-catalog.mjs','package.json']){
  const before=read(file);write(file,before+'\n/* tampered */');let invoked=false;
  await assert.rejects(runPipeline({root,mode:'prepared',run:async()=>{invoked=true;}}),/differs from its final seal/);checks++;
  check(invoked,false,'Tamper rejected before any packaging');check(sealed(),originalSeal,'Mismatch cannot reseal');write(file,before);
 }
 write('public/extra.json','{}');await assert.rejects(runPipeline({root,mode:'prepared',run:packageOnly}),/differs/);checks++;fs.unlinkSync(path.join(root,'public/extra.json'));
 for(const file of ['public/payload.pyc','public/__pycache__/payload.txt']){write(file,'Unexpected public asset');assert.throws(()=>verifySnapshot(root),/differs/);checks++;fs.unlinkSync(path.join(root,file));}
 const oldClient=read('public/catalog-client.js');fs.unlinkSync(path.join(root,'public/catalog-client.js'));await assert.rejects(runPipeline({root,mode:'prepared',run:packageOnly}),/differs/);checks++;write('public/catalog-client.js',oldClient);

 commands=[];let generation=0,validationCount=0;
 const prepare=async args=>{
  commands.push(argsKey(args));
  if(commands.length<=preparation.length){
   check(sealed(),originalSeal,'No intermediate generator may seal');generation++;
   write('public/generated.txt','generation '+generation);
   if(args[0]==='scripts/build-shared-catalog.mjs')write('public/catalog/v1/manifest.json','{"publicationSequence":3}');
  }else if(commands.length<=preparation.length+validations.length){
   check(sealed(),originalSeal,'Old seal retained until all semantic checks pass');
   check(read('public/catalog/v1/manifest.json'),'{"publicationSequence":3}','Validation sees final shared publication');validationCount++;
  }else{verifySnapshot(root);assert.notEqual(sealed(),originalSeal);}
 };
 await runPipeline({root,mode:'prepare',run:prepare});
 check(validationCount,validations.length,'Every semantic check precedes sealing');
 check(commands,[...preparation,...validations,...packaging].map(argsKey),'Preparation order and full packaging are explicit');
 verifySnapshot(root);checks++;

 const preparedSeal=sealed();write('public/paris/events.json','{"events":[]}');
 await assert.rejects(runPipeline({root,mode:'seal',run:async()=>{throw Error('semantic failure');}}),/semantic failure/);checks++;
 check(sealed(),preparedSeal,'Failed validation leaves old seal intact');
 let sealCalls=[];await runPipeline({root,mode:'seal',run:async args=>sealCalls.push(argsKey(args))});
 check(sealCalls,validations.map(argsKey),'Explicit reseal validates only, without source generators or packaging');
 verifySnapshot(root);checks++;

 const beforeMutationSeal=sealed();
 await assert.rejects(runPipeline({root,mode:'prepared',run:async args=>{if(args[0]==='scripts/run-framework.mjs')write('public/map.html','unexpected packaging mutation');}}),/differs/);checks++;
 check(sealed(),beforeMutationSeal,'Post-build mutation is rejected without resealing');
 writeSnapshot(root); // Explicit fixture setup for a hostile packaging-stage reseal.
 await assert.rejects(runPipeline({root,mode:'prepared',run:async args=>{if(args[0]==='scripts/run-framework.mjs'){write('public/map.html','mutation plus rewritten seal');writeSnapshot(root);}}}),/seal changed during packaging/);checks++;
 await assert.rejects(runPipeline({root,mode:'prepared',run:async args=>{if(args[0]==='scripts/run-framework.mjs')write(snapshotPath,sealed()+' ');}}),/seal changed during packaging/);checks++;
 check(chooseMode(undefined,{HAPPYMAP_USE_COMMITTED_EN:'1'},()=>{throw Error('Must not probe Python');}),'prepared','Committed mode avoids Python');
 check(chooseMode(undefined,{},()=>false),'prepared','Python-free host uses prepared packaging');
 check(chooseMode(undefined,{},()=>true),'prepare','Ordinary Python branch preserves generation');
 assert.throws(()=>chooseMode('prepare',{HAPPYMAP_USE_COMMITTED_EN:'1'},()=>true),/conflicts/);checks++;
 assert.throws(()=>chooseMode('prepare',{},()=>false),/requires Python/);checks++;
 const projectPackage=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
 check(projectPackage.scripts.build,'node scripts/build-pipeline.mjs --prepared','Default deployment always packages reviewed source');
 check(projectPackage.scripts['build:prepare'],'node scripts/build-pipeline.mjs --prepare','Broad generation remains an explicit opt-in');
 console.log(JSON.stringify({pass:true,checks,twoPreparedBuilds:true,tamperRejectedBeforeMutation:true,reviewedGuidesPreserved:true,sealAfterFinalGeneration:true,failedValidationDoesNotSeal:true,postBuildMutationRejected:true,realFrameworkBuild:false}));
}finally{fs.rmSync(root,{recursive:true,force:true});}
