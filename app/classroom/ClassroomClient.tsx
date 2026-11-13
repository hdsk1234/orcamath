'use client';
import {usePathname,useSearchParams} from 'next/navigation';
import Academy from '../components/Academy';
import {classroomLocation} from '../lib/classroom-navigation';
import {validSpecies} from '../lib/companion-recommendation';

export default function ClassroomClient({signedInName}:{signedInName:string}){
 const pathname=usePathname(),search=useSearchParams();
 const location=classroomLocation(pathname,search);
 // Unknown paths belong to the server's 404 page, not the persistent shell.
 if(!location)return null;
 return <Academy signedInName={signedInName} initialMode={location.mode} initialTab={location.tab} initialStudentId={location.studentId} initialCompanion={validSpecies(location.friend)}/>;
}
