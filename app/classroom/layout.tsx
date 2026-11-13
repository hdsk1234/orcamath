import type {ReactNode} from 'react';
import {getOrcaUser} from '../lib/social-auth';
import ClassroomClient from './ClassroomClient';

export const dynamic='force-dynamic';
export default async function ClassroomLayout({children}:{children:ReactNode}){
 const user=await getOrcaUser();
 // The leaf page preserves the exact login return URL for anonymous requests.
 if(!user)return children;
 return <><ClassroomClient signedInName={user.displayName}/>{children}</>;
}
