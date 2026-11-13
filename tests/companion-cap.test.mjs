import test from 'node:test';import assert from 'node:assert/strict';
import {makeStudent,makeThemes,studentStats,addDays} from '../app/lib/domain.ts';
import {reconcileCompanions} from '../app/lib/companions.ts';
test('퇴화해도 레벨 내부의 기존 경험치 진행분을 보존한다',()=>{
 const start='2026-10-01',s=makeStudent('기존 진행분','progress',false,start);s.startDate=start;s.selected=[];
 for(let n=0;n<54;n++)s.marks['past-'+n]={status:'approved',xpEfficiency:1};
 const w={students:[s],themes:makeThemes(),consultations:[],updatedAt:''};reconcileCompanions(w,start);
 reconcileCompanions(w,addDays(start,10));const stats=studentStats(s,w.themes);
 assert.equal(stats.xp,540);assert.equal(stats.level,5);assert.equal(stats.levelXp,40);assert.equal(stats.nextLevel,60);
});
test('과거 확인 대기 때문에 이후 별도의 7일 실패 판정이 막히지 않는다',()=>{
 const start='2026-10-01',s=makeStudent('확인 대기','pending',false,start);s.startDate=start;s.selected=[];
 const w={students:[s],themes:makeThemes(),consultations:[],updatedAt:''};reconcileCompanions(w,start);
 s.marks[`daily:${start}:wake`]={status:'submitted'};
 reconcileCompanions(w,addDays(start,8));assert.equal(s.companion.state,3);assert.equal(s.companion.regressionDates.length,0);
 reconcileCompanions(w,addDays(start,11));assert.equal(s.companion.regressionDates.length,1);
});
test('Lv.50 초과 누적 XP가 있어도 퇴화하고, 퇴화 이후 새 XP로만 회복한다',()=>{
 const start='2026-10-01',s=makeStudent('최대레벨','max',false,start);s.startDate=start;s.selected=[];
 for(let n=0;n<700;n++)s.marks['legacy-'+n]={status:'approved',xpEfficiency:1};
 const w={students:[s],themes:makeThemes(),consultations:[],updatedAt:''};reconcileCompanions(w,start);assert.equal(studentStats(s,w.themes).level,50);
 reconcileCompanions(w,addDays(start,10));assert.equal(studentStats(s,w.themes).level,49);assert.equal(studentStats(s,w.themes).xp,7000);
 reconcileCompanions(w,addDays(start,13));assert.equal(studentStats(s,w.themes).level,48);
 const today=addDays(start,13);for(const kind of ['wake','problems','writing'])s.marks[`daily:${today}:${kind}`]={status:'approved'};
 reconcileCompanions(w,today);assert.equal(s.companion.state,0);assert.equal(studentStats(s,w.themes).level,48);
 for(let n=0;n<7;n++)s.marks['new-'+n]={status:'approved'};reconcileCompanions(w,today);
 assert.equal(studentStats(s,w.themes).level,49);assert.equal(studentStats(s,w.themes).xp,7100);assert.equal(studentStats(s,w.themes).levelXp,0);
});
