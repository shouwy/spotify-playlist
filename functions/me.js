const axios = require('axios')
const { getAuthHeaderFromEvent, getRedisKeyFromEvent, upstashGet } = require('./_utils')

const qs = (obj) => Object.entries(obj).map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')

exports.handler = async function(event){
  try{
    // accept Authorization header first, otherwise derive it from cookie -> redis -> refresh token
    let auth = (event.headers || {})['authorization'] || (event.headers || {})['Authorization']
    if (!auth) { auth = await getAuthHeaderFromEvent(event);}
    if (!auth) return { statusCode:401, body: JSON.stringify({ error: 'not authorized' }) }

    const res = await axios.get('https://api.spotify.com/v1/me', { headers: { Authorization: auth } })
    const data = res.data || {};

    // attach role if available via redis key stored in cookie
    try{
      const redisKey = getRedisKeyFromEvent(event);
      if(redisKey){
        const role = await upstashGet(`user_roles:${redisKey}`);
        if(role) data.role = role;
        data._redisKey = redisKey;
      }
    }catch(e){ console.warn('me: failed to fetch role', e?.message || e); }

    return { statusCode:200, body: JSON.stringify(data) }
  }catch(err){
    console.error(err.response?.data || err)
    const status = err.response?.status || 500
    const body = err.response?.data ? JSON.stringify(err.response.data) : 'me error'
    return { statusCode: status, body }
  }
}