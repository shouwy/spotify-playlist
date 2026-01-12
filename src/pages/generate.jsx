import React, { useState, useEffect, useRef } from 'react';
import { callEnqueue, callGetJob, callProcessJob, callCreatePlaylist, callGetLastJob } from '../utils/api.js';

const STYLES = ['electronic','house','techno','ambient','pop','rock','hip-hop','dance'];

export default function GeneratePage() {
  const [bpmMin, setBpmMin] = useState(120);
  const [bpmMax, setBpmMax] = useState(180);
  const [danceability, setDanceability] = useState(0.8);
  const [styles, setStyles] = useState(['electronic']);
  const [yearMin, setYearMin] = useState(2000);
  const [yearMax, setYearMax] = useState(new Date().getFullYear());
  const [lengthMinutes, setLengthMinutes] = useState(60);
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [playlistName, setPlaylistName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [lastJob, setLastJob] = useState(null);
  const [hasActive, setHasActive] = useState(false);

  function toggleSelect(id){
    const s = new Set(selected);
    if(s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  }

  function onStyleToggle(style){
    const s = new Set(styles);
    if(s.has(style)) s.delete(style); else s.add(style);
    setStyles(Array.from(s));
  }

  async function generate() {
    setMessage('');
    setLoading(true);
    setTracks([]);
    setSelected(new Set());
    try{
      const body = {
        bpm_min: Number(bpmMin),
        bpm_max: Number(bpmMax),
        danceability: Number(danceability),
        genres: styles,
        year_min: Number(yearMin),
        year_max: Number(yearMax),
        length_minutes: Number(lengthMinutes) // optional, backend may use it
      };
      // enqueue generation job and trigger worker, then poll with exponential backoff
      const { jobId } = await callEnqueue(body);
      setMessage(`Job enqueued ${jobId}. Triggering worker...`);
      let initialDelay = 1500;
      try{
        const procRes = await callProcessJob();
        if(procRes && procRes.running && typeof procRes.retry_after === 'number'){
          initialDelay = Math.max(1000, procRes.retry_after * 1000);
          setMessage(`Worker busy; polling will start in ${Math.round(initialDelay/1000)}s`);
        } else {
          setMessage(`Worker started; polling for results...`);
        }
      }catch(e){
        console.warn('failed to trigger worker', e);
      }

      const start = Date.now();
      const timeout = 1000 * 120; // 2 minutes
      let interval = initialDelay;
      const maxInterval = 10000;
      let done = false;
      while(!done && (Date.now() - start) < timeout){
        await new Promise(r => setTimeout(r, interval));
        try{
          const job = await callGetJob(jobId);
          if(!job) { interval = Math.min(maxInterval, interval * 2); continue; }
          if(job.status === 'done'){
            setTracks(job.result?.tracks || []);
            setMessage('Génération terminée.');
            done = true;
            break;
          }
          if(job.status === 'error'){
            setMessage(`Erreur: ${job.error || 'job failed'}`);
            done = true;
            break;
          }
          // otherwise still queued/running -> update message and backoff
          setMessage(`Job ${job.status}...`);
          interval = Math.min(maxInterval, interval * 2);
        }catch(e){
          console.warn('poll error', e);
          interval = Math.min(maxInterval, interval * 2);
        }
      }
      if(!done){
        setMessage('Timeout while waiting for job.');
      }
    }catch(err){
      console.error(err);
      setMessage('Erreur pendant la génération.');
    } finally {
      setLoading(false);
    }
  }

  async function loadLastJobIntoView(){
    if(!lastJob || !lastJob.job) return;
    const j = lastJob.job;
    if(j.result && j.result.tracks) setTracks(j.result.tracks);
    else setMessage('Dernière génération ne contient pas de résultat.');
  }

  async function relaunchLastJob(){
    if(!lastJob || !lastJob.job) return setMessage('Pas de job à relancer');
    if(hasActive) return setMessage('Vous avez déjà un job en attente ou en cours.');
    try{
      setMessage('Relancement en file...');
      const params = lastJob.job.params || {};
      const { jobId } = await callEnqueue(params);
      setMessage(`Job relancé ${jobId}`);
    }catch(e){ setMessage('Erreur lors du relancement.'); }
  }

  // share the same fetch promise across mounts so StrictMode remounts don't lose the result
  let lastJobPromise = null;
  useEffect(()=>{
    let mounted = true;
    async function fetchLast(){
      try{
        if(!lastJobPromise){
          lastJobPromise = callGetLastJob().catch(e => { lastJobPromise = null; throw e; });
        }
        let res = await lastJobPromise;
        if(typeof res === 'string') res = JSON.parse(res);
        if(!mounted) return;
        setLastJob(res);
        setHasActive(!!res?.hasActive);
      }catch(e){ console.error('fetchLast error', e); }
    }
    fetchLast();
    return ()=>{ mounted = false };
  },[]);

  async function savePlaylist() {
    if (!playlistName || selected.size === 0) {
      setMessage('Donnez un nom et sélectionnez au moins une piste.');
      return;
    }
    setSaving(true);
    setMessage('');
    try{
      const chosen = tracks.filter(t => selected.has(t.id)).map(t => t.uri || t.track?.uri || t.href && hrefToSpotifyUri(t.href)).filter(Boolean);
      console.log('saving playlist with tracks', chosen);
      const res = await callCreatePlaylist({ name: playlistName, uris: chosen });
      setMessage(res?.playlistId ? `Playlist créée (${res.playlistId})` : 'Playlist créée.');
      // navigate to manage page
      window.location.href = '/manage';
    }catch(e){
      console.error(e);
      setMessage('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }

  function hrefToSpotifyUri(href){
    if(!href) return null;
    const m = href.match(/^https?:\/\/open\.spotify\.com\/([^\/]+)\/([^?\/]+)(?:\?.*)?$/);
    if(!m) return null;
    return `spotify:${m[1]}:${m[2]}`;
  }

  return (
    <div className="p-5">
      <h2 className="text-xl font-semibold">Générer ma playlist</h2>

      <div className="border border-gray-200 p-3 mb-4 rounded">
        <div>
          <label>BPM min / max</label>
          <div>
            <input type="number" min="0" max="250" value={bpmMin} onChange={e=>setBpmMin(e.target.value)} className="w-20 mr-2 border rounded px-2" />
            <input type="number" min="0" max="250" value={bpmMax} onChange={e=>setBpmMax(e.target.value)} className="w-20 border rounded px-2" />
          </div>
        </div>

        <div className="mt-2">
          <label>Danceability: {danceability}</label>
          <div>
            <input type="range" min="0" max="1" step="0.01" value={danceability} onChange={e=>setDanceability(e.target.value)} className="w-full" />
          </div>
        </div>

        <div className="mt-2">
          <label>Styles</label>
          <div>
            {STYLES.map(s => (
              <label key={s} className="mr-2">
                <input type="checkbox" checked={styles.includes(s)} onChange={()=>onStyleToggle(s)} className="mr-1"/> {s}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-2">
          <label>Années (min / max)</label>
          <div>
            <input type="number" min="1900" max={new Date().getFullYear()} value={yearMin} onChange={e=>setYearMin(e.target.value)} className="w-24 mr-2 border rounded px-2" />
            <input type="number" min="1900" max={new Date().getFullYear()} value={yearMax} onChange={e=>setYearMax(e.target.value)} className="w-24 border rounded px-2" />
          </div>
        </div>
        <div className="mt-2">
          <label>Durée (minutes)</label>
          <div>
            <input type="number" min="1" max="600" value={lengthMinutes} onChange={e=>setLengthMinutes(e.target.value)} className="w-24 border rounded px-2" />
          </div>
        </div>

        <div className="mt-3">
          <button onClick={generate} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded">{loading ? 'Génération...' : 'Générer ma playlist'}</button>
        </div>

      </div>

      <div>
        <h3>Dernière génération</h3>
        {lastJob && lastJob.job ? (
          <div className="border border-gray-100 p-2 mb-3 rounded">
            <div>Job: {lastJob.job.id} — status: {lastJob.job.status}</div>
            <div>Créé: {new Date(lastJob.job.created_at).toLocaleString()}</div>
            {lastJob.job.started_at && <div>Démarré: {new Date(lastJob.job.started_at).toLocaleString()}</div>}
            {lastJob.job.ended_at && <div>Terminé: {new Date(lastJob.job.ended_at).toLocaleString()}</div>}
            {lastJob.job.ended_at && lastJob.job.started_at && <div>Durée: {(lastJob.job.ended_at - lastJob.job.started_at)} ms</div>}
            <div className="mt-2">
              <button onClick={loadLastJobIntoView} className="px-3 py-1 bg-gray-200 rounded">Charger le résultat</button>
              <button onClick={relaunchLastJob} disabled={hasActive} className="ml-2 px-3 py-1 bg-gray-200 rounded">{hasActive ? 'Relance désactivée (job en attente)' : 'Relancer cette génération'}</button>
            </div>
          </div>
        ) : <div>Aucune génération précédente</div>}

        <div className="mt-3">
          <input placeholder="Nom de la playlist" value={playlistName} onChange={e=>setPlaylistName(e.target.value)} className="w-72 mr-2 border rounded px-2" />
          <button onClick={savePlaylist} disabled={saving || selected.size === 0 || !playlistName} className="px-3 py-2 bg-blue-600 text-white rounded">{saving ? 'Sauvegarde...' : 'Enregistrer la playlist'}</button>
        </div>
        <h3>Résultats</h3>
        {message && <div className="text-red-600">{message}</div>}
        {!tracks.length && <div>Aucune piste affichée</div>}
        <ul className="list-none p-0">
          {tracks.map(t => {
            const id = t.id || t.track?.id || (t.href && t.href.split('/').pop());
            const title = t.name || t.title || (t.track && t.track.name) || 'Unknown';
            const artists = (t.artists || []).map(a=>a).join(', ') || t.artist || '';
            const tempo = t.audio_features?.tempo ?? t.audio_features?.bpm ?? null;
            const dance = typeof t.audio_features?.danceability === 'number' ? t.audio_features.danceability : (t.danceability ?? null);
            const year = t.release_year || (t.album && t.album.release_date && t.album.release_date.slice(0,4)) || null;
            const popularity = t.popularity ?? (t.track && t.track.popularity) ?? null;
            const genres = Array.isArray(t.genres) ? t.genres : (t.genre ? [t.genre] : []);
            return (
              <li key={id} className="flex items-center p-2 border-b border-gray-200">
                <input type="checkbox" checked={selected.has(id)} onChange={()=>toggleSelect(id)} className="mr-2" />
                <div className="flex-1">
                  <div className="font-semibold">{title}</div>
                  <div className="text-sm text-gray-500">{artists}</div>
                  <div className="text-sm text-gray-700 mt-1">
                    {tempo != null && <span className="mr-3">BPM: {Math.round(tempo)}</span>}
                    {dance != null && <span className="mr-3">Dance: {dance.toFixed(2)}</span>}
                    {year != null && <span className="mr-3">Year: {year}</span>}
                    {genres.length > 0 && <span className="mr-3">Genre: {genres.join(', ')}</span>}
                    {popularity != null && <span className="mr-3">Popularity: {popularity}</span>}
                  </div>
                </div>
                <div className="w-44 text-right">
                  {t.score != null && <div className="font-semibold">score: {t.score.toFixed(2)}</div>}
                  {t.uri && <div className="text-xs text-gray-500 mt-1">{t.uri}</div>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}