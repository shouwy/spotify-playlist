const { Redis } = require('@upstash/redis');
const { getAuthHeaderFromEvent } = require('./_utils');

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN });

exports.handler = async function(event){
  try{
    // require auth
    const auth = await getAuthHeaderFromEvent(event);
    if(!auth) return { statusCode: 401, body: 'not authorized' };

    // delete the queue
    const removed = await redis.del('generate_queue');
    return { statusCode: 200, body: JSON.stringify({ ok: true, removed }) };
  }catch(err){
    console.error('clear_queue error', err?.message || err);
    return { statusCode: 500, body: 'clear_queue error' };
  }
}
