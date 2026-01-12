const { Redis } = require('@upstash/redis');
const { getRedisKeyFromEvent } = require('./_utils');

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN });

exports.handler = async function(event){
  try{
    const redisKey = getRedisKeyFromEvent(event);
    if(!redisKey) return { statusCode: 401, body: JSON.stringify({ error: 'not authorized' }) };

    const ids = await redis.lrange(`user_jobs:${redisKey}`, 0, 9);
    if(!ids || !ids.length) return { statusCode: 200, body: JSON.stringify({ job: null, hasActive: false }) };

    // fetch most recent job
    const lastId = ids[0];
    let job = await redis.get(`job:${lastId}`);
    try{ job = typeof job === 'string' ? JSON.parse(job) : job; }catch(e){ console.warn('get_last_job: failed to parse job JSON', e?.message || e); }

    // detect if user has any active jobs (queued or running)
    let hasActive = false;
    for(const id of ids){
      let j = await redis.get(`job:${id}`);
      try{ j = typeof j === 'string' ? JSON.parse(j) : j; }catch(e){ j = null; }
      if(j && (j.status === 'queued' || j.status === 'running')){ hasActive = true; break; }
    }

    return { statusCode: 200, body: JSON.stringify({ job, hasActive }) };
  }catch(err){
    console.error('get_last_job error', err?.message || err);
    return { statusCode: 500, body: 'get_last_job error' };
  }
}
