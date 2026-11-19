import test from 'node:test';
import assert from 'node:assert/strict';
import { readSheet } from 'read-excel-file/node';
import { EXCEL_SHEET, parseExcelQuiz } from '../dist/excel-quiz.js';
import { createSession } from '../dist/model.js';

const template = new URL('../dist/assets/quiz-template.xlsx', import.meta.url);
const rows = await readSheet(template, EXCEL_SHEET);
const valid = ['가장 작은 수는?', 2, 4, 1, 3, 3, '1이 가장 작아요.'];

test('downloaded workbook is blank and accepts a completed question as a playable quiz', () => {
  assert.throws(() => parseExcelQuiz(rows, '양식.xlsx'), /5행부터/);
  const filled = structuredClone(rows);
  filled[0][1] = '수학 복습';
  filled[1][1] = '수의 크기';
  filled[4] = valid;
  filled[5] = [];
  filled[6] = ['2보다 큰 수는?', 1, 0, 2, 3, '4'];
  const quiz = parseExcelQuiz(filled, '학교.xlsx');
  assert.equal(quiz.title, '수학 복습');
  assert.equal(quiz.subject, '수의 크기');
  assert.deepEqual(quiz.questions.map(q => q.options[q.correct]), ['1', '3']);
  assert.equal(quiz.questions[0].explanation, '1이 가장 작아요.');
  assert.equal(createSession(quiz, ['1모둠', '2모둠']).quiz.questions.length, 2);
  assert.equal(parseExcelQuiz([...rows.slice(0,4), valid], '우리 반.xlsx').title, '우리 반');
});

test('wrong headers, incomplete rows, invalid answers and excessive questions are rejected', () => {
  const header = structuredClone(rows.slice(0,4));
  assert.throws(() => parseExcelQuiz([['다른 표']], '다른 표.xlsx'), /열 이름/);
  assert.throws(() => parseExcelQuiz([...header, valid, [], ['보기 없음']], '수학.xlsx'), /7행의 문제와 보기/);
  assert.throws(() => parseExcelQuiz([...header, [...valid.slice(0,5), 5]], '수학.xlsx'), /5행의 정답 번호/);
  assert.throws(() => parseExcelQuiz([...header, ['중복?', 1, '1', 2, 3, 1]], '수학.xlsx'), /5행에 같은 보기/);
  assert.throws(() => parseExcelQuiz([...header, ...Array(31).fill(valid)], '수학.xlsx'), /30문제/);
});
