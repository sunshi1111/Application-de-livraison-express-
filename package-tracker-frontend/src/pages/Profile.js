import React, { useMemo } from 'react';
import './Profile.css';
import { getUser, logout } from '../services/authService';

export default function Profile() {
  const user = getUser();

  // Génère un profil de gestionnaire simulé et plausible
  const profile = useMemo(() => {
  const username = user?.username || 'admin';
  const displayName = user?.displayName || 'Administrateur';
    const role = user?.role || 'employee';
    const baseId = Math.abs([...String(username)].reduce((h, c) => ((h<<5)-h) + c.charCodeAt(0), 0)).toString(16);
    const userId = `U-${baseId.slice(0, 8).padEnd(8, '0').toUpperCase()}`;

  // Poste / département / quart / région (simulés)
  const positions = ['Responsable logistique', 'Agent de répartition', 'Directeur régional', "Gestionnaire d'entrepôt"];
  const depts = ['Centre opérationnel Est', 'Service répartition Nord', 'Service distribution Sud', 'Contrôle qualité (siège)'];
  const shifts = ['Matin (08:00-16:00)', 'Après-midi (12:00-20:00)', 'Soir (16:00-24:00)'];
  const regions = ['Secteur Hongqiao, Shanghai', 'Secteur Tongzhou, Pékin', 'Secteur Longhua, Shenzhen', 'Secteur Yuhang, Hangzhou'];
    const pick = (arr, seed) => arr[(seed % arr.length + arr.length) % arr.length];
    const seed = baseId.length;

    const position = pick(positions, seed);
    const department = pick(depts, seed+1);
    const shift = pick(shifts, seed+2);
    const region = pick(regions, seed+3);

  // Coordonnées (simulées)
    const phone = `1${(1000000000 + seed*997).toString().slice(0,10)}`;
    const email = `${username}@logistics.example.com`;

  // Informations RH (simulées)
    const employeeNo = `EMP${(100000 + seed*37).toString().slice(0,6)}`;
    const hireDate = '2021-07-15';
  const dutyStatus = 'En service';

    // Autorisations
    const permissions = [
      "Voir le tableau de bord",
      "Recherche de colis et calcul d'itinéraire",
      'Régénérer les données simulées',
      'Exporter le rapport des colis',
      role === 'admin' ? 'Paramètres système (Admin)' : 'Lecture seule des paramètres',
    ];

    // KPI 指标（模拟）
    const kpi = {
      monthPackages: 1240,
      onTimeRate: 0.962,
      customerComplaintRate: 0.008,
      avgHandleTimeMin: 5.6,
    };

    return {
      userId, displayName, username, role, position, department, shift, region,
      phone, email, employeeNo, hireDate, dutyStatus, permissions, kpi
    };
  }, [user]);

  return (
    <div className="pro-page">
      <header className="pro-header">
        <div className="brand">
          <div className="avatar">{profile.displayName.slice(0,1)}</div>
          <div className="identity">
            <h1>{profile.displayName}</h1>
            <div className="chips">
              <span className="chip role">{profile.position}</span>
              <span className="chip dept">{profile.department}</span>
              <span className="chip status">{profile.dutyStatus}</span>
            </div>
            <div className="uid">ID utilisateur : {profile.userId} · Compte : {profile.username}</div>
          </div>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => window.location.href='/admin'}>Retour au menu</button>
          <button className="btn btn-danger" onClick={() => { logout(); window.location.href='/'; }}>Se déconnecter</button>
        </div>
      </header>

      <main className="pro-main">
        <section className="pro-grid">
          <div className="card">
            <h2>Informations de base</h2>
            <div className="info-grid">
              <div className="row"><span className="label">ID utilisateur</span><span className="value">{profile.userId}</span></div>
              <div className="row"><span className="label">Nom</span><span className="value">{profile.displayName}</span></div>
              <div className="row"><span className="label">Compte</span><span className="value">{profile.username}</span></div>
              <div className="row"><span className="label">N° employé</span><span className="value">{profile.employeeNo}</span></div>
              <div className="row"><span className="label">Date d'embauche</span><span className="value">{profile.hireDate}</span></div>
            </div>
          </div>

          <div className="card">
            <h2>Informations du poste</h2>
            <div className="info-grid">
              <div className="row"><span className="label">Poste</span><span className="value">{profile.position}</span></div>
              <div className="row"><span className="label">Département</span><span className="value">{profile.department}</span></div>
              <div className="row"><span className="label">Quart</span><span className="value">{profile.shift}</span></div>
              <div className="row"><span className="label">Zone de responsabilité</span><span className="value">{profile.region}</span></div>
              <div className="row"><span className="label">Statut actuel</span><span className="value"><span className="status-dot online"/> {profile.dutyStatus}</span></div>
            </div>
          </div>

          <div className="card">
            <h2>Contact</h2>
            <div className="info-grid">
              <div className="row"><span className="label">Téléphone</span><span className="value">{profile.phone}</span></div>
              <div className="row"><span className="label">Email</span><span className="value">{profile.email}</span></div>
            </div>
          </div>

          <div className="card">
            <h2>Autorisations</h2>
            <ul className="perm-list">
              {profile.permissions.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="kpi">
          <div className="kpi-card">
            <div className="kpi-value">{profile.kpi.monthPackages}</div>
            <div className="kpi-label">Colis traités ce mois</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{(profile.kpi.onTimeRate*100).toFixed(1)}%</div>
            <div className="kpi-label">Taux de ponctualité</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{(profile.kpi.customerComplaintRate*100).toFixed(2)}%</div>
            <div className="kpi-label">Taux de réclamation client</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-value">{profile.kpi.avgHandleTimeMin} minutes</div>
            <div className="kpi-label">Durée moyenne de traitement</div>
          </div>
        </section>
      </main>
    </div>
  );
}
