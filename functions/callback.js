// functions/callback.js
const axios = require('axios');
const { Redis } = require('@upstash/redis');

const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SITE_URL = process.env.SITE_URL || 'https://your-netlify-site.netlify.app';
const REDIRECT_URI = SITE_URL + '/callback';

const redis = new Redis({ url: UPSTASH_REDIS_URL, token: UPSTASH_REDIS_TOKEN });

async function upstashSet(key, value, ttlSeconds = 60 * 60 * 24 * 30) {
  try {
    console.log('upstashSet: storing key', key, 'with TTL', ttlSeconds);
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
    console.log('upstashSet: key stored successfully');
    return true;
  } catch (err) {
    console.error('upstashSet: Redis error', err?.message || err);
    throw err;
  }
}

exports.handler = async function(event) {
  try {
    console.log('callback: handler started');
    if (!UPSTASH_REDIS_URL || !UPSTASH_REDIS_TOKEN) {
      console.error('callback: Missing UPSTASH env vars');
      return { statusCode: 500, body: 'Missing Redis config' };
    }

    const code = event.queryStringParameters && event.queryStringParameters.code;
    if (!code) {
      console.error('callback: missing code in query params');
      return { statusCode: 400, body: 'missing code' };
    }
    console.log('callback: received code');

    // exchange code for tokens
    const params = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI });
    const tokenRes = await axios.post('https://accounts.spotify.com/api/token', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
      }
    });
    const data = tokenRes.data;
    console.log('callback: tokens exchanged', { access_token: data.access_token?.slice(0,10)+'...', refresh_token: data.refresh_token?.slice(0,10)+'...' });

    // get user
    const me = await axios.get('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${data.access_token}` }});
    const userId = me.data.id;
    console.log('callback: user ID retrieved:', userId);

    // store in Redis
    const redisKey = `spotify_refresh:${userId}`;
    console.log('callback: storing refresh token for user', userId, 'with key', redisKey);
    await upstashSet(redisKey, { refresh_token: data.refresh_token, created_at: Date.now() }, 60*60*24*30);
    console.log('callback: refresh token stored');

    // set cookie
    const cookie = `spotify_refresh_id=${encodeURIComponent(redisKey)}; HttpOnly; Secure; Path=/; Max-Age=${60*60*24*30}; SameSite=None`;
    console.log('callback: setting cookie');

    // return HTML
    const html = `<!doctype html><html><body><script>
      const tokens = ${JSON.stringify({ access_token: data.access_token, expires_in: data.expires_in })};
      localStorage.setItem('spotify_tokens', JSON.stringify(tokens));
      window.location = '/';
    </script></body></html>`;

    return { statusCode: 200, headers: { 'Content-Type': 'text/html', 'Set-Cookie': cookie }, body: html };
  } catch (err) {
    console.error('callback: handler error', err?.response?.data || err?.message || err);
    return { statusCode: 500, body: 'callback error' };
  }
};
