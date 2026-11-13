import {notFound} from 'next/navigation';
import {requireOrcaUser} from '../lib/social-auth';
import Academy from '../components/Academy';
import {validSpecies} from '../lib/companion-recommendation';
import {classroomPath,parseClassroomRoute} from '../lib/classroom-navigation';
export default async function Classroom({params,searchParams}:{params?:Promise<{route?:string[]}>;searchParams:Promise<{view?:string;friend?:string;studentId?:string}>}){
 const parts=(await params)?.route??[];
 const route=parts.length?parseClassroomRoute(parts):null;
 if(parts.length&&!route)notFound();
 const {view,friend,studentId}=await searchParams;
 const initialCompanion=validSpecies(friend);
 const initialTab=route?.tab??(view==='survey'?'survey':view==='result'?'result':'today');
 const returnTo=route?classroomPath(route.mode,route.tab,studentId,initialCompanion):'/classroom'+(view||studentId||initialCompanion?'?'+new URLSearchParams({...view?{view}:{},...studentId?{studentId}:{},...initialCompanion?{friend:initialCompanion}:{}}).toString():'');
 const user=await requireOrcaUser(returnTo);
 return <Academy signedInName={user.displayName} initialTab={initialTab} initialMode={route?.mode} initialCompanion={initialCompanion} initialStudentId={studentId}/>;
}
