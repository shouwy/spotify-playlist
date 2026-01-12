import React, { useEffect, useState, useRef } from 'react';

export default function ManagePlaylists(){
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadedRef = useRef(false);
  useEffect(()=>{
    if(loadedRef.current) return;
    loadedRef.current = true;
    // simple fetch of user playlists via Spotify using backend function if available
    async function load(){
      try{
        const res = await fetch('/.netlify/functions/list_playlists', { credentials: 'include' });
        if(res.ok){
          const data = await res.json();
          setPlaylists(data.items || data || []);
        }
      }catch(e){
        console.warn(e);
      }finally{
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="p-5">
      <h2 className="text-xl font-semibold">Gérer mes playlists</h2>
      {loading && <div className="text-gray-500">Chargement…</div>}
      {!loading && !playlists.length && <div className="text-gray-600">Aucune playlist trouvée.</div>}
      <ul className="list-none p-0 mt-3">
        {playlists.map(p => (
          <li key={p.id} className="p-2 border-b border-gray-200">
            <strong className="block font-semibold">{p.name}</strong>
            <div className="text-sm text-gray-600">{p.tracks?.total ?? p.total ?? 0} tracks</div>
          </li>
        ))}
      </ul>
    </div>
  );
}