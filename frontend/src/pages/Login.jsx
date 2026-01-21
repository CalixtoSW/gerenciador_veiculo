import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ensureCsrf, login } from "../api.js";

export default function LoginPage({ onAuthed }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await ensureCsrf();
      const me = await login({ username, password });
      onAuthed(me);
      navigate("/vehicles", { replace: true });
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Entrar</h2>
      <form onSubmit={submit} className="form">
        <label>
          Usuário
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </label>
        <label>
          Senha
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
          />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button className="button" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="muted">
        Não tem conta? <Link to="/register">Criar conta</Link>
      </p>
    </div>
  );
}

