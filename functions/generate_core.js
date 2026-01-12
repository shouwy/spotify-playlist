const axios = require('axios');
const RECCO_BASE = process.env.RECCO_BASE_URL || 'https://api.reccobeats.com/v1';

function chunkArray(arr, size){
  const out = [];
  for(let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size));
  return out;
}

async function getReccoRecommendations({ trackIds, seed_genres, targetTempo, targetDanceability, limit }){
  const config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: RECCO_BASE+'/track/recommendation',
    headers: { 'Accept': 'application/json' },
    params: { seeds: trackIds, seed_genres: seed_genres, size: limit, audio_features: { tempo: targetTempo, danceability: targetDanceability } }
  };
  const res = await axios.request(config);
  return res.data.content || [];
}

async function getReccoAudioFeatures(ids){
  const config = { method:'get', url: RECCO_BASE+'/audio-features', params: { ids }, headers:{ 'Accept':'application/json' } };
  const res = await axios.request(config);
  return res.data.content || [];
}

async function getReccoTracksByIds(trackIds){
  let tracks = [];
  for(const chunk of chunkArray(trackIds,40)){
    const res = await axios.request({ method:'get', url: RECCO_BASE+'/track', params:{ ids: chunk }, headers:{ 'Accept':'application/json' } });
    tracks.push(...(res.data.content || []));
  }
  return tracks;
}

async function getSpotifyTracksByIds(trackIds, accessToken){
  if(!accessToken) return [];
  const out = [];
  const headers = { Authorization: `Bearer ${accessToken}` };
  for(const chunk of chunkArray(trackIds,50)){
    try{
      // sanitize ids: strip spotify:uri prefixes or full open.spotify.com URLs
      const cleaned = chunk.map(id => {
        if(!id) return id;
        if(typeof id !== 'string') return String(id);
        if(id.includes(':')) return id.split(':').pop();
        if(id.includes('/')) return id.split('/').pop();
        return id;
      });
      console.log('getSpotifyTracksByIds: requesting ids', cleaned.slice(0,10));
      const res = await axios.get('https://api.spotify.com/v1/tracks', { params: { ids: cleaned.join(',') }, headers });
      out.push(...(res.data && res.data.tracks ? res.data.tracks.filter(Boolean) : []));
    }catch(e){ console.warn('getSpotifyTracksByIds error', e?.message || e); }
  }
  return out;
}

async function getSpotifyArtistsByIds(artistIds, accessToken){
  if(!accessToken) return [];
  const out = [];
  const headers = { Authorization: `Bearer ${accessToken}` };
  for(const chunk of chunkArray(artistIds,50)){
    try{
      const res = await axios.get('https://api.spotify.com/v1/artists', { params: { ids: chunk.join(',') }, headers });
      out.push(...(res.data && res.data.artists ? res.data.artists.filter(Boolean) : []));
    }catch(e){ /* best-effort: skip */ }
  }
  return out;
}

// extract a Spotify track id from various possible fields on a collected item
function extractSpotifyIdFromItem(obj){
  if(!obj) return null;
  if(obj.uri && typeof obj.uri === 'string' && obj.uri.includes('spotify:track:')) return obj.uri.split(':').pop();
  if(obj.href && typeof obj.href === 'string'){
    const m = obj.href.match(/track\/([^?\/]+)/);
    if(m) return m[1];
  }
  if(obj.external_urls && obj.external_urls.spotify) {
    const m = String(obj.external_urls.spotify).match(/track\/([^?\/]+)/);
    if(m) return m[1];
  }
  // fallback: if id looks like a spotify id
  if(obj.id && typeof obj.id === 'string' && /^[A-Za-z0-9]{10,}$/.test(obj.id)) return obj.id;
  return null;
}

function extractSpotifyIdsFromCollected(collected){
  const ids = collected.map(c=>extractSpotifyIdFromItem(c)).filter(Boolean);
  return Array.from(new Set(ids));
}

