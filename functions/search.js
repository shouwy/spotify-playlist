const axios = require('axios');
exports.handler = async function(event){
  try{
    const q = (event.queryStringParameters && event.queryStringParameters.q) || '';
    if(!q) return { statusCode:400, body: 'missing q' };
    const auth = (event.headers || {})['authorization'] || (event.headers || {})['Authorization'];
    if(!auth) return { statusCode:401, body: 'missing auth' };
    const res = await axios.get(`https://api.spotify.com/v1/search?type=track&limit=12&q=${encodeURIComponent(q)}`, { headers: { Authorization: auth }});
    return { statusCode:200, body: JSON.stringify(res.data) };
  }catch(err){
    console.error(err.response?.data || err);
    return { statusCode:500, body: 'search error' };
  }
};
