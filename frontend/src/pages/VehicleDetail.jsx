import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createFueling, listFuelings, vehicleMetrics } from "../api.js";

export default function VehicleDetailPage() {
  const { id } = useParams();
  const vehicleId = useMemo(() => Number(id), [id]);

  const [fuelings, setFuelings] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    vehicle: vehicleId,
    odometer_km: "",
    fuel_type: "gasolina",
    liters: "",
    total_cost: "",
    is_full_tank: true,
    station_name: "",
    notes: ""
  });

  useEffect(() => {
    (async () => {
      try {
        const [f, m] = await Promise.all([listFuelings(vehicleId), vehicleMetrics(vehicleId)]);
        setFuelings(f);
        setMetrics(m);
      } catch (err) {
        setError(String(err.message || err));
      }
    })();
  }, [vehicleId]);

  async function addFueling(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload = {
        ...form,
        vehicle: vehicleId,
        odometer_km: Number(form.odometer_km),
        liters: String(form.liters),
        total_cost: String(form.total_cost)
      };
      const created = await createFueling(payload);
      setFuelings((items) => [created, ...items]);
      const m = await vehicleMetrics(vehicleId);
      setMetrics(m);
      setForm({ ...form, odometer_km: "", liters: "", total_cost: "", station_name: "", notes: "" });
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid">
      <div className="card">
        <div className="row">
          <h2>Veículo #{vehicleId}</h2>
          <Link className="button secondary" to="/vehicles">
            Voltar
          </Link>
        </div>

        <h3>Métricas</h3>
        {metrics ? (
          <div className="metrics">
            <div className="metric">
              <div className="muted">Média (km/L)</div>
              <div className="strong">{metrics.km_per_liter_avg ?? "—"}</div>
            </div>
            <div className="metric">
              <div className="muted">L/100km</div>
              <div className="strong">{metrics.liters_per_100km_avg ?? "—"}</div>
            </div>
            <div className="metric">
              <div className="muted">Custo/km</div>
              <div className="strong">{metrics.avg_cost_per_km ?? "—"}</div>
            </div>
            <div className="metric">
              <div className="muted">Custo/L</div>
              <div className="strong">{metrics.avg_cost_per_liter ?? "—"}</div>
            </div>
          </div>
        ) : (
          <p className="muted">Carregando métricas…</p>
        )}

        <h3>Abastecimentos</h3>
        {fuelings.length === 0 ? (
          <p className="muted">Nenhum abastecimento cadastrado.</p>
        ) : (
          <ul className="list">
            {fuelings.map((f) => (
              <li className="listItem" key={f.id}>
                <div>
                  <div className="strong">
                    {new Date(f.occurred_at).toLocaleString()} • {f.odometer_km} km
                  </div>
                  <div className="muted">
                    {f.liters} L • R$ {f.total_cost} • R$/L {f.price_per_liter} • {f.fuel_type}{" "}
                    {f.is_full_tank ? "• tanque cheio" : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Novo abastecimento</h2>
        <form className="form" onSubmit={addFueling}>
          <label>
            Hodômetro (km)
            <input
              value={form.odometer_km}
              onChange={(e) => setForm({ ...form, odometer_km: e.target.value })}
              required
              inputMode="numeric"
            />
          </label>
          <label>
            Combustível
            <select value={form.fuel_type} onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}>
              <option value="gasolina">Gasolina</option>
              <option value="etanol">Etanol</option>
              <option value="diesel">Diesel</option>
              <option value="gnv">GNV</option>
              <option value="eletrico">Elétrico</option>
              <option value="hibrido">Híbrido</option>
              <option value="flex">Flex</option>
            </select>
          </label>
          <label>
            Litros
            <input value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} required />
          </label>
          <label>
            Total pago (R$)
            <input
              value={form.total_cost}
              onChange={(e) => setForm({ ...form, total_cost: e.target.value })}
              required
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.is_full_tank}
              onChange={(e) => setForm({ ...form, is_full_tank: e.target.checked })}
            />
            Tanque cheio (recomendado para métricas)
          </label>
          <label>
            Posto (opcional)
            <input value={form.station_name} onChange={(e) => setForm({ ...form, station_name: e.target.value })} />
          </label>
          <label>
            Observações (opcional)
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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

