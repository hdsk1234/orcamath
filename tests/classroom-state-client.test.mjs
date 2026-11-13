import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomStateLoader,ClassroomStateError} from '../app/lib/classroom-state-client.ts';
const data=revision=>({revision,viewer:{userId:'user'},workspace:{students:[]}});
test('포커스·동기화가 겹쳐도 상태 요청은 하나만 보낸다',async()=>{
 let calls=0,finish;
 const loader=createClassroomStateLoader(()=>{calls++;return new Promise(resolve=>{finish=resolve;});});
 const a=loader.load(),b=loader.load();
 assert.equal(a,b);assert.equal(calls,1);
 finish(Response.json(data(1)));
 assert.deepEqual(await a,data(1));
 const c=loader.load();assert.equal(calls,2);
 finish(Response.json(data(2)));assert.equal((await c).revision,2);
});
test('로그인 오류 이후 재시도가 가능하며 다른 세션으로 데이터를 공유하지 않는다',async()=>{
 let calls=0;
 const loader=createClassroomStateLoader(async()=>++calls===1?Response.json({error:'로그인이 필요합니다.'},{status:401}):Response.json(data(3)));
 await assert.rejects(loader.load(),e=>e instanceof ClassroomStateError&&e.status===401);
 assert.equal((await loader.load()).revision,3);
 const other=createClassroomStateLoader(async()=>Response.json(data(9)));
 assert.equal((await other.load()).revision,9);
});
test('화면 종료 시 진행 요청을 취소하고 다시 사용할 수 있다',async()=>{
 let calls=0;
 const loader=createClassroomStateLoader((_url,{signal})=>{
  if(++calls>1)return Promise.resolve(Response.json(data(2)));
  return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))));
 });
 const aborted=loader.load();loader.abort();
 const next=loader.load();await assert.rejects(aborted,{name:'AbortError'});
 assert.equal((await next).revision,2);assert.equal(calls,2);
});
