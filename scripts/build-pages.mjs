import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export function pagesBuildPlan(branch){
 if(branch==='main')return {script:'build',production:true,output:'dist'};
 return {script:'build:dev',production:false,output:'dist'};
}
// The Pages dashboard keeps one output directory for both production and Preview.
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const plan=pagesBuildPlan(process.env.CF_PAGES_BRANCH);
 if(!process.env.npm_execpath)throw new Error('Run this through npm run build:pages.');
 const result=spawnSync(process.execPath,[process.env.npm_execpath,'run',plan.script],{stdio:'inherit',env:{...process.env,...(plan.production?{VITE_PLAY_TOGETHER:'true'}:{})}});
 if(result.status!==0)process.exit(result.status??1);
 if(plan.production){const prepared=spawnSync(process.execPath,['scripts/prepare-production-pages.mjs','dist'],{stdio:'inherit'});process.exit(prepared.status??1);}
}
