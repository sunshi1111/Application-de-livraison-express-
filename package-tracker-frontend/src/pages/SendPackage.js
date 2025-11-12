import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SendPackage.css';
import { getUser, logout } from '../services/authService';
import SendPackageForm from '../components/SendPackageForm';
import { appendCustomerPackageId } from '../services/authService';

export default function SendPackage() {
  const navigate = useNavigate();
  const user = getUser();
  const [lastPkg, setLastPkg] = useState(null);

  if (!user || user.role !== 'customer') {
    return <div style={{padding:40}}>Accès non autorisé.</div>;
  }

  return (
    <div className="sp-page">
      <header className="sp-header">
        <div className="brand">
          <span className="logo">📦</span>
          <div className="title">
            <h1>Envoyer un nouveau colis</h1>
            <span>Choisissez origine/destination et type, planifiez l'heure d'envoi</span>
          </div>
        </div>
        <div className="actions">
          <button className="btn" onClick={()=>navigate('/user')}>Retour au menu</button>
          <button className="btn" onClick={()=>navigate('/track')}>Mes colis</button>
          <button className="btn btn-danger" onClick={()=>{ logout(); navigate('/'); }}>Se déconnecter</button>
        </div>
      </header>
      <main className="sp-main">
        <div className="left">
          <SendPackageForm 
            onCreated={(pkg) => setLastPkg(pkg)}
            onNewPackageId={(pid) => appendCustomerPackageId(pid)}
          />
        </div>
        <div className="right">
          <div className="card">
            <h3>Derniers résultats de création</h3>
            {lastPkg ? (
              <div className="pkg-info">
                <div><strong>ID:</strong> <span className="mono">{lastPkg.id}</span></div>
                <div><strong>Itinéraire:</strong> {lastPkg.src} → {lastPkg.dst}</div>
                <div><strong>Type:</strong> {lastPkg.category === 1 ? 'Express' : 'Standard'}</div>
                <div><strong>createTime:</strong> {Number(lastPkg.createTime).toFixed(2)} h</div>
                <div><strong>Statut:</strong> {lastPkg.status}</div>
                <div style={{marginTop: 10}}>
                  <button className="btn" onClick={()=>navigate('/track')}>Voir mes colis</button>
                </div>
              </div>
            ) : <p>Aucun colis récemment créé.</p>}
            <p className="hint">Remarque : si le temps de simulation est inférieur à createTime, le colis apparaîtra comme « non créé ».</p>
          </div>
        </div>
      </main>
    </div>
  );
}