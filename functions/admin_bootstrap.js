const { Redis } = require('@upstash/redis');
const { getRedisKeyFromEvent } = require('./_utils');

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const ADMIN_BOOTSTRAP_KEY = process.env.ADMIN_BOOTSTRAP_KEY;

const redis = new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN });

exports.handler = async function(event){
  try{
    if(!ADMIN_BOOTSTRAP_KEY) return { statusCode: 500, body: 'ADMIN_BOOTSTRAP_KEY not configured' };

    const body = (event.body && typeof event.body === 'string') ? JSON.parse(event.body) : (event.body || {});
    if(!body || body.bootstrap_key !== ADMIN_BOOTSTRAP_KEY){
      return { statusCode: 401, body: 'invalid bootstrap key' };
    }

    // ensure no admin exists yet
    let existing = [];
    try{ existing = await redis.keys('user_roles:*'); }catch(e){ console.warn('redis.keys failed', e?.message || e); }
    if(existing && existing.length > 0){
      return { statusCode: 403, body: 'admin already exists' };
    }

    const redisKey = getRedisKeyFromEvent(event);
    if(!redisKey) return { statusCode: 401, body: 'not authenticated' };

    const roleKey = `user_roles:${redisKey}`;
    await redis.set(roleKey, 'admin');

    return { statusCode: 200, body: JSON.stringify({ ok: true, message: `Admin granted to ${redisKey}` }) };
  }catch(err){
    console.error('admin_bootstrap error', err?.message || err);
    return { statusCode: 500, body: 'admin_bootstrap error' };
  }
};
