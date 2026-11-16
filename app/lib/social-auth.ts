import {env} from 'cloudflare:workers';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {Auth,type AuthConfig} from '@auth/core';
import Google from '@auth/core/providers/google';
import Kakao from '@auth/core/providers/kakao';
import Naver from '@auth/core/providers/naver';
import {readSocialSession} from './social-session';
import {LOGIN_ORIGIN,loginAvailability,safeLoginReturn,validProvider,socialIdentityId,readCookie,authResponse} from './login-policy';
import {bindSocialIdentity} from './login-identities';
import {normalizeStaffEmail,provisionStaffLogin} from './staff-access';
const values=()=>env as unknown as Record<string,unknown>;
export const socialLoginStatus=(includeTesting=true)=>loginAvailability(values()).map(p=>({...p,ready:p.ready&&(includeTesting||values()[p.id.toUpperCase()+'_LOGIN_PUBLIC_READY']!=='false'),review:values()[p.id.toUpperCase()+'_LOGIN_PUBLIC_READY']==='false'}));
export const loginOrigin=()=>String(values().ORCA_LOGIN_ORIGIN??LOGIN_ORIGIN).replace(/\/$/,'');
const secure=(origin:string)=>origin.startsWith('https:');
export const sessionCookie=(origin=loginOrigin())=>(secure(origin)?'__Secure-':'')+'orca.session-token';
export const linkCookie=(origin=loginOrigin())=>(secure(origin)?'__Host-':'')+'orca-link';
export async function readSocialUser(requestHeaders:Headers){
 return readSocialSession(requestHeaders,env.DB,String(values().ORCA_LOGIN_SECRET??''),sessionCookie());
}
export async function getOrcaUser(){return readSocialUser(new Headers(await headers()));}
export async function requireOrcaUser(returnTo='/classroom'){const u=await getOrcaUser();if(u)return u;redirect('/login?returnTo='+encodeURIComponent(safeLoginReturn(returnTo)));}
export function authConfig(request:Request):AuthConfig{
 const v=values(),origin=loginOrigin(),ready=socialLoginStatus().filter(p=>p.ready),providers=[];
 if(ready.some(p=>p.id==='google'))providers.push(Google({clientId:String(v.GOOGLE_CLIENT_ID),clientSecret:String(v.GOOGLE_CLIENT_SECRET),checks:['pkce','state'],authorization:{params:{scope:'openid email profile'}}}));
 if(ready.some(p=>p.id==='kakao'))providers.push(Kakao({clientId:String(v.KAKAO_CLIENT_ID),clientSecret:String(v.KAKAO_CLIENT_SECRET),checks:['state'],authorization:{url:'https://kauth.kakao.com/oauth/authorize',params:{scope:'profile_nickname'}}}));
 if(ready.some(p=>p.id==='naver'))providers.push(Naver({clientId:String(v.NAVER_CLIENT_ID),clientSecret:String(v.NAVER_CLIENT_SECRET),checks:['state'],client:{token_endpoint_auth_method:'client_secret_post'},token:{url:'https://nid.naver.com/oauth2.0/token',params:{state:new URL(request.url).searchParams.get('state')??''}},profile(p){const x=p.response;if(!x?.id)throw Error('Invalid Naver identity');return {id:String(x.id),name:x.name??x.nickname??'네이버 회원',email:x.email??null,image:null};}}));
 return {basePath:'/api/auth',secret:String(v.ORCA_LOGIN_SECRET??''),trustHost:true,providers,session:{strategy:'jwt',maxAge:7*86400},cookies:{sessionToken:{name:sessionCookie(origin),options:{httpOnly:true,sameSite:'lax',path:'/',secure:secure(origin)}}},pages:{signIn:'/login',error:'/login'},callbacks:{
  async jwt({token,account,user,profile}){
   if(account){
    if(!validProvider(account.provider)||!env.DB)throw Error('Provider unavailable');
    const id=await socialIdentityId(account.provider,account.providerAccountId),nonce=readCookie(request.headers.get('cookie')??'',linkCookie());
    let link:undefined|{hash:string;currentUserId:string};
    if(nonce){
     const current=await readSocialUser(request.headers);
     if(!current)throw Error('계정 연결을 시작한 기존 로그인이 만료됐습니다.');
     const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(nonce));
     link={hash:Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join(''),currentUserId:current.userId};
    }
    const userId=await bindSocialIdentity(env.DB,id,account.provider,link);
    const emailVerified=account.provider==='google'&&profile?.email_verified===true&&!!normalizeStaffEmail(profile.email)&&normalizeStaffEmail(profile.email)===normalizeStaffEmail(user.email);
    const email=emailVerified?normalizeStaffEmail(profile?.email):user.email??'';
    token.orcaId=await provisionStaffLogin(env.DB,{userId,identityId:id,provider:account.provider,email,emailVerified});
    token.identityId=id;token.provider=account.provider;token.emailVerified=emailVerified;
    token.name=user.name??'새 회원';token.email=email;delete token.picture;
   }
   return token;
  },
  async session({session,token}){session.user={...session.user,id:String(token.orcaId??''),name:typeof token.name==='string'?token.name:'새 회원',email:typeof token.email==='string'?token.email:'',image:null};return session;},
  async redirect({url}){const target=url.startsWith('/')?url:new URL(url,origin).origin===origin?new URL(url).pathname+new URL(url).search:'/classroom';return origin+safeLoginReturn(target);}
 },logger:{error(error){const detail=error as Error&{type?:string;cause?:{err?:{name?:string}}};const tag=(v:unknown)=>String(v??'').replace(/[^A-Za-z0-9_]/g,'').slice(0,60);console.error('ORCA social login failed:',tag(detail.type??error.name),tag(detail.cause?.err?.name));},warn(){},debug(){}}};
}
export async function socialAuthHandler(request:Request){
 const origin=loginOrigin();if(new URL(request.url).origin!==origin)return new Response('Invalid origin',{status:400});
 if(String(values().ORCA_LOGIN_SECRET??'').length<32)return Response.json({error:'로그인 연결을 준비하고 있습니다.'},{status:503});
 const response=await Auth(request,authConfig(request));
 return authResponse(response,new URL(request.url).pathname.startsWith('/api/auth/callback/')?{name:linkCookie(),secure:secure(origin)}:undefined);
}
