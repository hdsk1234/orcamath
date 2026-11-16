import test from 'node:test';
import assert from 'node:assert/strict';
import {logoutResponse} from '../app/lib/logout.ts';

function request(origin='https://orca.example',headers={}){return new Request(origin+'/api/logout',{method:'POST',headers:{origin,...headers}});}

test('소셜 설정 없이 운영·로컬 로그인 쿠키와 계정 연결 쿠키를 종료한다',()=>{
 for(const origin of ['https://orca.example','http://localhost:5174']){
  const response=logoutResponse(request(origin));
  assert.equal(response.status,303);
  assert.equal(response.headers.get('location'),'/login');
  assert.match(response.headers.get('cache-control'),/no-store/);
  const cookies=response.headers.getSetCookie();
  for(const name of ['orca.session-token','__Secure-orca.session-token','orca-link','__Host-orca-link']){
   const cookie=cookies.find(x=>x.startsWith(name+'='));
   assert(cookie);
   assert.match(cookie,/Path=\/; HttpOnly; SameSite=Lax; Max-Age=0/);
   assert.equal(cookie.endsWith('; Secure'),name.startsWith('__'));
  }
 }
});

test('분할된 세션 쿠키도 모두 지우고 다른 앱 쿠키는 유지한다',()=>{
 const response=logoutResponse(request(undefined,{cookie:'__Secure-orca.session-token.0=aaa; __Secure-orca.session-token.1=bbb; orca.session-token.0=ccc; preference=dark; orca.session-token-fake=x'}));
 const cookies=response.headers.getSetCookie();
 for(const name of ['__Secure-orca.session-token.0','__Secure-orca.session-token.1','orca.session-token.0'])assert(cookies.some(x=>x.startsWith(name+'=;')&&x.includes('Max-Age=0')));
 assert.equal(cookies.length,7);
});

test('외부 사이트·Origin 없는 요청과 GET은 쿠키를 변경하지 않는다',()=>{
 for(const headers of [{origin:'https://evil.example'},{origin:'null'},{origin:'https://orca.example','sec-fetch-site':'cross-site'}]){
  const response=logoutResponse(request(undefined,headers));
  assert.equal(response.status,403);
  assert.equal(response.headers.getSetCookie().length,0);
 }
 assert.equal(logoutResponse(new Request('https://orca.example/api/logout',{method:'POST'})).status,403);
 const response=logoutResponse(new Request('https://orca.example/api/logout'));
 assert.equal(response.status,405);
 assert.equal(response.headers.get('allow'),'POST');
 assert.equal(response.headers.getSetCookie().length,0);
});
