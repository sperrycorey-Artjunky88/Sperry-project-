import test from 'node:test';
import assert from 'node:assert/strict';
import {backup,readBackup} from '../dist/storage.mjs';
import {emptyState} from '../dist/core.mjs';
test('verified backups round-trip and legacy backups remain compatible',async()=>{const s=emptyState();s.extra='preserved';assert.deepEqual(await readBackup(await backup(s)),s);assert.deepEqual(await readBackup(s),s);});
test('changed or truncated backups fail closed',async()=>{const b=await backup(emptyState());b.raw+=' ';await assert.rejects(()=>readBackup(b),/checksum/);await assert.rejects(()=>readBackup({format:b.format,raw:null}),/checksum/);});
