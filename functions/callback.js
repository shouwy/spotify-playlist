const axios = require('axios');

exports.handler = async function(event) {
  try {
    const query = event.queryStringParameters || {};
    const code = query.code;
    if(!code) return { statusCode: 400, body: 'Missing code' };

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const siteUrl = process.env.SITE_URL || 'https://your-netlify-site.netlify.app';
    const redirectUri = siteUrl + '/callback';

    const tokenRes = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
      grant_type: 'authorization_code', code, redirect_uri: redirectUri
    }).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      }
    });

    const data = tokenRes.data;
    // Return an HTML that stores tokens in localStorage then redirect to root
    const html = `<!doctype html><html><body><script>
      const tokens = ${JSON.stringify(data)};
      localStorage.setItem('spotify_tokens', JSON.stringify(tokens));
      // redirect back
      window.location = '/';
    </script></body></html>`;

    return { statusCode: 200, headers: {'Content-Type':'text/html'}, body: html };
  } catch (err) {
    console.error(err.response?.data || err.message || err);
    return { statusCode: 500, body: 'Error during Spotify callback' };
  }
};