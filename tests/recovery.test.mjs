import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {backup} from '../dist/storage.mjs';
import {emptyState} from '../dist/core.mjs';
test('offline recovery extracts verified state and refuses to overwrite a file',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'core-recovery-'));
 try{
 const input=join(dir,'recovery.json'),output=join(dir,'restored.json');
 const record=await backup(emptyState());record.kind='snapshot';
 await writeFile(input,JSON.stringify({records:[record,{kind:'current',raw:'BROKEN',checksum:'bad'}]}));
 const run=(...args)=>execFileSync(process.execPath,['tools/recover.mjs',input,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
 assert.match(run(),/0: snapshot.*valid/);assert.match(run(),/1: current.*unreadable/);
 run('0',output);assert.deepEqual(JSON.parse(await readFile(output,'utf8')),emptyState());
 assert.throws(()=>run('0',output));assert.throws(()=>run('1',join(dir,'bad.json')));
 }finally{await rm(dir,{recursive:true,force:true});}
});