// Enrich collected Recco items with Spotify track + artist metadata (release_date, canonical names, genres)
async function enrichCollectedWithSpotify(collected, accessToken){
  const uniqIds = extractSpotifyIdsFromCollected(collected);
  const spotifyMeta = await getSpotifyTracksByIds(uniqIds, accessToken);

  for(const s of spotifyMeta){
    try{
      const idx = collected.findIndex(c=>c && (extractSpotifyIdFromItem(c) === s.id || c.id === s.id));
      if(idx === -1) continue;
      const c = collected[idx];
      // ensure album object and release_date
      c.album = c.album || {};
      if(!c.album.release_date && s.album && s.album.release_date) c.album.release_date = s.album.release_date;
      if(!c.album.name && s.album && s.album.name) c.album.name = s.album.name;
      // canonical name and artists
      if(!c.trackTitle && s.name) c.trackTitle = s.name;
      if(!c.name && s.name) c.name = s.name;
      if((!c.artists || !c.artists.length) && Array.isArray(s.artists)) c.artists = s.artists.map(a=>a.name);
    }catch(e){ /* ignore per-item errors */ }
  }

  // gather artist ids and fetch their metadata for genres
  const artistIds = new Set();
  for(const s of spotifyMeta){
    if(Array.isArray(s.artists)) for(const a of s.artists) if(a && a.id) artistIds.add(a.id);
  }
  const artistList = Array.from(artistIds);
  if(artistList.length){
    const artistsMeta = await getSpotifyArtistsByIds(artistList, accessToken);
    const artistMap = {};
    for(const a of artistsMeta) artistMap[a.id] = a;
    for(const s of spotifyMeta){
      try{
        const idx = collected.findIndex(c=>c && (extractSpotifyIdFromItem(c) === s.id || c.id === s.id));
        if(idx === -1) continue;
        const c = collected[idx];
        const genres = new Set();
        if(Array.isArray(s.artists)){
          for(const a of s.artists){
            const meta = artistMap[a.id];
            if(meta && Array.isArray(meta.genres)) for(const g of meta.genres) genres.add(g);
          }
        }
        const genreArr = Array.from(genres);
        if(genreArr.length) c.genres = genreArr;
      }catch(e){ /* ignore per-item */ }
    }
  }

  return { collected: collected.length, spotifyMeta: spotifyMeta.length, artistCount: artistList.length };
}

// normalize track object from Recco/Spotify combined
function normalizeTrack(t, af){
  // album can be either an object (with name/release_date) or a string; handle both
  const albumObj = (t.album && typeof t.album === 'object') ? t.album : null;
  const release = albumObj ? (albumObj.release_date || null) : null;
  const release_year = release ? parseInt(String(release).slice(0,4)) : null;
  
  // Handle both Recco (trackTitle) and Spotify (name) formats
  const trackName = t.trackTitle || t.name || 'Unknown';
  
  // Handle both Recco (objects) and Spotify (objects) artist formats
  const artistsArray = Array.isArray(t.artists) ? t.artists : [];
  const artistNames = artistsArray.map(a => typeof a === 'string' ? a : (a.name || 'Unknown')).filter(Boolean);
  
  return {
    id: t.id,
    name: trackName,
    artists: artistNames,
    uri: t.uri || (t.href ? t.href.replace('https://open.spotify.com/track/','spotify:track:') : null),
    href: t.href || null,
    popularity: t.popularity || 0,
    album: albumObj ? albumObj.name : (typeof t.album === 'string' ? t.album : null),
    release_year,
    genres: Array.isArray(t.genres) ? t.genres : (t.genre ? [t.genre] : []),
    audio_features: af || null,
  };
}

function scoreAndSelectTracks(ids, tracks, features, target_danceability, bpmMin, bpmMax, yearMin, yearMax){
  // same scoring logic as in generate.js
  const tempoWeight = 4.0; const danceWeight = 1.0; const popularityWeight = 0.2;
  const rangeWidth = Math.max(1, (bpmMax - bpmMin));
  const out = ids.map(id=>{
    const track = tracks.find(t=>t && t.id===id) || null;
    const audio_features = (features||[]).find(x=>x && x.id===id) || null;
    let score=0;
    // determine release year if available
    let release_year = null;
    try{
      const r = track && (track.release_year || (track.album && (track.album.release_date || track.album.release_date)) || track.release_date);
      if(r){ release_year = parseInt(String(r).slice(0,4)); }
    }catch(e){ release_year = null; }

    // filter by year range if provided
    if(typeof yearMin === 'number' && typeof yearMax === 'number' && release_year){
      if(release_year < yearMin || release_year > yearMax){
        return null;
      }
    }
    if(audio_features){
      if(target_danceability!=null && typeof audio_features.danceability === 'number'){
        const danceScore = Math.max(0,1-Math.abs(audio_features.danceability - target_danceability)); score += danceWeight * danceScore;
      }
      if(typeof audio_features.tempo === 'number'){
        const tempo = audio_features.tempo; let tempoScore = 0;
        if(tempo >= bpmMin && tempo <= bpmMax) tempoScore = 1; else { const dist = tempo < bpmMin ? (bpmMin-tempo) : (tempo-bpmMax); tempoScore = Math.max(0,1 - (dist/(rangeWidth*2))); }
        score += tempoWeight * tempoScore;
      }
    }
    if(track && typeof track.popularity === 'number') score += popularityWeight * (track.popularity/100);
    return { track, score, audio_features };
  }).filter(x=>x && x.track);
  return out;
}

