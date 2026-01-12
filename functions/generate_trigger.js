const { Redis } = require('@upstash/redis');

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN });

exports.handler = async function(event){
  try{
    // quick signal to wake any workers (or indicate a new job)
    const ts = Date.now();
    // store last signal timestamp and increment signal count in a unified hash
    try{ await redis.hset('worker:metrics', { last_signal: String(ts) }); }catch(e){ /* best-effort */ }
    try{ await redis.hincrby('worker:metrics', 'signal_count', 1); }catch(e){ /* best-effort */ }
    return { statusCode: 200, body: JSON.stringify({ ok: true, ts }) };
  }catch(err){
    console.error('generate_trigger error', err?.message || err);
    return { statusCode: 500, body: 'trigger error' };
  }
}
