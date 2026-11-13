'use client';
import {useEffect,useRef,useState} from 'react';
import {BookOpen,CalendarDays,ChevronDown,ClipboardCheck,GraduationCap,LayoutDashboard,Link2,LogOut,MessageCircle,Sparkles,Target} from 'lucide-react';
import BrandLogo from './BrandLogo';
import './learning-navigation.css';

const groups=[
 {title:'학습',keys:['today','plan','books','questions']},
 {title:'성장',keys:['growth','character']},
 {title:'수강',keys:['billing']},
 {title:'진단',keys:['survey','result']},
 {title:'명예의 전당',keys:['hall']},
 {title:'이용 가이드',keys:['guide']},
];
const icons={today:LayoutDashboard,plan:CalendarDays,books:BookOpen,questions:MessageCircle,survey:ClipboardCheck,result:Target,growth:Sparkles,character:Sparkles,billing:BookOpen,hall:GraduationCap,guide:BookOpen};
export default function LearningNavigation({tabs,activeTab,guardian,hrefFor,navigate}:{tabs:string[][];activeTab:string;guardian:boolean;hrefFor:(key:string)=>string;navigate:(key:string)=>Promise<void>}){
 const [open,setOpen]=useState<string|null>(null);
 const header=useRef<HTMLElement>(null),navigation=useRef<HTMLElement>(null),lastTrigger=useRef<HTMLButtonElement|null>(null);
 const availableGroups=groups.map(group=>({...group,items:group.keys.flatMap(key=>{const item=tabs.find(([tab])=>tab===key);return item?[item]:[];})})).filter(group=>group.items.length);
 useEffect(()=>{setOpen(null);},[activeTab]);
 useEffect(()=>{
  const closeOutside=(e:PointerEvent)=>{if(navigation.current&&!navigation.current.contains(e.target as Node))setOpen(null);};
  document.addEventListener('pointerdown',closeOutside);
  return()=>document.removeEventListener('pointerdown',closeOutside);
 },[]);
 return <header className="learning-header" ref={header}>
  <div className="learning-header-inner">
   <a className="learning-header-brand" href="/" aria-label="ORCA 수학 홈페이지"><BrandLogo/><span>ORCA<small>수학</small></span></a>
   <nav ref={navigation} className="learning-top-nav" aria-label={guardian?'학부모 학습 메뉴':'학생 학습 메뉴'} onPointerLeave={e=>{if(e.pointerType==='mouse')setOpen(null);}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOpen(null);}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setOpen(null);lastTrigger.current?.focus();}}}>
    {availableGroups.map((group,index)=><div key={group.title} className={`learning-menu-group ${group.keys.includes(activeTab)?'is-active':''} ${open===group.title?'is-open':''}`} onPointerEnter={e=>{if(e.pointerType==='mouse'){lastTrigger.current=e.currentTarget.querySelector('button');setOpen(group.title);}}}>
     <button type="button" className="learning-menu-trigger" aria-expanded={open!==null} aria-controls="learning-mega-menu" onClick={e=>{lastTrigger.current=e.currentTarget;if(window.matchMedia('(hover: hover)').matches)setOpen(group.title);else setOpen(current=>current===null?group.title:null);}} onKeyDown={e=>{
      if(e.key==='ArrowDown'){e.preventDefault();lastTrigger.current=e.currentTarget;setOpen(group.title);requestAnimationFrame(()=>header.current?.querySelector<HTMLAnchorElement>(`[data-group-panel="${index}"] a`)?.focus());}
     }}>{group.title}<ChevronDown size={14} aria-hidden="true"/></button>
    </div>)}
    <div id="learning-mega-menu" className="learning-mega-menu" hidden={open===null} aria-label="전체 세부 메뉴">
     {availableGroups.map((group,index)=><section key={group.title} className="learning-menu-panel" data-group-panel={index} aria-label={`${group.title} 세부 메뉴`}>
      <h2 className="learning-menu-caption">{group.title}</h2>
      {group.items.map(([key,label])=>{const Icon=icons[key as keyof typeof icons];return <a key={key} href={hrefFor(key)} aria-current={activeTab===key?'page':undefined} className={activeTab===key?'is-current':''} onClick={e=>{
       if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
       e.preventDefault();setOpen(null);void navigate(key);
      }}><Icon size={18} aria-hidden="true"/><span>{label}</span>{activeTab===key&&<i aria-hidden="true"/>}</a>;})}
     </section>)}
    </div>
   </nav>
   <div className="learning-header-account"><span className="learning-space-label">{guardian?'학부모 공간':'학생 공간'}</span><a href="/login?connect=1" target="_top" aria-label="로그인 계정 연결"><Link2 size={16}/><span>계정 연결</span></a><a href="/logout" target="_top"><LogOut size={16}/><span>로그아웃</span></a></div>
  </div>
 </header>;
}
