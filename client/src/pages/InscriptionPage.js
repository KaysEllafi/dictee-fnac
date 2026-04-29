import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const EMPTY_PARTICIPANT = { prenom: '', nom: '', telephone: '' };

function makeParticipants() {
  return [0, 1, 2].map(() => ({ ...EMPTY_PARTICIPANT }));
}

export default function InscriptionPage() {
  const [alert, setAlert]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [count, setCount]         = useState({ count: 0, max: 400 });
  const [nb, setNb]               = useState(1); // 1 à 3
  const [email, setEmail]         = useState('');
  const [participants, setParticipants] = useState(makeParticipants());
  const [inscriptions, setInscriptions] = useState(null); // array

  useEffect(() => {
    axios.get('/api/inscriptions/count')
      .then(r => setCount(r.data))
      .catch(() => {});
  }, []);

  const pct  = Math.round((count.count / count.max) * 100);
  const full = count.count >= count.max;
  const willOverflow = count.count + nb > count.max;

  const activeParticipants = useMemo(() => participants.slice(0, nb), [participants, nb]);

  const handleParticipantChange = (idx, e) => {
    const { name, value } = e.target;
    setParticipants((prev) => prev.map((p, i) => (i === idx ? { ...p, [name]: value } : p)));
  };

  const handleReset = () => {
    setNb(1);
    setEmail('');
    setParticipants(makeParticipants());
  };

  const handleSubmit = async () => {
    setAlert(null);

    const invalid = !email || !activeParticipants.every(p => p.prenom && p.nom);
    if (invalid) {
      setAlert({ type: 'error', msg: 'Veuillez remplir le(s) prénom(s) et nom(s) ainsi que l’e-mail.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAlert({ type: 'error', msg: 'Adresse e-mail invalide.' });
      return;
    }

    if (full || willOverflow) {
      setAlert({ type: 'error', msg: 'La dictée affiche complet pour le nombre d’inscriptions choisi.' });
      return;
    }

    setLoading(true);
    try {
      const payload = { email, participants: activeParticipants };
      const { data } = await axios.post('/api/inscriptions', payload);
      setInscriptions(data.inscriptions);
      setCount(c => ({ ...c, count: c.count + nb }));
      handleReset();
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Erreur serveur.' });
    } finally {
      setLoading(false);
    }
  };

  if (inscriptions) {
    const first = inscriptions[0];
    return (
      <div>
        <div className="alert alert-success" style={{ marginBottom: 24 }}>
          ✅ Inscription confirmée ! Vérifiez votre e-mail pour vos codes-barres.
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#777', marginBottom: 8 }}>Vos codes de participation</p>

          <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>
            {inscriptions.map((ins) => (
              <div key={ins.id} style={{ border: '1px solid #eee', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#777', marginBottom: 6 }}>
                  {ins.prenom} {ins.nom}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 'bold', letterSpacing: '0.1em', color: '#555' }}>
                  {ins.code}
                </div>
              </div>
            ))}
          </div>

          <p style={{ marginTop: 16, fontSize: 13, color: '#888' }}>
            Un e-mail avec vos codes-barres a été envoyé à <strong>{first.email}</strong>.<br />
            Présentez-les à l’entrée le jour de la dictée.
          </p>

          <button
            className="btn btn-secondary"
            style={{ marginTop: 20 }}
            onClick={() => setInscriptions(null)}
          >
            Inscrire une autre famille
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h1 className="card-title">Dictée Fnac Tunisie 2026</h1>
        <p className="card-subtitle">Inscrivez-vous gratuitement. Places limitées.</p>

        <div className="counter-bar">
          <span className="counter-label">{count.count} inscrits</span>
          <div className="progress">
            <div
              className={`progress-fill${pct >= 100 ? ' full' : pct >= 80 ? ' warn' : ''}`}
              style={{ width: pct + '%' }}
            />
          </div>
          <span className="counter-label">{full ? '🔴 Complet' : 'Places restantes'}</span>
        </div>

        {full && (
          <div className="alert alert-error">
            La dictée affiche complet. Vous pouvez nous contacter pour rejoindre la liste d'attente.
          </div>
        )}

        {willOverflow && !full && (
          <div className="alert alert-error">
            Il n’y a pas assez de places pour {nb} inscription(s).
          </div>
        )}

        {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>Nombre d’inscriptions (1 à 3) *</label>
          <select
            value={nb}
            onChange={(e) => setNb(parseInt(e.target.value, 10))}
            style={{
              height: 40,
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: '0 12px',
              fontSize: 14,
              outline: 'none'
            }}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </div>

        {activeParticipants.map((p, idx) => (
          <div key={idx} style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 10, color: '#777', fontSize: 13, fontWeight: 'bold' }}>
              Inscrit {idx + 1}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Prénom *</label>
                <input
                  name="prenom"
                  value={p.prenom}
                  onChange={(e) => handleParticipantChange(idx, e)}
                  placeholder="Jean"
                />
              </div>
              <div className="form-group">
                <label>Nom *</label>
                <input
                  name="nom"
                  value={p.nom}
                  onChange={(e) => handleParticipantChange(idx, e)}
                  placeholder="Dupont"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Téléphone</label>
              <input
                name="telephone"
                type="tel"
                value={p.telephone}
                onChange={(e) => handleParticipantChange(idx, e)}
                placeholder="+216 XX XXX XXX"
              />
            </div>
          </div>
        ))}

        <div className="form-group">
          <label>Adresse e-mail *</label>
          <input
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jean.dupont@email.com"
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={loading || full || willOverflow}
        >
          {loading ? 'Inscription en cours...' : "Confirmer mon inscription"}
        </button>

        <p style={{ marginTop: 16, fontSize: 12, color: '#aaa', textAlign: 'center' }}>
          En vous inscrivant, vous acceptez que vos données soient utilisées uniquement pour cet événement.
        </p>
      </div>
    </div>
  );
}
