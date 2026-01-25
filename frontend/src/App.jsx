import React, { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { ensureCsrf, getMe, logout } from "./api.js";
import LoginPage from "./pages/Login.jsx";
import RegisterPage from "./pages/Register.jsx";
import VehiclesPage from "./pages/Vehicles.jsx";
import VehicleOverviewPage from "./pages/VehicleOverview.jsx";
import FuelingFormPage from "./pages/FuelingForm.jsx";
import StationsPage from "./pages/Stations.jsx";

export default function App() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      await ensureCsrf();
      const user = await getMe();
      if (!active) return;
      setMe(user);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    await logout();
    setMe(null);
    navigate("/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="container">
        <h1>Gerenciador de Veículo</h1>
        <p>Carregando…</p>
      </div>
    );
  }

  const authed = !!me;

  return (
    <div className="container">
      <header className="header">
        <div className="title">
          <Link to="/vehicles">Gerenciador de Veículo</Link>
        </div>
        <div className="headerRight">
          {authed ? (
            <>
              <Link className="button secondary" to="/stations">
                Postos
              </Link>
              <span className="muted">Olá, {me.username}</span>
              <button className="button" onClick={handleLogout}>
                Sair
              </button>
            </>
          ) : (
            <>
              <Link className="button secondary" to="/login">
                Entrar
              </Link>
              <Link className="button" to="/register">
                Criar conta
              </Link>
            </>
          )}
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Navigate to={authed ? "/vehicles" : "/login"} replace />} />
        <Route path="/login" element={<LoginPage onAuthed={setMe} />} />
        <Route path="/register" element={<RegisterPage onAuthed={setMe} />} />

        <Route path="/vehicles" element={authed ? <VehiclesPage /> : <Navigate to="/login" replace />} />
        <Route path="/vehicles/:id" element={authed ? <VehicleOverviewPage /> : <Navigate to="/login" replace />} />
        <Route path="/stations" element={authed ? <StationsPage /> : <Navigate to="/login" replace />} />
        <Route
          path="/vehicles/:id/fuelings/new"
          element={authed ? <FuelingFormPage mode="new" /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/vehicles/:id/fuelings/:fuelingId/edit"
          element={authed ? <FuelingFormPage mode="edit" /> : <Navigate to="/login" replace />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
