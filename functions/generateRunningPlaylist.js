const axios = require('axios');

async function getRecommendations(accessToken, seed_artists, seed_tracks, target_danceability, target_tempo, limit) {
  const params = new URLSearchParams({
    seed_artists: seed_artists.slice(0,5).join(','),
    seed_tracks: seed_tracks.slice(0,5).join(','),
    limit: String(limit),
    target_tempo: String(target_tempo),
    target_danceability: String(target_danceability)
  });
  const res = await axios.get('https://api.spotify.com/v1/recommendations?' + params.toString(), { headers: { Authorization: 'Bearer ' + accessToken }});
  return res.data.tracks || [];
}

exports.handler = async function(event){
  try{
    const body = JSON.parse(event.body || '{}');
    const length_minutes = body.length_minutes || 180;
    const authHeader = (event.headers || {})['authorization'] || (event.headers || {})['Authorization'];
    if(!authHeader) return { statusCode:401, body: 'missing auth' };
    const accessToken = authHeader.replace('Bearer ','');
    // 1. get user's top artists and tracks
    const me = await axios.get('https://api.spotify.com/v1/me', { headers: { Authorization: 'Bearer ' + accessToken }});
    const topArtistsRes = await axios.get('https://api.spotify.com/v1/me/top/artists?limit=5', { headers: { Authorization: 'Bearer ' + accessToken }});
    const topTracksRes = await axios.get('https://api.spotify.com/v1/me/top/tracks?limit=5', { headers: { Authorization: 'Bearer ' + accessToken }});
    const seed_artists = (topArtistsRes.data.items || []).map(a=>a.id);
    const seed_tracks = (topTracksRes.data.items || []).map(t=>t.id);

    // target tempo around 165 (user wanted 160-180). We'll request recommendations with target_tempo ~165
    const target_tempo = 165;
    // We want a high energy / danceability for running
    const target_danceability = 0.8;

    // estimate number of tracks needed: average 3.5 min -> minutes / 3.5
    const avg_minutes_per_track = 3.5;
    const approx_tracks = Math.ceil(length_minutes / avg_minutes_per_track);

    // get recommendations in batches
    let tracks = [];
    let triedSeeds = 0;
    while(tracks.length < approx_tracks && triedSeeds < 5){
      const recs = await getRecommendations(accessToken, seed_artists, seed_tracks, target_danceability, target_tempo, Math.min(100, approx_tracks - tracks.length + 10));
      recs.forEach(t => {
        if(!tracks.find(x=>x.id===t.id)) tracks.push(t);
      });
      triedSeeds++;
      // rotate seeds lightly if needed
      if(triedSeeds===1 && seed_tracks.length<5) {
        // add a fallback popular electronic artist
        seed_artists.push('4Z8W4fKeB5YxbusRsdQVPb'); // example: Coldplay fallback (not ideal)
      } 
      if(triedSeeds>3) break;
    }

    // ensure we have enough by filling with chart / known electro tracks if necessary (simple fallback)
    if(tracks.length < approx_tracks){
      const fallback = await axios.get('https://api.spotify.com/v1/search?q=genre:electronic&type=track&limit=50', { headers: { Authorization: 'Bearer ' + accessToken }});
      fallback.data.tracks.items.forEach(t=>{ if(!tracks.find(x=>x.id===t.id)) tracks.push(t); });
    }

    // trim to approx_tracks
    tracks = tracks.slice(0, approx_tracks);

    // create playlist
    const userId = me.data.id;
    const createRes = await axios.post(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      name: '🏃 Running Electro Flow',
      description: 'Générée automatiquement — Electro, 160-180 BPM, ~3h',
      public: true
    }, { headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' } });

    const playlistId = createRes.data.id;
    // add tracks in batches of 100
    for(let i=0;i<tracks.length;i+=100){
      const batch = tracks.slice(i,i+100).map(t=>t.uri);
      await axios.post(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, { uris: batch }, { headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' } });
    }

    return { statusCode:200, body: JSON.stringify(createRes.data) };
  }catch(err){
    console.error(err.response?.data || err.message || err);
    return { statusCode:500, body: 'generate error' };
  }
};
