import {type LoginProvider} from './login-policy.ts';
export async function bindSocialIdentity(db:D1Database,id:string,provider:LoginProvider,link?:{hash:string;currentUserId:string},now=new Date().toISOString()){
 await db.prepare('INSERT OR IGNORE INTO login_identities (id,provider,user_id,created_at) VALUES (?,?,?,?)').bind(id,provider,id,now).run();
 if(link){
  const intent=await db.prepare('SELECT user_id FROM login_link_intents WHERE hash=? AND provider=? AND expires_at>? AND used_at IS NULL').bind(link.hash,provider,now).first<{user_id:string}>();
  if(!intent||intent.user_id!==link.currentUserId)throw Error('계정 연결 요청이 만료됐습니다. 기존 계정에서 다시 연결해 주세요.');
  const member=await db.prepare("SELECT user_id FROM memberships WHERE user_id=? AND role IN ('admin','manager','teacher','assistant','student','parent')").bind(intent.user_id).first();if(!member)throw Error('승인된 기존 계정에서 연결을 시작해 주세요.');
  const claim=now+':'+crypto.randomUUID();
  await db.batch([
   db.prepare('UPDATE login_link_intents SET used_at=? WHERE hash=? AND used_at IS NULL AND expires_at>?').bind(claim,link.hash,now),
   db.prepare('UPDATE login_identities SET user_id=? WHERE id=? AND (user_id=? OR (user_id=id AND NOT EXISTS (SELECT 1 FROM memberships WHERE user_id=login_identities.id) AND NOT EXISTS (SELECT 1 FROM registrations WHERE user_id=login_identities.id))) AND EXISTS (SELECT 1 FROM login_link_intents WHERE hash=? AND user_id=? AND used_at=?)').bind(intent.user_id,id,intent.user_id,link.hash,intent.user_id,claim)
  ]);
  const result=await db.prepare('SELECT user_id FROM login_identities WHERE id=?').bind(id).first<{user_id:string}>();if(result?.user_id!==intent.user_id)throw Error('이미 다른 회원 기록에 연결된 로그인입니다. 관리자에게 계정 확인을 요청해 주세요.');return result.user_id;
 }
 const result=await db.prepare('SELECT user_id FROM login_identities WHERE id=? AND provider=?').bind(id,provider).first<{user_id:string}>();if(!result)throw Error('로그인 계정을 확인하지 못했습니다.');return result.user_id;
}
