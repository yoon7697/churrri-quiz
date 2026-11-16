export const POINTS=10,DURATIONS=[0,15,20,30,45,60];
export const DEMO={id:'demo-five',title:'오늘 배운 걸, 함께 한 번 더!',subject:'과학 · 사회 · 수학',builtIn:true,questions:[
{id:'demo-1',text:'물이 수증기로 변하는 현상을 무엇이라고 할까요?',options:['응결','증발','동결','융해'],correct:1,explanation:'액체 상태의 물이 기체인 수증기로 변하는 현상은 증발이에요.',kind:'lesson'},
{id:'demo-2',text:'일반적으로 지도의 위쪽은 어느 방향일까요?',options:['북쪽','남쪽','동쪽','서쪽'],correct:0,explanation:'별도의 방위 표시가 없다면 일반적인 지도의 위쪽은 북쪽이에요. 방위표가 있다면 그 표시를 먼저 확인해요.',kind:'lesson'},
{id:'demo-3',text:'삼각형의 세 각의 크기를 모두 더하면 얼마일까요?',options:['90도','120도','180도','360도'],correct:2,explanation:'평평한 종이 위에 그린 삼각형의 세 각의 합은 180도예요.',kind:'lesson'},
{id:'demo-4',text:'페트병을 분리배출하는 올바른 방법은 무엇일까요?',options:['내용물이 남은 채 버려요','다른 쓰레기를 안에 넣어요','라벨을 붙인 채 일반 쓰레기에 넣어요','내용물을 비우고 라벨을 분리해요'],correct:3,explanation:'내용물을 비우고 헹군 뒤 라벨을 분리해요. 뚜껑 등 세부 배출 방법은 지역 안내도 함께 확인해요.',kind:'lesson'},
{id:'demo-5',text:'지구가 태양 주위를 한 바퀴 도는 데 걸리는 시간은?',options:['약 하루','약 일주일','약 한 달','약 일 년'],correct:3,explanation:'지구가 태양 주위를 도는 운동을 공전이라고 해요. 한 바퀴 도는 데 약 일 년이 걸려요.',kind:'lesson'}]};
export const uid=()=>crypto.randomUUID();
function text(v,n,max){if(typeof v!=='string'||!v.trim()||v.trim().length>max)throw Error(`${n}을(를) 확인해 주세요.`);return v.trim();}
export function validateQuiz(v,{freshIds=false}={}){
 if(!v||typeof v!=='object'||!Array.isArray(v.questions)||v.questions.length<1||v.questions.length>30)throw Error('문제는 1~30개로 구성해 주세요.');
 const ids=new Set();const questions=v.questions.map((q,i)=>{
  if(!q||!Array.isArray(q.options)||q.options.length!==4)throw Error(`${i+1}번 문제의 보기 네 개를 확인해 주세요.`);
  if(!Number.isInteger(q.correct)||q.correct<0||q.correct>3)throw Error(`${i+1}번 문제의 정답을 선택해 주세요.`);
  const options=q.options.map((s,j)=>text(s,`${i+1}번 문제의 ${j+1}번 보기`,180));
  if(new Set(options).size!==4)throw Error(`${i+1}번 문제에 같은 보기가 있어요.`);
  const id=freshIds?uid():text(q.id,'문제 번호',100);if(ids.has(id))throw Error('문제 번호가 중복돼요.');ids.add(id);
  return{id,text:text(q.text,`${i+1}번 문제`,500),options,correct:q.correct,explanation:typeof q.explanation==='string'?q.explanation.slice(0,1200).trim():'',kind:q.kind==='nonsense'?'nonsense':'lesson'};
 });
 return{id:freshIds?uid():text(v.id,'퀴즈 번호',100),title:text(v.title,'퀴즈 제목',80),subject:typeof v.subject==='string'?v.subject.slice(0,80):'',questions,updatedAt:Date.now()};
}
export function createSession(quiz,names,duration=30,now=Date.now()){
 const q=validateQuiz(quiz);if(!Array.isArray(names)||names.length<2||names.length>12)throw Error('모둠 수는 2~12개로 선택해 주세요.');
 const clean=names.map(n=>text(n,'모둠 이름',16));if(new Set(clean).size!==clean.length)throw Error('모둠 이름을 서로 다르게 입력해 주세요.');if(!DURATIONS.includes(duration))throw Error('제한 시간을 확인해 주세요.');
 return{id:uid(),quiz:structuredClone(q),groups:clean.map((name,i)=>({id:`g${i}`,name})),index:0,phase:'question',awards:q.questions.map(()=>[]),pending:[],timer:{duration,remaining:duration,deadline:duration?now+duration*1000:null,running:duration>0}};
}
export function setAward(s,ids,index=s.index){if(!Number.isInteger(index)||index<0||index>=s.quiz.questions.length)throw Error('문제 번호를 확인해 주세요.');if(!Array.isArray(ids)||ids.some(id=>!s.groups.some(g=>g.id===id)))throw Error('모둠을 확인해 주세요.');s.awards[index]=[...new Set(ids)];return s;}
export function totals(s){return s.groups.map(g=>({...g,score:s.awards.reduce((n,a)=>n+(a.includes(g.id)?POINTS:0),0)}));}
export function ranked(s){const rows=totals(s).sort((a,b)=>b.score-a.score);return rows.map(g=>({...g,rank:rows.findIndex(x=>x.score===g.score)+1,joint:rows.filter(x=>x.score===g.score).length>1}));}
export function remaining(s,now=Date.now()){const t=s.timer;return t.duration===0?0:Math.max(0,Math.min(t.duration,t.running&&t.deadline!==null?Math.ceil((t.deadline-now)/1000):t.remaining));}
export function pauseTimer(s,now=Date.now()){s.timer.remaining=remaining(s,now);s.timer.running=false;s.timer.deadline=null;}
export function toggleTimer(s,now=Date.now()){if(s.timer.running)pauseTimer(s,now);else if(s.timer.remaining>0){s.timer.running=true;s.timer.deadline=now+s.timer.remaining*1000;}}
export function nextQuestion(s,now=Date.now()){if(s.index===s.quiz.questions.length-1){s.phase='finished';pauseTimer(s,now);return;}s.index++;s.phase='question';s.pending=[];s.timer.remaining=s.timer.duration;s.timer.deadline=s.timer.duration?now+s.timer.duration*1000:null;s.timer.running=s.timer.duration>0;}
export function restoreSession(v){try{if(!v||!Array.isArray(v.groups))return null;const s=createSession(v.quiz,v.groups.map(g=>g.name),v.timer?.duration);if(!Number.isInteger(v.index)||v.index<0||v.index>=s.quiz.questions.length||!['question','answer','award','score','finished'].includes(v.phase)||!Array.isArray(v.awards)||v.awards.length!==s.quiz.questions.length)return null;v.awards.forEach((a,i)=>setAward(s,a,i));setAward(s,v.pending||[],v.index);s.pending=[...s.awards[v.index]];s.awards[v.index]=[...new Set(v.awards[v.index])];s.index=v.index;s.phase=v.phase;s.timer.remaining=Math.max(0,Math.min(s.timer.duration,Number(v.timer.remaining)||0));s.timer.running=v.phase==='question'&&!!v.timer.running&&Number.isFinite(v.timer.deadline)&&s.timer.duration>0;s.timer.deadline=s.timer.running?v.timer.deadline:null;return s;}catch{return null;}}
export function parseImport(v){if(!v||v.format!=='churrri-quiz'||v.version!==1||!Array.isArray(v.quizzes)||!v.quizzes.length||v.quizzes.length>30)throw Error('우리 반 퀴즈왕에서 내보낸 퀴즈 파일을 선택해 주세요.');return v.quizzes.map(q=>validateQuiz(q,{freshIds:true}));}
