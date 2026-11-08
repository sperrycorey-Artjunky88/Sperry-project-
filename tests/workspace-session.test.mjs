import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspaceSession} from '../dist/workspace-session.mjs';
import {emptyState} from '../dist/core.mjs';
import {backup} from '../dist/storage.mjs';
const initial=()=>({...emptyState(),tasks:[{id:'a',created:'today',title:'Local original',goal:'Keep',constraints:'',status:'active',responses:[],agreement:'',disagreement:'',decision:'',outcome:''}]});
function setup(mode='local'){
 let local=initial(),remote=emptyState(),preference=mode,calls=0,writes=0,fail=false;
 const client={snapshot:null,async read(){calls++;if(fail)throw Error('Shared offline');this.snapshot={revision:0,state:structuredClone(remote)};return this.snapshot;},async save(next){calls++;if(fail)throw Error('Revision conflict');remote=structuredClone(next);return {state:remote};},async importBackup(raw,{confirmed}){calls++;assert.equal(confirmed,true);writes++;remote=JSON.parse(JSON.parse(raw).raw);return {state:remote,added:1,verified:true};}};
 const openLocal=async()=>({get state(){return structuredClone(local);},async save(next){local=structuredClone(next);return local;}});
 const session=createWorkspaceSession({client,openLocal,readLocal:async()=>structuredClone(local),preferences:{getItem:()=>preference,setItem:(k,v)=>preference=v}});
 return {session,get local(){return local;},calls:()=>calls,writes:()=>writes,fail:()=>fail=true,changeLocal:()=>local.tasks[0].title='Changed after export'};
}
test('default local start makes zero network requests',async()=>{const f=setup();await f.session.start();assert.equal(f.calls(),0);assert.equal(f.session.mode,'local');assert.deepEqual(f.session.state,f.local);});
test('checking and switching shared storage never uploads or changes local originals',async()=>{const f=setup();await f.session.start();await f.session.checkShared();assert.equal(f.session.mode,'local');await f.session.useShared();assert.equal(f.session.mode,'shared');assert.equal(f.writes(),0);assert.equal(f.local.tasks.length,1);await f.session.useLocal();assert.equal(f.session.state.tasks[0].title,'Local original');});
test('an explicitly selected shared workspace never falls back to local on startup failure',async()=>{const f=setup('shared');f.fail();await assert.rejects(()=>f.session.start(),/offline/);assert.equal(f.session.mode,'shared');assert.equal(f.local.tasks.length,1);});
test('upload requires confirmed current backup and preserves the original local state',async()=>{const f=setup();await f.session.start();await f.session.checkShared();const exported=JSON.stringify(await backup(f.local),null,2);await assert.rejects(()=>f.session.uploadLocal(exported,{confirmed:false}),/confirm/i);assert.equal(f.writes(),0);await f.session.uploadLocal(exported,{confirmed:true});assert.equal(f.session.mode,'shared');assert.equal(f.local.tasks.length,1);assert.equal(f.writes(),1);});
test('changing local data after backup blocks upload without touching cloud',async()=>{const f=setup();await f.session.start();await f.session.checkShared();const exported=JSON.stringify(await backup(f.local));f.changeLocal();await assert.rejects(()=>f.session.uploadLocal(exported,{confirmed:true}),/changed/i);assert.equal(f.writes(),0);});
test('failed shared save retains view, originals and chosen storage mode',async()=>{const f=setup();await f.session.start();await f.session.useShared();const before=f.session.state;f.fail();await assert.rejects(()=>f.session.save(initial()),/conflict/i);assert.deepEqual(f.session.state,before);assert.equal(f.session.mode,'shared');assert.equal(f.local.tasks.length,1);});
test('failed shared startup exposes no verified shared snapshot for backup',async()=>{const f=setup('shared');f.fail();await assert.rejects(()=>f.session.start());assert.equal(f.session.hasSharedSnapshot,false);});
