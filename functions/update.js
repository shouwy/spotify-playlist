// functions/update.js
const axios = require('axios');
const { getAuthHeaderFromEvent } = require('./_utils');

exports.handler = async function(event){
  try{
    const authHeader = await getAuthHeaderFromEvent(event);
    if(!authHeader) return { statusCode:401, body:'not authorized' };

    const body = JSON.parse(event.body || '{}');
    if(!body.playlist_id || !body.name) return { statusCode:400, body:'missing params' };

    await axios.put(`https://api.spotify.com/v1/playlists/${body.playlist_id}`, {
      name: body.name, description: body.description || ''
    }, { headers: { Authorization: authHeader, 'Content-Type':'application/json' } });

    return { statusCode:200, body: JSON.stringify({ ok:true }) };
  }catch(err){
    console.error(err.response?.data || err);
    return { statusCode:500, body: JSON.stringify({ error:'update error', detail: err.response?.data || err.message }) };
  }
};
