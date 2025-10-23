const axios = require('axios')

const qs = (obj) => Object.entries(obj).map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')

exports.handler = async function(event){
  try{
    // get access token from localStorage -> client should call /me using fetch in browser (we rely on cookie-based refresh flow)
    // but since Netlify functions are server-side, we'll accept access token via Authorization header forwarded from the browser
    const auth = (event.headers || {})['authorization'] || (event.headers || {})['Authorization']
    if(!auth) return { statusCode:401, body: 'not authorized' }
    const res = await axios.get('https://api.spotify.com/v1/me', { headers: { Authorization: auth } })
    return { statusCode:200, body: JSON.stringify(res.data) }
  }catch(err){ console.error(err.response?.data || err); return { statusCode:500, body:'me error' } }
}

exports.handler = async function () {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) {
    console.error('Missing Spotify env vars')
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET / SPOTIFY_REFRESH_TOKEN' })
    }
  }

  try {
    // Exchange refresh token for access token
    const tokenResp = await axios.post(
      'https://accounts.spotify.com/api/token',
      qs({ grant_type: 'refresh_token', refresh_token: SPOTIFY_REFRESH_TOKEN }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')
        }
      }
    )

    const access_token = tokenResp.data?.access_token
    if (!access_token) {
      console.error('No access token in token response', tokenResp.data)
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to obtain access token' }) }
    }

    // Call Spotify /me
    const meResp = await axios.get('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${access_token}` }
    })

    return {
      statusCode: meResp.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meResp.data)
    }
  } catch (err) {
    const status = err.response?.status || 500
    const data = err.response?.data || { message: err.message }
    console.error('me function error:', data)
    return { statusCode: status, body: JSON.stringify(data) }
  }
}