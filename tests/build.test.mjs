import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
test('built Worker preserves every frontend asset and defaults to disabled shared storage',async()=>{
 execFileSync(process.execPath,['tools/build-sites.mjs'],{stdio:'pipe'});
 const {default:worker}=await import(pathToFileURL(resolve('build/sites/dist/server/index.js')));
 const info=JSON.parse(readFileSync('build/sites/BUILD_INFO.json','utf8'));
 for(const path of info.staticFiles){const r=await worker.fetch(new Request('https://workspace.test'+path));assert.equal(r.status,200);assert.equal(await r.text(),readFileSync('dist'+path,'utf8'));}
 assert.equal((await worker.fetch(new Request('https://workspace.test/api/workspace'))).status,503);
 const config=JSON.parse(readFileSync('build/sites/.openai/hosting.json','utf8'));assert.equal(config.project_id,'appgprj_6acad225d5ec81918aa041c500fdc3e4');assert.ok(!('static' in config));
});
test('additive migration preserves a populated database when reapplied',()=>{const db=new DatabaseSync(':memory:');try{const migration=readFileSync('migrations/0001_shared_workspace.sql','utf8');db.exec(migration);db.prepare('INSERT INTO workspace_revisions VALUES (?,?,?,?,?,?)').run('owner',1,'write','original','digest','today');db.exec(migration);assert.equal(db.prepare('SELECT raw FROM workspace_revisions').get().raw,'original');}finally{db.close();}});
