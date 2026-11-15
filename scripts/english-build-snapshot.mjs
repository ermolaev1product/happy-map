// Final prepared-source seal. Never regenerate or silently accept a mismatch.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const snapshotPath='data/i18n/english-build-sha256.json';
const trees=['public','scripts','data/i18n','data/seo'];
const inputs=['package.json','package-lock.json','next.config.ts','vite.config.ts','postcss.config.mjs','tsconfig.json','lib/locale-policy.mjs','lib/locale-routing.mjs','lib/compressed-place-assets.mjs','data/coverage-20261016/legacy-place-ids.json'];
const ignored=name=>name==='__pycache__'||name.endsWith('.pyc');

export function snapshot(root=process.cwd()){
 const files=new Set();
 function scan(relative){
  const absolute=path.join(root,relative),stat=fs.lstatSync(absolute);
  if(stat.isSymbolicLink())throw Error('Snapshot refuses symlink: '+relative);
  if(stat.isDirectory()){for(const name of fs.readdirSync(absolute))if(!(relative==='scripts'||relative.startsWith('scripts/'))||!ignored(name))scan(path.posix.join(relative,name));}
  else if(stat.isFile()&&relative!==snapshotPath&&!relative.startsWith(snapshotPath+'.tmp-'))files.add(relative);
 }
 for(const relative of trees)scan(relative);
 for(const relative of inputs)if(fs.existsSync(path.join(root,relative)))scan(relative);
 return Object.fromEntries([...files].sort().map(relative=>[relative,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,relative))).digest('hex')]));
}

export function verifySnapshot(root=process.cwd()){
 const file=path.join(root,snapshotPath);
 if(!fs.existsSync(file))throw Error('Final prepared-source snapshot is missing. Prepare and validate the source before sealing it.');
 const sealed=fs.readFileSync(file,'utf8'),expected=JSON.parse(sealed),actual=snapshot(root);
 const changed=[...new Set([...Object.keys(expected),...Object.keys(actual)])].filter(key=>expected[key]!==actual[key]);
 if(changed.length)throw Error('Prepared source differs from its final seal ('+changed.length+' files): '+changed.slice(0,12).join(', ')+'. Revalidate the intended changes and seal explicitly; packaging will not reseal them.');
 return {files:Object.keys(actual).length,sealSha256:crypto.createHash('sha256').update(sealed).digest('hex')};
}

// Call only after the preparation pipeline's semantic checks have passed.
export function writeSnapshot(root=process.cwd()){
 const file=path.join(root,snapshotPath),temporary=file+'.tmp-'+process.pid;
 const data=JSON.stringify(snapshot(root),null,2)+'\n';
 try{fs.writeFileSync(temporary,data,{flag:'wx'});fs.renameSync(temporary,file);}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
 return verifySnapshot(root);
}
