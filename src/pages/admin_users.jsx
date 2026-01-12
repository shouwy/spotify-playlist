import React, { useEffect, useState, useRef } from 'react';
import { callAdminListUsers, callAdminUpdateRole } from '../utils/api.js';

function Toast({ msg, onClose }){ useEffect(()=>{ const t = setTimeout(onClose, 3500); return ()=>clearTimeout(t); }, [onClose]); return <div className="toast">{msg}</div>; }

export default function AdminUsers(){
  const [data, setData] = useState({ users: [], requests: [] });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  async function refresh(){
    setLoading(true);
    try{
      const d = await callAdminListUsers();
      setData(d);
    }catch(e){ setToast('Erreur: '+(e.message||e)); }
    setLoading(false);
  }

  async function grant(redisKey){
    try{ await callAdminUpdateRole({ redisKey, role: 'admin' }); setToast('Admin granted'); await refresh(); }catch(e){ setToast('Erreur: '+e.message); }
  }
  async function revoke(redisKey){
    try{ await callAdminUpdateRole({ redisKey, role: null }); setToast('Admin revoked'); await refresh(); }catch(e){ setToast('Erreur: '+e.message); }
  }

  const loadedRef = useRef(false);
  useEffect(()=>{
    if(loadedRef.current) return;
    loadedRef.current = true;
    refresh();
  }, []);

  if(loading) return <div className="p-5">Loading...</div>;

  return (
    <div className="p-5">
      <h2 className="text-xl font-semibold">Gestion des utilisateurs</h2>
      {toast && <Toast msg={toast} onClose={()=>setToast(null)} />}
      <div className="mt-3">
        <h3 className="font-semibold">Demandes d'accès</h3>
        {data.requests.length === 0 && <div className="text-gray-600">Aucune demande</div>}
        <ul className="p-0 list-none">
          {data.requests.map((r,i)=>(
            <li key={i} className="mb-2">
              <div>{r.redisKey} — demandé le {new Date(r.requested_at).toLocaleString()}</div>
              <div className="mt-1">
                <button onClick={()=>grant(r.redisKey)} className="px-2 py-1 bg-green-600 text-white rounded">Accorder</button>
                <button onClick={()=>revoke(r.redisKey)} className="ml-2 px-2 py-1 bg-red-600 text-white rounded">Refuser</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-3">
        <h3 className="font-semibold">Utilisateurs connus</h3>
        <ul className="p-0 list-none">
          {data.users.map((u,i)=>(
            <li key={i} className="mb-2">
              <div>{u.key} — {u.role}</div>
              <div className="mt-1">
                {u.role !== 'admin' ? <button onClick={()=>grant(u.key)} className="px-2 py-1 bg-blue-600 text-white rounded">Grant Admin</button> : <button onClick={()=>revoke(u.key)} className="px-2 py-1 bg-gray-200 rounded">Revoke Admin</button>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
