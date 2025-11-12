import React, { useEffect, useState, useRef } from 'react';
import './NodeStatus.css';
import apiService from '../services/apiService';

export default function NodeStatus() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);
  // Temps de simulation (heures), la plage est déterminée par sim_bounds renvoyé par le backend
  const [simTime, setSimTime] = useState(0);
  const [simMin, setSimMin] = useState(0);
  const [simMax, setSimMax] = useState(12);
  const debounceRef = useRef(null);

  const loadAt = async (t) => {
    setLoading(true);
    try {
      const data = await apiService.getNodeCountsAt(Number(t));
      setNodes(data || []);
    } catch (e) {
      console.error('Échec du chargement des données des sites', e);
      setNodes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 获取仿真时间范围并加载初始时间点数据
    let mounted = true;
    const init = async () => {
      try {
        const bounds = await apiService.getSimBounds();
        if (!mounted) return;
          const maxVal = Number(bounds?.max ?? 12);
          const minVal = Number(bounds?.min ?? 0);
          setSimMin(minVal);
          setSimMax(maxVal);
          // 将当前时间初始化到 min（也可以初始化到 max 或中点，选择 min 更直观）
          setSimTime(minVal);
          // 立即加载 minVal 时点的数据
          await loadAt(minVal);
      } catch (e) {
        // 如果获取范围失败，回退到默认行为
        await loadAt(simTime);
      }
    };
    init();
    // 清理定时器
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSliderChange = (e) => {
    const v = Number(e.target.value);
    setSimTime(v);
    // 防抖，避免在拖动时频繁请求（200ms）
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadAt(v);
    }, 180);
  };

  const onRefresh = () => loadAt(simTime);

  return (
    <div className="node-status-page">
      <div className="container">
        <div className="card">
          <header className="node-status-header">
            <h2>État des sites</h2>
            <div className="controls">
              <button className="btn" onClick={onRefresh}>Actualiser</button>
            </div>
          </header>

          <section className="time-control">
            <label>Timeline : <strong>{simTime.toFixed(1)}h</strong> (plage {simMin.toFixed(1)}h — {simMax.toFixed(1)}h)</label>
            <input
              type="range"
              min={simMin}
              max={simMax}
              step="0.1"
              value={simTime}
              onChange={onSliderChange}
              className="time-slider"
            />
          </section>

          <main>
            {loading ? (
              <div className="loading">Chargement…</div>
            ) : (
              <div className="counts-grid">
                {nodes.map(n => (
                    <div key={n.id} className="count-card">
                      <div className="node-meta">
                        <div className="node-id">{n.id}</div>
                        <div className="node-type">{n.type}</div>
                      </div>
                      <div className="count">{n.currentPackageCount}</div>
                      <div className="throughput">Débit : {n.throughput || '-'}</div>
                      <div className="node-actions">
                        <button className="btn btn-small" onClick={async () => {
                          // Afficher la liste des colis présents sur ce nœud à simTime
                          try {
                            const pkgs = await apiService.getPackagesAtNode(n.id, simTime);
                            // 临时显示在 alert（可改为弹窗或展开面板）
                            if (!pkgs || pkgs.length === 0) {
                              alert(`${n.id} : aucun colis à ${simTime.toFixed(1)}h`);
                            } else {
                              const list = pkgs.map(p => `${p.id.substring(0,8)}... (${p.status})`).join('\n');
                              alert(`${n.id} - colis à ${simTime.toFixed(1)}h:\n` + list);
                            }
                          } catch (e) {
                            console.error('Échec de la récupération des colis du nœud', e);
                            alert('Échec : ' + e.message);
                          }
                        }}>Voir les colis</button>
                      </div>
                    </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
