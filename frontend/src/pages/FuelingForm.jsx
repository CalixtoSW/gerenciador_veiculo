import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  createFueling,
  createStation,
  getFueling,
  getStation,
  getVehicle,
  listStations,
  updateFueling
} from "../api.js";

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
  const [stationId, setStationId] = useState(null);
  const [stationCity, setStationCity] = useState("");
  const [stationState, setStationState] = useState("");
  const [stationBrand, setStationBrand] = useState("");
  const [stationAddress, setStationAddress] = useState("");
  const [stationLatitude, setStationLatitude] = useState("");
  const [stationLongitude, setStationLongitude] = useState("");
  const [stationMatches, setStationMatches] = useState([]);

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
          setStationId(f.station ?? null);
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

  useEffect(() => {
    if (!form.station_name || stationId) {
      setStationMatches([]);
      return;
    }
    let active = true;
    const handle = setTimeout(async () => {
      try {
        const items = await listStations(form.station_name);
        if (!active) return;
        setStationMatches(items.slice(0, 8));
      } catch {
        if (!active) return;
        setStationMatches([]);
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [form.station_name, stationId]);

  useEffect(() => {
    if (!stationId) return;
    let active = true;
    (async () => {
      try {
        const station = await getStation(stationId);
        if (!active) return;
        setStationCity(station.city || "");
        setStationState(station.state || "");
        setStationBrand(station.brand || "");
        setStationAddress(station.address || "");
        setStationLatitude(station.latitude ? String(station.latitude) : "");
        setStationLongitude(station.longitude ? String(station.longitude) : "");
      } catch {
        if (!active) return;
      }
    })();
    return () => {
      active = false;
    };
  }, [stationId]);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      let resolvedStationId = stationId;
      if (!resolvedStationId && form.station_name.trim()) {
        if (!stationCity.trim() || !stationState.trim()) {
          setError("Informe cidade e UF para cadastrar o posto.");
          setBusy(false);
          return;
        }
        const latitude = stationLatitude.trim() ? Number(stationLatitude) : null;
        const longitude = stationLongitude.trim() ? Number(stationLongitude) : null;
        const created = await createStation({
          name: form.station_name.trim(),
          brand: stationBrand.trim(),
          address: stationAddress.trim(),
          city: stationCity.trim(),
          state: stationState.trim().toUpperCase(),
          latitude: Number.isNaN(latitude) ? null : latitude,
          longitude: Number.isNaN(longitude) ? null : longitude
        });
        resolvedStationId = created.id;
        setStationId(created.id);
      }
      const occurredAtIso = new Date(form.occurred_at).toISOString();
      const payload = {
        vehicle: vehicleId,
        station: resolvedStationId,
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
          <input
            value={form.station_name}
            onChange={(e) => {
              setStationId(null);
              setForm({ ...form, station_name: e.target.value });
            }}
            placeholder="Digite para buscar ou criar"
          />
        </label>
        {stationMatches.length ? (
          <div className="muted" style={{ marginTop: -8 }}>
            {stationMatches.map((station) => (
              <button
                key={station.id}
                type="button"
                className="button secondary"
                style={{ marginRight: 8, marginTop: 6 }}
                onClick={() => {
                  setStationId(station.id);
                  setForm((prev) => ({ ...prev, station_name: station.name }));
                  setStationCity(station.city || "");
                  setStationState(station.state || "");
                  setStationBrand(station.brand || "");
                  setStationAddress(station.address || "");
                  setStationLatitude(station.latitude ? String(station.latitude) : "");
                  setStationLongitude(station.longitude ? String(station.longitude) : "");
                  setStationMatches([]);
                }}
              >
                {station.name} ({station.city}/{station.state})
              </button>
            ))}
          </div>
        ) : null}
        {stationId ? (
          <div className="muted" style={{ marginTop: -4 }}>
            {stationCity && stationState ? `Selecionado: ${stationCity}/${stationState}` : "Posto selecionado"}
            <button
              type="button"
              className="button secondary"
              style={{ marginLeft: 8 }}
              onClick={() => {
                setStationId(null);
                setStationCity("");
                setStationState("");
                setStationBrand("");
                setStationAddress("");
                setStationLatitude("");
                setStationLongitude("");
              }}
            >
              Usar outro
            </button>
          </div>
        ) : form.station_name.trim() ? (
          <>
            <label>
              Cidade
              <input value={stationCity} onChange={(e) => setStationCity(e.target.value)} />
            </label>
            <label>
              UF
              <input value={stationState} onChange={(e) => setStationState(e.target.value)} maxLength={2} />
            </label>
            <label>
              Bandeira (opcional)
              <input value={stationBrand} onChange={(e) => setStationBrand(e.target.value)} />
            </label>
            <label>
              EndereÃ§o (opcional)
              <input value={stationAddress} onChange={(e) => setStationAddress(e.target.value)} />
            </label>
            <label>
              Latitude (opcional)
              <input value={stationLatitude} onChange={(e) => setStationLatitude(e.target.value)} />
            </label>
            <label>
              Longitude (opcional)
              <input value={stationLongitude} onChange={(e) => setStationLongitude(e.target.value)} />
            </label>
          </>
        ) : null}
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

