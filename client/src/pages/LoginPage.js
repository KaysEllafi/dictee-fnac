import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [form, setForm]     = useState({ username: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/admin/login', form);
      localStorage.setItem('token', data.token);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Identifiants incorrects.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 380, margin: '60px auto' }}>
      <div className="card">
        <h2 className="card-title">Accès admin</h2>
        <p className="card-subtitle">Connectez-vous pour accéder au dashboard.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-group">
          <label>Identifiant</label>
          <input
            name="username" value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            placeholder="admin"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        <div className="form-group">
          <label>Mot de passe</label>
          <input
            name="password" type="password" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </div>
    </div>
  );
}
