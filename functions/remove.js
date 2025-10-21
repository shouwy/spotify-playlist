// functions/remove.js
const axios = require('axios');
const { getAuthHeaderFromEvent } = require('./_utils');

exports.handler = async function(event){
  try{
    const authHeader = await getAuthHeaderFromEvent(event);
    if(!authHeader) return { statusCode:401, body:'not authorized' };

    const body = JSON.parse(event.body || '{}');
    if(!body.playlist_id || !body.tracks) return { statusCode:400, body:'missing params' };
    // body.tracks = [{ uri: 'spotify:track:...' }, ...]
    const res = await axios.request({
      method: 'DELETE',
      url: `https://api.spotify.com/v1/playlists/${body.playlist_id}/tracks`,
      data: { tracks: body.tracks },
      headers: { Authorization: authHeader, 'Content-Type':'application/json' }
    });
    return { statusCode:200, body: JSON.stringify(res.data) };
  }catch(err){
    console.error(err.response?.data || err);
    return { statusCode:500, body: JSON.stringify({ error:'remove error', detail: err.response?.data || err.message }) };
  }
};
