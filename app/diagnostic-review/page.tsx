import {requireOrcaUser} from '../lib/social-auth';
import {identity,AppError} from '../lib/server';
import DiagnosticAiReview from '../components/DiagnosticAiReview';
export const dynamic='force-dynamic';
export const metadata={title:'ORCA 수학 | 원장 진단 초안 검토',robots:{index:false,follow:false}};
export default async function Page(){await requireOrcaUser('/diagnostic-review');try{const {viewer}=await identity();if(viewer.role!=='admin')return <main className="report-example-main"><section className="card"><h1>원장 전용 검토 화면이에요.</h1><p>AI 초안과 원본 자료는 원장 계정에서 확인할 수 있어요.</p><a href="/classroom">학습관리로 돌아가기</a></section></main>;}catch(e){if(!(e instanceof AppError))throw e;return <main><p>원장 계정 연결이 필요해요.</p><a href="/classroom">계정 확인</a></main>;}return <DiagnosticAiReview/>;}
