const axios = require('axios')

// This function assumes client has a valid access token and sends it in Authorization header
// It will:
// 1) request user's top artists/tracks to get taste
// 2) call recommendations with seed artists/tracks + target_tempo between 160-180
// 3) collect tracks until ~3 hours duration then create playlist and add tracks

exports.handler = async function(event){
  try{
    const auth = (event.headers || {})['authorization'] || (event.headers || {})['Authorization']
    if(!auth) return { statusCode:401, body:'not authorized' }

    // 1) get current user
    const me = await axios.get('https://api.spotify.com/v1/me', { headers: { Authorization: auth } })
    const userId = me.data.id

    // 2) get top artists & tracks
    const topArtists = await axios.get('https://api.spotify.com/v1/me/top/artists?limit=5', { headers: { Authorization: auth } })
    const topTracks = await axios.get('https://api.spotify.com/v1/me/top/tracks?limit=5', { headers: { Authorization: auth } })

    const seed_artists = topArtists.data.items.slice(0,2).map(a=>a.id).join(',')
    const seed_tracks = topTracks.data.items.slice(0,2).map(t=>t.id).join(',')

    // collect tracks
    let collected = []
    let total_ms = 0
    const targetMin = 160, targetMax=180

    // We'll loop a few times to fetch recommendations until ~3h
    for(let i=0;i<8 && total_ms < 3*60*60*1000; i++){
      const tempo = Math.floor(Math.random()*(targetMax-targetMin+1)+targetMin)
      const rec = await axios.get(`https://api.spotify.com/v1/recommendations?seed_artists=${seed_artists}&seed_tracks=${seed_tracks}&limit=30&target_tempo=${tempo}&market=FR`, { headers: { Authorization: auth } })
      for(const t of rec.data.tracks){
        if(total_ms >= 3*60*60*1000) break
        if(!collected.find(x=>x.id===t.id)){
          collected.push(t)
          total_ms += t.duration_ms
        }
      }
    }

    // Fallback: if not enough duration, add topTracks
    if(total_ms < 3*60*60*1000){
      for(const t of topTracks.data.items){ if(!collected.find(x=>x.id===t.id)){ collected.push(t); total_ms += t.duration_ms; if(total_ms >= 3*60*60*1000) break }}
    }

    const uris = collected.map(t=>t.uri)

    // create playlist
    const createRes = await axios.post(`https://api.spotify.com/v1/users/${userId}/playlists`, { name: '🏃 Running Electro Flow', description: 'Générée automatiquement — Electro, 160–180 cadence (~3h)', public: false }, { headers: { Authorization: auth, 'Content-Type':'application/json' } })
    const playlistId = createRes.data.id

    // add tracks in batches of 100
    for(let i=0;i<uris.length;i+=100){
      const batch = uris.slice(i,i+100)
      await axios.post(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, { uris: batch }, { headers: { Authorization: auth, 'Content-Type':'application/json' } })
    }

    return { statusCode:200, body: JSON.stringify({ ok:true, playlist: createRes.data, added: uris.length }) }
  }catch(err){ console.error(err.response?.data || err); return { statusCode:500, body: JSON.stringify({ error: 'generate error', detail: err.response?.data || err.message }) } }
}