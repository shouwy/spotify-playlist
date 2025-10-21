import React, { useEffect, useState } from 'react'

const SITE_URL = window.location.origin
const SCOPES = 'playlist-modify-public playlist-modify-private playlist-read-private user-top-read'

function App(){
  const [user, setUser] = useState(null)
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(()=>{ fetchProfile() }, [])

  async function fetchProfile(){
    try{
      const r = await fetch('/.netlify/functions/me')
      if(!r.ok) return
      const j = await r.json()
      setUser(j)
      fetchPlaylists()
    }catch(e){ console.error(e) }
  }

  async function fetchPlaylists(){
    try{
      setLoading(true)
      const r = await fetch('/.netlify/functions/list')
      if(!r.ok){ setLoading(false); return }
      const j = await r.json()
      setPlaylists(j.items || [])
      setLoading(false)
    }catch(e){ console.error(e); setLoading(false) }
  }

  function login(){ window.location.href = '/login' }
  function logout(){ fetch('/.netlify/functions/logout').then(()=> window.location.reload()) }

  async function generateRunning(){
    if(!confirm('Créer automatiquement la playlist "🏃 Running Electro Flow" (~3h) ?')) return
    setLoading(true)
    const r = await fetch('/.netlify/functions/generateRunning', { method: 'POST' })
    setLoading(false)
    if(r.ok){ alert('Playlist générée — vérifie ton compte Spotify'); fetchPlaylists() }
    else { const t = await r.text(); alert('Erreur: '+t) }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Spotify Playlist Manager</h1>
      {!user ? (
        <div className="p-4 bg-white rounded shadow">
          <p>Tu n'es pas connecté.</p>
          <button onClick={login} className="mt-3 px-4 py-2 bg-green-600 text-white rounded">Se connecter à Spotify</button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between bg-white p-4 rounded shadow mb-4">
            <div>
              <div className="font-medium">{user.display_name}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
            <div>
              <button onClick={generateRunning} className="px-3 py-2 bg-blue-600 text-white rounded mr-2">🎧 Générer ma playlist de course</button>
              <button onClick={logout} className="px-3 py-2 bg-red-600 text-white rounded">Se déconnecter</button>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-2">Tes playlists</h2>
            {loading ? <div>Chargement...</div> : (
              playlists.map(p => (
                <div key={p.id} className="p-3 border rounded mb-2 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-gray-500">{p.tracks.total} tracks</div>
                  </div>
                  <div>
                    <a className="mr-2 text-blue-600" href={p.external_urls.spotify} target="_blank">Ouvrir</a>
                    <button className="mr-2 px-2 py-1 bg-yellow-400 rounded" onClick={async ()=>{ const ids = prompt('URIs séparés par des virgules'); if(!ids) return; await fetch('/.netlify/functions/add',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({playlist_id:p.id, uris: ids.split(',').map(s=>s.trim())})}); alert('Ajout demandé') }}>Ajouter tracks</button>
                    <button className="px-2 py-1 bg-red-400 rounded" onClick={async ()=>{ if(!confirm('Supprimer (unfollow) ?')) return; await fetch('/.netlify/functions/delete', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({playlist_id: p.id})}); alert('Unfollow demandé'); fetchPlaylists() }}>Supprimer</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App