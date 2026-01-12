// Local worker runner for development: polls Redis and invokes process_jobs.handler
// Usage: set env vars (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, SPOTIFY_CLIENT_ID/SECRET) then run:
//   node worker_local.js


// load .env file if present (simple parser)
const fs = require('fs');
const path = require('path');
const dotenvPath = path.resolve(process.cwd(), '.env');
if(fs.existsSync(dotenvPath)){
  try{
    const content = fs.readFileSync(dotenvPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      line = line.trim();
      if(!line || line.startsWith('#')) return;
      const eq = line.indexOf('=');
      if(eq === -1) return;
      const k = line.slice(0, eq).trim();
      let v = line.slice(eq+1).trim();
      if(v.startsWith('"') && v.endsWith('"')) v = v.slice(1,-1);
      if(process.env[k] === undefined) process.env[k] = v;
    });
    console.log('Loaded .env into process.env');
  }catch(e){ console.warn('Failed to load .env', e?.message || e); }
}

const processJobs = require('./functions/process_jobs');
const { Redis } = require('@upstash/redis');

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
if(!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN){
  console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in env or .env');
  process.exit(1);
}

const redis = new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN });

const POLL_INTERVAL_MS = Number(process.env.WORKER_LOCAL_POLL_MS) || 5000;

async function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function loop(){
  console.log('Local worker started — polling every', POLL_INTERVAL_MS, 'ms');
  while(true){
    try{
      const len = await redis.llen('generate_queue');
      if(len && Number(len) > 0){
        console.log('Queue length', len, '- invoking process_jobs');
        try{
          const t0 = Date.now();
          const res = await processJobs.handler({});
          const took = Date.now() - t0;
          console.log('process_jobs result', res && res.statusCode, res && res.body ? res.body : '', 'took', took + 'ms');
        }catch(e){
          console.error('process_jobs.handler error', e?.message || e);
        }
      }
    }catch(e){
      console.error('worker_local poll error', e?.message || e);
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

loop().catch(e=>{ console.error('worker_local fatal', e); process.exit(1); });
