// Unwired preparation. Identity must come from a trusted Sites server wrapper.
// Never pass a body/query/client header as authenticatedUserId or ownerId.
import {mergeBackup} from '../dist/core.mjs';
import {readBackup} from '../dist/storage.mjs';
import {ConflictError,RecordError} from './shared-store.mjs';
class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
function response(status,data,revision){return Response.json(data,{status,headers:{'Cache-Control':'no-store',...(revision===undefined?{}:{ETag:`"${revision}"`})}});}
async function readJson(request,maxBytes){
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new HttpError(415,'Use application/json.');
 const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'Missing request body.');
 const chunks=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new HttpError(413,'Import is too large. Keep the original backup.');}chunks.push(value);}}finally{reader.releaseLock();}
 const raw=new Uint8Array(size);let offset=0;for(const c of chunks){raw.set(c,offset);offset+=c.byteLength;}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch{throw new HttpError(400,'Request is not valid JSON.');}
}
export function createWorkspaceApi({store,ownerId,maxBytes=2*1024*1024}){
 if(typeof ownerId!=='string'||!ownerId)throw Error('Configure the owner identity on the server before enabling shared storage.');
 return async function handle(request,authenticatedUserId){
  if(!authenticatedUserId||authenticatedUserId!==ownerId)return response(401,{error:'Owner sign-in required.'});
  try{
   const url=new URL(request.url),path=url.pathname;
   if(!['/api/workspace','/api/import'].includes(path))return response(404,{error:'Unknown endpoint.'});
   if(request.method==='GET'&&path==='/api/workspace'){const current=await store.read(ownerId);return response(200,current,current.revision);}
   if(!((request.method==='PUT'&&path==='/api/workspace')||(request.method==='POST'&&path==='/api/import')))return response(405,{error:'Unsupported method.'});
   if(request.headers.get('Origin')!==url.origin)return response(403,{error:'Use a same-origin request.'});
   const match=/^"(0|[1-9]\d*)"$/.exec(request.headers.get('If-Match')||'');
   if(!match||!Number.isSafeInteger(Number(match[1])))return response(428,{error:'A current If-Match revision is required.'});
   const expected=Number(match[1]),body=await readJson(request,maxBytes);
   if(!body||typeof body!=='object'||Array.isArray(body))throw new HttpError(400,'A JSON object is required.');
   let saved,added;
   if(path==='/api/import'){
    if(body.confirmed!==true||typeof body.backupRaw!=='string')throw new HttpError(400,'Explicit import confirmation and a backup file are required.');
    let incoming;try{incoming=await readBackup(JSON.parse(body.backupRaw));}catch{throw new HttpError(400,'Backup verification failed. Nothing was imported.');}
    const current=await store.read(ownerId);if(current.revision!==expected)throw new ConflictError();
    const merged=mergeBackup(current.state,incoming);added=merged.added;
    saved=await store.commit(ownerId,merged.state,expected,{rawBackup:body.backupRaw});
   }else saved=await store.commit(ownerId,body.state,expected);
   return response(200,{...saved,...(added===undefined?{}:{added,verified:true})},saved.revision);
  }catch(e){
   if(e instanceof ConflictError)return response(409,{error:e.message});
   if(e instanceof RecordError)return response(400,{error:e.message});
   if(e instanceof HttpError)return response(e.status,{error:e.message});
   return response(503,{error:'Shared storage is unavailable or could not be verified. Keep your local data and read shared state before retrying.'});
  }
 };
}
