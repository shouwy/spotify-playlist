const axios = require('axios')
const { getAuthHeaderFromEvent } = require('./_utils')

exports.handler = async function(event){
  try{
    // accept Authorization header first, otherwise derive it from cookie -> redis -> refresh token
    let auth = (event.headers || {})['authorization'] || (event.headers || {})['Authorization']
    if (!auth) { auth = await getAuthHeaderFromEvent(event);}
    if (!auth) return { statusCode:401, body: JSON.stringify({ error: 'not authorized' }) }
    const res = await axios.get('https://api.spotify.com/v1/me/playlists?limit=50', { headers: { Authorization: auth } })
    return { statusCode:200, body: JSON.stringify(res.data) }
  }catch(err){ console.error(err.response?.data || err); return { statusCode:500, body:'list error' } }
}