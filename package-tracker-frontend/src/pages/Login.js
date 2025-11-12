import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { login, getUser } from '../services/authService';

const Login = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('employee');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [packageId, setPackageId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (u) {
      if (u.role === 'employee') navigate('/admin');
      if (u.role === 'customer') navigate('/track');
    }
  }, [navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = login({ username, password, role, packageId });
    setLoading(false);
    if (!res.success) {
      setError(res.message);
      return;
    }

    if (role === 'employee') navigate('/admin');
    else navigate('/user');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand">
          <div className="logo">📦</div>
          <div className="title">Système de suivi de colis</div>
          <div className="subtitle">Logistique intelligente · en un coup d'œil</div>
        </div>

        <div className="role-switch">
          <button className={`role-btn ${role === 'employee' ? 'active' : ''}`} onClick={() => setRole('employee')}>Connexion employé</button>
          <button className={`role-btn ${role === 'customer' ? 'active' : ''}`} onClick={() => setRole('customer')}>Connexion client</button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nom d'utilisateur</label>
            <input
              type="text"
              placeholder={role === 'employee' ? 'employee ou admin' : 'customer'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="password"
              placeholder="Veuillez saisir le mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {role === 'customer' && (
            <div className="form-group">
              <label>ID colis</label>
              <input
                type="text"
                placeholder="Veuillez saisir votre ID colis"
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
                required
              />
            </div>
          )}

          {error && <div className="error-tip">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <div className="hint">
            Comptes d'exemple : employé employee/123456, client customer/123456
          </div>
        </form>
      </div>

      <div className="login-bg">
        <div className="bubble b1" />
        <div className="bubble b2" />
        <div className="bubble b3" />
      </div>
    </div>
  );
};

export default Login;
