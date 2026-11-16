'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {BookOpen,CalendarDays,ChevronDown,ClipboardCheck,GraduationCap,LayoutDashboard,Link2,LogOut,MessageCircle,Sparkles,Target,TrendingUp,Users} from 'lucide-react';
import BrandLogo from './BrandLogo';
import './learning-navigation.css';

const groups=[
 {title:'학습',keys:['today','plan','books','questions']},
 {title:'성장',keys:['growth','character']},
 {title:'장학',keys:['billing']},
 {title:'더보기',keys:['survey','result','hall','guide']},
];
const managementGroups=[
 {title:'현황',keys:['overview']},
 {title:'학습 관리',keys:['submissions','reminders','students','assessments','questions','materials']},
 {title:'상담·등록',keys:['leads','sales']},
 {title:'학원 운영',keys:['members','finance','settlement']},
 {title:'안내·성과',keys:['guide','hall']},
];
const icons={overview:LayoutDashboard,submissions:ClipboardCheck,reminders:MessageCircle,students:Users,assessments:GraduationCap,materials:BookOpen,leads:Users,sales:TrendingUp,members:Users,finance:TrendingUp,settlement:TrendingUp,today:LayoutDashboard,plan:CalendarDays,books:BookOpen,questions:MessageCircle,survey:ClipboardCheck,result:Target,growth:Sparkles,character:Sparkles,billing:BookOpen,hall:GraduationCap,guide:BookOpen};
export default function LearningNavigation({tabs,activeTab,guardian,management=false,spaceLabel,hrefFor,navigate}:{tabs:string[][];activeTab:string;guardian:boolean;management?:boolean;spaceLabel?:string;hrefFor:(key:string)=>string;navigate:(key:string)=>Promise<void>}){
 const [open,setOpen]=useState<string|null>(null);
 const navigation=useRef<HTMLElement>(null),lastTrigger=useRef<HTMLButtonElement|null>(null);
 const availableGroups=(management?managementGroups:groups).map(group=>({...group,items:group.keys.flatMap(key=>{const item=tabs.find(([tab])=>tab===key);return item?[item]:[];})})).filter(group=>group.items.length);
 useEffect(()=>{setOpen(null);},[activeTab,management]);
 useEffect(()=>{
  const closeOutside=(e:PointerEvent)=>{if(navigation.current&&!navigation.current.contains(e.target as Node))setOpen(null);};
  document.addEventListener('pointerdown',closeOutside);
  return()=>document.removeEventListener('pointerdown',closeOutside);
 },[]);
 const follow=(event:React.MouseEvent<HTMLAnchorElement>,key:string)=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();setOpen(null);void navigate(key);
 };
 return <header className={`learning-header ${management?'management-header':''}`}>
  <div className="learning-header-inner">
   <a className="learning-header-brand" href="/" aria-label="ORCA 수학 홈페이지"><BrandLogo/><span>ORCA<small>수학</small></span></a>
   <nav ref={navigation} className="learning-top-nav" style={{'--menu-columns':availableGroups.length} as CSSProperties} aria-label={management?'학원 관리 메뉴':guardian?'학부모 학습 메뉴':'학생 학습 메뉴'} onPointerLeave={e=>{if(e.pointerType==='mouse')setOpen(null);}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOpen(null);}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setOpen(null);lastTrigger.current?.focus();}}}>
    <div className="learning-menu-strip">
     {availableGroups.map(group=><div key={group.title} className={`learning-menu-group ${group.keys.includes(activeTab)?'is-active':''} ${open===group.title?'is-open':''}`} onPointerEnter={e=>{if(e.pointerType==='mouse'){lastTrigger.current=e.currentTarget.querySelector('button');setOpen(group.title);}}}>
      <button type="button" className="learning-menu-trigger" aria-expanded={open!==null} aria-controls="learning-submenu" onClick={e=>{lastTrigger.current=e.currentTarget;if(window.matchMedia('(hover: hover)').matches)setOpen(group.title);else setOpen(current=>current===null?group.title:null);}} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();lastTrigger.current=e.currentTarget;setOpen(group.title);requestAnimationFrame(()=>navigation.current?.querySelector<HTMLAnchorElement>(`[data-menu-group="${group.title}"] a`)?.focus());}}}>{group.title}<ChevronDown size={14} aria-hidden="true"/></button>
     </div>)}
    </div>
    <div id="learning-submenu" className="learning-submenu" hidden={open===null} aria-label="전체 세부 메뉴">
     {availableGroups.map(group=><section className="learning-submenu-group" data-menu-group={group.title} aria-label={`${group.title} 세부 메뉴`} key={group.title}>
      {group.items.map(([key,label])=>{const Icon=icons[key as keyof typeof icons];return <a key={key} href={hrefFor(key)} className={activeTab===key?'is-current':''} aria-current={activeTab===key?'page':undefined} onClick={e=>follow(e,key)}><Icon size={17} aria-hidden="true"/><span>{key==='books'?'내 교재':label}</span></a>;})}
     </section>)}
    </div>
   </nav>
   <div className="learning-header-account"><span className="learning-space-label">{spaceLabel??(management?'학원 관리':guardian?'학부모 공간':'학생 공간')}</span><a href="/login?connect=1" target="_top" aria-label="로그인 계정 연결"><Link2 size={16}/><span>계정 연결</span></a><a href="/logout" target="_top"><LogOut size={16}/><span>로그아웃</span></a></div>
  </div>
 </header>;
}
