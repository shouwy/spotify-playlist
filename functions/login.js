exports.handler = async function() {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const siteUrl = process.env.SITE_URL
  const redirectUri = siteUrl + '/callback'
  const scope = encodeURIComponent('playlist-modify-public playlist-modify-private playlist-read-private user-top-read')
  const url = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`
  return { statusCode: 302, headers: { Location: url } }
}