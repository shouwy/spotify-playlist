// functions/create.js

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

    return { statusCode: 200, body: JSON.stringify(createRes.data) };
  } catch (err) {
    console.error(err.response?.data || err);
    return { statusCode: 500, body: JSON.stringify({ error: 'create error', detail: err.response?.data || err.message }) };
  }
};
