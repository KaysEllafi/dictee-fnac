import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import InscriptionPage  from './pages/InscriptionPage';
import AdminPage        from './pages/AdminPage';
import ScannerPage      from './pages/ScannerPage';
import LoginPage        from './pages/LoginPage';
import './App.css';

function Navbar() {
  const location = useLocation();
  const isAdmin  = location.pathname.startsWith('/admin') || location.pathname.startsWith('/scanner');

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="fnac-logo">fnac</span>
        <span className="navbar-title">Dictée 2025</span>
      </div>
      {isAdmin && (
        <div className="navbar-links">
          <Link to="/admin"   className={location.pathname === '/admin'   ? 'active' : ''}>Liste</Link>
          <Link to="/scanner" className={location.pathname === '/scanner' ? 'active' : ''}>Scanner</Link>
          <button onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}>
            Déconnexion
          </button>
        </div>
      )}
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/"        element={<InscriptionPage />} />
          <Route path="/login"   element={<LoginPage />} />
          <Route path="/admin"   element={<AdminPage />} />
          <Route path="/scanner" element={<ScannerPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
