import {identity,loadWorkspace,mutateWorkspace,checkOrigin,json,failure,AppError} from '../../lib/server';
import {diagnosis} from '../../lib/domain';
import {buildDiagnosticReport,reportAccess,requestReportConsultation} from '../../lib/diagnostic-report';
export async function GET(r:Request){try{
 const {viewer,workspaceId}=await identity(),{workspace}=await loadWorkspace(workspaceId),s=workspace.students.find(s=>s.id===(new URL(r.url).searchParams.get('studentId')||viewer.studentId));
 if(!s)throw new AppError(403,'연결된 본인 진단 결과만 확인할 수 있어요.');const access=reportAccess(viewer,s);
 if(access==='forbidden'||access==='withheld')throw new AppError(403,'결과 공개 상태와 연결된 학생을 확인해 주세요.');
 return json(access==='pending'?{status:'pending',report:null,detail:null}:{status:'ready',report:diagnosis(s),detail:buildDiagnosticReport(s)});
 }catch(e){return failure(e);}}
export async function POST(r:Request){try{
 checkOrigin(r);const {viewer,workspaceId}=await identity(),b=await r.json() as {studentId?:unknown};
 const studentId=typeof b.studentId==='string'?b.studentId:viewer.studentId;
 const result=await mutateWorkspace(workspaceId,w=>{const s=w.students.find(s=>s.id===studentId);if(!s)throw new AppError(403,'연결된 본인 진단 결과만 이용할 수 있어요.');try{return requestReportConsultation(w,s,viewer);}catch(e){throw new AppError(403,e instanceof Error?e.message:'공개된 본인 결과에서 요청해 주세요.');}});
 return json({ok:true,...result.result});
 }catch(e){return failure(e);}}
