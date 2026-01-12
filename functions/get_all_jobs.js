const { Redis } = require('@upstash/redis');
const { getRedisKeyFromEvent, upstashGet } = require('./_utils');

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN });

exports.handler = async function(event){
  try{
    const requester = getRedisKeyFromEvent(event);
    if(!requester) return { statusCode: 401, body: JSON.stringify({ error: 'not authenticated' }) };
    const role = await upstashGet(`user_roles:${requester}`);
    if(role !== 'admin') return { statusCode: 403, body: JSON.stringify({ error: 'forbidden' }) };

    const ids = await redis.lrange('all_jobs', 0, 499).catch(()=>[]);
    if(!ids || !ids.length) return { statusCode: 200, body: JSON.stringify({ jobs: [] }) };

    const jobs = [];
    for(const id of ids){
      try{
        const j = await redis.get(`job:${id}`);
        if(!j) continue;
        const duration = j.started_at && j.ended_at ? (j.ended_at - j.started_at) : null;
        jobs.push({ id: j.id, status: j.status, created_at: j.created_at, started_at: j.started_at, ended_at: j.ended_at, duration, error: j.error || null, user_redis_key: j.user_redis_key || null });
      }catch(e){ /* skip */ }
    }

    return { statusCode: 200, body: JSON.stringify({ jobs }) };
  }catch(err){
    console.error('get_all_jobs error', err?.message || err);
    return { statusCode: 500, body: 'get_all_jobs error' };
  }
};
