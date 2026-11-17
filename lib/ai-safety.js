// Conservative first-free-credit-period guard. Never replenishes or buys credits.
// A renewal or purchased credit requires an operator review before re-enabling AI.
export const FREE_CREDIT_ALLOWANCE = 5;
export const CREDIT_RESERVE = 1;
export const QUIZ_MODEL = 'openai/gpt-4o-mini';

export function validateCredits(credits) {
  const decimal = value => (typeof value === 'number' || typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)) ? Number(value) : NaN;
  const balance = decimal(credits?.balance), used = decimal(credits?.totalUsed);
  if (!Number.isFinite(balance) || !Number.isFinite(used) || balance < 0 || used < 0) {
    throw Object.assign(Error('credit_check_unavailable'), {statusCode:503, safetyCode:'credits_unavailable'});
  }
  if (balance + used > FREE_CREDIT_ALLOWANCE + 0.000001 || used >= FREE_CREDIT_ALLOWANCE - CREDIT_RESERVE || balance < CREDIT_RESERVE) {
    throw Object.assign(Error('free_credit_safety_limit'), {statusCode:402, safetyCode:'free_credit_limit'});
  }
  return {balance, used};
}

export async function checkCredits(readCredits) {
  let timer;
  try {
    return validateCredits(await Promise.race([
      readCredits(),
      new Promise((_, reject) => { timer=setTimeout(() => reject(Error('credit_check_timeout')), 5000); timer.unref?.(); })
    ]));
  } catch (error) {
    if (error.safetyCode) throw error;
    throw Object.assign(Error('credit_check_unavailable'), {statusCode:503, safetyCode:'credits_unavailable', cause:error});
  } finally { clearTimeout(timer); }
}

// Whitelist diagnostics: never log error messages, prompts, headers or keys.
export function safeDiagnostic(error) {
  const chain=[error,error?.cause,error?.cause?.cause];
  let providerError;
  for(const e of chain) {
    try { const data=JSON.parse(e?.responseBody||'{}'); if(data.error)providerError=data.error; } catch {}
  }
  const label=value=>typeof value==='string'&&/^[a-zA-Z_]{1,60}$/.test(value)?value:null;
  return {event:'quiz_ai_failed', status:chain.find(e=>Number.isInteger(e?.statusCode))?.statusCode||null,
    code:error?.safetyCode||null,
    providerCode:label(providerError?.code),providerType:label(providerError?.type),
    providerReason: typeof providerError?.message==='string'?providerError.message.replace(/[A-Za-z0-9_\-]{20,}/g,'[redacted]').replace(/https?:\/\/\S+/g,'[url]').slice(0,300):null,
    verificationRequired:chain.some(e=>/customer_verification_required/.test(String(e?.message||''))),
    invalidKey:chain.some(e=>/invalid.*(api.?key|token)|invalid_api_key/i.test(String(e?.message||'')))};
}
