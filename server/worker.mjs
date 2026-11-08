import {createSitesHandler} from './sites-handler.mjs';
const error=(status,message)=>Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
export function createWorker({assets}){
 return {async fetch(request,env={}){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/')){
   if(!env.WORKSPACE_SITE_ORIGIN)return error(503,'Shared storage is not configured. This browser still keeps its own records.');
   if(url.origin!==env.WORKSPACE_SITE_ORIGIN)return error(403,'Use the configured private workspace address.');
   // Sites dispatch owns sign-in and strips/injects identity headers. This
   // Worker must be deployed ONLY behind that boundary, at the pinned origin.
   // Do not expose it as an independently authenticated public workers.dev app.
   const handle=createSitesHandler({getUser:async()=>({id:request.headers.get('oai-authenticated-user-id')})});
   return handle(request,env);
  }
  if(!['GET','HEAD'].includes(request.method))return error(405,'Unsupported method.');
  const path=url.pathname==='/'?'/index.html':url.pathname;
  const asset=assets[path];if(!asset)return error(404,'Not found.');
  return new Response(request.method==='HEAD'?null:asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }};
}
