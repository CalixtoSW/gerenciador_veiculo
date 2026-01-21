import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ensureCsrf, register } from "../api.js";

export default function RegisterPage({ onAuthed }) {
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
      const me = await register({ username, password });
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
      <h2>Criar conta</h2>
      <form onSubmit={submit} className="form">
        <label>
          Usuário
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </label>
        <label>
          Senha
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button className="button" disabled={busy}>
          {busy ? "Criando…" : "Criar"}
        </button>
      </form>
      <p className="muted">
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </div>
  );
}

