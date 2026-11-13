import BrandLogo from '../components/BrandLogo';
import ConsultForm from '../components/ConsultForm';
import '../components/landing.css';
export const metadata={title:'상담 신청 | ORCA 수학'};
export const dynamic='force-dynamic';
const sources:Record<string,string>={홈페이지:'홈페이지',website:'홈페이지',김과외:'김과외',kimgwaoe:'김과외',블로그:'블로그',blog:'블로그',naver:'블로그',유튜브:'유튜브',youtube:'유튜브',인스타:'인스타',인스타그램:'인스타',instagram:'인스타',지인소개:'지인소개',referral:'지인소개',기타:'기타'};
export default async function ConsultPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams,raw=params.source??params.utm_source,source=typeof raw==='string'?(sources[raw.toLowerCase()]??'기타'):'홈페이지',mode=params.mode==='online'||params.mode==='face'?params.mode:'undecided';
 return <div className="orca-landing"><header className="landing-header"><a className="landing-brand" href="/" aria-label="오르카 메인"><BrandLogo className="landing-brand-logo"/><span>ORCA<small>수학</small></span></a><a className="landing-login" href="https://orca-edu.onrender.com/">수업 소개 보기 ↗</a></header><main className="landing-wrap landing-section consult-page"><div className="landing-section-heading"><span className="landing-eyebrow">YOUR FIRST STEP WITH ORCA</span><h1>상담부터,<br/>나에게 맞는 시작을 찾아요.</h1><p>회원가입 없이 연락처를 남겨 주세요.<br/>상담 담당자가 전화 상담 시간을 함께 정합니다.</p></div><div className="consult-flow" aria-label="상담 신청 과정"><span><b>01</b>상담 신청</span><span><b>02</b>전화 약속</span><span><b>03</b>나에게 맞는 수업 안내</span></div><ConsultForm initialSource={source} initialMode={mode}/><p className="consult-help">접수·삭제 문의: 010-2523-4975 / 010-3483-2563<br/>진단검사와 정규수업 이용은 상담 진행 단계에 따라 안내합니다.</p></main><footer className="landing-footer landing-wrap"><span>ORCA 수학 · 너의 공부가 이어지도록.</span><a href="/">통합관리 홈페이지</a></footer></div>;
}
