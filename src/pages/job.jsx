import React, { useEffect, useState } from 'react';
import { callGetJob, callForceJob } from '../utils/api.js';

export default function JobPage(){
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  function getQuery(){
    const p = new URLSearchParams(window.location.search);
    return p.get('id');
  }

  async function fetchJob(){
    const id = getQuery();
    if(!id) { setMsg('missing id'); setLoading(false); return; }
    try{
      const j = await callGetJob(id);
      setJob(j);
    }catch(e){ setMsg(e.message || String(e)); }
    setLoading(false);
  }

  async function force(){
    if(!job || !job.id) return;
    try{
      setMsg('Forcing job...');
      await callForceJob(job.id);
      setMsg('Job requeued.');
    }catch(e){ setMsg('Error: '+(e.message||e)); }
  }

  useEffect(()=>{ fetchJob(); },[]);

  if(loading) return <div className="p-5">Loading...</div>;
  if(!job) return <div className="p-5">No job</div>;

  const duration = job.started_at && job.ended_at ? (job.ended_at - job.started_at) : null;

  return (
    <div className="p-5">
      <h2 className="text-xl font-semibold">Job {job.id}</h2>
      {msg && <div className="text-red-600">{msg}</div>}
      <div className="mt-2">Status: {job.status}</div>
      <div>Created: {job.created_at ? new Date(job.created_at).toLocaleString() : 'n/a'}</div>
      <div>Started: {job.started_at ? new Date(job.started_at).toLocaleString() : 'n/a'}</div>
      <div>Ended: {job.ended_at ? new Date(job.ended_at).toLocaleString() : 'n/a'}</div>
      {duration != null && <div>Duration: {duration} ms</div>}
      <div className="mt-3">
        <button onClick={force} className="px-3 py-2 bg-blue-600 text-white rounded">Forcer job</button>
      </div>
      <h3 className="mt-4 text-lg font-semibold">Result</h3>
      {job.result && job.result.tracks ? (
        <ul className="list-none p-0">
          {job.result.tracks.map(t => {
            const id = t.id || t.track?.id || (t.href && t.href.split('/').pop());
            const title = t.name || t.title || (t.track && t.track.name) || 'Unknown';
            const artists = (t.artists || []).map(a=>a).join(', ') || t.artist || '';
            const tempo = t.audio_features?.tempo ?? t.audio_features?.bpm ?? null;
            const dance = typeof t.audio_features?.danceability === 'number' ? t.audio_features.danceability : (t.danceability ?? null);
            const year = t.release_year || (t.album && t.album.release_date && t.album.release_date.slice(0,4)) || null;
            const popularity = t.popularity ?? (t.track && t.track.popularity) ?? null;
            return (
              <li key={id} className="flex items-center p-2 border-b border-gray-200">
                <div className="flex-1">
                  <div className="font-semibold">{title}</div>
                  <div className="text-sm text-gray-500">{artists}</div>
                  <div className="text-sm text-gray-700 mt-1">
                    {tempo != null && <span className="mr-3">BPM: {Math.round(tempo)}</span>}
                    {dance != null && <span className="mr-3">Dance: {dance.toFixed(2)}</span>}
                    {year != null && <span className="mr-3">Year: {year}</span>}
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
      ) : <div>No result</div>}
    </div>
  );
}
