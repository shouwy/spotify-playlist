const { Redis } = require('@upstash/redis');
const { upstashGet, refreshWithRefreshToken } = require('./_utils');
const { generateTracks } = require('./generate_core');
const crypto = require('crypto');

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN });

const MAX_JOBS_PER_INVOCATION = Number(process.env.PROCESS_MAX_JOBS) || 10;
const LOCK_TTL_SECONDS = Number(process.env.WORKER_LOCK_TTL) || 60;

exports.handler = async function(event){
  try{
    // try to acquire a worker lock so we don't start multiple workers
    const lockKey = 'worker:lock';
    const ownerId = (crypto.randomUUID && crypto.randomUUID()) || crypto.randomBytes(16).toString('hex');
    const lockAcquired = await redis.set(lockKey, ownerId, { nx: true, ex: LOCK_TTL_SECONDS });
    if(!lockAcquired){
      // another worker is running — include TTL so caller can backoff
      let ttl = null;
      try{ ttl = await redis.ttl(lockKey); }catch(e){}
      return { statusCode: 200, body: JSON.stringify({ ok: false, running: true, retry_after: ttl }) };
    }

    const maxJobs = MAX_JOBS_PER_INVOCATION; // process at most this many jobs per invocation
    let processed = 0;
    const startTime = Date.now();
    const maxTime = (Number(process.env.PROCESS_MAX_TIME_MS) || 50_000);

    while(processed < maxJobs && (Date.now() - startTime) < maxTime){
      const jobId = await redis.rpop('generate_queue');
      if(!jobId) break;

      const jobKey = `job:${jobId}`;
      const job = await redis.get(jobKey);
      if(!job){
        processed++;
        continue;
      }

      job.status = 'running';
      job.started_at = Date.now();
      await redis.set(jobKey, job);

      const userKey = job.user_redis_key;
      if(!userKey){
        job.status = 'error'; job.error = 'missing user redis key'; await redis.set(jobKey, job);
        processed++; continue;
      }

      const stored = await upstashGet(userKey);
      if(!stored || !stored.refresh_token){
        job.status = 'error'; job.error = 'missing refresh token for user'; await redis.set(jobKey, job);
        processed++; continue;
      }

      let tokenData;
      try{ tokenData = await refreshWithRefreshToken(stored.refresh_token); }catch(e){
        job.status = 'error'; job.error = 'refresh failed'; job.refresh_error = e?.message || e; await redis.set(jobKey, job);
        processed++; continue;
      }

      try{
        const jobStart = Date.now();
        const result = await generateTracks(job.params || {}, tokenData.access_token);
        job.status = 'done'; job.result = result; job.ended_at = Date.now(); await redis.set(jobKey, job);
        const duration = job.ended_at - (job.started_at || jobStart);
        console.log(`Job ${jobId} done in ${duration}ms; tracks=${result.track_count || (result.tracks && result.tracks.length) || 0}`);
        try{ await redis.hincrby('worker:metrics', 'jobs_succeeded', 1); await redis.lpush('worker:job_durations', String(duration)); await redis.ltrim('worker:job_durations', 0, 99); }catch(e){}
      }catch(e){
        console.error('process job failed', e?.message || e);
        job.status = 'error'; job.error = e?.message || String(e); job.ended_at = Date.now(); await redis.set(jobKey, job);
        const durationErr = job.ended_at - (job.started_at || Date.now());
        try{ await redis.hincrby('worker:metrics', 'jobs_failed', 1); await redis.lpush('worker:job_durations', String(durationErr)); await redis.ltrim('worker:job_durations', 0, 99); }catch(e){}
      }

      processed++;
      // renew lock TTL only if we still own it
      try{
        const cur = await redis.get(lockKey);
        if(cur === ownerId){ await redis.set(lockKey, ownerId, { ex: LOCK_TTL_SECONDS }); }
      }catch(e){ /* best-effort */ }
    }

    // release lock only if we own it
    try{ const cur = await redis.get(lockKey); if(cur === ownerId) await redis.del(lockKey); }catch(e){ /* ignore */ }

    return { statusCode: 200, body: JSON.stringify({ ok: true, processed }) };
  }catch(err){
    console.error('process_jobs error', err?.message || err);
    try{ await redis.del('worker:lock'); }catch(e){}
    return { statusCode: 500, body: 'process_jobs error' };
  }
}
