import React, { useState } from 'react';

export default function Header({ user, onLogin, onLogout }){
  const [open, setOpen] = useState(false);
  return (
    <div className="header">
      <div className="brand">
        <div className="brand-badge">SP</div>
        <div className="brand-title">Spotify Playlist Manager</div>
      </div>

      <div className="menu-wrap">
        <button aria-label="menu" onClick={()=>setOpen(o=>!o)} className="menu-button">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div role="menu" aria-hidden={!open} className={open ? 'menu-pop open' : 'menu-pop'}>
          <div className="menu-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /></svg>
            <div>{user ? (user.display_name || user.email) : 'Invité'}</div>
          </div>

          <div className="menu-divider" />

          <div className="menu-col">
            <MenuItem disabled={!user} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>} text="Générer" onClick={()=>{ window.location.href = '/generate' }} />
            <MenuItem disabled={!user} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg>} text="Gérer" onClick={()=>{ window.location.href = '/manage' }} />

            {user?.role === 'admin' && (
              <>
                <div className="h-2" />
                <div className="menu-admin-label">Admin</div>
                <MenuItem icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2 5 5 .5-4 3 1 5-4-3-4 3 1-5-4-3 5-.5z" /></svg>} text="Tableau de bord" onClick={()=>{ window.location.href = '/admin' }} />
                <MenuItem icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM6 5v6h10V5" /></svg>} text="Gérer les utilisateurs" onClick={()=>{ window.location.href = '/admin/users' }} />
              </>
            )}

            <div className="h-2" />
            <div className="menu-divider" />

            {!user ? (
              <MenuItem icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v12" /><path d="M20 12v6a2 2 0 0 1-2 2H8" /><path d="M18 2v4" /><path d="M9 7h6" /></svg>} text="Se connecter" onClick={onLogin} />
            ) : (
              <MenuItem icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>} text="Se déconnecter" onClick={onLogout} />
            )}
          </div>
        </div>
        </div>
      </div>
  )
}

function MenuItem({ icon, text, onClick, disabled }){
  const handle = () => { if(disabled) return; onClick && onClick(); };
  return (
    <button onClick={handle} disabled={disabled} className={`menu-item ${disabled ? 'disabled' : ''}`}>
      <span className="icon">{icon}</span>
      <span className="flex-1">{text}</span>
    </button>
  );
}
