import {mkdir,cp,rm,readdir} from 'node:fs/promises';
const root = new URL('../internal/web/static/',import.meta.url);
await mkdir(root,{recursive:true});
for(const name of await readdir(root))if(name!=='README.txt')await rm(new URL(name,root),{recursive:true,force:true});
await cp(new URL('../dist/index.html',import.meta.url),new URL('index.html',root));
await cp(new URL('../dist/assets/',import.meta.url),new URL('assets/',root),{recursive:true});
console.log('Copied compiled browser assets for go:embed');
