export const STAFF_DIRECTORY=[
 {name:'박상우',role:'manager',teacherId:null,title:'총괄관리자'},
 {name:'강신의',role:'teacher',teacherId:'kang',title:'강사 관리자'},
 {name:'송서균',role:'teacher',teacherId:'song',title:'강사 관리자'},
 {name:'어동선',role:'teacher',teacherId:'eo',title:'강사 관리자'},
 {name:'변지석',role:'teacher',teacherId:'byun',title:'부원장 · 노베 전용 강사 · 상담실장'},
] as const;
export function staffForName(name:string){return STAFF_DIRECTORY.find(s=>s.name===name.trim());}
export function signupRole(name:string,choice:string){return staffForName(name)?.role??(choice==='parent'?'parent':'student');}
