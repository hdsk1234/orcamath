import {getOrcaUser,socialLoginStatus} from '../lib/social-auth';
import {safeLoginReturn} from '../lib/login-policy';
import {chatGPTSignInPath} from '../chatgpt-auth';
import {identity,AppError} from '../lib/server';
import BrandLogo from '../components/BrandLogo';
import LoginOptions from './LoginOptions';
import './login.css';
export const dynamic='force-dynamic';
export default async function LoginPage({searchParams}:{searchParams:Promise<{returnTo?:string;connect?:string;test?:string;error?:string}>}){
 const q=await searchParams,returnTo=safeLoginReturn(q.returnTo),user=await getOrcaUser();let canConnect=false,canTest=false;
 if(user&&(q.connect==='1'||q.test==='1')){try{const {viewer}=await identity();canConnect=q.connect==='1';canTest=q.test==='1'&&viewer.role==='admin';}catch(e){if(!(e instanceof AppError))throw e;}}
 return <main className="orca-login"><a className="login-brand" href="/"><BrandLogo/><span>ORCA <small>수학</small></span></a><section className="login-panel"><span className="login-eyebrow">YOUR LEARNING SPACE</span><h1>{canConnect?'내 계정에 로그인 연결':'오르카와 함께 시작해요.'}</h1><p className="login-intro">{canConnect?'연결할 계정을 선택하세요. 현재 권한과 학습 기록을 그대로 사용합니다.':'자주 쓰는 계정으로 간편하게 로그인하세요.'}</p>{canConnect&&<div className="login-notice"><strong>{user?.displayName}</strong><span>현재 로그인한 계정에 연결합니다.</span></div>}{canTest&&<p className="login-notice">원장 전용 로그인 점검 화면입니다. 검수 중인 서비스도 확인할 수 있어요. 기존 권한을 유지하려면 ‘내 로그인 계정 연결’을 이용하세요.</p>}{q.error&&<p role="alert" className="login-error">로그인을 완료하지 못했어요. 선택한 계정의 이용 동의와 연결 상태를 확인한 뒤 다시 시도해 주세요.</p>}{q.connect==='1'&&!canConnect&&<p className="login-notice">승인된 기존 계정으로 로그인한 뒤, 학습 공간의 ‘로그인 계정 연결’에서 다시 시작해 주세요.</p>}<LoginOptions providers={socialLoginStatus(canConnect||canTest)} returnTo={returnTo} connect={canConnect}/>{user&&!canConnect&&<a className="login-continue" href={returnTo}>현재 계정으로 학습 공간 열기 →</a>}<div className="login-divider"><span>기존 회원</span></div><a className="login-legacy" href={chatGPTSignInPath(returnTo)} target="_top">기존 ChatGPT 계정으로 로그인</a><p className="login-help">처음이라면 로그인 후 학생·학부모를 선택해 가입을 신청해요. 관리자 확인 후 본인 또는 자녀의 학습 기록에 연결됩니다.</p><a className="login-privacy" href="/privacy">개인정보 처리 안내</a><a className="login-back" href="/">← 메인으로 돌아가기</a></section></main>;
}
