import React from 'react';
import { useNavigate } from 'react-router-dom';
import './UserHome.css';
import { getUser, logout } from '../services/authService';

const Card = ({ title, desc, action, onClick, icon }) => (
  <div className="u-card">
    <div className="icon">{icon}</div>
    <div className="content">
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
    <button className="btn" onClick={onClick}>{action}</button>
  </div>
);

export default function UserHome() {
  const navigate = useNavigate();
  const user = getUser();

  return (
    <div className="u-home">
      <header className="u-header">
        <div className="brand">
          <span className="logo">📦</span>
          <div className="title">
            <h1>Mes services</h1>
            <span>Uniquement recherche de colis personnelle et informations personnelles</span>
          </div>
        </div>
        <div className="actions">
          <div className="user-chip" title="Utilisateur actuel">
            <div className="avatar">{(user?.displayName || 'C').slice(0,1)}</div>
            <div className="name">{user?.displayName || 'Client'}</div>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/track')}>Mes colis</button>
          <button className="btn btn-secondary" onClick={() => navigate('/user/send')}>Envoyer un colis</button>
          <button className="btn btn-secondary" onClick={() => navigate('/user/profile')}>Profil</button>
          <button className="btn btn-danger" onClick={() => { logout(); navigate('/'); }}>Se déconnecter</button>
        </div>
      </header>

      <main className="u-main">
        <div className="u-grid">
          <Card
            title="Mes colis"
            desc="Consultez et suivez vos colis dans le système (basé sur l'ID renseigné lors de la connexion)."
            action="Voir les colis"
            onClick={() => navigate('/track')}
            icon="🧭"
          />
          <Card
            title="Envoyer un colis"
            desc="Créez un nouveau colis : choisissez origine/destination et horaire d'envoi."
            action="Créer"
            onClick={() => navigate('/user/send')}
            icon="🚚"
          />
          <Card
            title="Profil"
            desc="Voir les informations de base et les coordonnées."
            action="Voir le profil"
            onClick={() => navigate('/user/profile')}
            icon="👤"
          />
        </div>
      </main>
    </div>
  );
}