async function generateTracks(params, accessToken){
  // params: bpmMin,bpmMax,yearMin,yearMax,genres,length_minutes
  const bpmMin = Number(params.bpm_min) || 0;
  const bpmMax = Number(params.bpm_max) || 250;
  const yearMin = Number(params.year_min) || 1900;
  const yearMax = Number(params.year_max) || new Date().getFullYear();
  const genres = Array.isArray(params.genres) ? params.genres : (params.genres ? [params.genres] : []);
  const length_minutes = Number(params.length_minutes) || 60;
  const targetDance = typeof params.danceability === 'number' || !isNaN(Number(params.danceability)) ? Number(params.danceability) : 0.7;

  // get user's top tracks
  const headers = { Authorization: `Bearer ${accessToken}` };
  const me = await axios.get('https://api.spotify.com/v1/me', { headers }).catch(()=>null);
  const topTracksRes = await axios.get('https://api.spotify.com/v1/me/top/tracks?limit=50', { headers }).catch(()=>({ data:{ items:[] } }));
  let topTracks = Array.isArray(topTracksRes.data?.items) ? topTracksRes.data.items.slice() : [];
  for(const g of genres){
    try{ 
      const q = `year:${yearMin}-${yearMax} genre:\"${g}\"`;
       const sr = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=50`, { headers }); 
       topTracks.push(...(sr.data?.tracks?.items||[]));
     }catch(e){/*ignore*/}
  }
  const spotifyTrackIds = topTracks.map(t=>t.id).filter(Boolean);

  // collect Recco tracks & details
  let collected = await getReccoTracksByIds(spotifyTrackIds);
  for(const chunk of chunkArray(spotifyTrackIds,5)){
    const recs = await getReccoRecommendations({ trackIds: chunk, seed_genres: genres.length?genres:undefined, targetTempo: null, targetDanceability: targetDance, limit: Math.min(100, spotifyTrackIds.length+20) }).catch(()=>[]);
    collected.push(...recs);
  }

  // enrich collected items with Spotify metadata (album.release_date, canonical name/artists) when available
  try{
    const info = await enrichCollectedWithSpotify(collected, accessToken);
    console.log('generate_core: enrichment counts', info);
  }catch(e){ /* ignore enrichment errors */ }

  console.log(`Collected ${collected.length} total recommendations`);
  
  const ids = collected.map(t=>t.id).filter(Boolean);
  let features = [];
  for(const chunk of chunkArray(ids,40)){
    const f = await getReccoAudioFeatures(chunk).catch(()=>[]);
    features.push(...f);
  }

  const scored = scoreAndSelectTracks(ids, collected, features, targetDance, bpmMin, bpmMax, yearMin, yearMax);
  scored.sort((a,b)=> (b.score||0)-(a.score||0));

  const targetCount = Math.max(1, Math.ceil(length_minutes / 3.5));
  const final = scored.slice(0, targetCount).map(s => {
    const normalized = normalizeTrack(s.track, s.audio_features);
    // propagate score for UI and keep original raw object for debugging
    normalized.score = s.score;
    normalized._raw = s.track;
    return normalized;
  });
  console.log(`Generated ${final.length} tracks from ${scored.length} scored candidates`, `(requested length_minutes=${length_minutes})`);
  return { tracks: final, userId: me?.data?.id || null };
}

module.exports = { generateTracks };
