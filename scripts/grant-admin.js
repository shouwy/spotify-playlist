#!/usr/bin/env node
// scripts/grant-admin.js
// Usage: node scripts/grant-admin.js <spotify_user_id>

const { Redis } = require('@upstash/redis');
require('dotenv').config();

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
if(!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN){
  console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in .env');
  process.exit(2);
}

const redis = new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN });

async function main(){
  const spotifyId = process.argv[2];
  if(!spotifyId){
    console.error('Usage: node scripts/grant-admin.js <spotify_user_id>');
    process.exit(1);
  }

  const redisKey = `spotify_refresh:${spotifyId}`;
  const roleKey = `user_roles:${redisKey}`;

  try{
    await redis.set(roleKey, 'admin');
    console.log(`Granted admin role to ${redisKey} (key=${roleKey})`);
    process.exit(0);
  }catch(err){
    console.error('Failed to set admin role:', err?.message || err);
    process.exit(3);
  }
}

main();
