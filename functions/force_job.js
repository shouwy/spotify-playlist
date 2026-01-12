const { Redis } = require('@upstash/redis');
const { getAuthHeaderFromEvent } = require('./_utils');

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN });

exports.handler = async function(event){
  try{
    const auth = await getAuthHeaderFromEvent(event);
    if(!auth) return { statusCode: 401, body: 'not authorized' };

    const body = event.body ? JSON.parse(event.body) : {};
    const jobId = body.jobId || body.id;
    if(!jobId) return { statusCode: 400, body: 'missing jobId' };

    const jobKey = `job:${jobId}`;
    const job = await redis.get(jobKey);
    if(!job) return { statusCode: 404, body: 'job not found' };

    // reset state and push to front of queue
    job.status = 'queued';
    job.error = null;
    job.started_at = null;
    job.ended_at = null;
    await redis.set(jobKey, job);
    await redis.lpush('generate_queue', jobId);
    try{ await redis.hincrby('worker:metrics', 'forced_count', 1); }catch(e){}

    return { statusCode: 200, body: JSON.stringify({ ok: true, jobId }) };
  }catch(err){
    console.error('force_job error', err?.message || err);
    return { statusCode: 500, body: 'force_job error' };
  }
}
