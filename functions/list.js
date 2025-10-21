const axios = require('axios');

exports.handler = async function(event){
  try{
    const auth = (event.headers || {})['authorization'] || (event.headers || {})['Authorization'];
    if(!auth) return { statusCode:401, body: 'missing auth' };

    const res = await axios.get('https://api.spotify.com/v1/me/playlists', { headers: { Authorization: auth } });
    return { statusCode:200, body: JSON.stringify(res.data) };
  } catch(err){
    console.error(err.response?.data || err);
    return { statusCode:500, body: 'list error' };
  }
};