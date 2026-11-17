import {generateText, Output, jsonSchema, gateway} from 'ai';
import {createHash} from 'node:crypto';
import {generationInput, createQuiz} from '../lib/quiz-generation.js';
import {checkCredits, QUIZ_MODEL, safeDiagnostic} from '../lib/ai-safety.js';

const requests=new Map();
let active=0;
export const config={maxDuration:60};
export function quota(ip,now=Date.now()) {
  for (const [k,v] of requests) if(now-v.start>=3600000) requests.delete(k);
  const key=createHash('sha256').update(ip).digest('hex'),v=requests.get(key)||{start:now,count:0,last:0};
  if (requests.size>=1000&&!requests.has(key) || v.count>=6 || v.count&&now-v.last<30000) return false;
  v.count++;v.last=now;requests.set(key,v);return true;
}
export function publicAIError(error) {
  if(error?.safetyCode==='credits_unavailable')return {status:503,message:'AI 무료 이용 잔액을 확인하지 못해 생성을 잠시 중단했어요. 직접 문제 만들기는 사용할 수 있어요.'};
  const chain=[error,error?.cause,error?.cause?.cause];
  const message=chain.map(e=>String(e?.message||'')).join(' ');
  const status=chain.find(e=>Number.isInteger(e?.statusCode))?.statusCode;
  if (/free tier.*(access|model)|no_providers_available/i.test(message)) return {status:503,message:'현재 무료 이용 계정에서 사용할 수 없는 AI 모델이에요. 운영자가 연결 모델을 확인해야 해요. 직접 문제 만들기는 사용할 수 있어요.'};
  if (/customer_verification_required|verification.*required/i.test(message)) return {status:503,message:'AI 연결에 운영자 계정 확인이 필요해요. 직접 문제 만들기는 계속 사용할 수 있어요.'};
  if (status===401||status===403||/api.key|authentication|unauthorized/i.test(message)) return {status:503,message:'AI 연결 설정을 확인해야 해요. 잠시 후 다시 이용해 주세요. 직접 문제 만들기는 사용할 수 있어요.'};
  if (status===402||/insufficient.*(fund|credit)|quota_for_entity|budget/i.test(message)) return {status:503,message:'AI 생성 사용량 한도에 도달했어요. 직접 문제를 만들거나 나중에 다시 이용해 주세요.'};
  if (status===429) return {status:429,message:'AI 요청이 몰리고 있어요. 잠시 후 다시 시도해 주세요.'};
  if (/abort|timeout/i.test(message)) return {status:504,message:'생성이 오래 걸려 중단했어요. 내용을 줄이거나 문제 수를 줄여 다시 시도해 주세요.'};
  if (/자료|문제|보기|해설|정답|검토/.test(error?.message||'')&&!status) return {status:422,message:error.message};
  return {status:502,message:'AI 문제를 만들지 못했어요. 입력 내용은 유지되니 잠시 후 다시 시도해 주세요.'};
}
export function makeHandler(call) {return async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  const send=(s,v)=>res.status(s).json(v);
  if(req.method!=='POST'){res.setHeader('Allow','POST');return send(405,{message:'POST 요청으로 이용해 주세요.'});}
  const allowed=['https://churrri-quiz.vercel.app','https://churrri-quiz-yoon76971-5417.vercel.app',process.env.VERCEL_URL&&`https://${process.env.VERCEL_URL}`,process.env.VERCEL_BRANCH_URL&&`https://${process.env.VERCEL_BRANCH_URL}`].filter(Boolean);
  if(!allowed.includes(req.headers.origin))return send(403,{message:'퀴즈왕 사이트에서 다시 이용해 주세요.'});
  if(!String(req.headers['content-type']||'').startsWith('application/json'))return send(415,{message:'올바른 형식으로 요청해 주세요.'});
  let input;
  try {if(Number(req.headers['content-length'])>100000)throw Error('자료가 너무 커요. 내용을 줄여 주세요.');input=generationInput(typeof req.body==='string'?JSON.parse(req.body):req.body);}catch(e){return send(400,{message:e instanceof SyntaxError?'자료를 다시 확인해 주세요.':e.message});}
  if(active>=3||!quota(String(req.headers['x-vercel-forwarded-for']||req.headers['x-real-ip']||req.socket?.remoteAddress||'unknown').split(',')[0])){res.setHeader('Retry-After','30');return send(429,{message:'잠시 쉬었다 다시 만들어 주세요. 한 번 만든 문제는 저장해 다시 사용할 수 있어요.'});}
  active++;
  try {return send(200,{quiz:await createQuiz(input,call)});}catch(e){const p=publicAIError(e);return send(p.status,{message:p.message});}finally{active--;}
};}
export default makeHandler(async (stage,{schema,...options})=>{
  try {
    // Check at both generation and independent audit. No OIDC/BYOK fallback.
    if(!process.env.AI_GATEWAY_API_KEY)throw Object.assign(Error('missing_api_key'),{statusCode:401});
    const credits=await checkCredits(()=>gateway.getCredits());
    console.info(JSON.stringify({event:'quiz_credit_check',stage,balance:credits.balance,used:credits.used}));
    const {output,usage,providerMetadata}=await generateText({model:QUIZ_MODEL,...options,
      output:Output.object({schema:jsonSchema(schema)}),maxOutputTokens:stage==='generate'?7500:2200,
      maxRetries:0,abortSignal:AbortSignal.timeout(stage==='generate'?30000:15000)});
    console.info(JSON.stringify({event:'quiz_ai_completed',stage,inputTokens:usage?.inputTokens,outputTokens:usage?.outputTokens,
      generationId:providerMetadata?.gateway?.generationId}));
    return output;
  } catch(error) {console.error(JSON.stringify(safeDiagnostic(error)));throw error;}
});
