import { readSheet, SheetNotFoundError } from 'read-excel-file/browser';
import { EXCEL_SHEET, parseExcelQuiz } from '../dist/excel-quiz.js';

self.onmessage = async ({data: file}) => {
  let rows;
  try {
    rows = await readSheet(file, EXCEL_SHEET);
  } catch (error) {
    const message = error instanceof SheetNotFoundError
      ? '엑셀 파일에 ‘퀴즈’ 시트가 없어요. 내려받은 양식의 시트 이름을 확인해 주세요.'
      : '엑셀 파일을 읽지 못했어요. 파일을 .xlsx로 저장한 뒤 다시 선택해 주세요.';
    self.postMessage({error: message});
    return;
  }

  try {
    self.postMessage({quiz: parseExcelQuiz(rows, file.name)});
  } catch (error) {
    self.postMessage({error: error.message});
  }
};
