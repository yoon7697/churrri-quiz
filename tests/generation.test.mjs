import test from 'node:test';
import assert from 'node:assert/strict';
import {generationInput,validateGenerated,validateAudit,createQuiz} from '../lib/quiz-generation.js';
import {makeHandler,publicAIError} from '../api/generate-quiz.js';
import {validateQuiz} from '../dist/model.js';
const source='액체 상태의 물이 기체인 수증기로 변하는 현상을 증발이라고 합니다. 기체 상태의 수증기가 액체인 물로 변하는 현상을 응결이라고 합니다.';
const input=()=>generationInput({source,lessonCount:1,nonsenseCount:0});
const raw=()=>({title:'물의 상태 변화',subject:'과학',questions:[{text:'액체인 물이 수증기로 변하는 현상은?',options:['증발','응결','동결','융해'],correct:0,explanation:'물이 액체에서 기체로 변하는 것은 증발이에요.',kind:'lesson',sourceQuote:'액체 상태의 물이 기체인 수증기로 변하는 현상을 증발이라고 합니다.',optionReasons:['증발: 액체에서 기체로 변하므로 정답이에요.','응결: 기체에서 액체로 변하는 것이에요.','동결: 액체가 고체로 변하는 것이에요.','융해: 고체가 액체로 변하는 것이에요.']}]});
const audit=()=>({checks:[{index:0,answer:'A',unambiguous:true,grounded:true,suitable:true}]});
test('counts reject strings, fractions and unsolicited difficulty; source is bounded',()=>{
 for(const lessonCount of [0,11,1.5,'5'])assert.throws(()=>generationInput({source,lessonCount,nonsenseCount:0}));
 for(const nonsenseCount of [-1,4,'1'])assert.throws(()=>generationInput({source,lessonCount:1,nonsenseCount}));
 assert.throws(()=>generationInput({source:'a'.repeat(16001),lessonCount:1,nonsenseCount:0}));
 assert.equal(generationInput({...input(),difficulty:'hard'}).difficulty,undefined);
});
test('valid grounded quiz retains evidence through local save/import validation',()=>{
 const q=validateGenerated(raw(),input());
 assert.equal(validateQuiz(q).questions[0].sourceQuote,raw().questions[0].sourceQuote);
 assert.equal(validateQuiz(q).questions[0].optionReasons.length,4);
});
test('missing, mismatched and invented source quotes are rejected',()=>{
 for(const sourceQuote of ['', '아무 근거 없이 새로 만든 수업 문장입니다.']){
  const r=raw();r.questions[0].sourceQuote=sourceQuote;assert.throws(()=>validateGenerated(r,input()));
 }
});
test('wrong question kinds/counts, repeated questions and equivalent options rejected',()=>{
 const r=raw();r.questions[0].kind='nonsense';assert.throws(()=>validateGenerated(r,input()));
 const d=raw();d.questions.push(structuredClone(d.questions[0]));assert.throws(()=>validateGenerated(d,{...input(),lessonCount:2}));
 const o=raw();o.questions[0].options=['증 발','증발','응결','동결'];assert.throws(()=>validateGenerated(o,input()));
});
test('audit disagreement, ambiguity, missing or repeated indices prevent returning a quiz',()=>{
 const q=validateGenerated(raw(),input());
 for(const patch of [{answer:'B'},{answer:0},{answer:'0'},{answer:'E'},{unambiguous:false},{grounded:false},{suitable:false},{index:2}]){
  const a=audit();Object.assign(a.checks[0],patch);assert.throws(()=>validateAudit(a,q));
 }
 assert.throws(()=>validateAudit({checks:[]},q));
 assert.throws(()=>validateAudit({checks:[audit().checks[0],audit().checks[0]]},{questions:[q.questions[0],q.questions[0]]}));
});
test('wordplay is appended from the bank without entering either AI call',async()=>{
 const requestInput = {...input(), nonsenseCount:3};
 const calls = [];
 const quiz = await createQuiz(requestInput, async (stage, options) => {
  calls.push(stage);
  assert.equal(options.system.includes('넌센스'), false);
  assert.equal(JSON.parse(options.prompt).nonsenseCount, undefined);
  if (stage === 'generate') {
   assert.deepEqual(options.schema.properties.questions.items.properties.kind.enum, ['lesson']);
   return raw();
  }
  assert.equal(JSON.parse(options.prompt).questions.length, 1);
  return audit();
 });
 assert.deepEqual(calls, ['generate', 'audit']);
 assert.deepEqual(quiz.questions.map(q => q.kind), ['lesson', 'nonsense', 'nonsense', 'nonsense']);
 assert.equal(new Set(quiz.questions.map(q => q.text)).size, 4);
 for (const q of validateQuiz(quiz).questions.slice(1)) {
  assert.equal(q.options.length, 4);
  assert.ok(q.explanation.includes(q.options[q.correct]));
  assert.equal(q.sourceQuote, undefined);
 }
 const invalidDraft = raw();
 invalidDraft.questions[0].kind = 'nonsense';
 assert.throws(() => validateGenerated(invalidDraft, requestInput), /학습 문제만/);
});
test('rotated option explanations are rejected even when each sentence is factual',()=>{
 const r=raw();r.questions[0].optionReasons.push(r.questions[0].optionReasons.shift());
 assert.throws(()=>validateGenerated(r,input()),/보기와 설명의 순서/);
});
test('generation performs independent audit before releasing the draft',async()=>{
 const calls=[];const q=await createQuiz(input(),async(stage)=>{calls.push(stage);return stage==='generate'?raw():audit();});
 assert.deepEqual(calls,['generate','audit']);assert.equal(q.questions.length,1);
 await assert.rejects(createQuiz(input(),async s=>s==='generate'?raw():{checks:[]}));
});
test('question counts and audit indices are bounded; reviewer does not receive the marked answer',async()=>{
 let sent,review;
 await createQuiz(input(),async(stage,options)=>{if(stage==='generate'){sent=options;return raw();}review=options;return audit();});
 assert.equal(sent.schema.properties.questions.minItems,1);assert.equal(sent.schema.properties.questions.maxItems,1);
 assert.equal(JSON.parse(sent.prompt).lessonCount,1);assert.equal(JSON.parse(sent.prompt).nonsenseCount,undefined);
 const p=JSON.parse(review.prompt);assert.equal(p.questions[0].correct,undefined);assert.equal(p.questions[0].index,0);
 assert.equal(p.questions[0].options.A,'증발');assert.equal(p.questions[0].options.B,'응결');
 assert.equal(review.schema.properties.checks.minItems,1);assert.equal(review.schema.properties.checks.items.properties.index.maximum,0);
});
const request=(patch={})=>({method:'POST',headers:{origin:'https://churrri-quiz.vercel.app','content-type':'application/json','x-vercel-forwarded-for':'test-'+Math.random()},body:input(),...patch});
async function run(req,call){const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(b){this.body=b;return this;}};await makeHandler(call)(req,res);return res;}
test('endpoint rejects methods, foreign origins and malformed input without any AI calls',async()=>{
 const call=()=>{throw Error('Must not call AI');};
 assert.equal((await run(request({method:'GET'}),call)).code,405);
 assert.equal((await run(request({headers:{origin:'https://other.invalid'}}),call)).code,403);
 assert.equal((await run(request({body:{source}}),call)).code,400);
 assert.equal((await run(request({body:'bad json'}),call)).code,400);
});
test('endpoint returns usable verified draft and throttles repeated requests',async()=>{
 const req=request(),call=async s=>s==='generate'?raw():audit();
 const r=await run(req,call);assert.equal(r.code,200);assert.equal(r.body.quiz.questions[0].correct,0);
 assert.equal((await run(req,call)).code,429);
});
test('provider secrets/details are never returned; credits/auth/timeouts are actionable',()=>{
 const err={statusCode:401,message:'key: secret-example'};assert.equal(publicAIError(err).status,503);assert.ok(!publicAIError(err).message.includes('secret-example'));
 assert.equal(publicAIError({statusCode:402}).status,503);
 assert.equal(publicAIError({message:'customer_verification_required'}).status,503);
 assert.equal(publicAIError({name:'AbortError',message:'timeout'}).status,504);
});
