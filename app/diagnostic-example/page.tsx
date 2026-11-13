import {ArrowLeft,LockKeyhole} from 'lucide-react';
import {requireOrcaUser} from '../lib/social-auth';
import {AppError,identity,loadWorkspace} from '../lib/server';
import {approvedCasePreview} from '../lib/diagnostic-ai';
import {isManagement} from '../lib/permissions';
import BrandLogo from '../components/BrandLogo';
import DiagnosticReport from '../components/DiagnosticReport';
import {jaewonReport} from './data';
export const dynamic='force-dynamic';
export const metadata={title:'ORCA 수학 | 진단 결과 예시',robots:{index:false,follow:false}};
export default async function DiagnosticExample({searchParams}:{searchParams:Promise<{caseId?:string}>}){
 const {caseId}=await searchParams;
 await requireOrcaUser('/diagnostic-example'+(caseId?'?caseId='+encodeURIComponent(caseId):''));let allowed=false,context:Awaited<ReturnType<typeof identity>>|undefined;
 try{context=await identity();allowed=caseId?context.viewer.role==='admin':isManagement(context.viewer.role);}catch(e){if(!(e instanceof AppError)||e.status!==403)throw e;}
 if(!allowed)return <main className="report-example-main"><section className="card"><h1>관리자 전용 화면이에요.</h1><p>원장 또는 총괄관리자 계정에서 예시 결과지를 확인할 수 있어요.</p><a href="/classroom">학습관리로 돌아가기</a></section></main>;
 let report=jaewonReport();if(caseId&&context){const {workspace}=await loadWorkspace(context.workspaceId);try{report=approvedCasePreview(workspace,caseId,context.viewer);}catch{return <main className="report-example-main"><section className="card"><h1>확정된 진단 결과를 선택해 주세요.</h1><a href="/diagnostic-review">진단 결과 검토로 돌아가기</a></section></main>;}}
 return <div className="report-example"><header className="report-example-top"><a href="/classroom"><BrandLogo/><span>ORCA 수학</span></a><span className="report-private"><LockKeyhole size={13}/>{caseId?'학생 화면 미리보기':'관리자용 예시'}</span></header><main className="report-example-main"><a className="report-back" href={caseId?'/diagnostic-review':'/classroom'}><ArrowLeft size={15}/>{caseId?'진단 결과 검토로 돌아가기':'학습관리로 돌아가기'}</a><div className="report-title"><span className="eyebrow">ORCA MATH DIAGNOSIS</span><h1>{report.name} 학생의 진단 결과</h1><p>{caseId?'원장님이 확정한 진단 결과와 나에게 맞는 개선 가이드':'미적분1 · 기존 상담 평가를 바탕으로 구성한 예시'}</p></div><nav className="report-page-nav" aria-label="결과지 이동"><a href="#report-summary">6각형 그래프</a><a href="#report-solutions">영역별 해결책</a><a href="#report-consult">상담 안내</a></nav><DiagnosticReport report={report} showTitle={false}/><footer className="report-footer">ORCA 수학 · {caseId?'원장 전용 학생 화면 미리보기 · 실제 학생 계정 공개와 별도로 제공돼요.':'기존 상담 기록을 보존한 관리자용 예시'}</footer></main></div>;
}
