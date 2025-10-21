// functions/delete.js
const axios = require('axios');
const { getAuthHeaderFromEvent } = require('./_utils');

exports.handler = async function(event){
  try{
    const authHeader = await getAuthHeaderFromEvent(event);
    if(!authHeader) return { statusCode:401, body:'not authorized' };

    const body = JSON.parse(event.body || '{}');
    if(!body.playlist_id) return { statusCode:400, body:'missing playlist_id' };

    const res = await axios.request({
      method: 'DELETE',
      url: `https://api.spotify.com/v1/playlists/${body.playlist_id}/followers`,
      headers: { Authorization: authHeader }
    });

    return { statusCode:200, body: JSON.stringify({ ok:true }) };
  }catch(err){
    console.error(err.response?.data || err);
    return { statusCode:500, body: JSON.stringify({ error:'delete error', detail: err.response?.data || err.message }) };
  }
};
