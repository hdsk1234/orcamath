import {FILE_ATTACHMENTS_MESSAGE} from '../../lib/file-storage';
import {env} from 'cloudflare:workers';
import {AppError,identity,loadWorkspace,mutateWorkspace,checkOrigin,json,failure} from '../../lib/server';
import {AI_MODEL,AI_PROMPT_VERSION,beginAiRun,saveAiDraft,approveAiDraft,normalizeAiDraft,validateGeneratedStudentCopy,requireAiOwner,rewriteStudentCopy,type AiCase} from '../../lib/diagnostic-ai';
import {startAiDraft,pollAiDraft,AiRequestError,type AiContent} from '../../lib/diagnostic-ai-request';
import {ORIGINAL_SURVEY,SUBJECTS} from '../../lib/diagnostic';
import {MATH_BANK} from '../../lib/diagnostic-bank';
const apiKey=()=>String((env as unknown as Record<string,unknown>).OPENAI_API_KEY??'');
async function owner(){const ctx=await identity();try{requireAiOwner(ctx.viewer);}catch(e){throw new AppError(403,(e as Error).message);}return ctx;}
export async function GET(){try{const {workspaceId}=await owner(),{workspace}=await loadWorkspace(workspaceId);return json({model:AI_MODEL,connected:!!apiKey(),cases:workspace.aiCases??[],students:workspace.students.map(s=>({id:s.id,name:s.name,demo:s.demo,ready:!!s.diagnostic?.completedAt}))});}catch(e){return failure(e);}}
export async function POST(r:Request){try{
 checkOrigin(r);const {viewer,workspaceId}=await owner(),b=await r.json() as Record<string,unknown>,op=String(b.operation??'');
 if(op==='poll'){
 const {workspace}=await loadWorkspace(workspaceId);let checked=0;
 for(const c of (workspace.aiCases??[]).filter(c=>c.run?.status==='running').slice(0,5)){
  const run=c.run!;
  if(!run.providerId){if(Date.now()-Date.parse(run.startedAt)>300000)await mutateWorkspace(workspaceId,w=>{const current=w.aiCases?.find(x=>x.id===c.id)?.run;if(current?.id===run.id&&current.status==='running'){current.status='failed';current.error='이전 분석의 접수 응답을 받지 못했어요. 원본은 보존됐으며 다시 분석할 수 있어요. 이전 요청 요금은 OpenAI 사용 내역에서 확인해 주세요.';}return {};});continue;}
  try{const result=await pollAiDraft(apiKey(),run.providerId);if(!result.pending){let draft;try{draft=normalizeAiDraft(['omd-draft-1','omd-draft-2'].includes(run.promptVersion)?result.draft:validateGeneratedStudentCopy(result.draft),c);}catch(e){throw new AiRequestError('AI 초안 검증이 필요해요. '+(e as Error).message,result.usage);}await mutateWorkspace(workspaceId,w=>{const current=w.aiCases?.find(x=>x.id===c.id)?.run;if(current?.id===run.id&&current.status==='running')Object.assign(current,{status:'draft',finishedAt:new Date().toISOString(),draft,usage:result.usage});return {};});}checked++;}
  catch(e){if(e instanceof AiRequestError)await mutateWorkspace(workspaceId,w=>{const current=w.aiCases?.find(x=>x.id===c.id)?.run;if(current?.id===run.id&&current.status==='running')Object.assign(current,{status:'failed',error:e.message,...(e.usage?{usage:e.usage}:{})});return {};});}
 }
 return json({ok:true,checked});
 }
 if(op==='fromStudent'){
  const out=await mutateWorkspace(workspaceId,w=>{const s=w.students.find(x=>x.id===b.studentId);if(!s?.diagnostic?.completedAt)throw new AppError(400,'설문과 선택 과목의 답안 제출을 먼저 완료해 주세요.');const existing=w.aiCases?.find(c=>c.studentId===s.id&&c.sourceVersion===s.diagnostic!.updatedAt);if(existing)return {caseId:existing.id};const c:AiCase={id:crypto.randomUUID(),name:s.name,subject:s.diagnostic.subjects[0],createdAt:new Date().toISOString(),studentId:s.id,sourceVersion:s.diagnostic.updatedAt,snapshot:structuredClone(s.diagnostic)};(w.aiCases??=[]).push(c);return {caseId:c.id};});return json(out.result);
 }
 if(['save','approve','link','archive','recover','copy'].includes(op)){
  const out=await mutateWorkspace(workspaceId,w=>{const c=w.aiCases?.find(x=>x.id===b.caseId);if(!c)throw new AppError(404,'진단 초안을 찾을 수 없어요.');try{
   if(op==='copy')rewriteStudentCopy(w,c,b.copy,viewer);
   if(op==='save')saveAiDraft(c,String(b.runId),b.draft,viewer);
   if(op==='archive'){if(c.run?.status==='running')throw new Error('진행 중인 분석은 완료 후 보관해 주세요.');c.archivedAt=b.archived===true?new Date().toISOString():undefined;}
   if(op==='recover'){if(c.run?.status!=='failed'||!c.run.providerId||c.run.sourceVersion!==c.sourceVersion)throw new Error('현재 자료로 접수한 분석 결과만 다시 불러올 수 있어요.');c.run.status='running';c.run.error=undefined;}
   if(op==='link'){if(c.run?.status==='approved'||c.run?.status==='running')throw new Error('분석 전 또는 검토 중인 초안만 계정을 연결할 수 있어요.');const id=String(b.studentId??'');if(id&&!w.students.some(s=>s.id===id))throw new Error('연결할 학생을 확인해 주세요.');if(c.snapshot&&c.studentId!==id)throw new Error('홈페이지 답안의 학생 연결은 변경할 수 없어요.');c.studentId=id||undefined;}
   if(op==='approve')approveAiDraft(w,c,String(b.runId),viewer,b.confirmed===true);
  }catch(e){throw new AppError(409,(e as Error).message);}return {};});return json({ok:true,cases:out.workspace.aiCases??[]});
 }
 if(op!=='analyze')throw new AppError(400,'진단 작업을 확인해 주세요.');if(!apiKey())throw new AppError(503,'AI 연결키 설정을 기다리고 있어요.');
 const reserved=await mutateWorkspace(workspaceId,w=>{const c=w.aiCases?.find(x=>x.id===b.caseId);if(!c)throw new AppError(404,'진단 자료를 찾을 수 없어요.');if(c.run?.status==='approved')throw new AppError(409,'확정한 결과는 보존돼요. 새 검사를 진행해 주세요.');if(c.file||c.analysisFile||Object.values(c.snapshot?.answers??{}).some(answer=>answer.files?.length))throw new AppError(503,FILE_ATTACHMENTS_MESSAGE);try{return {case:structuredClone(c),runId:beginAiRun(c,viewer)};}catch(e){throw new AppError(409,(e as Error).message);}}),c=reserved.result.case,runId=reserved.result.runId;
 try{
  const subjects=c.snapshot?.subjects??[c.subject],questions=MATH_BANK.filter(q=>subjects.some(s=>s===q.subject)),content:AiContent[]=[{type:'input_text',text:JSON.stringify({source:'진단 원본 자료',subjects:subjects.map(id=>SUBJECTS.find(s=>s.id===id)?.name),survey:ORIGINAL_SURVEY,questions:questions.map(q=>({id:q.id,prompt:q.prompt,topic:q.topic,sourcePage:q.sourcePage})),...(c.snapshot?{studentAnswers:c.snapshot.survey,mathAnswers:Object.fromEntries(Object.entries(c.snapshot.answers).map(([id,a])=>[id,{text:a.text,unknown:a.unknown}]))}:{note:'첨부 PDF의 학생 응답과 풀이를 분석하세요. 파일명과 이름을 추론 근거로 사용하지 마세요.'})})}];
  if(c.snapshot)for(const q of questions){content.push({type:'input_text',text:q.id+' 문제 원문'});content.push({type:'input_image',image_url:new URL('/diagnostic/'+q.image.path,r.url).href,detail:'high'});}
  const result=await startAiDraft(apiKey(),content);
  await mutateWorkspace(workspaceId,w=>{const current=w.aiCases?.find(x=>x.id===c.id);if(!current?.run||current.run.id!==runId)throw new AppError(409,'새 분석이 시작되어 이전 응답을 적용하지 않았어요.');current.run.providerId=result.responseId;return {};});return json({ok:true,caseId:c.id});
 }catch(e){await mutateWorkspace(workspaceId,w=>{const current=w.aiCases?.find(x=>x.id===c.id);if(current?.run?.id===runId)Object.assign(current.run,{status:'failed',finishedAt:new Date().toISOString(),error:e instanceof AiRequestError?e.message:e instanceof Error&&!/fetch|timeout|abort/i.test(e.message)?e.message:'분석 연결이 끊겼어요. 원본 자료는 보존돼요. 상태를 확인하고 다시 실행해 주세요.',...(e instanceof AiRequestError&&e.usage?{usage:e.usage}:{})});return {};});throw new AppError(503,e instanceof AiRequestError?e.message:'AI 분석을 완료하지 못했어요. 상태를 확인해 주세요.');}
 }catch(e){return failure(e);}}
