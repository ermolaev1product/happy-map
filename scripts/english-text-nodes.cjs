const fs=require('fs'),path=require('path'),acorn=require('acorn');
const root=path.resolve('public/en');let nodes=[];
function js(s,file,offset=0){let tree;try{tree=acorn.parse(s,{ecmaVersion:'latest',sourceType:'module'})}catch(e){throw Error(file+': '+e.message)}
function walk(n){if(!n||typeof n!=='object')return;
if((n.type==='Literal'&&typeof n.value==='string')||n.type==='TemplateElement'){
 const value=n.type==='Literal'?n.value:n.value.raw;
 if(/[А-Яа-яЁё]/.test(value))nodes.push({file,start:offset+n.start,end:offset+n.end,type:n.type,value});
}for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v)}}walk(tree)}
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())scan(f);else if(e.name.endsWith('.js')&&!f.includes('/assets/'))js(fs.readFileSync(f,'utf8'),f);else if(e.name.endsWith('.html')){const s=fs.readFileSync(f,'utf8');for(const m of s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){if(m[1].trim())js(m[1],f,m.index+m[0].indexOf('>')+1)}}}}
scan(root);fs.writeFileSync(require('path').join(require('os').tmpdir(),'happymap-js-text.json'),JSON.stringify(nodes));console.log('JS Russian text nodes:',nodes.length);
