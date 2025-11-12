import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import PackageSearch from './components/PackageSearch';
import PathVisualization from './components/PathVisualization';
import apiService, { checkBackendConnection, formatApiError } from './services/apiService';
import { getUser } from './services/authService';

function App({ showPackageSearch = true }) {
  const [data, setData] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [calculatedPath, setCalculatedPath] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState({ connected: false, message: '' });
  const [simTime, setSimTime] = useState(0); // simulation time in hours

  // Initialiser les données
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        setError(null);
        
  // Vérifier l'état de la connexion au backend
        const connectionStatus = await checkBackendConnection();
        setBackendStatus(connectionStatus);
        
        if (!connectionStatus.connected) {
          throw new Error(connectionStatus.message + (connectionStatus.suggestion ? `\nSuggestion : ${connectionStatus.suggestion}` : ''));
        }
        
  // Récupérer les données système depuis le backend
        const systemData = await apiService.getSystemData();
        
  // Formater la structure des données pour être compatible avec les composants existants
        const formattedData = {
          stations: systemData.stations,
          centers: systemData.centers,
          edges: systemData.edges,
          packets: systemData.packets.map(packet => ({
            ...packet,
            calculatedPath: packet.calculatedPath || null,
            path: packet.path || []
          })),
          parameters: systemData.parameters
        };
        // set simulation time range default
        setSimTime(0);
        setData(formattedData);
        
      } catch (err) {
          const errorInfo = formatApiError(err);
          setError(errorInfo.message + (errorInfo.suggestion ? `\nSuggestion : ${errorInfo.suggestion}` : ''));
        console.error('Data initialization error:', err);
        setBackendStatus({ connected: false, message: errorInfo.message });
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Gérer la sélection de colis
  const handlePackageSelect = (packageData) => {
    setSelectedPackage(packageData);
    if (packageData.calculatedPath) {
      setCalculatedPath(packageData.calculatedPath);
    }
  };

  // Recalculer l'itinéraire
  const handlePathCalculate = async (packageData) => {
    if (packageData) {
      try {
  // Appeler l'API backend pour calculer l'itinéraire
        const pathResult = await apiService.calculatePath(
          packageData.src, 
          packageData.dst, 
          packageData.category
        );
        
        setCalculatedPath(pathResult);
        
  // Mettre à jour les données des colis
        setData(prevData => ({
          ...prevData,
          packets: prevData.packets.map(pkg => 
            pkg.id === packageData.id 
              ? { ...pkg, calculatedPath: pathResult, path: pathResult.path || [] }
              : pkg
          )
        }));
        
      } catch (err) {
        console.error('Path calculation error:', err);
        const errorInfo = formatApiError(err);
        alert("Échec du calcul d'itinéraire : " + errorInfo.message);
      }
    }
  };

  // Gérer le clic sur un nœud
  const handleNodeClick = (node) => {
    console.log('Node clicked:', node);
  };

  // Régénérer les données
  const handleRegenerateData = async () => {
    setSelectedPackage(null);
    setCalculatedPath(null);
    setData(null);
    setLoading(true);
    
    try {
  // Appeler l'API backend pour régénérer les données
      await apiService.regenerateSystem();
      
  // Récupérer à nouveau les données
      const systemData = await apiService.getSystemData();
      
      const formattedData = {
        stations: systemData.stations,
        centers: systemData.centers,
        edges: systemData.edges,
        packets: systemData.packets.map(packet => ({
          ...packet,
          calculatedPath: packet.calculatedPath || null,
          path: packet.path || []
        })),
        parameters: systemData.parameters
      };

      setData(formattedData);
      
    } catch (err) {
      console.error('Regenerate data error:', err);
        const errorInfo = formatApiError(err);
      setError('Échec de la régénération des données : ' + errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  // Compute package position at a given simulation time (hours)
  const computePackagePosition = (packet, simTime) => {
    // packet.createTime (hours)
    const createTime = Number(packet.createTime || 0);
    if (simTime < createTime) {
      return { status: 'not_created', location: packet.src, progress: 0 };
    }
  // Utiliser en priorité les événements historiques (history) générés par le backend pour déterminer les périodes de séjour ; si un séjour couvre le simTime actuel, considérer comme en station
    try {
      const hist = packet.history || [];
      if (Array.isArray(hist) && hist.length > 0) {
        for (let i = 0; i < hist.length; i++) {
          const ev = hist[i];
          const evTs = Number(ev.timestamp || 0);
          const stay = Number(ev.stayDuration || 0);
          if (!isNaN(evTs) && !isNaN(stay)) {
            if (evTs <= simTime && simTime < evTs + stay) {
              return { status: 'staying', location: ev.location, progress: 1 };
            }
          }
        }
      }
    } catch (e) {
      // ignore and fallback to path-based estimation
    }

    const pathResult = packet.calculatedPath || packet.calculatedPath;
    if (!pathResult || !pathResult.path || !pathResult.pathInfo || !pathResult.pathInfo.segments) {
      // no path info - just stay at currentLocation
      return { status: packet.status || 'created', location: packet.currentLocation || packet.src, progress: 1 };
    }

    const segments = pathResult.pathInfo.segments || [];
    const n = segments.length;

    // derive per-segment time durations
    let segTimes = [];
    // try explicit timeCost fields
    if (segments.every(s => s.timeCost !== undefined)) {
      segTimes = segments.map(s => Number(s.timeCost || 0));
    } else if (pathResult.costType === 'time' && segments.every(s => s.cost !== undefined)) {
      segTimes = segments.map(s => Number(s.cost || 0));
    } else {
      // fallback: use totalTime if available, else split evenly
      const totalTime = Number(pathResult.pathInfo?.totalTime || 0);
      if (totalTime > 0) {
        const totalCost = segments.reduce((acc, s) => acc + (Number(s.cost || 0)), 0) || segments.length;
        segTimes = segments.map(s => {
          const c = Number(s.cost || 1);
          return (c / totalCost) * totalTime;
        });
      } else if (n > 0) {
        segTimes = Array(n).fill(12 / n); // fallback equal distribution over 12h window
      } else {
        segTimes = [];
      }
    }

    // accumulate times
    let t = createTime;
    for (let i = 0; i < n; i++) {
      const segT = segTimes[i] || 0;
      const segStart = t;
      const segEnd = t + segT;
      if (simTime >= segStart && simTime <= segEnd) {
        const progress = segT > 0 ? (simTime - segStart) / segT : 1;
        return { status: 'in_transit', from: segments[i].from, to: segments[i].to, progress };
      }
      t = segEnd;
    }

    // passed all segments -> delivered at dst
    const last = segments[n - 1];
    const finalLocation = last ? last.to : packet.dst;
    return { status: 'delivered', location: finalLocation, progress: 1 };
  };

  // derive simulation bounds (min/max time)
  const simBounds = useMemo(() => {
    if (!data) return { min: 0, max: 12 };
    const packets = data.packets || [];
    let maxT = 0;
    packets.forEach(p => {
      const ct = Number(p.createTime || 0);
      const totalTime = Number(p.calculatedPath?.pathInfo?.totalTime || 0);
      const end = ct + (totalTime > 0 ? totalTime : 0);
      if (end > maxT) maxT = end;
    });
    if (maxT <= 0) maxT = 12;
    return { min: 0, max: Math.ceil(maxT * 100) / 100 };
  }, [data]);

  // packages annotated with computed position for current simTime
  const packagesAtSimTime = useMemo(() => {
    if (!data) return [];
    return data.packets.map(p => ({ ...p, simPos: computePackagePosition(p, simTime) }));
  }, [data, simTime]);

  // package summary (counts and small list) computed from unfiltered packagesAtSimTime
  const packageSummary = useMemo(() => {
    const list = packagesAtSimTime || [];
    const summary = { not_created: 0, in_transit: 0, delivered: 0, list: [] };
    list.forEach(p => {
      const s = p.simPos?.status || p.status || 'created';
      if (s === 'not_created') summary.not_created++;
      else if (s === 'in_transit') summary.in_transit++;
      else if (s === 'delivered') summary.delivered++;
    });
    summary.list = (packagesAtSimTime || []).slice(0, 20).map(p => ({ id: p.id, status: p.simPos?.status || p.status }));
    return summary;
  }, [packagesAtSimTime]);

  // When a package is selected, only show that package on the map
  const displayedPackagesAtSimTime = useMemo(() => {
    if (!packagesAtSimTime) return [];
    if (selectedPackage) {
      return packagesAtSimTime.filter(p => p.id === selectedPackage.id);
    }
    return packagesAtSimTime;
  }, [packagesAtSimTime, selectedPackage]);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-container">
          <div className="spinner"></div>
          <h2>Initialisation du système de suivi des colis...</h2>
          <p>Récupération des données depuis le serveur backend</p>
          {!backendStatus.connected && (
            <div className="backend-status">
              <p style={{color: '#e53e3e', marginTop: '10px'}}>
                ⚠️ État de la connexion backend : {backendStatus.message}
              </p>
              <p style={{fontSize: '0.9rem', color: '#666'}}>
                Veuillez vous assurer que le serveur backend est en cours d'exécution (exécutez start_backend.bat)
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <div className="error-container">
          <h2>Erreur système</h2>
          <div className="error-details">
            <p style={{whiteSpace: 'pre-line'}}>{error}</p>
            {!backendStatus.connected && (
              <div className="backend-help">
                <h3>Problème de connexion au backend</h3>
                <p>Veuillez démarrer le serveur backend en suivant ces étapes :</p>
                <ol>
                  <li>Ouvrez une invite de commandes et accédez au dossier <code>package-tracker-backend</code></li>
                  <li>Exécutez <code>start_backend.bat</code> pour démarrer le serveur backend</li>
                  <li>Attendez le message "Application startup complete"</li>
                  <li>Actualisez cette page</li>
                </ol>
              </div>
            )}
          </div>
          <div className="error-actions">
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Recharger
            </button>
            <button className="btn btn-secondary" onClick={handleRegenerateData}>
              Réessayer la connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="app-error">
        <div className="error-container">
          <h2>Échec du chargement des données</h2>
          <button className="btn btn-primary" onClick={handleRegenerateData}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App" tabIndex={0}>
      <header className="app-header">
        <div className="brand">
          <div className="logo">📦</div>
            <div className="title">
            <h1>Système de suivi des colis</h1>
            <span>Plateforme intelligente de planification d'itinéraires et de suivi des colis</span>
          </div>
        </div>
        <div className="header-controls">
          <div className="backend-status-indicator">
            <span className={`status-dot ${backendStatus.connected ? 'connected' : 'disconnected'}`}></span>
            <span className="status-text">
              Backend : {backendStatus.connected ? 'Connecté' : 'Déconnecté'}
            </span>
          </div>
          <div className="user-chip" title="Utilisateur actuel">
            <div className="avatar">{(getUser()?.displayName || 'U').slice(0,1)}</div>
            <div className="name">{getUser()?.displayName || 'Employé'}</div>
          </div>
          <button 
            className="btn btn-secondary regenerate-btn"
            onClick={handleRegenerateData}
            title="Régénérer les données"
            disabled={!backendStatus.connected}
          >
            🔄 Régénérer
          </button>
          <button 
            className="btn btn-secondary regenerate-btn"
            onClick={() => { localStorage.removeItem('pkgtracker_user'); window.location.href = '/'; }}
            title="Se déconnecter"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          <div className="app-layout">
            <div className="left-panel">
              {showPackageSearch && (
                <div className="card">
                  <PackageSearch
                    packages={data.packets}
                    onPackageSelect={handlePackageSelect}
                    onPathCalculate={handlePathCalculate}
                  />
                </div>
              )}
              
              {/* Statistiques */}
              <div className="card stats-card">
                <h3>Statistiques du système</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-number">{data.stations.length}</span>
                    <span className="stat-label">Stations de livraison</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{data.centers.length}</span>
                    <span className="stat-label">Centres de distribution</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{data.packets.length}</span>
                    <span className="stat-label">Nombre total de colis</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{data.edges.length}</span>
                    <span className="stat-label">Connexions</span>
                  </div>
                </div>
                
                <div className="package-types">
                  <h4>Répartition par type de colis</h4>
                  <div className="type-distribution">
                    <div className="type-item">
                      <span className="type-label">Colis standard :</span>
                      <span className="type-count">
                        {data.packets.filter(p => p.category === 0).length}
                      </span>
                    </div>
                    <div className="type-item">
                      <span className="type-label">Colis express :</span>
                      <span className="type-count">
                        {data.packets.filter(p => p.category === 1).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="right-panel">
              <div className="card visualization-card">
                <PathVisualization
                  stations={data.stations}
                  centers={data.centers}
                  edges={data.edges}
                  selectedPackage={selectedPackage}
                  calculatedPath={calculatedPath}
                  onNodeClick={handleNodeClick}
                  simTime={simTime}
                  packagesAtSimTime={displayedPackagesAtSimTime}
                />
                <div className="timeline-controls" style={{padding: '8px 12px', marginTop: 12}}>
                  <label style={{marginRight:12}}>Temps de simulation : {simTime.toFixed(2)} heures</label>
                  <input
                    type="range"
                    min={simBounds.min}
                    max={simBounds.max}
                    step={(simBounds.max - simBounds.min) / 200}
                    value={simTime}
                    onChange={(e) => setSimTime(Number(e.target.value))}
                    style={{width: '60%'}}
                  />
                  <button className="btn btn-small" onClick={() => setSimTime(simBounds.min)} style={{marginLeft:8}}>Début</button>
                  <button className="btn btn-small" onClick={() => setSimTime(simBounds.max)} style={{marginLeft:8}}>Fin</button>
                </div>
                {/* Package summary under the timeline: show counts and a short list */}
                <div className="package-summary" style={{padding: '8px 12px', borderTop: '1px solid #eee', marginTop: 8}}>
                  {/* compute summary from all packages at sim time (not filtered by selectedPackage) */}
                  <h4 style={{margin: '4px 0'}}>Résumé des colis</h4>
                  <div style={{display: 'flex', gap: 16, alignItems: 'center'}}>
                    <div>
                      <div>Total colis : <strong>{packagesAtSimTime.length}</strong></div>
                      <div>Non créés : <strong>{packageSummary.not_created}</strong></div>
                      <div>En transit : <strong>{packageSummary.in_transit}</strong></div>
                      <div>Livrés : <strong>{packageSummary.delivered}</strong></div>
                    </div>
                    <div style={{flex: 1}}>
                      <div style={{fontSize: '0.9rem', color: '#555'}}>Liste partielle de colis (max 20)</div>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6}}>
                        {packageSummary.list.map(p => (
                          <div key={p.id} style={{padding: '6px 8px', background: '#f7f7f8', borderRadius: 6, fontSize: '0.85rem'}}>
                            <div style={{fontWeight: 600}}>{p.id.substring(0,8)}...</div>
                            <div style={{color: '#666'}}>{p.status}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>© 2024 Système de suivi des colis - Basé sur un algorithme intelligent de planification d'itinéraires</p>
      </footer>
    </div>
  );
}

export default App;