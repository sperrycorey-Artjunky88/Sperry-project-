// Build only: this script never provisions, uploads, migrates or deploys anything.
import {build} from 'esbuild';
import {readFile,readdir,mkdir,writeFile,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=join(root,'build/sites');
const assets={};
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8'};
for(const entry of await readdir(join(root,'dist'),{withFileTypes:true})){
 const extension=Object.keys(types).find(ext=>entry.name.endsWith(ext));
 if(entry.isFile()&&extension)assets['/'+entry.name]={body:await readFile(join(root,'dist',entry.name),'utf8'),type:types[extension]};
}
if(!assets['/index.html'])throw Error('Existing index.html is missing; build aborted.');
await mkdir(join(output,'dist/server'),{recursive:true});await mkdir(join(output,'.openai'),{recursive:true});await mkdir(join(output,'migrations'),{recursive:true});
await build({stdin:{contents:`import {createWorker} from ${JSON.stringify(resolve(root,'server/worker.mjs'))};export default createWorker({assets:${JSON.stringify(assets)}});`,resolveDir:root,sourcefile:'workspace-worker.mjs'},bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:join(output,'dist/server/index.js'),legalComments:'eof'});
await copyFile(join(root,'hosting/worker.json'),join(output,'.openai/hosting.json'));
await copyFile(join(root,'migrations/0001_shared_workspace.sql'),join(output,'migrations/0001_shared_workspace.sql'));
await writeFile(join(output,'BUILD_INFO.json'),JSON.stringify({staticFiles:Object.keys(assets),sharedEnabledByDefault:false},null,2)+'\n');
console.log('Worker built at build/sites/dist/server/index.js. Nothing deployed or provisioned.');
