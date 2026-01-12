const { Redis } = require('@upstash/redis');
const { upstashGet } = require('./_utils');
const crypto = require('crypto');

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN });

function parseSpotifyRedisKeyFromCookie(headers){
  const cookie = (headers.cookie || headers.Cookie || '');
  const m = cookie.match(/spotify_refresh_id=([^;]+)/);
  if(!m) return null;
  return decodeURIComponent(m[1]);
}

exports.handler = async function(event){
  try{
    const body = JSON.parse(event.body || '{}');
    const headers = event.headers || {};
    const redisKey = parseSpotifyRedisKeyFromCookie(headers);
    if(!redisKey) return { statusCode: 401, body: JSON.stringify({ error: 'not authorized' }) };

    // ensure the key maps to a stored refresh token
    const stored = await upstashGet(redisKey);
    if(!stored || !stored.refresh_token) return { statusCode: 401, body: JSON.stringify({ error: 'missing refresh token' }) };

    const jobId = (crypto.randomUUID && crypto.randomUUID()) || crypto.randomBytes(16).toString('hex');
    const job = {
      id: jobId,
      status: 'queued',
      params: body,
      user_redis_key: redisKey,
      created_at: Date.now()
    };

    await redis.set(`job:${jobId}`, job);
    await redis.lpush('generate_queue', jobId);
    // also record per-user recent jobs
    try{ await redis.lpush(`user_jobs:${redisKey}`, jobId); await redis.ltrim(`user_jobs:${redisKey}`, 0, 49); }catch(e){ console.warn('failed to record user job', e?.message || e); }
    // record globally for admin listing (keep recent 1000)
    try{ await redis.lpush('all_jobs', jobId); await redis.ltrim('all_jobs', 0, 999); }catch(e){ console.warn('failed to record global job', e?.message || e); }

    return { statusCode: 200, body: JSON.stringify({ jobId }) };
  }catch(err){
    console.error('enqueue error', err?.message || err);
    return { statusCode: 500, body: 'enqueue error' };
  }
}
