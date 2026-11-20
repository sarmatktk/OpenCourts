import {pagesBuildPlan} from '../scripts/build-pages.mjs';
import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
it('production rollout examples keep production resources separate and push off until accepted',()=>{
 const migrations=read('release/wrangler.production-migrations.json'),worker=read('release/wrangler.push-production.example.json'),processor=read('release/wrangler.media-processor-production.example.json');
 for(const config of [migrations,worker]){expect(config.d1_databases).toHaveLength(1);expect(config.d1_databases[0].database_id).toBe('56c414b7-aca5-429b-acfa-b9e8e87b052b');expect(config.d1_databases[0].database_name).toBe('opencourts-courts');}
 expect(worker.vars.PUSH_ENABLED).toBe('false');expect(worker.vars.PUSH_ENVIRONMENT).toBe('production');expect(worker.vars.AUTH_ORIGIN).toBe('https://opencourts.us');expect(worker.r2_buckets[0].bucket_name).toBe('opencourts-media');
 expect(worker.workers_dev).toBe(false);expect(processor.workers_dev).toBe(false);expect(processor.preview_urls).toBe(false);
});
it('reviewed migration hashes still match the exact local rollout SQL',()=>{
 const inventory=read('release/migration-inventory.json');expect(inventory.migrations).toHaveLength(32);
 for(const item of inventory.migrations)expect(createHash('sha256').update(readFileSync('functions/db/migrations/'+item.file,'utf8').replace(/\r\n/g,'\n')).digest('hex')).toBe(item.normalizedSha256);
});

it('Pages CI builds community production metadata only on main and keeps Preview safeguards on other branches',()=>{
 expect(pagesBuildPlan('main')).toEqual({script:'build',production:true,output:'dist'});
 for(const branch of ['feature/play-together','another-preview',undefined])expect(pagesBuildPlan(branch)).toEqual({script:'build:dev',production:false,output:'dist'});
});
