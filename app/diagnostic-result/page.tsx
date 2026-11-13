import {ArrowLeft,LockKeyhole} from 'lucide-react';
import {requireOrcaUser} from '../lib/social-auth';
import {AppError,identity,loadWorkspace} from '../lib/server';
import {diagnosticAccess,regularStudent} from '../lib/crm';
import {buildDiagnosticReport,reportAccess} from '../lib/diagnostic-report';
import DiagnosticReport from '../components/DiagnosticReport';
import BrandLogo from '../components/BrandLogo';
export const dynamic='force-dynamic';
export const metadata={title:'ORCA 수학 | 나의 진단·개선 가이드'};
export default async function DiagnosticResult({searchParams}:{searchParams:Promise<{studentId?:string}>}){
 const params=await searchParams,returnTo='/diagnostic-result'+(params.studentId?'?studentId='+encodeURIComponent(params.studentId):'');
 await requireOrcaUser(returnTo);
 let context:Awaited<ReturnType<typeof identity>>;
 try{context=await identity();}catch(e){if(!(e instanceof AppError)||e.status!==403)throw e;return <main className="report-example-main"><section className="card"><h1>연결된 진단 계정이 필요해요.</h1><p>담당자가 연결한 학생 또는 학부모 계정에서 결과를 확인할 수 있어요.</p><a href="/classroom">계정 연결 확인하기</a></section></main>;}
 const {viewer,workspaceId}=context,{workspace}=await loadWorkspace(workspaceId),isStaff=['admin','manager','teacher'].includes(viewer.role),studentId=params.studentId||viewer.studentId,s=workspace.students.find(s=>s.id===studentId);
 if(!s||!diagnosticAccess(viewer,s))return <main className="report-example-main"><section className="card"><h1>{isStaff&&!studentId?'확인할 학생을 골라 주세요.':'연결된 본인 결과만 확인할 수 있어요.'}</h1>{isStaff&&!studentId&&<div className="report-student-links">{workspace.students.filter(s=>diagnosticAccess(viewer,s)).map(s=><a className="secondary" key={s.id} href={'/diagnostic-result?studentId='+encodeURIComponent(s.id)}>{s.name}</a>)}</div>}<a href="/classroom">학습관리로 돌아가기</a></section></main>;
 const access=reportAccess(viewer,s),regular=regularStudent(s),back='/classroom?view=result&studentId='+encodeURIComponent(s.id);
 return <div className="report-example"><header className="report-example-top"><a href="/classroom"><BrandLogo/><span>ORCA 수학</span></a><span className="report-private"><LockKeyhole size={13}/>{regular?'나의 학습 기록':'진단·개선 가이드'}</span></header><main className="report-example-main"><a className="report-back" href={back}><ArrowLeft size={15}/>{regular?'나의 학습 공간으로':'등록 진행 안내로'}</a><div className="report-title"><span className="eyebrow">MY DIAGNOSIS & NEXT STEP</span><h1>{s.name} 학생의 진단 결과</h1><p>{regular?'정규등록 후에도 같은 진단 결과와 해결책을 확인할 수 있어요.':'등록 전에도 다시 로그인해 나의 결과와 개선 방법을 확인할 수 있어요.'}</p></div>{access==='ready'?<><nav className="report-page-nav" aria-label="결과지 이동"><a href="#report-summary">결과 요약</a><a href="#report-solutions">개선 가이드</a><a href="#report-consult">상담 이어가기</a></nav>{isStaff&&s.admission?.mode==='face'&&!s.admission.resultReleased&&<div className="notice amber">담당자 미리 보기입니다. 학생·학부모에게는 대면 상담 후 결과를 공개해야 보여요.</div>}<DiagnosticReport report={buildDiagnosticReport(s)} showTitle={false}/></>:<section className="card report-waiting"><LockKeyhole size={28}/><h2>{access==='withheld'?'대면 상담에서 결과를 함께 확인해요.':'나의 진단 결과를 준비하고 있어요.'}</h2><p>{access==='withheld'?'상담을 마친 뒤 담당자가 공개하면 이곳에서 결과와 여섯 영역의 해결책을 계속 볼 수 있어요.':s.diagnostic?.completedAt||s.surveyAt?'선생님이 개념 설명과 풀이를 확인하고 있어요. 평가가 완료되면 여기에 결과와 해결책이 표시돼요.':'진단검사 제출과 선생님 평가를 마치면 결과와 개선 가이드를 확인할 수 있어요.'}</p><a className="secondary" href={'/classroom?view=survey&studentId='+encodeURIComponent(s.id)}>진단검사 진행 상태 확인</a></section>}<footer className="report-footer">ORCA 수학 · 본인과 연결된 학부모·담당자가 함께 보는 진단 기록</footer></main></div>;
}
