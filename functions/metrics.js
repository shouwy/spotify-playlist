const { Redis } = require('@upstash/redis');

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN });

async function safeGet(key){
  try{ const v = await redis.get(key); return v == null ? null : Number(v); }catch(e){ return null; }
}

async function safeLRange(key, start = 0, end = -1){
  try{ const arr = await redis.lrange(key, start, end); return Array.isArray(arr) ? arr.map(x=>Number(x)||0) : []; }catch(e){ return null; }
}

exports.handler = async function(event){
  try{
    // read unified worker metrics hash
    const out = {};
    try{
      const h = await redis.hgetall('worker:metrics');
      // h contains string values; map them into expected keys
      for(const [k,v] of Object.entries(h||{})){
        // keep the same key names as before for backward compatibility
        out[`worker:${k}`] = isNaN(Number(v)) ? v : Number(v);
      }
    }catch(e){ /* ignore */ }
    // queue length
    try{ out.generate_queue_length = await redis.llen('generate_queue'); }catch(e){ out.generate_queue_length = null; }

    // recent job durations (ms)
    const durations = await safeLRange('worker:job_durations', 0, 49);
    out.recent_job_durations = durations || [];
    if(Array.isArray(durations) && durations.length){
      const sum = durations.reduce((s,v)=>s+v,0);
      out.recent_job_durations_avg = Math.round(sum/durations.length);
    } else {
      out.recent_job_durations_avg = null;
    }

    return { statusCode: 200, body: JSON.stringify(out) };
  }catch(err){
    console.error('metrics error', err?.message || err);
    return { statusCode: 500, body: 'metrics error' };
  }
}
