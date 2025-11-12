import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CustomerTrack.css';
import { getUser, logout } from '../services/authService';
import apiService, { formatApiError } from '../services/apiService';
import PathVisualization from '../components/PathVisualization';

const CustomerTrack = () => {
  const navigate = useNavigate();
  const [system, setSystem] = useState(null);
  const [packets, setPackets] = useState([]); // plusieurs colis
  const [selectedId, setSelectedId] = useState(null);
  const [calculatedPath, setCalculatedPath] = useState(null);
  const [simTime, setSimTime] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== 'customer') {
      navigate('/');
      return;
    }

    const init = async () => {
      try {
        setLoading(true);
        setError('');
  // récupérer les nœuds du système
        const data = await apiService.getSystemData();
        setSystem({ stations: data.stations, centers: data.centers, edges: data.edges, parameters: data.parameters });
  // récupérer plusieurs colis (par lot)
        const ids = (user.packageIds && user.packageIds.length) ? user.packageIds : (user.packageId ? [user.packageId] : []);
        let loaded = [];
        if (ids.length === 1) {
          try {
            const single = await apiService.getPackage(ids[0]);
            loaded = [single];
          } catch (e) {
            // Si le colis n'est pas trouvé (par ex. packageId expiré dans la session locale), nettoyer la session locale et revenir à la page de connexion
            const msg = (e && e.message) ? e.message : '';
            const isNotFound = msg === 'Colis introuvable' || (e.response && e.response.status === 404);
            if (isNotFound) {
              // Nettoyer les infos utilisateur stockées localement pour éviter des requêtes répétées sur des IDs inexistants
              try { localStorage.removeItem('pkgtracker_user'); } catch (_) {}
              navigate('/');
              return;
            }
            throw e;
          }
        } else if (ids.length > 1) {
          loaded = await apiService.getPackagesBatch(ids);
        }
        setPackets(loaded);
        if (loaded.length > 0) {
          setSelectedId(loaded[0].id);
          const first = loaded[0];
          if (!first.calculatedPath || !first.calculatedPath.path) {
            const r = await apiService.calculatePath(first.src, first.dst, first.category);
            setCalculatedPath(r);
          } else {
            setCalculatedPath(first.calculatedPath);
          }
        }
      } catch (err) {
        const info = formatApiError(err);
        setError(info.message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [navigate]);

  // Copier la logique de calcul de position depuis App.js pour s'assurer que l'icône est positionnée correctement
  const computePackagePosition = (p, t) => {
    const createTime = Number(p.createTime || 0);
    if (t < createTime) {
      return { status: 'not_created', location: p.src, progress: 0 };
    }
    const pr = p.calculatedPath || p.calculatedPath;
    if (!pr || !pr.path || !pr.pathInfo || !pr.pathInfo.segments) {
      return { status: p.status || 'created', location: p.currentLocation || p.src, progress: 1 };
    }
    const segments = pr.pathInfo.segments || [];
    const n = segments.length;
    let segTimes = [];
    if (segments.every(s => s.timeCost !== undefined)) {
      segTimes = segments.map(s => Number(s.timeCost || 0));
    } else if (pr.costType === 'time' && segments.every(s => s.cost !== undefined)) {
      segTimes = segments.map(s => Number(s.cost || 0));
    } else {
      const totalTime = Number(pr.pathInfo?.totalTime || 0);
      if (totalTime > 0) {
        const totalCost = segments.reduce((acc, s) => acc + (Number(s.cost || 0)), 0) || segments.length;
        segTimes = segments.map(s => {
          const c = Number(s.cost || 1);
          return (c / totalCost) * totalTime;
        });
      } else if (n > 0) {
        segTimes = Array(n).fill(12 / n);
      } else {
        segTimes = [];
      }
    }
    let cur = createTime;
    for (let i = 0; i < n; i++) {
      const dt = segTimes[i] || 0;
      const start = cur;
      const end = cur + dt;
      if (t >= start && t <= end) {
        const progress = dt > 0 ? (t - start) / dt : 1;
        return { status: 'in_transit', from: segments[i].from, to: segments[i].to, progress };
      }
      cur = end;
    }
    const last = segments[n - 1];
    const finalLocation = last ? last.to : p.dst;
    return { status: 'delivered', location: finalLocation, progress: 1 };
  };

  const packagesAtSimTime = useMemo(() => {
    if (!packets || packets.length === 0) return [];
    return packets.map(p => {
      const copy = { ...p };
      if (copy.id === selectedId && calculatedPath) {
        copy.calculatedPath = calculatedPath;
        copy.path = calculatedPath.path || [];
      }
      return { ...copy, simPos: computePackagePosition(copy, simTime) };
    });
  }, [packets, calculatedPath, simTime, selectedId]);

  const simBounds = useMemo(() => {
    if (!packets || packets.length === 0) return { min: 0, max: 12 };
    let maxT = 12;
    packets.forEach(p => {
      const ct = Number(p.createTime || 0);
      const totalTime = Number(p.calculatedPath?.pathInfo?.totalTime || 0);
      const end = ct + (totalTime > 0 ? totalTime : 0);
      if (end > maxT) maxT = end;
    });
    return { min: 0, max: Math.ceil(maxT * 100) / 100 };
  }, [packets]);

  const onLogout = () => { logout(); navigate('/'); };

  if (loading) {
    return (
      <div className="ct-loading">
        <div className="card">
          <div className="spinner" />
          <div>Chargement de vos colis en cours...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ct-error">
        <div className="card">
          <div className="title">Erreur</div>
          <div className="msg">{error}</div>
          <button className="btn" onClick={() => window.location.reload()}>Réessayer</button>
        </div>
      </div>
    );
  }

  if (!system) return null;

  return (
    <div className="ct-page">
      <header className="ct-header">
          <div className="brand">
          <span className="logo">📦</span>
          <div className="title">
            <div className="name">Mes colis</div>
            <div className="sub">Logistique intelligente · Suivi en temps réel</div>
          </div>
        </div>
        <div className="actions">
          <div className="user"><span className="avatar">{(getUser()?.displayName || 'C').slice(0,1)}</span>{getUser()?.displayName || 'Client'}</div>
          <button className="outline" onClick={()=>navigate('/user')}>Retour au menu</button>
          <button className="outline" onClick={onLogout}>Se déconnecter</button>
        </div>
      </header>

      <main className="ct-main">
        <div className="cards">
          <div className="card info">
            <h3 style={{marginTop:0}}>Liste de mes colis</h3>
            {packets.length === 0 && <div>Aucun colis pour le moment. Veuillez en créer un.</div>}
            {packets.length > 0 && (
              <div className="pkg-list" style={{maxHeight:240, overflowY:'auto', marginBottom:12}}>
                {packets.map(p => (
                  <div key={p.id} className={`pkg-item ${p.id===selectedId?'active':''}`} style={{padding:'6px 8px', border:'1px solid #ddd', borderRadius:6, marginBottom:6, background:p.id===selectedId?'#eef6ff':'#fff'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div className="mono" style={{fontSize:'0.75rem'}}>{p.id}</div>
                      <button className="btn small" onClick={() => {
                        setSelectedId(p.id);
                        if (!p.calculatedPath || !p.calculatedPath.path) {
                          apiService.calculatePath(p.src, p.dst, p.category).then(r=>setCalculatedPath(r));
                        } else {
                          setCalculatedPath(p.calculatedPath);
                        }
                      }}>Voir</button>
                    </div>
                    <div style={{fontSize:'0.7rem', color:'#555'}}>Itinéraire: {p.src} → {p.dst} | {p.category===1?'Express':'Standard'} | Statut: {p.status}</div>
                  </div>
                ))}
              </div>
            )}
            {selectedId && calculatedPath && (
              <div className="selected-summary" style={{fontSize:'0.8rem', padding:'8px', background:'#f9fafb', border:'1px solid #eee', borderRadius:6}}>
                <div><strong>Affichage actuel:</strong> <span className="mono">{selectedId}</span></div>
                <div>Temps estimé: {Number(calculatedPath.pathInfo?.totalTime || 0).toFixed(2)} heures</div>
              </div>
            )}
          </div>
          <div className="card viz">
              <PathVisualization
                stations={system.stations}
                centers={system.centers}
                edges={system.edges}
                selectedPackage={packets.find(p=>p.id===selectedId) || null}
                calculatedPath={calculatedPath}
                packagesAtSimTime={packagesAtSimTime}
              />
            <div className="timeline">
              <label>Temps de simulation : {simTime.toFixed(2)} heures</label>
              <input type="range" min={simBounds.min} max={simBounds.max} step={(simBounds.max - simBounds.min)/200} value={simTime} onChange={(e)=>setSimTime(Number(e.target.value))} />
              <button className="btn small" onClick={()=>setSimTime(simBounds.min)}>Début</button>
              <button className="btn small" onClick={()=>setSimTime(simBounds.max)}>Fin</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustomerTrack;
