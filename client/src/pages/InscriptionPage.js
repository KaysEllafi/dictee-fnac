import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function InscriptionPage() {
  const [form, setForm]           = useState({ prenom: '', nom: '', email: '', telephone: '' });
  const [alert, setAlert]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [count, setCount]         = useState({ count: 0, max: 400 });
  const [inscription, setInscription] = useState(null);

  useEffect(() => {
    axios.get('/api/inscriptions/count')
      .then(r => setCount(r.data))
      .catch(() => {});
  }, []);

  const pct  = Math.round((count.count / count.max) * 100);
  const full = count.count >= count.max;

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    setAlert(null);
    if (!form.prenom || !form.nom || !form.email) {
      setAlert({ type: 'error', msg: 'Veuillez remplir tous les champs obligatoires.' });
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post('/api/inscriptions', form);
      setInscription(data.inscription);
      setCount(c => ({ ...c, count: c.count + 1 }));
      setForm({ prenom: '', nom: '', email: '', telephone: '' });
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Erreur serveur.' });
    } finally {
      setLoading(false);
    }
  };

  if (inscription) {
    return (
      <div>
        <div className="alert alert-success" style={{ marginBottom: 24 }}>
          ✅ Inscription confirmée ! Vérifiez votre e-mail pour votre QR code.
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#777', marginBottom: 8 }}>Votre code de participation</p>
          <p style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold', letterSpacing: '0.1em' }}>
            {inscription.code}
          </p>
          <p style={{ marginTop: 16, fontSize: 13, color: '#888' }}>
            Un e-mail avec votre QR code a été envoyé à <strong>{inscription.email}</strong>.<br/>
            Présentez-le à l'entrée le jour de la dictée.
          </p>
          <button
            className="btn btn-secondary"
            style={{ marginTop: 20 }}
            onClick={() => setInscription(null)}
          >
            Inscrire une autre personne
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

        {/* Compteur de places */}
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

        {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

        <div className="form-row">
          <div className="form-group">
            <label>Prénom *</label>
            <input name="prenom" value={form.prenom} onChange={handleChange} placeholder="Jean" />
          </div>
          <div className="form-group">
            <label>Nom *</label>
            <input name="nom" value={form.nom} onChange={handleChange} placeholder="Dupont" />
          </div>
        </div>
        <div className="form-group">
          <label>Adresse e-mail *</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="jean.dupont@email.com" />
        </div>
        <div className="form-group">
          <label>Téléphone</label>
          <input name="telephone" type="tel" value={form.telephone} onChange={handleChange} placeholder="+216 XX XXX XXX" />
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={loading || full}
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
