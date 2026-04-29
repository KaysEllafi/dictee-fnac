import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function ScannerPage() {
  const [code, setCode]         = useState('');
  const [result, setResult]     = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned]   = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) navigate('/login');
    inputRef.current?.focus();
  }, [token, navigate]);

  const handleScan = async (codeValue) => {
    const c = (codeValue || code).trim().toUpperCase();
    if (!c) return;
    setScanning(true);
    try {
      const { data } = await axios.post('/api/scan', { code: c },
        { headers: { Authorization: `Bearer ${token}` } });

      if (data.statut === 'ok') {
        setResult({ type: 'ok', name: `${data.inscrit.prenom} ${data.inscrit.nom}`, email: data.inscrit.email });
        setScanned(s => s + 1);
        // Bip visuel vert
        setTimeout(() => setResult(null), 4000);
      } else if (data.statut === 'deja_scanne') {
        setResult({ type: 'warning', name: `${data.inscrit.prenom} ${data.inscrit.nom}`, msg: 'Déjà enregistré.' });
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setResult({ type: 'error', msg: 'Code non reconnu.' });
      } else if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setResult({ type: 'error', msg: 'Erreur serveur.' });
      }
    } finally {
      setScanning(false);
      setCode('');
      inputRef.current?.focus();
    }
  };

  // Les douchettes USB envoient "Entrée" automatiquement après le scan
  const handleKeyDown = e => {
    if (e.key === 'Enter') handleScan();
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 'bold' }}>Scanner — Jour J</h1>
        <p style={{ color: '#777', fontSize: 14 }}>
          Scannez les QR codes ou entrez le code manuellement. 
          <strong style={{ color: '#2e7d32' }}> {scanned} scanné(s)</strong> cette session.
        </p>
      </div>

      <div className="card">
        <div className="scanner-box">
          <div style={{ fontSize: 48, marginBottom: 12 }}>▦</div>
          <p style={{ color: '#777', fontSize: 14 }}>
            Pointez le scanner vers le QR code du participant.<br/>
            Le champ ci-dessous capture automatiquement le résultat.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="FNAC-2026-00001-AB12"
            style={{
              flex: 1, height: 44, border: '2px solid #ddd', borderRadius: 8,
              padding: '0 14px', fontSize: 15, fontFamily: 'monospace', outline: 'none'
            }}
            autoFocus
          />
          <button
            className="btn btn-primary"
            style={{ width: 'auto', padding: '0 24px' }}
            onClick={() => handleScan()}
            disabled={scanning || !code}
          >
            {scanning ? '...' : 'Valider'}
          </button>
        </div>

        {result && (
          <div className={`scan-result ${result.type}`}>
            {result.type === 'ok' && (
              <>
                <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
                  ✓ {result.name}
                </div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  {result.email} — Présence confirmée
                </div>
              </>
            )}
            {result.type === 'warning' && (
              <>
                <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
                  ⚠ {result.name}
                </div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>{result.msg}</div>
              </>
            )}
            {result.type === 'error' && (
              <div style={{ fontWeight: 'bold' }}>✗ {result.msg}</div>
            )}
          </div>
        )}
      </div>

      <p style={{ marginTop: 16, fontSize: 12, color: '#aaa', textAlign: 'center' }}>
        Compatible avec toute douchette USB ou Bluetooth (mode HID clavier).
      </p>
    </div>
  );
}
