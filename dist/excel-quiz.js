import { uid, validateQuiz } from './model.js';

export const EXCEL_SHEET = '퀴즈';
export const EXCEL_HEADERS = ['문제', '보기 1', '보기 2', '보기 3', '보기 4', '정답 번호', '해설'];

const asText = value => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';

export function parseExcelQuiz(rows, filename) {
  if (asText(rows[0]?.[0]) !== '퀴즈 제목' || asText(rows[1]?.[0]) !== '과목·단원' ||
      !EXCEL_HEADERS.every((header, col) => asText(rows[3]?.[col]) === header)) {
    throw Error('엑셀 양식의 제목과 열 이름을 확인해 주세요. 사이트에서 양식을 다시 내려받을 수 있어요.');
  }

  const questions = [];
  for (const [index, row] of rows.entries()) {
    if (index < 4) continue;
    const cells = EXCEL_HEADERS.map((_, col) => row[col]);
    if (cells.every(value => value == null || value === '')) continue;
    const [text, ...options] = cells.slice(0, 5).map(asText);
    const answer = asText(cells[5]);
    const explanation = asText(cells[6]);
    const rowNumber = index + 1;

    if (!text || options.some(option => !option)) throw Error(`엑셀 ${rowNumber}행의 문제와 보기 4개를 모두 채워 주세요.`);
    if (new Set(options).size !== 4) throw Error(`엑셀 ${rowNumber}행에 같은 보기가 있어요.`);
    if (!/^[1-4]$/.test(answer)) throw Error(`엑셀 ${rowNumber}행의 정답 번호는 1~4 중 하나를 입력해 주세요.`);
    if (text.length > 500 || options.some(option => option.length > 180) || explanation.length > 1200) {
      throw Error(`엑셀 ${rowNumber}행의 글이 길어요. 문제 500자, 보기 180자, 해설 1,200자까지 입력해 주세요.`);
    }
    questions.push({id: uid(), text, options, correct: Number(answer) - 1, explanation, kind: 'lesson'});
    if (questions.length > 30) throw Error('엑셀 파일 하나에 퀴즈 30문제까지 넣을 수 있어요.');
  }

  if (!questions.length) throw Error('엑셀 5행부터 문제를 한 개 이상 입력해 주세요.');
  const fallback = filename.replace(/\.xlsx$/i, '').trim().slice(0, 80) || '엑셀 퀴즈';
  const title = asText(rows[0]?.[1]) || fallback;
  const subject = asText(rows[1]?.[1]);
  if (title.length > 80 || subject.length > 80) throw Error('퀴즈 제목과 과목·단원은 각각 80자까지 입력해 주세요.');
  return validateQuiz({id: uid(), title, subject, questions});
}

export function readExcelQuiz(file) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./vendor/quiz-excel-worker.js', import.meta.url), {type: 'module'});
    const finish = (callback, value) => {
      clearTimeout(timeout);
      worker.terminate();
      callback(value);
    };
    const timeout = setTimeout(() => finish(reject, Error('엑셀 파일을 읽는 데 시간이 오래 걸려요. 양식에 필요한 문제만 옮긴 뒤 다시 시도해 주세요.')), 15000);
    worker.onmessage = ({data}) => {
      if (data.error) finish(reject, Error(data.error));
      else finish(resolve, data.quiz);
    };
    worker.onerror = () => finish(reject, Error('엑셀 파일을 열지 못했어요. 새로고침한 뒤 다시 시도해 주세요.'));
    worker.postMessage(file);
  });
}
