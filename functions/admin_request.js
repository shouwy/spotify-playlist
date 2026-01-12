const { Redis } = require('@upstash/redis');
const { getRedisKeyFromEvent, upstashGet } = require('./_utils');

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN });

exports.handler = async function(event){
  try{
    const redisKey = getRedisKeyFromEvent(event);
    if(!redisKey) return { statusCode: 401, body: JSON.stringify({ error: 'not authenticated' }) };

    // if already admin
    try{
      const role = await upstashGet(`user_roles:${redisKey}`);
      if(role === 'admin') return { statusCode: 400, body: JSON.stringify({ error: 'already admin' }) };
    }catch(e){ /* ignore */ }

    // attempt to record request only if not already present (use NX to avoid races)
    const payload = { redisKey, requested_at: Date.now() };
    try{
      const setRes = await redis.set(`admin_request:${redisKey}`, JSON.stringify(payload), { nx: true });
      if(!setRes){
        return { statusCode: 200, body: JSON.stringify({ ok: true, message: 'request already submitted' }) };
      }
      // only push to list if we successfully created the per-user key
      await redis.lpush('admin_requests', JSON.stringify(payload));
      await redis.ltrim('admin_requests', 0, 99);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }catch(e){
      console.warn('admin_request: set with nx failed', e?.message || e);
      // fallback: if set failed for any reason, treat as accepted to avoid exposing errors to user
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }
  }catch(err){
    console.error('admin_request error', err?.message || err);
    return { statusCode: 500, body: 'admin_request error' };
  }
};
