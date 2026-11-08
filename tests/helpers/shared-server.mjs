// Test-only loopback server. Synthetic identity is injected here, NEVER in Worker.
import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {sqliteD1} from './sqlite-d1.mjs';
const db=sqliteD1(process.argv[2]||':memory:');
const worker=(await import(pathToFileURL(resolve('build/sites/dist/server/index.js')))).default;
let offline=false,failNext=false;
const binding={prepare:(...args)=>db.db.prepare(...args),async batch(statements){if(failNext){failNext=false;throw Error('Synthetic database write failure');}return db.db.batch(statements);}};
const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/__test/offline'){offline=req.headers['x-test-value']==='true';res.end('ok');return;}
  if(req.url==='/__test/fail-next'){failNext=true;res.end('ok');return;}
  const origin=`http://127.0.0.1:${server.address().port}`;
  const headers=new Headers();for(const [k,v] of Object.entries(req.headers)){if(!k.toLowerCase().startsWith('oai-')&&v!==undefined)headers.set(k,Array.isArray(v)?v.join(','):v);}
  if((req.headers.cookie||'').split(';').map(x=>x.trim()).includes('core_test_user=owner'))headers.set('oai-authenticated-user-id','synthetic-owner');
  const body=[];for await(const c of req)body.push(c);
  const request=new Request(origin+req.url,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(body)})});
  const env={WORKSPACE_SHARED_ENABLED:offline?'false':'true',WORKSPACE_OWNER_ID:'synthetic-owner',WORKSPACE_SITE_ORIGIN:origin,DB:binding};
  const result=await worker.fetch(request,env);
  res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
 }catch{res.writeHead(500);res.end('Synthetic test server error');}
});
server.listen(Number(process.argv[3]||0),'127.0.0.1',()=>console.log(JSON.stringify({origin:`http://127.0.0.1:${server.address().port}`})));
process.on('SIGTERM',()=>server.close(()=>{db.close();process.exit(0);}));
