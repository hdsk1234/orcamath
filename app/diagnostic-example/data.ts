import type {DiagnosticReportData,ReportArea} from '../lib/diagnostic-report';
import {REPORT_AREAS,DIAGNOSTIC_GUIDES,REPORT_GUIDE_VERSION} from '../lib/diagnostic-guides';
// Server-only consultation example; import from the protected page only.
export function jaewonReport():DiagnosticReportData{
 const oldAreas=[
  {id:'attitude',name:'태도·마인드',score:7,tag:'성장에 활용할 강점',evidence:'피드백 수용력·승부욕·적극성·미래 목표가 긍정적으로 평가됐어요. 빠른 풀이와 스킬에 대한 기대는 남아 있어요.',meaning:'피드백을 받아들이는 태도를 풀이 습관을 바꾸는 힘으로 활용할 수 있어요.',action:'풀이 속도보다 “이 조건에서 왜 이 방법을 쓰는가”를 먼저 설명해 보세요.'},
  {id:'lifestyle',name:'생활습관',score:3,tag:'함께 보완할 기반',evidence:'기상이 늦고 불규칙하며, 수면이 부족하고 취침 전 휴대폰을 사용해요. 유산소 운동과 식습관은 긍정적으로 평가됐어요.',meaning:'공부 시간을 늘리는 것과 함께, 정해진 시간에 공부를 시작할 수 있는 생활 리듬이 필요해요.',action:'수면시간을 확보하고 취침·기상 시각을 일정하게 맞추세요. 자기 전에는 휴대폰을 멀리 두세요.'},
  {id:'concept',name:'개념 이해',score:3,tag:'개념 사이의 빈틈 보완',evidence:'미적분1 개념 문항의 기존 채점 기록은 15개 중 4.5개예요. 공식 암기를 넘어 이해한 부분도 있지만 단원별 차이가 컸어요.',meaning:'알고 있는 개념과 설명이 막히는 개념을 구분해, 빈틈을 실제 문제와 연결해야 해요.',action:'정의·사용 조건을 직접 설명하고, 해당 개념이 쓰이는 짧은 문제에 이어서 적용해 보세요.'},
  {id:'approach',name:'문제 접근',score:2,tag:'가장 먼저 바꿀 부분',evidence:'미적분1 문제풀이 15개 중 2개를 맞혔어요. 공식을 직접 적용하는 문제에서도 어려움이 확인됐어요.',meaning:'문제의 조건을 해석하고 필요한 개념과 풀이 방향을 선택하는 연결 과정이 우선 과제예요.',action:'종이에 조건 정리와 구하는 것을 먼저 쓰고, 사용할 개념을 고른 이유를 말한 뒤 풀이를 시작하세요.'},
  {id:'debugging',name:'실수 관리',score:3,tag:'점검 방법 만들기',evidence:'계산 실수가 많고 구체적인 예방·검토 방법은 부족해요. 실수를 인식하고 고치려는 의지는 확인됐어요.',meaning:'실수를 알아차리는 데서 한 걸음 더 나아가, 풀이 중에 확인할 기준이 필요해요.',action:'반복된 실수를 기록하고 부호·조건·계산처럼 실제 틀린 지점을 다음 풀이의 점검 항목으로 정하세요.'},
  {id:'exam',name:'시험운용',score:4,tag:'실전 기준 연습',evidence:'시험 긴장이 크고 문제를 넘기는 기준과 검토 순서가 부족하다고 평가됐어요. 상담에서는 결과에 대한 과도한 몰입은 크지 않았어요.',meaning:'실전에서 어떤 문제를 먼저 풀고, 언제 넘어가고, 무엇을 검토할지 기준을 익혀야 해요.',action:'시간을 재고 풀면서 막힌 문제를 넘긴 시점과 검토 순서를 기록하고, 담당 선생님과 조정하세요.'},
 ];
 const topics=[['principles'],['sleep','phone','morning'],['notebook','connection'],['strategy','transfer'],['prevention','review'],['selection','tension','exam-review']];
 const areas:ReportArea[]=REPORT_AREAS.map((a,i)=>({...a,score:oldAreas[i].score,source:'기존 상담 평가',evidence:oldAreas[i].evidence,action:oldAreas[i].action,note:'',weakTopics:[],matches:DIAGNOSTIC_GUIDES[a.id].topics.filter(t=>topics[i].includes(t.id)).map(t=>({id:t.id,title:t.title,advice:t.advice,basis:'기존 상담 소견에서 확인한 지도 방향이에요.',distance:2}))}));
 return {studentId:'example-jaewon',name:'임재원',version:'historical-counsel-example',guideVersion:REPORT_GUIDE_VERSION,ready:true,regular:false,example:true,title:'높은 잠재력을 문제를 푸는 행동으로 연결해요.',summary:'피드백을 받아들이는 태도와 학습 잠재력은 강점이에요. 지금은 문제의 조건을 읽고, 사용할 개념과 풀이 방향을 선택하는 연습이 가장 시급해요.',type:'고잠재형 행동미형성·실전취약형',sourceNote:'원장님이 평가한 기존 점수와 상담 소견을 유지한 예시예요. 새 설문 응답을 만들거나 재채점하지 않았어요.',areas,priorities:['L4','L3','P5'],potential:{label:'상',provisional:false,reason:'기존 상담 판정: 국어 1~2등급, 빠른 습득력과 과거 학업 경험을 근거로 평가했어요. 현재 기준으로 재확정하려면 공식 국어 성적의 응시일과 최소 2회 이상의 기록을 확인해야 해요.'},strengths:['피드백을 받아들이는 태도와 분명한 목표','게임·운동을 빠르게 배우는 경험과 과거 학업 성취','실수를 인식하고 개선하려는 의지'],note:'개념을 공부한 흔적은 있지만 단원별 빈틈이 있고, 실제 문제에서 어떤 개념을 꺼내 써야 할지 판단하는 데 어려움이 확인됐어요. 조건을 해석하고 풀이를 선택하는 과정을 반복해서 설명하고, 생활 리듬·계산 실수 점검·문제 전환 기준을 함께 정리해요. 다음 확인의 기준은 혼자 첫 접근을 정하고 그 이유를 설명할 수 있는지예요.',history:[]};
}
