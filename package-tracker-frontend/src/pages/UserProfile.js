import React, { useMemo } from 'react';
import './UserProfile.css';
import { getUser, logout } from '../services/authService';

export default function UserProfile() {
  const user = getUser();
  const profile = useMemo(() => {
    const username = user?.username || 'customer';
  const displayName = user?.displayName || 'Client';
    const baseId = Math.abs([...String(username)].reduce((h, c) => ((h<<5)-h) + c.charCodeAt(0), 0)).toString(16);
    const userId = `C-${baseId.slice(0, 8).padEnd(8, '0').toUpperCase()}`;
    const phone = `1${(2000000000 + baseId.length*937).toString().slice(0,10)}`;
    const email = `${username}@example.com`;
    const packageId = user?.packageId || '—';
    return { userId, displayName, username, phone, email, packageId };
  }, [user]);

  return (
    <div className="up-page">
      <header className="up-header">
        <div className="brand">
          <div className="avatar">{profile.displayName.slice(0,1)}</div>
          <div className="identity">
            <h1>{profile.displayName}</h1>
            <div className="uid">ID utilisateur : {profile.userId} · Compte : {profile.username}</div>
          </div>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => window.location.href='/user'}>Retour au menu</button>
          <button className="btn btn-danger" onClick={() => { logout(); window.location.href='/'; }}>Se déconnecter</button>
        </div>
      </header>

      <main className="up-main">
        <div className="card">
          <h2>Informations de base</h2>
          <div className="up-grid">
            <div className="row"><span className="label">ID utilisateur</span><span className="value">{profile.userId}</span></div>
            <div className="row"><span className="label">Nom</span><span className="value">{profile.displayName}</span></div>
            <div className="row"><span className="label">Compte</span><span className="value">{profile.username}</span></div>
            <div className="row"><span className="label">ID colis</span><span className="value mono">{profile.packageId}</span></div>
          </div>
        </div>
        <div className="card">
          <h2>Contact</h2>
          <div className="up-grid">
            <div className="row"><span className="label">Téléphone</span><span className="value">{profile.phone}</span></div>
            <div className="row"><span className="label">E-mail</span><span className="value">{profile.email}</span></div>
          </div>
        </div>
      </main>
    </div>
  );
}
