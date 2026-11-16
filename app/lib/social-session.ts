import {getToken} from '@auth/core/jwt';
import {validProvider} from './login-policy.ts';

export type OrcaUser={
 userId:string;
 displayName:string;
 email:string;
 fullName:string|null;
};

export async function readSocialSession(requestHeaders:Headers,db:D1Database|undefined,secret:string,cookieName:string):Promise<OrcaUser|null>{
 if(secret.length<32||!db)return null;
 try{
  const cookieHeaders=new Headers();
  cookieHeaders.set('cookie',requestHeaders.get('cookie')??'');
  const token=await getToken({req:{headers:cookieHeaders},secret,cookieName,salt:cookieName});
  if(!token||typeof token.orcaId!=='string'||typeof token.identityId!=='string'||!validProvider(token.provider))return null;
  const mapping=await db.prepare('SELECT user_id FROM login_identities WHERE id=? AND provider=?').bind(token.identityId,token.provider).first<{user_id:string}>();
  if(mapping?.user_id!==token.orcaId)return null;
  return {userId:token.orcaId,displayName:typeof token.name==='string'&&token.name?token.name:'새 회원',email:typeof token.email==='string'?token.email:'',fullName:typeof token.name==='string'?token.name:null};
 }catch{return null;}
}
