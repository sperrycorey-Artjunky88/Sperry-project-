// Opt-in preparation only. The existing app does not import or activate this module.
import {validate} from './core.mjs';
import {checksum,readBackup} from './storage.mjs';
export class SharedStorageError extends Error {
 constructor(message,status=0){super(message);this.name='SharedStorageError';this.status=status;}
}
const size=raw=>new TextEncoder().encode(raw).byteLength;
async function bodyJson(response,maxBytes){
 const reader=response.body?.getReader();if(!reader)throw new SharedStorageError('Shared storage returned no data.');
 const chunks=[];let length=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>maxBytes){await reader.cancel();throw new SharedStorageError('Shared reply is too large. Keep local data.');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new SharedStorageError('Shared reply is unreadable. Keep local data.');}
}
export function createSharedClient({origin=globalThis.location?.origin,fetch:fetchRequest=globalThis.fetch,maxReplyBytes=2*1024*1024}={}){
 const url=new URL(origin);
 if(url.origin!==origin||url.username||url.password||!['https:','http:'].includes(url.protocol))throw Error('An exact HTTP(S) site origin is required.');
 if(url.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('Shared storage requires HTTPS.');
 if(globalThis.location?.origin&&origin!==globalThis.location.origin)throw Error('Shared storage must use this site origin.');
 if(typeof fetchRequest!=='function')throw Error('Fetch is required.');
 let current=null,mustRead=true,busy=false;
 async function exclusive(operation){
  if(busy)throw new SharedStorageError('A shared operation is already in progress.');
  busy=true;try{return await operation();}finally{busy=false;}
 }
 function requireRead(){if(mustRead||!current)throw new SharedStorageError('Read and verify shared state before uploading or saving.');}
 async function send(path,method,body){
  const expected=current?.revision;
  mustRead=true;
  let response;
  try{response=await fetchRequest(origin+path,{method,credentials:'same-origin',redirect:'error',cache:'no-store',headers:{Accept:'application/json',...(body===undefined?{}:{'Content-Type':'application/json','If-Match':`"${expected}"`})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
  catch{throw new SharedStorageError('Shared request failed; its outcome may be unknown. Read shared state before retrying.');}
  if(response.redirected||response.status>=300&&response.status<400)throw new SharedStorageError('Shared storage redirected the request. Keep local data and sign in directly.');
  if(!response.ok){
   const messages={401:'Sign in as the workspace owner, then read shared state.',403:'Shared storage rejected this request origin.',409:'Another session saved first. Keep your edits and read shared state.',428:'Read shared state before saving.',503:'Shared storage is unavailable or could not verify the save. Read before retrying.'};
   throw new SharedStorageError(messages[response.status]||'Shared storage rejected this change. Keep your edits and read shared state.',response.status);
  }
  const data=await bodyJson(response,maxReplyBytes);
  try{
   if(!Number.isSafeInteger(data?.revision)||data.revision<0||response.headers.get('ETag')!==`"${data.revision}"`)throw Error();
   if(current && (
    data.revision < current.revision ||
    (data.revision === current.revision && data.checksum !== current.checksum)
   )) throw Error();
   validate(data.state);
   if(typeof data.checksum!=='string'||await checksum(JSON.stringify(data.state))!==data.checksum)throw Error();
   if(method!=='GET'&&(data.revision!==expected+1||path==='/api/import'&&(data.verified!==true||!Number.isSafeInteger(data.added)||data.added<0)))throw Error();
  }catch{throw new SharedStorageError('Shared reply failed verification. Keep local data and read shared state before retrying.');}
  current={revision:data.revision,state:structuredClone(data.state),checksum:data.checksum};mustRead=false;
  return structuredClone(data);
 }
 return {
  get snapshot(){return current?structuredClone(current):null;},
  read(){return exclusive(()=>send('/api/workspace','GET'));},
  save(next){return exclusive(async()=>{requireRead();const state=structuredClone(validate(next));return send('/api/workspace','PUT',{state});});},
  importBackup(raw,{confirmed=false}={}){return exclusive(async()=>{
   requireRead();if(confirmed!==true)throw new SharedStorageError('Confirm this upload explicitly before importing.');
   if(typeof raw!=='string'||size(raw)>1024*1024)throw new SharedStorageError('Shared backup is too large or invalid. Keep the local file.');
   await readBackup(JSON.parse(raw));
   return send('/api/import','POST',{confirmed:true,backupRaw:raw});
  });}
 };
}
