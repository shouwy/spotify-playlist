// Scheduled wrapper for Netlify Cron to run the job processor.
// It checks the queue length and only delegates to the worker if there's work to do,
// avoiding unnecessary worker invocations.
const processJobs = require('./process_jobs');
const { Redis } = require('@upstash/redis');

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN });

exports.handler = async function(event, context) {
  try{
    // increment cron run metric
    try{ await redis.hincrby('worker:metrics', 'cron_run_count', 1); }catch(e){ console.warn('could not increment cron_run_count', e?.message || e); }

    // check queue length first
    let len = 0;
    try{ len = await redis.llen('generate_queue'); }catch(e){ console.warn('could not read queue length', e?.message || e); }
    if(!len || Number(len) === 0){
      try{ await redis.hincrby('worker:metrics', 'cron_run_skipped', 1); }catch(e){}
      return { statusCode: 200, body: JSON.stringify({ ok: true, processed: 0, reason: 'queue empty' }) };
    }

    // delegate to process_jobs handler if queue not empty
    const res = await processJobs.handler(event || {});
    try{ await redis.hincrby('worker:metrics', 'cron_run_processed', 1); }catch(e){}
    return res;
  }catch(err){
    console.error('process_jobs_cron error', err?.message || err);
    return { statusCode: 500, body: 'process_jobs_cron error' };
  }
};
