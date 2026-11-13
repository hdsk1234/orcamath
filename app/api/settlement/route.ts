import {identity,loadWorkspace,json,failure,AppError} from '../../lib/server';
import {canAccessStudent} from '../../lib/domain';
import {financials,teacherRate} from '../../lib/billing';
import {staffOwnDues} from '../../lib/cashdesk';
export async function GET(){try{const {viewer,workspaceId}=await identity();if(!['teacher','assistant'].includes(viewer.role))throw new AppError(403,'강사·조교 본인 지급 내역만 조회할 수 있습니다.');const {workspace}=await loadWorkspace(workspaceId);const rows=staffOwnDues(workspace,viewer);return json({rows,teacherId:viewer.teacherId??null});}catch(e){return failure(e);}}
