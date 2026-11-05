// Offline-only recovery helper. Never writes to browser storage or modifies the input.
import {readFile,writeFile} from 'node:fs/promises';
import {readBackup,checksum} from '../dist/storage.mjs';
const [input,index,output]=process.argv.slice(2);
if(!input)throw Error('Usage: node tools/recover.mjs recovery.json [record-index new-output.json]');
const file=JSON.parse(await readFile(input,'utf8'));
const records=[...(file.legacyRaw!==null&&file.legacyRaw!==undefined?[{kind:'legacy recovery',raw:file.legacyRaw}]:[]),...(file.records||[])];
const valid=[];
for(const [i,r] of records.entries()){
 try{
  const state=await readBackup({format:'core-workspace-backup-v1',raw:r.raw,checksum:r.checksum||await checksum(r.raw)});
  valid[i]=state;console.log(`${i}: ${r.kind} revision ${r.revision??'original'} — ${state.tasks.length} tasks, ${state.lessons.length} lessons (valid)`);
 }catch{console.log(`${i}: ${r.kind} — unreadable; raw record retained in input`);}
}
if(index!==undefined){if(!output||!valid[Number(index)])throw Error('Choose a valid record index and a NEW output path.');await writeFile(output,JSON.stringify(valid[Number(index)],null,2),{flag:'wx'});console.log('Created verified import file. Import merges records; existing records remain.');}
