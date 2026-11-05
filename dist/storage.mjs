import {emptyState, validate} from './core.mjs';
export const LEGACY_KEY = 'core-ai-workspace-v1';
const DATABASE = 'core-ai-workspace';
export async function checksum(raw) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export async function backup(state) {
  const raw=JSON.stringify(validate(state));
  return {format:'core-workspace-backup-v1',raw,checksum:await checksum(raw)};
}
export async function readBackup(data) {
  if(data?.format!=='core-workspace-backup-v1') return validate(data);
  if(typeof data.raw!=='string'||await checksum(data.raw)!==data.checksum) throw Error('Backup checksum failed. Nothing was imported.');
  return validate(JSON.parse(data.raw));
}
async function checked(record) {
  if(!record || typeof record.raw!=='string' || await checksum(record.raw)!==record.checksum) throw Error('Stored backup verification failed. Saving is paused; export recovery data.');
  return validate(JSON.parse(record.raw));
}
function connect() {
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DATABASE,1);
    req.onupgradeneeded=()=>req.result.createObjectStore('records');
    req.onerror=()=>reject(req.error);
    req.onblocked=()=>reject(Error('Close other workspace tabs and reload to open storage.'));
    req.onsuccess=()=>{req.result.onversionchange=()=>req.result.close();resolve(req.result);};
  });
}
function transaction(db, mode, run) {
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('records',mode),store=tx.objectStore('records');let result, failure;
    tx.oncomplete=()=>resolve(result);
    tx.onabort=tx.onerror=()=>reject(failure||tx.error||Error('Storage transaction failed. Nothing was saved.'));
    try{run(store, value=>{result=value;}, error=>{failure=error;tx.abort();});}catch(e){failure=e;tx.abort();}
  });
}
export async function readCommittedState() {
  const db=await connect();
  try {
    const record=await transaction(db,'readonly',(s,done)=>{s.get('current').onsuccess=e=>done(e.target.result);});
    return await checked(record);
  }finally{db.close();}
}
export async function recoveryRecords() {
  const db=await connect();
  try{return await transaction(db,'readonly',(s,done)=>{s.getAll().onsuccess=e=>done(e.target.result);});}finally{db.close();}
}
export async function openWorkspace() {
  const db=await connect();
  try {
    const legacyRaw=localStorage.getItem(LEGACY_KEY);
    // Read and validate before starting any mutation. Never discard malformed legacy data.
    const legacy=legacyRaw===null?null:validate(JSON.parse(legacyRaw));
    const initial=await transaction(db,'readonly',(s,done)=>{s.get('current').onsuccess=e=>done(e.target.result);});
    if(initial) {
      await checked(initial);
      if(initial.legacyRaw!==legacyRaw) throw Error('Legacy browser data changed. Saving is paused to preserve both versions. Export recovery data before resolving this conflict.');
    }
    const initialState=initial?await checked(initial):(legacy||emptyState());
    const raw=JSON.stringify(initialState), digest=await checksum(raw);
    const legacyRecord=legacyRaw===null?null:{kind:'legacy',raw:legacyRaw,checksum:await checksum(legacyRaw)};
    const current=await transaction(db,'readwrite',(s,done,fail)=>{
      s.get('current').onsuccess=e=>{
        const existing=e.target.result;
        if(existing){done(existing);return;}
        const record={kind:'current',raw,checksum:digest,revision:0,legacyRaw};
        if(legacyRecord)s.put(legacyRecord,'legacy-original');
        s.put(record,'current');
        // Read back the exact raw legacy backup before allowing the transaction to commit.
        s.get(legacyRecord?'legacy-original':'current').onsuccess=e=>{
          const expected=legacyRecord||record;
          if(JSON.stringify(e.target.result)!==JSON.stringify(expected))fail(Error('Migration backup read-back failed. Original browser data is unchanged.'));
          else done(record);
        };
      };
    });
    let state=await checked(current),revision=current.revision,storedRaw=current.raw,storedChecksum=current.checksum;
    if(current.legacyRaw!==legacyRaw)throw Error('Legacy data changed during migration. Reload before saving.');
    return {
      get state(){return structuredClone(state);},get revision(){return revision;},
      recovery:recoveryRecords,
      async save(next) {
        const raw=JSON.stringify(validate(next)),digest=await checksum(raw),expected=revision;
        if(localStorage.getItem(LEGACY_KEY)!==legacyRaw)throw Error('Legacy browser data changed. Reload before saving.');
        const committed=await transaction(db,'readwrite',(s,done,fail)=>{
          s.get('current').onsuccess=e=>{
            const previous=e.target.result;
            if(!previous||previous.revision!==expected||previous.raw!==storedRaw||previous.checksum!==storedChecksum){fail(Error('Another tab saved changes. Keep unsaved text, then reload.'));return;}
            // Preserve every previous revision; no pruning or deletion is performed.
            s.put({...previous,kind:'snapshot'},`snapshot:${expected}`);
            const record={kind:'current',raw,checksum:digest,revision:expected+1,legacyRaw};s.put(record,'current');
            s.get('current').onsuccess=e=>{
              if(e.target.result.raw!==raw||e.target.result.checksum!==digest)fail(Error('Save verification failed.'));
              else done(record);
            };
          };
        });
        revision=committed.revision;storedRaw=raw;storedChecksum=digest;state=JSON.parse(raw);return structuredClone(state);
      }
    };
  } catch(e) {db.close();throw e;}
}
