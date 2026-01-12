const axios = require('axios');
const { getAuthHeaderFromEvent } = require('./_utils');

exports.handler = async function(event) {
  try {
    const authHeader = await getAuthHeaderFromEvent(event);
    if (!authHeader) return { statusCode: 401, body: 'not authorized' };

    const body = JSON.parse(event.body || '{}');
    const name = body.name || 'New Playlist';
    const description = body.description || '';
    const isPublic = !!body.public;

    // get user id
    const me = await axios.get('https://api.spotify.com/v1/me', { headers: { Authorization: authHeader }});
    const userId = me.data.id;

    const createRes = await axios.post(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      name, description, public: isPublic
    }, { headers: { Authorization: authHeader, 'Content-Type': 'application/json' }});

    const playlist = createRes.data;

    // if URIs provided, add them in batches (Spotify limits to 100 per request)
    const bodyData = JSON.parse(event.body || '{}');
    const uris = Array.isArray(bodyData.uris) ? bodyData.uris.filter(Boolean) : [];
    let snapshot_id = null;
    if(uris.length){
      for(let i=0;i<uris.length;i+=100){
        const chunk = uris.slice(i, i+100);
        const addRes = await axios.post(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, { uris: chunk }, { headers: { Authorization: authHeader, 'Content-Type': 'application/json' }});
        // keep last snapshot_id
        if(addRes && addRes.data && addRes.data.snapshot_id) snapshot_id = addRes.data.snapshot_id;
      }
    }

    return { statusCode: 200, body: JSON.stringify({ playlistId: playlist.id, snapshot_id, playlist }) };
  } catch (err) {
    console.error(err.response?.data || err);
    return { statusCode: 500, body: JSON.stringify({ error: 'create error', detail: err.response?.data || err.message }) };
  }
};
