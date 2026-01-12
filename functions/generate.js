const { getAuthHeaderFromEvent } = require('./_utils')
const { generateTracks } = require('./generate_core');
const axios = require('axios');

exports.handler = async function(event){
  try{
      const body = JSON.parse(event.body || '{}');
      // accept Authorization header first, otherwise derive it from cookie -> redis -> refresh token
      let auth = (event.headers || {})['authorization'] || (event.headers || {})['Authorization'];
      if(!auth) auth = await getAuthHeaderFromEvent(event);
      if(!auth) return { statusCode: 401, body: JSON.stringify({ error: 'not authorized' }) };
      const accessToken = auth.replace('Bearer ','');

      const result = await generateTracks(body, accessToken);
      return { statusCode: 200, body: JSON.stringify(result) };
  }catch(err){
      console.error(err.response?.data || err.message || err);
      return { statusCode: 500, body: 'ReccoBeats generation error' };
   }
};
