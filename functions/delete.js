const axios = require('axios');

exports.handler = async function(event){
  try{
    const auth = (event.headers || {})['authorization'] || (event.headers || {})['Authorization'];
    if(!auth) return { statusCode:401, body: 'missing auth' };
    const body = JSON.parse(event.body || '{}');
    if(!body.playlist_id) return { statusCode:400, body: 'missing playlist_id' };
    // In Spotify, "delete a playlist" is done by unfollowing it
    const res = await axios.request({ method: 'DELETE', url: `https://api.spotify.com/v1/playlists/${body.playlist_id}/followers`, headers: { Authorization: auth } });
    return { statusCode:200, body: JSON.stringify({ ok: true }) };
  } catch(err){
    console.error(err.response?.data || err);
    return { statusCode:500, body: 'delete error' };
  }
};