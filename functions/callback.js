// functions/callback.js
const axios = require('axios');

const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SITE_URL = process.env.SITE_URL || 'https://your-netlify-site.netlify.app';
const REDIRECT_URI = SITE_URL + '/callback';

async function upstashSet(key, value, ttlSeconds = 60 * 60 * 24 * 30) {
  // Upstash REST: set key with EX
  const body = { commands: [`SET ${key} ${encodeURIComponent(JSON.stringify(value))} EX ${ttlSeconds}`] };
  const res = await axios.post(UPSTASH_REDIS_URL, body, { headers: { Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}`, 'Content-Type': 'application/json' }});
  return res.data;
}

exports.handler = async function(event) {
  try {
    const code = event.queryStringParameters && event.queryStringParameters.code;
    if (!code) return { statusCode: 400, body: 'missing code' };

    // 1) exchange code for tokens
    const params = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI });
    const tokenRes = await axios.post('https://accounts.spotify.com/api/token', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
      }
    });
    const data = tokenRes.data; // { access_token, token_type, expires_in, refresh_token, scope }

    // 2) get user id to key the refresh token
    const me = await axios.get('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${data.access_token}` }});
    const userId = me.data.id;

    // 3) store refresh_token in Upstash Redis under key spotify_refresh:{userId}
    const redisKey = `spotify_refresh:${userId}`; // key stored in redis
    await upstashSet(redisKey, { refresh_token: data.refresh_token, created_at: Date.now() }, 60*60*24*30); // 30 days TTL

    // 4) set cookie with redisKey (HttpOnly, Secure). Cookie contains the redisKey only.
    const cookie = `spotify_refresh_id=${encodeURIComponent(redisKey)}; HttpOnly; Secure; Path=/; Max-Age=${60*60*24*30}; SameSite=Lax`;

    // 5) Return HTML that stores access_token temporarily in localStorage and redirects to root
    const html = `<!doctype html><html><body><script>
      const tokens = ${JSON.stringify({ access_token: data.access_token, expires_in: data.expires_in })};
      localStorage.setItem('spotify_tokens', JSON.stringify(tokens));
      window.location = '/';
    </script></body></html>`;

    return { statusCode: 200, headers: { 'Content-Type': 'text/html', 'Set-Cookie': cookie }, body: html };
  } catch (err) {
    console.error(err.response?.data || err.message || err);
    return { statusCode: 500, body: 'callback error' };
  }
};
