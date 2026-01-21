import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createVehicle, listVehicles } from "../api.js";

const fuelTypes = [
  { value: "gasolina", label: "Gasolina" },
  { value: "etanol", label: "Etanol" },
  { value: "diesel", label: "Diesel" },
  { value: "gnv", label: "GNV" },
  { value: "eletrico", label: "Elétrico" },
  { value: "hibrido", label: "Híbrido" },
  { value: "flex", label: "Flex" }
];

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    nickname: "",
    brand: "",
    model: "",
    plate: "",
    fuel_type: "gasolina"
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await listVehicles();
        setVehicles(data);
      } catch (err) {
        setError(String(err.message || err));
      }
    })();
  }, []);

  async function addVehicle(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const created = await createVehicle(form);
      setVehicles((v) => [created, ...v]);
      setForm({ nickname: "", brand: "", model: "", plate: "", fuel_type: "gasolina" });
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid">
      <div className="card">
        <h2>Seus veículos</h2>
        {vehicles.length === 0 ? (
          <p className="muted">Nenhum veículo cadastrado.</p>
        ) : (
          <ul className="list">
            {vehicles.map((v) => (
              <li key={v.id} className="listItem">
                <div>
                  <div className="strong">
                    <Link to={`/vehicles/${v.id}`}>{v.nickname || `${v.brand} ${v.model}`}</Link>
                  </div>
                  <div className="muted">
                    {v.plate ? `Placa: ${v.plate} • ` : ""}
                    Combustível: {v.fuel_type}
                  </div>
                </div>
                <Link className="button secondary" to={`/vehicles/${v.id}`}>
                  Abrir
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Novo veículo</h2>
        <form onSubmit={addVehicle} className="form">
          <label>
            Apelido (opcional)
            <input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
          </label>
          <label>
            Marca
            <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required />
          </label>
          <label>
            Modelo
            <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
          </label>
          <label>
            Placa (opcional)
            <input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} />
          </label>
          <label>
            Tipo de combustível
            <select value={form.fuel_type} onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}>
              {fuelTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          {error ? <div className="error">{error}</div> : null}
          <button className="button" disabled={busy}>
            {busy ? "Salvando…" : "Salvar"}
          </button>
        </form>
      </div>
    </div>
  );
}

