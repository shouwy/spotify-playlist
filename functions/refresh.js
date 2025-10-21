const axios = require('axios');

exports.handler = async function(event){
  try{
    const body = JSON.parse(event.body || '{}');
    const refresh_token = body.refresh_token;
    if(!refresh_token) return { statusCode:400, body: 'missing refresh_token' };

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    const tokenRes = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
      grant_type: 'refresh_token', refresh_token
    }).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      }
    });

    return { statusCode:200, body: JSON.stringify(tokenRes.data) };
  }catch(err){
    console.error(err.response?.data || err);
    return { statusCode:500, body: 'refresh error' };
  }
};