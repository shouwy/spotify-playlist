const axios = require('axios');

exports.handler = async function(event){
  try{
    const auth = (event.headers || {})['authorization'] || (event.headers || {})['Authorization'];
    if(!auth) return { statusCode:401, body: 'missing auth' };
    const body = JSON.parse(event.body || '{}');
    if(!body.playlist_id || !body.name) return { statusCode:400, body: 'missing params' };
    const res = await axios.put(`https://api.spotify.com/v1/playlists/${body.playlist_id}`, { name: body.name, description: body.description }, { headers: { Authorization: auth, 'Content-Type':'application/json' } });
    return { statusCode:200, body: JSON.stringify({ ok: true }) };
  } catch(err){
    console.error(err.response?.data || err);
    return { statusCode:500, body: 'update error' };
  }
};