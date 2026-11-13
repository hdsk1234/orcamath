import {canAccessStudent,isStaffRole,isLinkedViewer,type Viewer,type Attachment,type Workspace} from './domain.ts';
export type QuestionVisibility='private'|'class';
export type QuestionReply={id:string;kind:'student'|'teacher';name:string;body:string;createdAt:string;demo?:boolean};
export type Question={id:string;studentId:string;studentName:string;title:string;body:string;topic:string;visibility:QuestionVisibility;createdAt:string;updatedAt:string;files:Attachment[];replies:QuestionReply[];teacherRequested:boolean;resolved:boolean;demo:boolean};
export function canReadQuestion(v:Viewer,q:Question){return ['admin','manager'].includes(v.role)||(isStaffRole(v.role)&&canAccessStudent(v,q.studentId))||(isStaffRole(v.role)&&q.visibility==='class')||(isLinkedViewer(v.role)&&!!v.studentId&&(q.visibility==='class'||canAccessStudent(v,q.studentId)));}
export function canManageQuestion(v:Viewer,q:Question){return (isStaffRole(v.role)&&canAccessStudent(v,q.studentId))||(v.role==='student'&&v.studentId===q.studentId);}
export function visibleQuestions(w:Workspace,v:Viewer){
 const ownDemo=w.students.find(s=>s.id===v.studentId)?.demo??false;
 return (w.questions??[]).filter(q=>canReadQuestion(v,q)&&(isStaffRole(v.role)||q.demo===ownDemo)&&(isStaffRole(v.role)||q.studentId===v.studentId||!w.students.some(s=>s.id===q.studentId&&(s.billing?.stopped||s.enrollment?.status==='withdrawn'))));
}
export function canReplyQuestion(v:Viewer,q:Question){return ['admin','manager'].includes(v.role)||(v.role==='teacher'&&canAccessStudent(v,q.studentId))||(v.role==='student'&&v.studentId===q.studentId);}
export function questionStatus(q:Question){return q.resolved?'해결 완료':q.teacherRequested||!q.replies.some(r=>r.kind==='teacher')?'답변 대기':'선생님 답변';}
export function installQuestionExamples(w:Workspace){
 if(w.questionExampleVersion===2)return;
 // Remove only the old unshipped AI example; preserve written questions and teacher replies.
 for(const q of w.questions??[]){if(q.demo&&q.id==='question-demo-2')q.replies=q.replies.filter(r=>r.kind==='teacher');}
 const samples=w.students.filter(s=>s.demo).slice(0,3);w.questions??=[];
 const prompts=[['조건을 식으로 옮길 때 무엇부터 해야 하나요?','문제에 조건이 여러 개 나오면 어떤 조건부터 식으로 써야 할지 모르겠습니다. 제가 먼저 확인할 순서를 알려주세요.','조건정리','private'],['로그에서 진수 조건과 밑 조건은 왜 필요한가요?','logₐx에서 x>0, a>0, a≠1이라는 조건을 각각 왜 확인해야 하는지 알고 싶어요.','개념 질문','class'],['해설쓰기는 답을 옮겨 적으면 되는 건가요?','해설쓰기에서 풀이 방법을 선택한 이유를 어떻게 써야 하는지 예시를 보고 싶습니다.','공부 방법','class']] as const;
 samples.forEach((s,i)=>{const id=`question-demo-${i+1}`;if(w.questions!.some(q=>q.id===id))return;const [title,body,topic,visibility]=prompts[i],now=new Date().toISOString();const q:Question={id,studentId:s.id,studentName:s.name,title,body,topic,visibility,createdAt:now,updatedAt:now,files:[],replies:[],teacherRequested:i===0,resolved:i===1,demo:true};
  if(i===1)q.replies.push({id:id+'-t',kind:'teacher',name:'선생님 답변 예시',demo:true,body:'실수 범위에서 logₐx=y는 aʸ=x를 뜻합니다. 양수인 밑의 거듭제곱은 양수이므로 x>0입니다. a=1이면 모든 거듭제곱이 1이 되어 지수를 하나로 정할 수 없고, 음수나 0인 밑은 모든 실수 지수에 대해 정의할 수 없으므로 a>0 조건을 사용합니다. 다음 문제에서는 밑과 진수의 조건을 먼저 적어 보세요.',createdAt:now});
  if(i===2)q.replies.push({id:id+'-t',kind:'teacher',name:'선생님 답변 예시',demo:true,body:'가상 답변 예시 · 각 단계에서 어떤 조건 때문에 그 방법을 선택했는지를 적어 보세요. “두 식의 공통 항이 보여서 소거를 선택했다”처럼 조건과 행동을 연결하면 됩니다.',createdAt:now});w.questions!.push(q);
 });w.questionExampleVersion=2;
}
