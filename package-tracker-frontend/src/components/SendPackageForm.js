import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';

function SendPackageForm({ onCreated, onNewPackageId }) {
  const [stations, setStations] = useState([]);
  const [src, setSrc] = useState('');
  const [dst, setDst] = useState('');
  const [category, setCategory] = useState(0);
  const [sendTime, setSendTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const loadNodes = async () => {
      try {
        const nodes = await apiService.getNodes();
        // stations only
        setStations(nodes.stations || []);
        if (!src && nodes.stations?.length) setSrc(nodes.stations[0].id);
        if (!dst && nodes.stations?.length > 1) setDst(nodes.stations[1].id);
      } catch (e) {
        setError(e.message);
      }
    };
    loadNodes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!src || !dst) {
        setError("Veuillez sélectionner les stations de départ et d'arrivée");
        return;
      }
      if (src === dst) {
        setError('La station de départ et la destination ne peuvent pas être identiques');
        return;
      }
    setLoading(true);
    try {
  const pkg = await apiService.createScheduledPackage({ src, dst, category, sendTime: Number(sendTime) });
  setSuccess(`Colis créé : ${pkg.id.substring(0,8)}... (heure création=${pkg.createTime.toFixed(2)}h)`);
      if (onCreated) onCreated(pkg);
  if (onNewPackageId) onNewPackageId(pkg.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3>Envoyer un nouveau colis</h3>
      <form onSubmit={handleSubmit} className="send-package-form">
        <div className="form-group">
          <label>Station de départ</label>
          <select value={src} onChange={(e) => setSrc(e.target.value)}>
            {stations.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Station d'arrivée</label>
          <select value={dst} onChange={(e) => setDst(e.target.value)}>
            {stations.filter(s => s.id !== src).map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Type de colis</label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label><input type="radio" name="category" value={0} checked={category === 0} onChange={() => setCategory(0)} /> Standard</label>
            <label><input type="radio" name="category" value={1} checked={category === 1} onChange={() => setCategory(1)} /> Express</label>
          </div>
        </div>
        <div className="form-group">
          <label>Heure d'envoi (heures de simulation)</label>
          <input type="number" min={0} step={0.1} value={sendTime} onChange={(e) => setSendTime(e.target.value)} />
        </div>
        {error && <div className="error" style={{ color: '#d33', fontSize: '0.85rem' }}>{error}</div>}
        {success && <div className="success" style={{ color: '#0a7', fontSize: '0.85rem' }}>{success}</div>}
        <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Envoi...' : 'Créer le colis'}</button>
      </form>
      <p style={{ fontSize: '0.75rem', color: '#666', marginTop: 8 }}>Remarque : si l'axe de simulation est antérieur à l'heure d'envoi, le colis apparaîtra comme « non créé ».</p>
    </div>
  );
}

export default SendPackageForm;