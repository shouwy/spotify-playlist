// functions/add.js
const axios = require('axios');
const { getAuthHeaderFromEvent } = require('./_utils');

exports.handler = async function(event){
  try{
    const authHeader = await getAuthHeaderFromEvent(event);
    if(!authHeader) return { statusCode:401, body:'not authorized' };

    const body = JSON.parse(event.body || '{}');
    const playlist_id = body.playlist_id;
    const uris = body.uris; // array of spotify:track:...

    if(!playlist_id || !uris || !Array.isArray(uris) || uris.length === 0) return { statusCode:400, body:'missing params' };

    // spotify limit: 100 tracks per request
    for(let i=0;i<uris.length;i+=100){
      const batch = uris.slice(i, i+100);
      await axios.post(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks`, { uris: batch }, { headers: { Authorization: authHeader, 'Content-Type':'application/json' }});
    }

    return { statusCode: 200, body: JSON.stringify({ ok:true, added: uris.length }) };
  }catch(err){
    console.error(err.response?.data || err);
    return { statusCode:500, body: JSON.stringify({ error: 'add error', detail: err.response?.data || err.message }) };
  }
};
