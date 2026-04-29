import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/library';

export default function ScannerPage() {
  const [code, setCode]         = useState('');
  const [result, setResult]     = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned]   = useState(0);
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const lastCameraScanRef = useRef({ value: '', ts: 0 });
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const refreshCameraDevices = async (reader) => {
    const r = reader || readerRef.current;
    if (!r) return [];
    try {
      const devices = await r.listVideoInputDevices();
      setCameraDevices(devices);
      if (devices.length && !selectedCameraId) setSelectedCameraId(devices[0].deviceId);
      return devices;
    } catch {
      return [];
    }
  };

  useEffect(() => {
    if (!token) navigate('/login');
    inputRef.current?.focus();

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    refreshCameraDevices(reader).then((devices) => {
      if (!devices.length) {
        setCameraError('Aucune caméra détectée. Cliquez sur "Ouvrir la caméra" pour demander l’autorisation.');
      }
    });

    return () => {
      reader.reset();
    };
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

  const startCamera = async () => {
    if (!readerRef.current || !videoRef.current) return;

    setCameraError('');
    setCameraActive(true);

    try {
      let devices = cameraDevices;

      // Certains navigateurs (mobile/Safari) ne listent les caméras qu'après autorisation.
      if (!devices.length && navigator.mediaDevices?.getUserMedia) {
        const preStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        preStream.getTracks().forEach((t) => t.stop());
        devices = await refreshCameraDevices();
      }

      const onDecode = (decoded) => {
        if (!decoded) return;
        const value = decoded.getText().trim().toUpperCase();
        if (!value) return;

        // Evite de traiter plusieurs fois le même scan en rafale.
        const now = Date.now();
        const tooSoon = lastCameraScanRef.current.value === value && (now - lastCameraScanRef.current.ts) < 1500;
        if (tooSoon) return;

        lastCameraScanRef.current = { value, ts: now };
        setCode(value);
        handleScan(value);
      };

      if (selectedCameraId) {
        await readerRef.current.decodeFromVideoDevice(selectedCameraId, videoRef.current, onDecode);
      } else {
        await readerRef.current.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current,
          onDecode
        );
      }
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        setCameraError('Accès caméra refusé. Autorisez la caméra pour Safari puis rechargez la page.');
      } else if (err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError') {
        setCameraError('Aucune caméra compatible détectée sur cet appareil.');
      } else {
        setCameraError('Impossible de démarrer la caméra. Vérifiez l’autorisation navigateur.');
      }
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (!readerRef.current) return;
    readerRef.current.reset();
    setCameraActive(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 'bold' }}>Scanner — Jour J</h1>
        <p style={{ color: '#777', fontSize: 14 }}>
          Scannez les codes-barres ou entrez le code manuellement.
          <strong style={{ color: '#2e7d32' }}> {scanned} scanné(s)</strong> cette session.
        </p>
      </div>

      <div className="card">
        <div style={{ marginBottom: 16, display: 'grid', gap: 10 }}>
          {cameraDevices.length > 1 && (
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              disabled={cameraActive}
              style={{
                height: 40,
                border: '1px solid #ddd',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 14
              }}
            >
              {cameraDevices.map((d, idx) => (
                <option key={d.deviceId} value={d.deviceId}>
                  Caméra {idx + 1}
                </option>
              ))}
            </select>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            {!cameraActive ? (
              <button className="btn btn-secondary" onClick={startCamera}>Ouvrir la caméra</button>
            ) : (
              <button className="btn btn-secondary" onClick={stopCamera}>Arrêter la caméra</button>
            )}
          </div>

          {cameraError && (
            <div className="alert alert-error" style={{ marginBottom: 0 }}>
              {cameraError}
            </div>
          )}

          <video
            ref={videoRef}
            style={{
              width: '100%',
              borderRadius: 10,
              border: '1px solid #eee',
              display: cameraActive ? 'block' : 'none'
            }}
            autoPlay
            playsInline
            muted
          />
        </div>

        <div className="scanner-box">
          <div style={{ fontSize: 48, marginBottom: 12 }}>▦</div>
          <p style={{ color: '#777', fontSize: 14 }}>
            Pointez le scanner vers le code-barres du participant.<br/>
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
