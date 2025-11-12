import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminHome.css';
import { getUser, logout } from '../services/authService';

const Card = ({ title, desc, action, onClick, icon }) => (
  <div className="admin-card">
    <div className="icon">{icon}</div>
    <div className="content">
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
    <button className="btn" onClick={onClick}>{action}</button>
  </div>
);

export default function AdminHome() {
  const navigate = useNavigate();
  const user = getUser();
  // La page d'administration n'affiche plus l'état du site en ligne ; cliquez sur la carte "État des sites" pour ouvrir la page dédiée

  return (
    <div className="admin-home">
      <header className="admin-header">
        <div className="brand">
          <span className="logo">📦</span>
          <div className="title">
            <h1>Console d'administration</h1>
            <span>Choisissez un module</span>
          </div>
        </div>
        <div className="actions">
          <div className="user-chip" title="Utilisateur actuel">
            <div className="avatar">{(user?.displayName || 'U').slice(0,1)}</div>
            <div className="name">{user?.displayName || 'Administrateur'}</div>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard-overview')}>Aperçu</button>
          <button className="btn btn-secondary" onClick={() => navigate('/package-query')}>Rechercher</button>
          <button className="btn btn-secondary" onClick={() => navigate('/profile')}>Profil</button>
          <button className="btn btn-danger" onClick={() => { logout(); navigate('/'); }}>Se déconnecter</button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-grid">
          <Card
            title="Vue d'ensemble des statuts"
            desc="Accédez à la vue d'ensemble du système (sans recherche de colis) pour consulter la carte, les statistiques et la timeline."
            action="Aller à l'aperçu"
            onClick={() => navigate('/dashboard-overview')}
            icon="🗺️"
          />
          <Card
            title="Rechercher des colis"
            desc="Fonction de recherche de colis : saisissez l'ID pour voir les détails et la visualisation du trajet."
            action="Lancer la recherche"
            onClick={() => navigate('/package-query')}
            icon="🔍"
          />
          <Card
            title="Informations personnelles"
            desc="Consultez le profil, le rôle, les permissions et les indicateurs de performance."
            action="Ouvrir le profil"
            onClick={() => navigate('/profile')}
            icon="👤"
          />
        </div>
        <div className="admin-node-card">
          <Card
            title="État des sites"
            desc="Consultez le nombre de colis en temps réel et la capacité de traitement de chaque site."
            action="Voir les sites"
            onClick={() => navigate('/admin/node-status')}
            icon="📍"
          />
        </div>
      </main>
    </div>
  );
}
