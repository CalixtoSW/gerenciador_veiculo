import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { createFueling, getFueling, getVehicle, updateFueling } from "../api.js";

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

export default function FuelingFormPage({ mode }) {
  const { id, fuelingId } = useParams();
  const vehicleId = useMemo(() => Number(id), [id]);
  const fuelingPk = useMemo(() => (fuelingId ? Number(fuelingId) : null), [fuelingId]);

  const navigate = useNavigate();
  const location = useLocation();

  const [vehicle, setVehicle] = useState(null);
  const [existing, setExisting] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
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
    let active = true;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const v = await getVehicle(vehicleId);
        let f = null;
        if (mode === "edit" && fuelingPk) {
          f = await getFueling(fuelingPk);
        }
        if (!active) return;
        setVehicle(v);
        setExisting(f);
        if (f) {
          setForm({
            occurred_at: toDateTimeLocalValue(f.occurred_at),
            odometer_km: String(f.odometer_km ?? ""),
            fuel_type: f.fuel_type ?? v.fuel_type ?? "gasolina",
            liters: String(f.liters ?? ""),
            total_cost: String(f.total_cost ?? ""),
            is_full_tank: Boolean(f.is_full_tank),
            station_name: f.station_name ?? "",
            notes: f.notes ?? ""
          });
        } else {
          setForm((prev) => ({
            ...prev,
            fuel_type: v.fuel_type || prev.fuel_type
          }));
        }
      } catch (err) {
        if (!active) return;
        setError(String(err.message || err));
      } finally {
        if (!active) return;
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [vehicleId, fuelingPk, mode]);

  const vehicleTitle = vehicle ? vehicle.nickname || `${vehicle.brand} ${vehicle.model}` : `Veículo #${vehicleId}`;
  const title = mode === "edit" ? "Editar abastecimento" : "Novo abastecimento";

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const occurredAtIso = new Date(form.occurred_at).toISOString();
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

      if (mode === "edit" && existing) {
        await updateFueling(existing.id, payload);
      } else {
        await createFueling(payload);
      }

      navigate(`/vehicles/${vehicleId}`, { replace: true, state: { refresh: Date.now(), from: location.pathname } });
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="row">
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <div className="muted">{vehicleTitle}</div>
        </div>
        <Link className="button secondary" to={`/vehicles/${vehicleId}`}>
          Voltar
        </Link>
      </div>

      {loading ? <p className="muted">Carregando…</p> : null}
      {error ? <div className="error">{error}</div> : null}

      <form className="form" onSubmit={submit}>
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
          <input value={form.total_cost} onChange={(e) => setForm({ ...form, total_cost: e.target.value })} required />
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

        <button className="button" disabled={busy || loading}>
          {busy ? "Salvando…" : mode === "edit" ? "Salvar alterações" : "Salvar"}
        </button>
      </form>
    </div>
  );
}

