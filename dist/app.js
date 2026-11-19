import {aiPage} from './ai-view.js';
import {DEMO,uid,validateQuiz,createSession,setAward,remaining,pauseTimer,toggleTimer,nextQuestion,restoreSession,parseImport} from './model.js';
import * as view from './views.js';
const $=s=>document.querySelector(s),root=$('#app'),modal=$('#modal'),KEY='churrri-quiz-v1';
let data={quizzes:[],session:null},storageOK=true,route='home',setupId=DEMO.id,settings={names:Array.from({length:6},(_,i)=>`${i+1}모둠`),duration:30},draft=null,editIndex=0,dirty=false,dialogActions={},toastTimer;
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved){data.quizzes=Array.isArray(saved.quizzes)?saved.quizzes.map(q=>validateQuiz(q)):[];data.session=restoreSession(saved.session);}}catch{storageOK=false;}
function toast(t){clearTimeout(toastTimer);$('#toast').textContent=t;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function persist(){try{localStorage.setItem(KEY,JSON.stringify({version:1,...data}));return true;}catch{storageOK=false;toast('저장하지 못했어요. 퀴즈를 파일로 내보내 보관해 주세요.');return false;}}
const quizzes=()=>[DEMO,...data.quizzes],quizById=id=>quizzes().find(q=>q.id===id),blank=()=>({id:uid(),text:'',options:['','','',''],correct:null,explanation:'',kind:'lesson'});
function openDialog(title,html,actions={}){dialogActions=actions;modal.innerHTML=`<div class="dialog-head"><h2 id="modal-title">${view.esc(title)}</h2><button type="button" data-dialog-action="close" aria-label="닫기">×</button></div>${html}`;if(!modal.open)modal.showModal();}
function confirm(title,text,label,fn){openDialog(title,`<p class="dialog-copy">${view.esc(text)}</p><div class="dialog-actions"><button class="btn" data-dialog-action="close">돌아가기</button><button class="btn primary" data-dialog-action="confirm">${view.esc(label)}</button></div>`,{confirm:()=>{modal.close();fn();}});}
function openImportDialog() {
  openDialog('퀴즈 파일 가져오기', `
    <p class="dialog-copy">집에서 엑셀 양식을 채우고, 학교에서 저장한 파일을 선택하세요. 퀴즈왕에서 내보낸 JSON 파일도 열 수 있어요.</p>
    <p class="hint">엑셀은 .xlsx 형식으로 저장해 주세요. 파일 하나에 최대 30문제를 담을 수 있어요.</p>
    <p id="import-status" class="form-error" role="status"></p>
    <div class="dialog-actions">
      <a class="btn" href="./assets/quiz-template.xlsx" download="우리 반 퀴즈왕 엑셀 양식.xlsx">엑셀 양식 다운로드</a>
      <button type="button" class="btn primary" data-dialog-action="select-file">퀴즈 파일 선택</button>
    </div>
    <input type="file" id="import-file" accept=".xlsx,.json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json" hidden>`,
  {'select-file': () => {
    const input = $('#import-file');
    input.value = '';
    input.click();
  }});
}
modal.addEventListener('click',event=>{const b=event.target.closest('[data-dialog-action]');if(!b)return;if(b.dataset.dialogAction==='close')modal.close();else dialogActions[b.dataset.dialogAction]?.();});
let aiForm={title:'',subject:'',source:'',lessonCount:5,nonsenseCount:0},aiBusy=false,pdfBusy=false,aiMessage='',aiAbort=null;
function go(next){if((aiBusy||pdfBusy)&&next!=='ai'){toast('작업이 끝날 때까지 기다리거나 생성을 취소해 주세요.');return;}if(route==='play'&&next!=='play'&&data.session){pauseTimer(data.session);persist();}route=next;render();window.scrollTo(0,0);}
function guard(fn){if(route==='edit'&&dirty)confirm('수정 중인 퀴즈를 닫을까요?','저장하지 않은 수정 내용은 사라져요.','저장하지 않고 나가기',()=>{dirty=false;fn();});else fn();}
function render(){if(route==='play'&&!data.session)route='home';root.innerHTML=`${storageOK?'':'<div class="status-banner">이 브라우저에 저장하지 못할 수 있어요. 만든 퀴즈는 파일로 내보내 보관해 주세요.</div>'}${route==='play'?'':view.header()}${route==='home'?view.home(data):route==='library'?view.library(quizzes()):route==='ai'?aiPage(aiForm,aiBusy,pdfBusy,aiMessage):route==='setup'?view.setup(quizById(setupId)||DEMO,quizzes(),settings):route==='edit'?view.editor(draft,editIndex):view.play(data.session)}${route==='play'?'':view.footer()}`;tick();}
function startEditor(id){const q=quizById(id);draft=q?structuredClone(q):{id:uid(),title:'',subject:'',questions:[blank()]};if(q?.builtIn){draft.id=uid();delete draft.builtIn;draft.title=q.title+' (복사본)';draft.questions.forEach(v=>v.id=uid());}editIndex=0;dirty=false;go('edit');}
function names(){const fields=[...document.querySelectorAll('.group-name')];if(fields.length)settings.names=fields.map(f=>f.value);}
function save(){try{const q=validateQuiz(draft),i=data.quizzes.findIndex(v=>v.id===q.id);if(i<0){if(data.quizzes.length>=100)throw Error('퀴즈가 가득 찼어요. 먼저 서랍을 정리해 주세요.');data.quizzes.push(q);}else data.quizzes[i]=q;if(!persist())return;dirty=false;go('library');toast('퀴즈 서랍에 저장했어요.');}catch(e){$('#editor-error').textContent=e.message;$('#editor-error').scrollIntoView({block:'center'});}}
function launch(){names();try{validateQuiz(quizById(setupId)||DEMO);createSession(quizById(setupId)||DEMO,settings.names,settings.duration);const begin=()=>{data.session=createSession(quizById(setupId)||DEMO,settings.names,settings.duration);persist();go('play');};if(data.session&&data.session.phase!=='finished')confirm('새 퀴즈를 시작할까요?','진행 중인 퀴즈의 모둠 점수는 새로 시작돼요.','새로 시작하기',begin);else begin();}catch(e){$('#setup-error').textContent=e.message;}}
function restart(){const s=data.session;if(s)confirm('처음부터 다시 풀까요?','모둠 이름은 유지하고 점수는 0점부터 다시 시작해요.','다시 시작하기',()=>{data.session=createSession(s.quiz,s.groups.map(g=>g.name),s.timer.duration);persist();go('play');});}
async function act(a,b){const s=data.session;
 if(a==='home'||a==='library'){guard(()=>go(a));return;}
 if(a==='help'){openDialog('우리 반 5분 퀴즈, 이렇게 해요','<ol class="help-steps"><li><b>퀴즈와 모둠을 선택해요.</b><br>학생 기기 없이 선생님 화면 하나로 진행해요.</li><li><b>함께 의논하고 답을 보여 줘요.</b><br>타이머가 끝나도 정답은 선생님이 공개해요.</li><li><b>맞힌 모둠을 선택해 10점을 더해요.</b><br>선택한 모둠마다 10점, 오답은 0점이에요.</li><li><b>전광판을 보고 다음 문제로!</b><br>점수 수정으로 현재 문제의 기록을 바꿀 수 있어요.</li></ol><p class="hint">새로고침해도 진행 중인 퀴즈를 이어갈 수 있어요. 집과 학교 사이에서는 퀴즈 파일 내보내기·가져오기를 이용해 주세요.</p><div class="dialog-actions"><button class="btn primary" data-dialog-action="close">알겠어요</button></div>');return;}
 if(a==='setup'){setupId=b.dataset.id;guard(()=>go('setup'));return;}
 if(a==='new'){guard(()=>go('ai'));return;}
 if(a==='manual-new'||a==='edit'){guard(()=>startEditor(a==='edit'?b.dataset.id:null));return;}
 if(a==='cancel-ai'){aiAbort?.abort();return;}
 if(a==='save-quiz'){save();return;}
 if(a==='edit-question'){editIndex=Number(b.dataset.index);render();return;}
 if(a==='add-question'){if(draft.questions.length>=30){toast('한 퀴즈에 30문제까지 만들 수 있어요.');return;}draft.questions.push(blank());editIndex=draft.questions.length-1;dirty=true;render();return;}
 if(a==='remove-question'){if(draft.questions.length<2)return;draft.questions.splice(editIndex,1);editIndex=Math.min(editIndex,draft.questions.length-1);dirty=true;render();return;}
 if(a==='move-question-up'||a==='move-question-down'){const n=editIndex+(a==='move-question-up'?-1:1);if(n<0||n>=draft.questions.length)return;[draft.questions[editIndex],draft.questions[n]]=[draft.questions[n],draft.questions[editIndex]];editIndex=n;dirty=true;render();return;}
 if(a==='delete'){const q=quizById(b.dataset.id);if(!q||q.builtIn)return;confirm('퀴즈를 삭제할까요?',`‘${q.title}’을 서랍에서 삭제해요. 진행 중인 퀴즈에는 영향을 주지 않아요.`,'삭제하기',()=>{data.quizzes=data.quizzes.filter(v=>v.id!==q.id);persist();render();toast('퀴즈를 삭제했어요.');});return;}
 if(a==='export'){const q=quizById(b.dataset.id);if(!q)return;const blob=new Blob([JSON.stringify({format:'churrri-quiz',version:1,quizzes:[q]},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=q.title.replace(/[\\/:*?"<>|]/g,'_')+'.quiz.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('퀴즈 파일을 내보냈어요.');return;}
 if(a==='import'){guard(openImportDialog);return;}
 if(a==='less-group'||a==='more-group'){names();const n=settings.names.length+(a==='less-group'?-1:1);if(n<2||n>12)return;settings.names=Array.from({length:n},(_,i)=>settings.names[i]??`${i+1}모둠`);render();return;}
 if(a==='duration'){names();settings.duration=Number(b.dataset.value);render();return;}
 if(a==='resume'){go('play');return;}
 if(a==='restart'){restart();return;}
 if(a==='fullscreen'){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('이 브라우저에서는 전체화면을 사용할 수 없어요.');}return;}
 if(!s||route!=='play')return;
 if(a==='timer-toggle'&&s.phase==='question'){toggleTimer(s);persist();tick();return;}
 if(a==='timer-reset'&&s.phase==='question'){s.timer.remaining=s.timer.duration;s.timer.deadline=s.timer.duration?Date.now()+s.timer.duration*1000:null;s.timer.running=s.timer.duration>0;persist();tick();return;}
 if(a==='reveal'&&s.phase==='question'){pauseTimer(s);s.phase='answer';}
 else if(a==='award-screen'&&s.phase==='answer'){s.pending=[...s.awards[s.index]];s.phase='award';}
 else if(a==='answer-screen'&&s.phase==='award')s.phase='answer';
 else if(a==='toggle-group'&&s.phase==='award'){const id=b.dataset.id;if(!s.groups.some(g=>g.id===id))return;s.pending=s.pending.includes(id)?s.pending.filter(v=>v!==id):[...s.pending,id];}
 else if(a==='select-all'&&s.phase==='award')s.pending=s.groups.map(g=>g.id);
 else if(a==='clear-selection'&&s.phase==='award')s.pending=[];
 else if(a==='confirm-awards'&&s.phase==='award'){setAward(s,s.pending);s.phase='score';}
 else if(a==='edit-score'&&s.phase==='score'){s.pending=[...s.awards[s.index]];s.phase='award';}
 else if(a==='next'&&s.phase==='score')nextQuestion(s);
 else return;
 persist();render();window.scrollTo(0,0);
}
root.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b&&!b.disabled)act(b.dataset.action,b);});
root.addEventListener('submit',e=>{if(e.target.id==='ai-form'){e.preventDefault();generateAI();return;}if(e.target.id==='setup-form'){e.preventDefault();launch();}});
root.addEventListener('input',e=>{if(route==='ai'&&e.target.name){aiForm[e.target.name]=e.target.value;if(e.target.name==='source')$('#ai-source-length').textContent=e.target.value.length.toLocaleString();return;}if(route!=='edit')return;const f=e.target,key=f.dataset.editField;if(key){if(['title','subject'].includes(key))draft[key]=f.value;else draft.questions[editIndex][key]=f.value;dirty=true;}if(f.dataset.option!==undefined){draft.questions[editIndex].options[Number(f.dataset.option)]=f.value;dirty=true;}});
root.addEventListener('change',e=>{const f=e.target;if(route==='ai'&&['lessonCount','nonsenseCount'].includes(f.name)){aiForm[f.name]=Number(f.value);$('#ai-total').textContent=`총 ${aiForm.lessonCount+aiForm.nonsenseCount}문제 · 정답당 10점`;return;}if(f.id==='ai-pdf'){importPDF(f.files[0]);return;}if(f.id==='quiz-choice'){names();setupId=f.value;render();}if(route==='edit'&&f.dataset.correct!==undefined){draft.questions[editIndex].correct=Number(f.dataset.correct);dirty=true;}if(route==='edit'&&f.id==='question-kind'){draft.questions[editIndex].kind=f.value;dirty=true;}});
modal.addEventListener('change', async event => {
  const input = event.target;
  if (input.id !== 'import-file' || !input.files[0]) return;
  const file = input.files[0];
  const status = $('#import-status');
  const button = modal.querySelector('[data-dialog-action="select-file"]');
  button.disabled = true;
  status.textContent = '퀴즈 파일을 읽고 있어요…';

  try {
    if (file.size > 1024 * 1024) throw Error('1MB 이하의 퀴즈 파일을 선택해 주세요.');
    let incoming;
    if (/\.xlsx$/i.test(file.name)) {
      const {readExcelQuiz} = await import('./excel-quiz.js');
      incoming = [await readExcelQuiz(file)];
    } else if (/\.json$/i.test(file.name)) {
      incoming = parseImport(JSON.parse(await file.text()));
    } else {
      throw Error('.xlsx 또는 .json 퀴즈 파일을 선택해 주세요.');
    }
    if (!modal.open || !input.isConnected) return;
    if (data.quizzes.length + incoming.length > 100) throw Error('퀴즈가 가득 찼어요. 먼저 서랍을 정리해 주세요.');
    const previous = data.quizzes;
    data.quizzes = [...previous, ...incoming];
    if (!persist()) {
      data.quizzes = previous;
      status.textContent = '브라우저에 저장하지 못했어요. 저장 공간을 확인한 뒤 다시 시도해 주세요.';
      return;
    }
    modal.close();
    go('library');
    toast(`${incoming.length}개 퀴즈를 가져왔어요.`);
  } catch (error) {
    status.textContent = error instanceof SyntaxError ? '올바른 퀴즈 JSON 파일인지 확인해 주세요.' : error.message;
  } finally {
    button.disabled = false;
  }
});
function tick(){const s=data.session;if(!s||route!=='play'||s.phase!=='question'||!s.timer.duration)return;const left=remaining(s),text=$('#timer-text'),pause=$('#timer-toggle');if(!text||!pause)return;text.textContent=left?`${left}초`:'시간 끝';pause.textContent=s.timer.running?'Ⅱ':'▶';pause.setAttribute('aria-label',s.timer.running?'타이머 일시정지':'타이머 계속하기');pause.disabled=left===0;$('#timer').classList.toggle('expired',left<=5);if(!left&&s.timer.running){pauseTimer(s);persist();pause.textContent='▶';}}
setInterval(tick,250);render();
if(data.session&&data.session.phase!=='finished')openDialog('진행 중인 퀴즈가 있어요',`<p class="dialog-copy">${view.esc(data.session.quiz.title)}<br>${data.session.index+1} / ${data.session.quiz.questions.length}문제에서 이어갈 수 있어요.</p><div class="dialog-actions"><button class="btn" data-dialog-action="close">처음 화면 보기</button><button class="btn primary" data-dialog-action="resume">이어 하기</button></div>`,{resume:()=>{modal.close();go('play');}});

async function generateAI(){
 if(aiBusy||pdfBusy)return;
 aiBusy=true;aiMessage='문제를 출제하고 정답과 자료의 근거를 다시 검토하고 있어요. 잠시 기다려 주세요.';aiAbort=new AbortController();render();
 const timer=setTimeout(()=>aiAbort?.abort(),58000);
 try {
  const response=await fetch('/api/generate-quiz',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(aiForm),signal:aiAbort.signal});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(result.message||'AI 연결을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
  const quiz=validateQuiz(result.quiz,{freshIds:true});
  draft=quiz;editIndex=0;dirty=true;aiBusy=false;aiMessage='';go('edit');toast('AI 초안을 만들었어요. 정답·해설을 확인한 뒤 저장해 주세요.');
 } catch(e){aiMessage=e.name==='AbortError'?'기다리기를 중단했어요. 서버의 생성 작업은 잠시 더 진행될 수 있으니 바로 재요청하지 말고 기다려 주세요.':e.message;}
 finally{clearTimeout(timer);aiBusy=false;aiAbort=null;if(route==='ai')render();}
}
async function importPDF(file){
 if(!file||aiBusy||pdfBusy)return;
 pdfBusy=true;aiMessage='PDF에서 글을 읽고 있어요…';render();
 try{
  const {readPDF}=await import('./pdf-source.js');
  const text=await readPDF(file,t=>{aiMessage=t;const el=$('.ai-status');if(el)el.textContent=t;});
  const apply=()=>{aiForm.source=text;aiMessage='PDF에서 글을 불러왔어요. 빠진 내용이나 글자 순서를 확인한 뒤 문제를 만들어 주세요.';render();};
  pdfBusy=false;
  if(aiForm.source.trim())confirm('수업 내용을 바꿀까요?','현재 입력한 내용을 PDF에서 읽은 글로 바꿉니다.','PDF 내용으로 바꾸기',apply);else apply();
 }catch(e){aiMessage=e.message;}
 finally{pdfBusy=false;if(route==='ai')render();}
}
