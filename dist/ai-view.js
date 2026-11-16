import {esc,btn,back} from './views.js';
export function aiPage(form,busy=false,reading=false,message='') {
  const disabled=busy||reading?'disabled':'';
  return `<main class="wrap">${back()}<div class="page-heading"><p class="eyebrow">ONE LESSON, GOOD QUESTIONS</p><h1>오늘 수업으로 퀴즈 만들기</h1><p>헷갈릴 수 있는 보기, 하나로 명확한 정답. 함께 배운 내용을 떠올려요.</p></div>
  <div class="ai-layout"><form id="ai-form" class="panel" aria-busy="${busy||reading}"><fieldset ${disabled} class="ai-fields">
  <div class="form-row"><label class="field-label" for="ai-title">퀴즈 제목 <span class="hint">선택</span></label><input class="field" id="ai-title" name="title" maxlength="80" value="${esc(form.title)}" placeholder="예: 6학년 과학 · 물의 상태 변화"></div>
  <div class="form-row"><label class="field-label" for="ai-subject">학년·과목·단원 <span class="hint">선택</span></label><input class="field" id="ai-subject" name="subject" maxlength="80" value="${esc(form.subject)}" placeholder="예: 4학년 과학, 물의 상태 변화"></div>
  <div class="ai-counts"><label><span class="field-label">학습 문제</span><select class="field" name="lessonCount">${Array.from({length:10},(_,i)=>i+1).map(n=>`<option value="${n}" ${form.lessonCount===n?'selected':''}>${n}문제</option>`).join('')}</select></label>
  <label><span class="field-label">넌센스 추가</span><select class="field" name="nonsenseCount">${[0,1,2,3].map(n=>`<option value="${n}" ${form.nonsenseCount===n?'selected':''}>${n?n+'문제 추가':'넣지 않기'}</option>`).join('')}</select></label></div>
  <p class="hint" id="ai-total">총 ${form.lessonCount+form.nonsenseCount}문제 · 정답당 10점</p>
  <div class="form-row ai-source"><div class="ai-source-head"><label class="field-label" for="ai-source">수업 내용</label><label class="btn soft ai-pdf-label" for="ai-pdf">PDF에서 글 불러오기</label><input id="ai-pdf" type="file" accept="application/pdf,.pdf" class="sr-only"></div>
  <textarea class="field" name="source" id="ai-source" minlength="40" maxlength="16000" required placeholder="오늘 배운 내용을 붙여넣어 주세요. 핵심 개념과 정의, 비교할 내용을 구체적으로 적으면 좋은 문제가 만들어져요.">${esc(form.source)}</textarea><p class="hint"><span id="ai-source-length">${form.source.length.toLocaleString()}</span> / 16,000자 · PDF는 10MB·50쪽까지. 스캔·사진 PDF는 직접 내용을 입력해 주세요.</p></div>
  <p class="hint ai-disclosure">문제 생성을 누르면 위 수업 내용이 AI 서비스로 전송됩니다. 학생 이름·개인정보가 없는 수업 자료를 넣어 주세요. 생성한 문제는 검토 후 이 브라우저에 저장할 수 있어요.</p>
  <button type="submit" class="btn primary full">${busy?'문제를 만들고 검토하고 있어요…':'AI로 문제 만들기 →'}</button></fieldset>
  <p class="ai-status" role="status" aria-live="polite">${esc(message)}</p>${busy?'<button type="button" class="quiet" data-action="cancel-ai">생성 기다리기 취소</button>':''}</form>
  <aside class="panel ai-aside"><span class="chip blue">수업 끝 5분</span><h2>이렇게 만들어요</h2><ol class="help-steps"><li><b>수업 내용에서 출제해요.</b><p>자료에 없는 내용을 억지로 만들지 않아요.</p></li><li><b>보기를 자세히 살펴봐요.</b><p>비슷한 용어나 조건을 활용하되 정답은 하나로 명확하게 만들어요.</p></li><li><b>저장 전에 확인해요.</b><p>정답·해설·자료의 근거를 검토하고 필요하면 직접 고쳐 주세요.</p></li></ol><div class="info-note">넌센스는 학습 문제 뒤에 별도로 추가해요. 만든 퀴즈는 같은 브라우저에서 다시 사용할 수 있어요.</div><hr><p>문제를 직접 준비하셨나요?</p>${btn('manual-new','직접 문제 입력하기','full')}</aside></div></main>`;
}
