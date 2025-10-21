const axios = require('axios')

exports.handler = async function(event){
  try{
    const body = JSON.parse(event.body || '{}')
    // Expect refresh token from httpOnly cookie provided automatically by browser
    const cookies = (event.headers && (event.headers.cookie || event.headers.Cookie)) || ''
    const match = cookies.match(/spotify_refresh=([^;]+)/)
    const refresh_token = body.refresh_token || (match && decodeURIComponent(match[1]))
    if(!refresh_token) return { statusCode:400, body:'missing refresh_token' }

    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
    const params = new URLSearchParams({ grant_type:'refresh_token', refresh_token }).toString()
    const tokenRes = await axios.post('https://accounts.spotify.com/api/token', params, { headers: { 'Content-Type':'application/x-www-form-urlencoded', 'Authorization':'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64') } })
    return { statusCode:200, body: JSON.stringify(tokenRes.data) }
  }catch(err){ console.error(err.response?.data || err); return { statusCode:500, body:'refresh error' } }
}