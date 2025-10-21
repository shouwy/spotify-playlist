const axios = require('axios');

exports.handler = async function(event){
  try{
    const auth = (event.headers || {})['authorization'] || (event.headers || {})['Authorization'];
    if(!auth) return { statusCode:401, body: 'missing auth' };
    const body = JSON.parse(event.body || '{}');
    // get user id
    const me = await axios.get('https://api.spotify.com/v1/me', { headers: { Authorization: auth } });
    const userId = me.data.id;
    const createRes = await axios.post(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      name: body.name || 'New Playlist', description: body.description || '', public: !!body.public
    }, { headers: { Authorization: auth, 'Content-Type': 'application/json' } });
    return { statusCode:200, body: JSON.stringify(createRes.data) };
  } catch(err){
    console.error(err.response?.data || err);
    return { statusCode:500, body: 'create error' };
  }
};