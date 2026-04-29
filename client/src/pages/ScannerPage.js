import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  BarcodeFormat,
  BrowserMultiFormatReader,
  DecodeHintType
} from '@zxing/library';

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
  const [ocrStatus, setOcrStatus] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const ocrBusyRef = useRef(false);
  const ocrIntervalRef = useRef(null);
  const tesseractRef = useRef(null);

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

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.ALSO_INVERTED, true);

    const reader = new BrowserMultiFormatReader(hints, 300);
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

      const constraints = selectedCameraId
        ? {
            video: {
              deviceId: { exact: selectedCameraId },
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          }
        : {
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          };

      await readerRef.current.decodeFromConstraints(constraints, videoRef.current, onDecode);

      // Fallback OCR en direct : lit le texte FNAC-2026-... depuis la vidéo.
      if (ocrIntervalRef.current) clearInterval(ocrIntervalRef.current);
      ocrIntervalRef.current = setInterval(() => {
        runOcrFromVideo().catch(() => {});
      }, 2500);
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
    setOcrStatus('');
    if (ocrIntervalRef.current) {
      clearInterval(ocrIntervalRef.current);
      ocrIntervalRef.current = null;
    }
  };

  const extractFnacCode = (text) => {
    if (!text) return null;
    const up = text.toUpperCase().replace(/\s+/g, ' ');
    const strict = up.match(/FNAC[\s-]*2026[\s-]*([0-9]{5})[\s-]*([A-Z0-9]{4})/);
    if (strict) return `FNAC-2026-${strict[1]}-${strict[2]}`;

    const loose = up.match(/FNAC[\s-]*2026[\s-]*[A-Z0-9-]{6,}/);
    if (!loose) return null;

    const normalized = loose[0].replace(/[^A-Z0-9]/g, '');
    // Format attendu : FNAC2026 + 5 chiffres + 4 chars
    if (!normalized.startsWith('FNAC2026') || normalized.length < 17) return null;
    const seq = normalized.slice(8, 13);
    const tail = normalized.slice(13, 17);
    if (!/^\d{5}$/.test(seq) || !/^[A-Z0-9]{4}$/.test(tail)) return null;
    return `FNAC-2026-${seq}-${tail}`;
  };

  const runOcrFromVideo = async () => {
    if (!cameraActive || scanning || ocrBusyRef.current || !videoRef.current) return;
    if (videoRef.current.readyState < 2) return;

    ocrBusyRef.current = true;
    try {
      if (!tesseractRef.current) {
        const mod = await import('tesseract.js');
        tesseractRef.current = mod.default || mod;
      }

      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      setOcrStatus('Lecture OCR...');
      const result = await tesseractRef.current.recognize(canvas, 'eng', {
        tessedit_char_whitelist: 'FNAC0123456789-',
      });

      const maybeCode = extractFnacCode(result?.data?.text || '');
      if (!maybeCode) return;

      const now = Date.now();
      const tooSoon = lastCameraScanRef.current.value === maybeCode && (now - lastCameraScanRef.current.ts) < 2000;
      if (tooSoon) return;

      lastCameraScanRef.current = { value: maybeCode, ts: now };
      setCode(maybeCode);
      handleScan(maybeCode);
    } finally {
      setOcrStatus('');
      ocrBusyRef.current = false;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 'bold' }}>Scanner — Jour J</h1>
        <p style={{ color: '#777', fontSize: 14 }}>
          Scannez les codes-barres ou entrez le code manuellement.
          <strong style={{ color: '#2e7d32' }}> {scanned} scanné(s)</strong> cette session.
        </p>
        <p style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
          Astuce iPhone : augmentez la luminosité et approchez le code-barres horizontalement.
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
          {cameraActive && (
            <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
              Détection auto QR/code-barres + OCR texte {ocrStatus ? `(${ocrStatus})` : ''}
            </p>
          )}

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
