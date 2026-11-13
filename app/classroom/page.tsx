import {requireOrcaUser} from '../lib/social-auth';
import Academy from '../components/Academy';
import {validSpecies,companionDiagnosisPath} from '../lib/companion-recommendation';
export const dynamic='force-dynamic';
export default async function Classroom({searchParams}:{searchParams:Promise<{view?:string;friend?:string;studentId?:string}>}){
 const {view,friend,studentId}=await searchParams;
 const initialCompanion=validSpecies(friend);
 const user=await requireOrcaUser(view==='survey'?companionDiagnosisPath(initialCompanion):'/classroom');
 return <Academy signedInName={user.displayName} initialTab={view==='survey'?'survey':view==='result'?'result':'today'} initialCompanion={initialCompanion} initialStudentId={studentId}/>;
}
