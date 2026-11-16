import {requireRegular,requireStudentRegular} from '../../lib/server';
import {FILE_ATTACHMENTS_MESSAGE} from '../../lib/file-storage';
import {identity,canStudent,staff,checkOrigin,mutateWorkspace,loadWorkspace,failure,json,AppError} from '../../lib/server';
import {canWriteRecords} from '../../lib/domain';
import {canReadQuestion,canManageQuestion,type QuestionVisibility} from '../../lib/questions';
const clean=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max):'';
export async function POST(request:Request){try{
 checkOrigin(request);const {viewer,workspaceId}=await identity();const crmState=await loadWorkspace(workspaceId);requireRegular(crmState.workspace,viewer);
 if(!canWriteRecords(viewer.role))throw new AppError(403,'학부모는 자녀의 질문과 공유 게시판을 조회할 수 있습니다.');
 const b=await request.json() as Record<string,unknown>,action=String(b.action??'');
 const id=clean(b.questionId,100),now=new Date().toISOString();
 if(action==='create'){
  const studentId=viewer.role==='student'?viewer.studentId??'':clean(b.studentId,80);canStudent(viewer,studentId);const target=crmState.workspace.students.find(s=>s.id===studentId);if(target)requireStudentRegular(target);
  const title=clean(b.title,120),body=clean(b.body,4000),topic=clean(b.topic,30),visibility=b.visibility as QuestionVisibility;
  if(!title||!body)throw new AppError(400,'제목과 궁금한 내용을 입력해 주세요.');if(!['private','class'].includes(visibility))throw new AppError(400,'공개 범위를 선택해 주세요.');
  if(!['개념 질문','문제풀이','조건정리','공부 방법','수업·과제'].includes(topic))throw new AppError(400,'질문 주제를 선택해 주세요.');
  const questionId=crypto.randomUUID();await mutateWorkspace(workspaceId,w=>{
   const student=w.students.find(s=>s.id===studentId);if(!student)throw new AppError(404,'학생을 찾을 수 없습니다.');w.questions??=[];
   if(w.questions.length>=500)throw new AppError(400,'게시판 기록 한도입니다. 관리자에게 문의해 주세요.');
   if(w.questions.filter(q=>q.studentId===studentId&&q.createdAt.slice(0,10)===now.slice(0,10)).length>=20)throw new AppError(429,'오늘 등록한 질문이 많습니다. 기존 질문에 이어서 질문해 주세요.');
   w.questions.push({id:questionId,studentId,studentName:student.name,title,body,topic,visibility,createdAt:now,updatedAt:now,files:[],replies:[],teacherRequested:true,resolved:false,demo:student.demo});return {};
  });return json({questionId});
 }
 if(action==='attachments')throw new AppError(503,FILE_ATTACHMENTS_MESSAGE);
 const updated=await mutateWorkspace(workspaceId,w=>{
  const q=w.questions?.find(q=>q.id===id);if(!q||!canReadQuestion(viewer,q))throw new AppError(404,'질문을 찾을 수 없습니다.');
  if(action==='reply'){
   const kind=viewer.role==='student'?'student':'teacher';if(kind==='student'&&!canManageQuestion(viewer,q))throw new AppError(403,'본인의 질문에 이어서 질문해 주세요.');if(kind==='teacher'){staff(viewer,['admin','manager','teacher']);if(!canManageQuestion(viewer,q))throw new AppError(403,'담당 학생의 질문에만 답변할 수 있습니다.');}
   const body=clean(b.body,4000);if(!body)throw new AppError(400,'내용을 입력해 주세요.');if(q.replies.length>=40)throw new AppError(400,'대화 한도입니다. 새 질문을 작성해 주세요.');
   q.replies.push({id:crypto.randomUUID(),kind,name:kind==='student'?q.studentName:viewer.name,body,createdAt:now});q.resolved=false;q.teacherRequested=kind==='student';
  }else{
   if(!canManageQuestion(viewer,q))throw new AppError(403,'본인의 질문만 변경할 수 있습니다.');
   if(action==='visibility'){if(!['private','class'].includes(String(b.visibility)))throw new AppError(400,'공개 범위를 선택해 주세요.');q.visibility=b.visibility as QuestionVisibility;}
   else if(action==='teacher_request'){q.teacherRequested=true;q.resolved=false;}
   else if(action==='resolve'){q.resolved=b.resolved===true;if(q.resolved)q.teacherRequested=false;}
   else throw new AppError(400,'지원하지 않는 질문 작업입니다.');
  }q.updatedAt=now;return {questionId:q.id};
 });return json(updated.result);
 }catch(e){return failure(e);}}
