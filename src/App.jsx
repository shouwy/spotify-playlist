import React, { useEffect, useState } from 'react'
import GeneratePage from './pages/generate';
import ManagePlaylists from './pages/manage_playlists';
import AdminPage from './pages/admin';
import AdminUsers from './pages/admin_users';
import AdminMetrics from './pages/admin_metrics';
import JobPage from './pages/job';
import { callAdminRequest } from './utils/api.js';
import Header from './components/Header';

const SITE_URL = window.location.origin
const SCOPES = 'playlist-modify-public playlist-modify-private playlist-read-private user-top-read'

function App(){
  const [user, setUser] = useState(null)
  const path = window.location.pathname;
  
  useEffect(()=>{ fetchProfile() }, [])

  useEffect(()=>{
    // if user is already logged in and on the root path, redirect to generate
    if(user && window.location.pathname === '/'){
      window.location.href = '/generate';
    }
  }, [user]);

  async function fetchProfile(){
    try{
      const r = await fetch('/.netlify/functions/me')
      if(!r.ok) return
      const j = await r.json()
      setUser(j)
    }catch(e){ console.error(e) }
  }

  function login(){ window.location.href = '/login' }
  async function logout(){ 
    localStorage.removeItem('spotify_tokens');
    try{ await fetch('/.netlify/functions/logout'); }catch(e){}
    setUser(null);
    window.location.href = '/';
  }

  const [adminRequesting, setAdminRequesting] = useState(false);
  async function requestAdmin(){
    if(adminRequesting) return;
    setAdminRequesting(true);
    try{
      await callAdminRequest();
      alert('Demande soumise');
    }catch(e){ alert('Erreur: '+(e.message||e)); }
    setAdminRequesting(false);
  }

  function renderPage(){
    if(path === '/generate') return <GeneratePage />;
    if(path === '/manage') return <ManagePlaylists />;
    if(path === '/admin') return <AdminPage />;
    if(path === '/admin/users') return <AdminUsers />;
    if(path === '/admin/metrics') return <AdminMetrics />;
    if(path.startsWith('/job')) return <JobPage />;

    // Home page: only show login prompt. If user is logged in, an effect redirects to /generate
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Spotify Playlist Manager</h1>
        <div className="p-4 bg-white rounded shadow">
          <p>Pour commencer, connectez-vous avec Spotify.</p>
          <button onClick={login} className="mt-3 px-4 py-2 bg-green-600 text-white rounded">Se connecter à Spotify</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header user={user} onLogin={()=>login()} onLogout={()=>logout()} />
      {renderPage()}
    </div>
  )
}

export default App