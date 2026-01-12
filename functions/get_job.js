const { Redis } = require('@upstash/redis');

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN });

exports.handler = async function(event){
  try{
    const qs = event.queryStringParameters || {};
    const id = qs.id || (event.path && event.path.split('/').pop());
    if(!id) return { statusCode: 400, body: 'missing id' };
    const job = await redis.get(`job:${id}`);
    if(!job) return { statusCode: 404, body: 'not found' };
    return { statusCode: 200, body: JSON.stringify(job) };
  }catch(err){
    console.error('get_job error', err?.message || err);
    return { statusCode: 500, body: 'get_job error' };
  }
}
