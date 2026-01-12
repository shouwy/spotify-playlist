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

    const body = (event.body && typeof event.body === 'string') ? JSON.parse(event.body) : (event.body || {});
    const targetKey = body.redisKey;
    const newRole = body.role; // 'admin' to grant, null/'' to revoke
    if(!targetKey) return { statusCode: 400, body: JSON.stringify({ error: 'missing redisKey' }) };

    const roleKey = `user_roles:${targetKey}`;
    if(newRole === 'admin'){
      await redis.set(roleKey, 'admin');
      // remove pending request if exists
      try{ await redis.del(`admin_request:${targetKey}`); }catch(e){}
      return { statusCode: 200, body: JSON.stringify({ ok: true, message: 'granted' }) };
    }else{
      await redis.del(roleKey);
      return { statusCode: 200, body: JSON.stringify({ ok: true, message: 'revoked' }) };
    }
  }catch(err){
    console.error('admin_update_role error', err?.message || err);
    return { statusCode: 500, body: 'admin_update_role error' };
  }
};
