const handler = async (event) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const siteUrl = process.env.SITE_URL || 'https://your-netlify-site.netlify.app';
  const redirectUri = siteUrl + '/callback';
  const scopes = encodeURIComponent('playlist-modify-public playlist-modify-private playlist-read-private');
  const url = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}`;
  return {
    statusCode: 302,
    headers: { Location: url }
  };
};

exports.handler = handler;