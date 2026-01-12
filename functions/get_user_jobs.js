const { Redis } = require('@upstash/redis');
const { getRedisKeyFromEvent } = require('./_utils');

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN });

exports.handler = async function(event){
  try{
    const redisKey = getRedisKeyFromEvent(event);
    if(!redisKey) return { statusCode: 401, body: JSON.stringify({ error: 'not authorized' }) };

    const ids = await redis.lrange(`user_jobs:${redisKey}`, 0, 99);
    if(!ids || !ids.length) return { statusCode: 200, body: JSON.stringify({ jobs: [] }) };

    const jobs = [];
    for(const id of ids){
      try{
        const j = await redis.get(`job:${id}`);
        if(!j) continue;
        const duration = j.started_at && j.ended_at ? (j.ended_at - j.started_at) : null;
        jobs.push({
          id: j.id,
          status: j.status,
          created_at: j.created_at,
          started_at: j.started_at,
          ended_at: j.ended_at,
          duration,
          error: j.error || null
        });
      }catch(e){ /* skip */ }
    }

    return { statusCode: 200, body: JSON.stringify({ jobs }) };
  }catch(err){
    console.error('get_user_jobs error', err?.message || err);
    return { statusCode: 500, body: 'get_user_jobs error' };
  }
}
