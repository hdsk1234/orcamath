import {getOrcaUser} from './lib/social-auth';
import Landing from './components/Landing';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getOrcaUser();return <Landing signedIn={!!user}/>;}
