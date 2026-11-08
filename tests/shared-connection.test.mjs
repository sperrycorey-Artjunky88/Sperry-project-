import test from 'node:test';
import assert from 'node:assert/strict';
import {createSharedClient} from '../dist/shared-client.mjs';
import {createSitesHandler} from '../server/sites-handler.mjs';
import {sqliteD1} from './helpers/sqlite-d1.mjs';
import {emptyState} from '../dist/core.mjs';
const origin='https://workspace.test',owner='verified-owner';
function fixture(t){const f=sqliteD1();t.after(f.close);const env={WORKSPACE_SHARED_ENABLED:'true',WORKSPACE_OWNER_ID:owner,DB:f.db};let identity=owner,calls=0;const handler=createSitesHandler({getUser:async()=>identity?{id:identity}:null});const fetch=async(url,options={})=>{calls++;return handler(new Request(url,{...options,headers:{...options.headers,...(options.method&&options.method!=='GET'?{Origin:origin}:{})}}),env);};return {...f,env,handler,fetch,setIdentity:id=>identity=id,calls:()=>calls};}
const state=()=>({...emptyState(),tasks:[{id:'t1',created:'today',title:'Cross-device test',goal:'Keep it',constraints:'No paid services',status:'active',responses:[],agreement:'',disagreement:'',decision:'',outcome:''}]});
test('two clients share a verified import without touching original browser data',async t=>{const f=fixture(t),a=createSharedClient({origin,fetch:f.fetch}),b=createSharedClient({origin,fetch:f.fetch});assert.equal(f.calls(),0);await a.read();const raw=JSON.stringify(state(),null,2);await a.importBackup(raw,{confirmed:true});assert.equal((await b.read()).state.tasks[0].title,'Cross-device test');assert.equal(f.sql.prepare('SELECT raw_backup FROM workspace_imports').get().raw_backup,raw);});
test('upload requires explicit confirmation and reading a shared revision first',async t=>{const f=fixture(t),c=createSharedClient({origin,fetch:f.fetch});await assert.rejects(()=>c.importBackup(JSON.stringify(state()),{confirmed:true}),/read/i);assert.equal(f.calls(),0);await c.read();const calls=f.calls();await assert.rejects(()=>c.importBackup(JSON.stringify(state())),/confirm/i);assert.equal(f.calls(),calls);});
test('stale client keeps its snapshot and rejected change is not retried',async t=>{const f=fixture(t),a=createSharedClient({origin,fetch:f.fetch}),b=createSharedClient({origin,fetch:f.fetch});await a.read();await b.read();await a.save(state());await assert.rejects(()=>b.save(state()),e=>e.status===409);assert.equal(b.snapshot.revision,0);const calls=f.calls();await assert.rejects(()=>b.save(state()),/read/i);assert.equal(f.calls(),calls);assert.equal((await b.read()).revision,1);});
test('server defaults disabled and never creates database or calls identity while disabled',async()=>{let accesses=0;const handler=createSitesHandler({getUser:async()=>{accesses++;throw Error();}});const r=await handler(new Request(origin+'/api/workspace'),{});assert.equal(r.status,503);assert.equal(accesses,0);});
test('missing owner, wrong owner, service-only access and forged client header are rejected',async t=>{const f=fixture(t);assert.equal((await f.handler(new Request(origin+'/api/workspace'),{...f.env,WORKSPACE_OWNER_ID:undefined})).status,503);for(const identity of [null,'other']){f.setIdentity(identity);const r=await f.handler(new Request(origin+'/api/workspace',{headers:{'oai-authenticated-user-id':owner,'OAI-Sites-Authorization':'Bearer synthetic'}}),f.env);assert.equal(r.status,401);}assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM workspace_revisions').get().n,0);});
test('client rejects redirected and corrupt responses without replacing a valid snapshot',async t=>{const f=fixture(t);let mode='valid';const fetch=async(...args)=>{if(mode==='redirect')return new Response(null,{status:302,headers:{Location:'https://evil.test'}});if(mode==='corrupt')return Response.json({revision:1,state:emptyState(),checksum:'bad'},{headers:{ETag:'"1"'}});return f.fetch(...args);};const c=createSharedClient({origin,fetch});await c.read();for(const m of ['redirect','corrupt']){mode=m;await assert.rejects(()=>c.read());assert.equal(c.snapshot.revision,0);}});
test('client sets same-origin credentials and redirect error; sends no owner or provider keys',async t=>{const f=fixture(t);let captured;const c=createSharedClient({origin,fetch:(url,options)=>{captured={url,options};return f.fetch(url,options);}});await c.read();assert.equal(captured.options.credentials,'same-origin');assert.equal(captured.options.redirect,'error');assert.equal(captured.url,origin+'/api/workspace');assert.ok(!JSON.stringify(captured).includes(owner));});
test('client serializes operations and protects its snapshot from external mutation',async t=>{const f=fixture(t);let release;const c=createSharedClient({origin,fetch:async(...args)=>{await new Promise(r=>release=r);return f.fetch(...args);}});const pending=c.read();await assert.rejects(()=>c.read(),/progress/i);release();await pending;const snapshot=c.snapshot;snapshot.state.tasks.push({});assert.equal(c.snapshot.state.tasks.length,0);});
test('malformed revision and invalid schema fail without claiming success',async()=>{for(const body of [{revision:-1,state:emptyState()},{revision:1,state:{}}]){const c=createSharedClient({origin,fetch:async()=>Response.json(body,{headers:{ETag:'"1"'}})});await assert.rejects(()=>c.read());assert.equal(c.snapshot,null);}});
test('a committed save with a lost response requires readback and makes no automatic retry',async t=>{const f=fixture(t);let lose=true;const fetch=async(url,options)=>{const response=await f.fetch(url,options);if(options.method==='PUT'&&lose){lose=false;throw Error('Synthetic network loss after commit');}return response;};const c=createSharedClient({origin,fetch});await c.read();await assert.rejects(()=>c.save(state()),/outcome may be unknown/i);assert.equal(c.snapshot.revision,0);const calls=f.calls();await assert.rejects(()=>c.save(state()),/read/i);assert.equal(f.calls(),calls);assert.equal((await c.read()).revision,1);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM workspace_revisions').get().n,1);});
test('an older server revision cannot replace a newer verified snapshot',async t=>{
 const f=fixture(t);let stale=false;
 const fetch=async(url,options)=>{
  if(stale){const {checksum}=await import('../dist/storage.mjs');return Response.json({revision:0,state:emptyState(),checksum:await checksum(JSON.stringify(emptyState()))},{headers:{ETag:'"0"'}});}
  return f.fetch(url,options);
 };
 const c=createSharedClient({origin,fetch});await c.read();await c.save(state());
 const verified=c.snapshot;stale=true;
 await assert.rejects(()=>c.read(),/verification/i);
 assert.deepEqual(c.snapshot,verified);
 const calls=f.calls();await assert.rejects(()=>c.save(state()),/read/i);
 assert.equal(f.calls(),calls);assert.deepEqual(c.snapshot,verified);
 stale=false;assert.deepEqual((await c.read()).state,verified.state);
});
test('constructor rejects a path, credentials and non-local insecure server origin',()=>{for(const candidate of [origin+'/api','https://name:synthetic@workspace.test','http://workspace.test'])assert.throws(()=>createSharedClient({origin:candidate,fetch:async()=>{throw Error('must not fetch');}}));});
test('bad ETag, missing checksum, and oversized responses retain the original verified snapshot',async t=>{const f=fixture(t);let mode='valid';const fetch=async(url,options)=>{if(mode==='valid')return f.fetch(url,options);if(mode==='oversize')return new Response('x'.repeat(2000));const {checksum}=await import('../dist/storage.mjs');return Response.json({revision:0,state:emptyState(),...(mode==='missing'?{}:{checksum:await checksum(JSON.stringify(emptyState()))})},{headers:{ETag:mode==='etag'?'"5"':'"0"'}});};const c=createSharedClient({origin,fetch,maxReplyBytes:1000});await c.read();for(const m of ['etag','missing','oversize']){mode=m;await assert.rejects(()=>c.read());assert.equal(c.snapshot.revision,0);}});

test('changed content under the same revision cannot replace a verified snapshot',async t=>{
 const f=fixture(t);let changed=false;
 const fetch=async(url,options)=>{
  if(!changed)return f.fetch(url,options);
  const {checksum}=await import('../dist/storage.mjs');const altered=state();altered.tasks[0].title='Uncommitted change';
  return Response.json({revision:1,state:altered,checksum:await checksum(JSON.stringify(altered))},{headers:{ETag:'"1"'}});
 };
 const c=createSharedClient({origin,fetch});await c.read();await c.save(state());
 const verified=c.snapshot;changed=true;
 await assert.rejects(()=>c.read(),/verification/i);assert.deepEqual(c.snapshot,verified);
 const calls=f.calls();await assert.rejects(()=>c.save(state()),/read/i);assert.equal(f.calls(),calls);
});
test('unchanged revisions and newer verified revisions remain readable',async t=>{
 const f=fixture(t),a=createSharedClient({origin,fetch:f.fetch}),b=createSharedClient({origin,fetch:f.fetch});
 await a.read();assert.equal((await a.read()).revision,0);
 await b.read();await b.save(state());assert.equal((await a.read()).revision,1);
 const verified=a.snapshot;await a.read();assert.deepEqual(a.snapshot,verified);
 await b.save(state());assert.equal((await a.read()).revision,2);
 assert.deepEqual(a.snapshot.state,state());
});
test('simultaneous clients cannot both commit the same revision',async t=>{const f=fixture(t),a=createSharedClient({origin,fetch:f.fetch}),b=createSharedClient({origin,fetch:f.fetch});await a.read();await b.read();const outcomes=await Promise.allSettled([a.save(state()),b.save(state())]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(outcomes.find(r=>r.status==='rejected').reason.status,409);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM workspace_revisions').get().n,1);});
