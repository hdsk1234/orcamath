import test from 'node:test';
import assert from 'node:assert/strict';
import {encode} from '@auth/core/jwt';
import {readSocialSession} from '../app/lib/social-session.ts';

const secret='session-test-secret-'.repeat(3);
const cookieName='__Secure-orca.session-token';
const tokenData={orcaId:'member-1',identityId:'social-1',provider:'google',emailVerified:true,name:'회원',email:'member@example.com'};
const db={prepare(){return {bind(id,provider){return {async first(){return id==='social-1'&&provider==='google'?{user_id:'member-1'}:null;}};}};}};
const authenticatedHeaders={
 'oai-authenticated-user-id':'owner',
 'oai-authenticated-user-email':'owner@example.com',
 'oai-authenticated-user-full-name':'Owner',
};
async function sessionHeaders(token=tokenData){const value=await encode({secret,salt:cookieName,token,maxAge:300});return new Headers({...authenticatedHeaders,cookie:cookieName+'='+value});}

test('플랫폼 인증 헤더·로컬 모의 로그인 쿠키·Bearer 토큰만으로 로그인할 수 없다',async()=>{
 const bearer=await encode({secret,salt:cookieName,token:tokenData,maxAge:300});
 for(const extra of [{},{cookie:'__sites_local_auth=1'},{authorization:'Bearer '+bearer}]){
  assert.equal(await readSocialSession(new Headers({...authenticatedHeaders,...extra}),db,secret,cookieName),null);
 }
});

test('유효한 소셜 세션은 플랫폼 헤더와 무관하게 기존 회원 ID로 로그인한다',async()=>{
 const user=await readSocialSession(await sessionHeaders(),db,secret,cookieName);
 assert.deepEqual(user,{userId:'member-1',displayName:'회원',email:'member@example.com',provider:'google',emailVerified:true,fullName:'회원'});
});

test('회원 연결 불일치·잘못된 공급자·키·DB 없는 세션은 거부한다',async()=>{
 for(const token of [{...tokenData,orcaId:'owner'},{...tokenData,identityId:'other'},{...tokenData,provider:'chatgpt'}]){
  assert.equal(await readSocialSession(await sessionHeaders(token),db,secret,cookieName),null);
 }
 const headers=await sessionHeaders();
 assert.equal(await readSocialSession(headers,db,'wrong-secret-'.repeat(4),cookieName),null);
 assert.equal(await readSocialSession(headers,db,'',cookieName),null);
 assert.equal(await readSocialSession(headers,undefined,secret,cookieName),null);
});
