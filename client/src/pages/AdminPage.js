import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function AdminPage() {
  const [inscrits, setInscrits] = useState([]);
  const [stats, setStats]       = useState({});
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  const fetchData = useCallback(async () => {
    if (!token) { navigate('/login'); return; }
    try {
      const [listRes, statsRes] = await Promise.all([
        axios.get(`/api/admin/inscrits${search ? `?q=${search}` : ''}`,
          { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setInscrits(listRes.data);
      setStats(statsRes.data);
    } catch (err) {
      if (err.response?.status === 401) { navigate('/login'); }
    } finally {
      setLoading(false);
    }
  }, [token, search, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const exportCSV = () => {
    const rows = [['Prénom','Nom','Email','Téléphone','Code','Présent','Date inscription']];
    inscrits.forEach(r => rows.push([
      r.prenom, r.nom, r.email, r.telephone || '',
      r.code, r.present ? 'Oui' : 'Non',
      new Date(r.created_at).toLocaleString('fr-FR')
    ]));
    const csv  = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a    = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `inscrits-dictee-fnac-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 'bold' }}>Dashboard — Inscrits</h1>
        <p style={{ color: '#777', fontSize: 14 }}>Gestion des inscriptions à la Dictée Fnac 2026</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total inscrits</div>
          <div className="stat-val">{stats.total ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Présents</div>
          <div className="stat-val" style={{ color: '#2e7d32' }}>{stats.presents ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Places restantes</div>
          <div className="stat-val">{stats.places_restantes ?? '—'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Rechercher par nom, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, height: 38, border: '1px solid #ddd', borderRadius: 8, padding: '0 12px', fontSize: 14 }}
        />
        <button className="btn btn-secondary" onClick={exportCSV}>📥 Export CSV</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 24, color: '#888', textAlign: 'center' }}>Chargement...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Prénom / Nom</th>
                <th>Email</th>
                <th>Code</th>
                <th>Statut</th>
                <th>Inscription</th>
              </tr>
            </thead>
            <tbody>
              {inscrits.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 24, color: '#aaa' }}>
                  Aucun inscrit.
                </td></tr>
              ) : inscrits.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ color: '#aaa', fontSize: 12 }}>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{r.prenom} {r.nom}</td>
                  <td style={{ color: '#777', fontSize: 13 }}>{r.email}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#888' }}>{r.code}</td>
                  <td>
                    <span className={`badge ${r.present ? 'badge-ok' : 'badge-pending'}`}>
                      {r.present ? 'Présent' : 'En attente'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: '#aaa' }}>
                    {new Date(r.created_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
