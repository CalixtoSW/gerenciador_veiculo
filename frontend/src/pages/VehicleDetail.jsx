import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createFueling, getVehicle, listFuelings, updateFueling, vehicleMetrics } from "../api.js";

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toDateTimeLocalValue(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(
    d.getMinutes()
  )}`;
}

function nowDateTimeLocalValue() {
  const d = new Date();
  d.setSeconds(0, 0);
  return toDateTimeLocalValue(d);
}

export default function VehicleDetailPage() {
  const { id } = useParams();
  const vehicleId = useMemo(() => Number(id), [id]);

  const [fuelings, setFuelings] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editingFuelingId, setEditingFuelingId] = useState(null);

  const [form, setForm] = useState({
    vehicle: vehicleId,
    occurred_at: nowDateTimeLocalValue(),
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
        const [v, f, m] = await Promise.all([getVehicle(vehicleId), listFuelings(vehicleId), vehicleMetrics(vehicleId)]);
        setVehicle(v);
        setFuelings(f);
        setMetrics(m);
        setForm((prev) => ({ ...prev, fuel_type: v.fuel_type || prev.fuel_type }));
      } catch (err) {
        setError(String(err.message || err));
      }
    })();
  }, [vehicleId]);

  function resetFuelingForm(nextFuelType) {
    setEditingFuelingId(null);
    setForm({
      vehicle: vehicleId,
      occurred_at: nowDateTimeLocalValue(),
      odometer_km: "",
      fuel_type: nextFuelType ?? vehicle?.fuel_type ?? "gasolina",
      liters: "",
      total_cost: "",
      is_full_tank: true,
      station_name: "",
      notes: ""
    });
  }

  function startEditFueling(f) {
    setEditingFuelingId(f.id);
    setForm({
      vehicle: vehicleId,
      occurred_at: toDateTimeLocalValue(f.occurred_at),
      odometer_km: String(f.odometer_km ?? ""),
      fuel_type: f.fuel_type ?? vehicle?.fuel_type ?? "gasolina",
      liters: String(f.liters ?? ""),
      total_cost: String(f.total_cost ?? ""),
      is_full_tank: Boolean(f.is_full_tank),
      station_name: f.station_name ?? "",
      notes: f.notes ?? ""
    });
  }

  async function submitFueling(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const occurredAtIso = form.occurred_at ? new Date(form.occurred_at).toISOString() : undefined;
      const payload = {
        vehicle: vehicleId,
        occurred_at: occurredAtIso,
        odometer_km: Number(form.odometer_km),
        fuel_type: form.fuel_type,
        liters: String(form.liters),
        total_cost: String(form.total_cost),
        is_full_tank: Boolean(form.is_full_tank),
        station_name: form.station_name,
        notes: form.notes
      };

      if (editingFuelingId) {
        const updated = await updateFueling(editingFuelingId, payload);
        setFuelings((items) => items.map((it) => (it.id === updated.id ? updated : it)));
      } else {
        const created = await createFueling(payload);
        setFuelings((items) => [created, ...items]);
      }

      const m = await vehicleMetrics(vehicleId);
      setMetrics(m);
      resetFuelingForm(vehicle?.fuel_type);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setBusy(false);
    }
  }

  const vehicleTitle = vehicle ? vehicle.nickname || `${vehicle.brand} ${vehicle.model}` : `Veículo #${vehicleId}`;

  return (
    <div className="grid">
      <div className="card">
        <div className="row">
          <h2>{vehicleTitle}</h2>
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
                <button className="button secondary" onClick={() => startEditFueling(f)} type="button">
                  Editar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <div className="row">
          <h2>{editingFuelingId ? "Editar abastecimento" : "Novo abastecimento"}</h2>
          {editingFuelingId ? (
            <button className="button secondary" type="button" onClick={() => resetFuelingForm(vehicle?.fuel_type)}>
              Cancelar
            </button>
          ) : null}
        </div>

        <form className="form" onSubmit={submitFueling}>
          <label>
            Data/hora
            <input
              type="datetime-local"
              value={form.occurred_at}
              onChange={(e) => setForm({ ...form, occurred_at: e.target.value })}
              required
            />
          </label>
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
            {busy ? "Salvando…" : editingFuelingId ? "Salvar alterações" : "Salvar"}
          </button>
        </form>
      </div>
    </div>
  );
}
