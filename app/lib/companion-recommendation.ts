import {DIAGNOSTIC_VERSION} from './diagnostic.ts';
import {QUESTION_ROWS,diagnosis,type Student} from './domain.ts';
import {SPECIES,type Species} from './companions.ts';

export const COMPANION_PREFERENCE_KEY='orca.companion-preference.v1';
export function validSpecies(value:unknown):Species|null{return SPECIES.some(s=>s.id===value)?value as Species:null;}
export function preferenceSpecies(raw:string|null,now=Date.now()):Species|null{
 try{const p=JSON.parse(raw??'null');return p&&Number.isFinite(p.at)&&p.at<=now&&now-p.at<=7*86400000?validSpecies(p.species):null;}catch{return null;}
}
export function companionDiagnosisPath(species:Species|null){return '/classroom?view=survey'+(species?'&friend='+species:'');}
export function recommendCompanion(student:Student){
 const low=(id:string)=>typeof student.answers[id]==='number'&&student.answers[id]!<=2;
 const high=(id:string)=>typeof student.answers[id]==='number'&&student.answers[id]!>=4;
 const numeric=QUESTION_ROWS.filter(q=>typeof student.answers[q[0]]==='number').length;
 const original=student.diagnostic?.version===DIAGNOSTIC_VERSION;
 const ready=original?!!student.diagnostic?.survey.submittedAt:!!student.surveyAt&&numeric>=8;
 if(!ready)return {species:null,reason:'진단 설문을 마치면 응답에서 확인한 학습 목표에 맞춰 친구를 추천해 줄게.',provisional:true};
 const result=diagnosis(student),type=result.primary.type;
 let species:Species='orca',reason='진단에서 확인한 공부 방향을 매일의 실천으로 이어 가 보자. 오르와 작은 완성을 차곡차곡 쌓아볼 수 있어.';
 if(original){const a=student.diagnostic!.survey.answers;if(type==='개념 이해 보완'){species='turtle';reason='선생님이 확인한 개념의 정의와 조건을 루트와 탄탄하게 다져 보자.';}else if(type==='풀이 접근 훈련'){species='shark';reason='샤프와 문제 조건을 정리하고 첫 풀이를 선택하는 연습을 해 보자.';}else if(type==='실수 관리 보완'){species='octopus';reason='모아와 풀이 단계마다 나만의 점검 방법을 연결해 보자.';}else if(Number(a['OMD-020'])>=4||Number(a['OMD-021'])>=4){species='seahorse';reason='루미와 개념의 뜻과 이유를 내 말로 설명하는 습관을 길러 보자.';}return {species,reason,provisional:!result.reviewed};}
 if(type==='실행 관리 우선'){reason='계획한 공부를 마치고 밀린 공부를 다시 시작하는 데 어려움이 있다고 응답했어. 오르와 오늘 할 일을 하나씩 이어 가 보자.';}
 else if(type==='개념과 접근 보완'){species='turtle';reason='선생님 평가에서 기본 개념을 보완하면 도움이 될 부분이 확인됐어. 루트와 개념의 뿌리를 탄탄하게 다져 보자.';}
 else if(type==='풀이 접근 훈련'){species='shark';reason='선생님 평가에서 문제의 첫 접근을 연습할 필요가 확인됐어. 샤프와 조건을 정리하고 첫 풀이를 시작해 보자.';}
 else if(type==='실수 관리 보완'){species='octopus';reason='알고 있는 점검 방법을 풀이 중에 사용하는 연습이 필요하다고 응답했어. 모아와 풀이의 각 단계와 점검 방법을 연결해 보자.';}
 else if(low('G1-06')&&low('G1-07')){reason='계획 이행과 밀린 공부의 재시작이 어렵다고 응답했어. 오르와 실행할 수 있는 작은 분량부터 이어 가 보자.';}
 else if(['L3-01','L3-02','L3-03','L3-04'].filter(low).length>=2||high('L3-05')||high('L4-05')){species='seahorse';reason='개념이나 풀이를 내 말로 설명하는 습관을 더 키울 수 있다는 응답이 있었어. 루미와 공식의 이유와 풀이의 뜻을 설명해 보자.';}
 else if(['L4-01','L4-02','L4-03','L4-04'].filter(low).length>=2){species='shark';reason='문제의 조건을 정리하고 풀이 방향을 고르는 연습이 도움이 된다는 응답이 있었어. 샤프와 첫 단계를 찾아보자.';}
 else if(['L3-01','L3-02','L4-02','L4-03'].filter(high).length>=3){species='octopus';reason='개념을 확인하고 조건과 풀이를 연결하는 습관이 응답에서 보였어. 모아와 여러 생각을 연결하는 연습을 이어 가 보자.';}
 return {species,reason,provisional:!result.reviewed};
}
