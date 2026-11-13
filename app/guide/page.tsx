import {requireOrcaUser} from '../lib/social-auth';
import StudyGuide from '../components/StudyGuide';
import BrandLogo from '../components/BrandLogo';
export const dynamic='force-dynamic';
export const metadata={title:'학습 이용 가이드 | ORCA 수학'};
export default async function GuidePage(){await requireOrcaUser('/guide');return <main className="guide-standalone"><header><a href="/classroom"><BrandLogo/> ORCA 수학</a><a href="/classroom">내 학습 공간으로 →</a></header><h1>학습 이용 가이드</h1><StudyGuide/></main>;}
