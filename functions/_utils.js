// functions/_utils.js
const axios = require('axios');
const { Redis } = require('@upstash/redis');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = new Redis({ url: UPSTASH_REDIS_URL, token: UPSTASH_REDIS_TOKEN });

async function upstashGet(key){
  const val = await redis.get(key);
  if (!val) return null;
  return val;
}

async function refreshWithRefreshToken(refresh_token){
  const params = new URLSearchParams({ grant_type: 'refresh_token', refresh_token }).toString();
  const tokenRes = await axios.post('https://accounts.spotify.com/api/token', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64') }
  });
  return tokenRes.data;
}

async function getAuthHeaderFromEvent(event){
  const headers = event.headers || {};
  const auth = headers.authorization || headers.Authorization;
  if(auth) return auth;
  const cookie = headers.cookie || headers.Cookie || '';
  const m = cookie.match(/spotify_refresh_id=([^;]+)/);
  if(!m) return null;
  const redisKey = decodeURIComponent(m[1]);
  const stored = await upstashGet(redisKey);
  if(!stored || !stored.refresh_token) return null;
  const tokenData = await refreshWithRefreshToken(stored.refresh_token);
  return `Bearer ${tokenData.access_token}`;
}

function getRedisKeyFromEvent(event){
  const headers = event.headers || {};
  const cookie = headers.cookie || headers.Cookie || '';
  const m = cookie.match(/spotify_refresh_id=([^;]+)/);
  if(!m) return null;
  return decodeURIComponent(m[1]);
}

module.exports = { getAuthHeaderFromEvent, upstashGet, refreshWithRefreshToken, getRedisKeyFromEvent };
