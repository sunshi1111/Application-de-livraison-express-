import React, { useEffect, useMemo, useState } from 'react';
import './PackageQuery.css';
import PackageSearch from '../components/PackageSearch';
import PathVisualization from '../components/PathVisualization';
import apiService, { checkBackendConnection, formatApiError } from '../services/apiService';
import { getUser, logout } from '../services/authService';

export default function PackageQuery() {
  const [data, setData] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [calculatedPath, setCalculatedPath] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState({ connected: false, message: '' });
  const [simTime, setSimTime] = useState(0);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError(null);
        const connectionStatus = await checkBackendConnection();
        setBackendStatus(connectionStatus);
        if (!connectionStatus.connected) {
          throw new Error(connectionStatus.message + (connectionStatus.suggestion ? `\nSuggestion: ${connectionStatus.suggestion}` : ''));
        }
        const systemData = await apiService.getSystemData();
        setData(systemData);
      } catch (err) {
        const errorInfo = formatApiError(err);
  setError(errorInfo.message + (errorInfo.suggestion ? `\nSuggestion: ${errorInfo.suggestion}` : ''));
      } finally {
        setLoading(false);
      }
    };
    init();
    // 不修改全局 .container：本页面通过自身样式模拟与总览一致的居中宽度
    return () => {};
  }, []);

  const handlePackageSelect = (pkg) => {
    setSelectedPackage(pkg);
    if (pkg?.calculatedPath) setCalculatedPath(pkg.calculatedPath);
    setSimTime(0);
  };

  const handlePathCalculate = async (pkg) => {
    if (!pkg) return;
    try {
      const result = await apiService.calculatePath(pkg.src, pkg.dst, pkg.category);
      setCalculatedPath(result);
    } catch (err) {
      const errorInfo = formatApiError(err);
      alert("Échec du calcul d'itinéraire : " + errorInfo.message);
    }
  };

  const simBounds = useMemo(() => {
    if (!calculatedPath?.pathInfo) return { min: 0, max: 12 };
    const t = Number(calculatedPath.pathInfo.totalTime || 12);
    return { min: 0, max: Math.max(0.25, Math.ceil(t * 100) / 100) };
  }, [calculatedPath]);

  const packagesAtSimTime = useMemo(() => {
    if (!selectedPackage || !calculatedPath?.pathInfo) return [];
    const segments = calculatedPath.pathInfo.segments || [];
    const segTimes = segments.map(s => Number(s.timeCost ?? s.cost ?? 0));
    let t = 0;
    for (let i = 0; i < segments.length; i++) {
      const segT = segTimes[i] || 0;
      const start = t; const end = t + segT;
      if (simTime >= start && simTime <= end) {
        const progress = segT > 0 ? (simTime - start) / segT : 1;
        return [{ ...selectedPackage, simPos: { status: 'in_transit', from: segments[i].from, to: segments[i].to, progress } }];
      }
      t = end;
    }
    // before or after
    if (simTime <= 0) return [{ ...selectedPackage, simPos: { status: 'not_created', location: selectedPackage.src } }];
    const last = segments[segments.length - 1];
    return [{ ...selectedPackage, simPos: { status: 'delivered', location: last ? last.to : selectedPackage.dst } }];
  }, [selectedPackage, calculatedPath, simTime]);

  if (loading) {
    return (
      <div className="pq-loading">
  <div className="spinner" /> Chargement...
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="pq-error">
        <div>
          <h3>Erreur système</h3>
          <pre style={{whiteSpace:'pre-wrap'}}>{error || 'Erreur inconnue'}</pre>
        </div>
      </div>
    );
  }

  const user = getUser();

  return (
    <div className="pq-page">
      <header className="pq-header">
        <div className="brand">
          <span className="logo">🔍</span>
          <div className="title">
            <h1>Recherche de colis</h1>
            <span>Saisissez l'ID du colis pour voir les détails et le trajet</span>
          </div>
        </div>
        <div className="actions">
          <div className="user-chip" title="Utilisateur actuel">
            <div className="avatar">{(user?.displayName || 'U').slice(0,1)}</div>
            <div className="name">{user?.displayName || 'Administrateur'}</div>
          </div>
          <button className="btn" onClick={() => window.location.href='/admin'}>Retour au menu</button>
          <button className="btn btn-danger" onClick={() => { logout(); window.location.href='/'; }}>Se déconnecter</button>
        </div>
      </header>

      <main className="pq-main">
        <div className="left">
          <div className="card">
            <PackageSearch
              packages={data.packets}
              onPackageSelect={handlePackageSelect}
              onPathCalculate={handlePathCalculate}
            />
          </div>
        </div>
        <div className="right">
          <div className="card">
            {selectedPackage ? (
              <>
                <PathVisualization
                  stations={data.stations}
                  centers={data.centers}
                  edges={data.edges}
                  selectedPackage={selectedPackage}
                  calculatedPath={calculatedPath}
                  simTime={simTime}
                  packagesAtSimTime={packagesAtSimTime}
                />
                <div className="timeline">
                  <label>Temps : {simTime.toFixed(2)} heures</label>
                  <input type="range" min={simBounds.min} max={simBounds.max} step={(simBounds.max-simBounds.min)/200} value={simTime} onChange={(e)=>setSimTime(Number(e.target.value))} />
                  <button className="btn btn-small" onClick={()=>setSimTime(simBounds.min)}>Début</button>
                  <button className="btn btn-small" onClick={()=>setSimTime(simBounds.max)}>Fin</button>
                </div>
              </>
            ) : (
              <div className="placeholder">Veuillez saisir l'ID du colis pour afficher la visualisation</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
