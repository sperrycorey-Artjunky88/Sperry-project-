import {emptyState,validate} from '../dist/core.mjs';
import {checksum} from '../dist/storage.mjs';
export class ConflictError extends Error {constructor(){super('Revision conflict. Reload shared state before saving.');}}
export class RecordError extends Error {}
const bytes=text=>new TextEncoder().encode(text).byteLength;
function keepUnknown(before,after,known){for(const key of Object.keys(before))if(!known.includes(key)&&JSON.stringify(before[key])!==JSON.stringify(after[key]))throw new RecordError('An existing extension field would change. Nothing was saved.');}
export function preserveRecords(before,after){
 keepUnknown(before,after,['version','tasks','lessons']);
 for(const t of before.tasks){
  const next=after.tasks.find(x=>x.id===t.id);
  if(!next||next.created!==t.created)throw new RecordError('Existing tasks cannot be removed or replaced.');
  keepUnknown(t,next,['id','created','title','goal','constraints','status','responses','agreement','disagreement','decision','outcome']);
  if(next.responses.length<t.responses.length||t.responses.some((r,i)=>JSON.stringify(r)!==JSON.stringify(next.responses[i])))throw new RecordError('Saved responses are append-only.');
 }
 for(const l of before.lessons){const next=after.lessons.find(x=>x.id===l.id);if(!next||next.created!==l.created)throw new RecordError('Existing lessons cannot be removed or replaced.');keepUnknown(l,next,['id','created','taskId','rule','evidence','test','result','status']);}
}
export function createSharedStore(db,{maxRecordBytes=1024*1024}={}){
 if(!db?.prepare||!db?.batch)throw Error('A database binding is required.');
 async function read(ownerId){
  if(typeof ownerId!=='string'||!ownerId)throw Error('Missing server owner identity.');
  const record=await db.prepare('SELECT revision,raw,checksum FROM workspace_revisions WHERE owner_id=? ORDER BY revision DESC LIMIT 1').bind(ownerId).first();
  if(!record)return {revision:0,state:emptyState()};
  try{if(await checksum(record.raw)!==record.checksum)throw Error();return {revision:record.revision,state:validate(JSON.parse(record.raw))};}catch{throw Error('Shared state verification failed. Original revisions are retained.');}
 }
 return {read,async commit(ownerId,next,expected,{rawBackup}={}){
  if(!Number.isSafeInteger(expected)||expected<0)throw new RecordError('Invalid revision.');
  try{validate(next);}catch{throw new RecordError('Unsupported workspace data.');}
  const raw=JSON.stringify(next);
  if(bytes(raw)>maxRecordBytes||(rawBackup!==undefined&&(typeof rawBackup!=='string'||bytes(rawBackup)>maxRecordBytes)))throw new RecordError('Shared record exceeds the supported size. Keep the local backup.');
  const current=await read(ownerId);if(current.revision!==expected)throw new ConflictError();preserveRecords(current.state,next);
  const digest=await checksum(raw),writeId=crypto.randomUUID(),revision=expected+1;
  const statements=[db.prepare('INSERT INTO workspace_revisions (owner_id,revision,write_id,raw,checksum,created) SELECT ?,?,?,?,?,? WHERE COALESCE((SELECT MAX(revision) FROM workspace_revisions WHERE owner_id=?),0)=?').bind(ownerId,revision,writeId,raw,digest,new Date().toISOString(),ownerId,expected)];
  if(rawBackup!==undefined)statements.push(db.prepare('INSERT INTO workspace_imports (owner_id,revision,raw_backup,checksum) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM workspace_revisions WHERE owner_id=? AND revision=? AND write_id=?)').bind(ownerId,revision,rawBackup,await checksum(rawBackup),ownerId,revision,writeId));
  const results=await db.batch(statements);
  if(results[0].meta.changes!==1)throw new ConflictError();
  // Verify this exact revision even if a later writer has already advanced the head.
  const verified=await db.prepare('SELECT raw,checksum FROM workspace_revisions WHERE owner_id=? AND revision=?').bind(ownerId,revision).first();
  if(!verified||verified.raw!==raw||verified.checksum!==digest)throw Error('Shared write could not be verified. Do not retry blindly; read shared state first.');
  return {revision,state:JSON.parse(raw),checksum:digest};
 }};
}
