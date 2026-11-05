import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
export function sqliteD1(filename=':memory:'){
 const sql=new DatabaseSync(filename);
 sql.exec(readFileSync(new URL('../../server/schema.sql',import.meta.url),'utf8'));
 const db={prepare(query){return {query,values:[],bind(...values){this.values=values;return this;},async first(){return sql.prepare(query).get(...this.values)??null;},async all(){return {results:sql.prepare(query).all(...this.values)};},async run(){const r=sql.prepare(query).run(...this.values);return {meta:{changes:Number(r.changes)}};}};},async batch(statements){sql.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 return {db,sql,close:()=>sql.close()};
}
