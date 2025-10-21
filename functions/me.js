const axios = require('axios')

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