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

    const keys = await redis.keys('user_roles:*');
    const users = [];
    for(const k of (keys||[])){
      try{
        const v = await redis.get(k);
        users.push({ key: k, role: v });
      }catch(e){ /* skip */ }
    }

    const requests = await redis.lrange('admin_requests', 0, 99).catch(()=>[]);
    console.log('admin requests (raw):', requests);

    const parsedRequests = [];
    for(const r of (requests||[])){
      if(!r) continue;
      if(typeof r === 'object'){
        parsedRequests.push(r);
        continue;
      }
      if(typeof r === 'string'){
        try{
          parsedRequests.push(JSON.parse(r));
        }catch(e){
          console.warn('admin_list_users: failed to parse request item', r, e?.message || e);
        }
      }
    }
    console.log('parsed requests:', parsedRequests);

    return { statusCode: 200, body: JSON.stringify({ users, requests: parsedRequests }) };
  }catch(err){
    console.error('admin_list_users error', err?.message || err);
    return { statusCode: 500, body: 'admin_list_users error' };
  }
};
