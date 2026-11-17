import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCredits,checkCredits,safeDiagnostic} from '../lib/ai-safety.js';
import {quota,publicAIError} from '../api/generate-quiz.js';

test('initial free allowance works but preserves a one dollar reserve',()=>{
  assert.deepEqual(validateCredits({balance:'4.99',totalUsed:'0.01'}),{balance:4.99,used:0.01});
  for(const c of [{balance:'0.99',totalUsed:'4.01'},{balance:'1',totalUsed:'4'},{balance:'10',totalUsed:'0'}, {balance:'4.99',totalUsed:'5.01'}]){
    assert.throws(()=>validateCredits(c),e=>e.statusCode===402);
  }
});
test('malformed, missing and failed credit checks stop all model calls',async()=>{
  for(const c of [null,{}, {balance:'',totalUsed:'0'}, {balance:null,totalUsed:'0'}, {balance:'NaN',totalUsed:'0'}, {balance:5,totalUsed:-1}])assert.throws(()=>validateCredits(c));
  let modelCalls=0;
  await assert.rejects(async()=>{await checkCredits(async()=>{throw Error('secret should never be returned');});modelCalls++;},e=>e.safetyCode==='credits_unavailable');
  assert.equal(modelCalls,0);
  assert.deepEqual(await checkCredits(async()=>({balance:'5',totalUsed:'0'})),{balance:5,used:0});
});
test('local quota enforces cooldown, hourly maximum, expiry and IP separation',()=>{
  const t=2000000000000,ip='quota-controlled';
  assert.equal(quota(ip,t),true);assert.equal(quota(ip,t+29999),false);
  assert.equal(quota(ip+'-other',t+1),true);
  for(let i=1;i<6;i++)assert.equal(quota(ip,t+i*30000),true);
  assert.equal(quota(ip,t+6*30000),false);
  assert.equal(quota(ip,t+3600000),true);
});
test('sanitized diagnostics and public errors exclude secret error payloads',()=>{
  const e=Object.assign(Error('invalid_api_key super-secret-value'),{statusCode:401});
  const data=JSON.stringify([safeDiagnostic(e),publicAIError(e)]);
  assert.equal(safeDiagnostic(e).invalidKey,true);assert.ok(!data.includes('super-secret-value'));
  assert.equal(publicAIError(Object.assign(Error('hidden'),{safetyCode:'credits_unavailable'})).status,503);
});
