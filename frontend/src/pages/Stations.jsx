import React, { useEffect, useMemo, useState } from "react";
import { createStation, listStationBrands, listStations, stationsMetrics, updateStation } from "../api.js";
import { formatCurrencyBR, formatDecimal } from "../utils/format.js";

function toIsoStart(date) {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

function toIsoEnd(date) {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

const NEW_BRAND_VALUE = "__new_brand__";

export default function StationsPage() {
  const [stations, setStations] = useState([]);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [brandCustom, setBrandCustom] = useState(false);
  const [brandOptions, setBrandOptions] = useState([]);

  const [metrics, setMetrics] = useState([]);
  const [metricsError, setMetricsError] = useState(null);
  const [metricsBusy, setMetricsBusy] = useState(false);
  const [filters, setFilters] = useState({ startDate: "", endDate: "" });

  const [form, setForm] = useState({
    name: "",
    brand: "",
    address: "",
    city: "",
    state: "",
    latitude: "",
    longitude: ""
  });

  useEffect(() => {
    let active = true;
    const handle = setTimeout(async () => {
      try {
        const data = await listStations(search.trim());
        if (!active) return;
        setStations(data);
      } catch (err) {
        if (!active) return;
        setError(String(err.message || err));
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [search]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listStationBrands();
        if (!active) return;
        setBrandOptions(data.map((row) => row.name));
      } catch {
        if (!active) return;
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filteredStations = useMemo(() => {
    if (!stateFilter) return stations;
    return stations.filter((station) => (station.state || "").toUpperCase() === stateFilter.toUpperCase());
  }, [stations, stateFilter]);

  const brandSelectValue = useMemo(() => {
    if (brandCustom) return NEW_BRAND_VALUE;
    if (!form.brand) return "";
    return brandOptions.includes(form.brand) ? form.brand : NEW_BRAND_VALUE;
  }, [brandCustom, form.brand, brandOptions]);

  async function loadMetrics() {
    setMetricsBusy(true);
    setMetricsError(null);
    try {
      const data = await stationsMetrics({
        start: toIsoStart(filters.startDate),
        end: toIsoEnd(filters.endDate)
      });
      setMetrics(data);
    } catch (err) {
      setMetricsError(String(err.message || err));
    } finally {
      setMetricsBusy(false);
    }
  }

  useEffect(() => {
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setEditingId(null);
    setBrandCustom(false);
    setForm({
      name: "",
      brand: "",
      address: "",
      city: "",
      state: "",
      latitude: "",
      longitude: ""
    });
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const latitude = form.latitude.trim() ? Number(form.latitude) : null;
      const longitude = form.longitude.trim() ? Number(form.longitude) : null;
      const payload = {
        name: form.name.trim(),
        brand_name: form.brand.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        latitude: Number.isNaN(latitude) ? null : latitude,
        longitude: Number.isNaN(longitude) ? null : longitude
      };
      let saved;
      if (editingId) {
        saved = await updateStation(editingId, payload);
        setStations((items) => items.map((s) => (s.id === saved.id ? saved : s)));
      } else {
        saved = await createStation(payload);
        setStations((items) => [saved, ...items]);
      }
      const brands = await listStationBrands();
      setBrandOptions(brands.map((row) => row.name));
      resetForm();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(station) {
    setEditingId(station.id);
    const stationBrand = station.brand_name || "";
    setBrandCustom(Boolean(stationBrand && !brandOptions.includes(stationBrand)));
    setForm({
      name: station.name || "",
      brand: stationBrand,
      address: station.address || "",
      city: station.city || "",
      state: station.state || "",
      latitude: station.latitude ? String(station.latitude) : "",
      longitude: station.longitude ? String(station.longitude) : ""
    });
  }

  return (
    <div className="stationsLayout">
      <div className="card stationsList">
        <div className="stationsHeader">
          <h2>Postos</h2>
          <div className="muted">Cadastre e organize pontos de abastecimento.</div>
        </div>
        <div className="stationsFilters">
          <label className="stationsSearch">
            Buscar
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome, cidade, UF, bandeira"
            />
          </label>
          <label>
            UF
            <input
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              maxLength={2}
              placeholder="Todas"
            />
          </label>
        </div>
        {filteredStations.length === 0 ? (
          <p className="muted">Nenhum posto encontrado.</p>
        ) : (
          <ul className="list">
            {filteredStations.map((s) => (
              <li key={s.id} className="listItem stationsItem">
                <div>
                  <div className="strong stationsTitle">
                    {s.name}
                    {s.brand_name ? <span className="brandBadge">{s.brand_name}</span> : null}
                  </div>
                  <div className="muted">
                    {s.city}/{s.state} {s.address ? `• ${s.address}` : ""}
                  </div>
                </div>
                <button className="button secondary" onClick={() => startEdit(s)}>
                  Editar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card stationsForm">
        <div className="stationsHeader">
          <h2>{editingId ? "Editar posto" : "Novo posto"}</h2>
          <div className="muted">Nome e localidade sao obrigatorios.</div>
        </div>
        <form onSubmit={submit} className="form">
          <label>
            Nome
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <div className="stationsRow">
            <label>
              Cidade
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            </label>
            <label>
              UF
              <input
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                maxLength={2}
                required
              />
            </label>
          </div>
          <label>
            Bandeira (opcional)
            <select
              value={brandSelectValue}
              onChange={(e) => {
                const value = e.target.value;
                if (value === NEW_BRAND_VALUE) {
                  setBrandCustom(true);
                  setForm({ ...form, brand: "" });
                  return;
                }
                setBrandCustom(false);
                setForm({ ...form, brand: value });
              }}
            >
              <option value="">Sem bandeira</option>
              {brandOptions.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
              <option value={NEW_BRAND_VALUE}>Nova bandeira...</option>
            </select>
          </label>
          {brandCustom ? (
            <label>
              Nova bandeira
              <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </label>
          ) : null}
          <label>
            Endereco (opcional)
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
          <div className="stationsRow">
            <label>
              Latitude (opcional)
              <input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
            </label>
            <label>
              Longitude (opcional)
              <input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
            </label>
          </div>
          {error ? <div className="error">{error}</div> : null}
          <div className="row">
            <button className="button" disabled={busy}>
              {busy ? "Salvando..." : editingId ? "Salvar alteracoes" : "Salvar"}
            </button>
            {editingId ? (
              <button className="button secondary" type="button" onClick={resetForm}>
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="card stationsMetrics">
        <div className="stationsHeader">
          <h2>Medias por posto (R$/L)</h2>
          <div className="muted">Ranking por preco medio no periodo.</div>
        </div>
        <form
          className="filters"
          onSubmit={(e) => {
            e.preventDefault();
            loadMetrics();
          }}
        >
          <div className="filtersRow">
            <label>
              Data inicial
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </label>
            <label>
              Data final
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </label>
            <div className="filtersActions">
              <button className="button secondary" type="button" onClick={() => setFilters({ startDate: "", endDate: "" })}>
                Limpar
              </button>
              <button className="button" type="submit">
                Aplicar
              </button>
            </div>
          </div>
        </form>
        {metricsBusy ? <p className="muted">Carregando...</p> : null}
        {metricsError ? <div className="error">{metricsError}</div> : null}
        {!metricsBusy && metrics.length === 0 ? <p className="muted">Sem dados no periodo.</p> : null}
        {metrics.length ? (
          <ol className="list stationsRank">
            {metrics.slice(0, 10).map((row) => (
              <li key={row.station_id} className="listItem stationsItem">
                <div>
                  <div className="strong">
                    {row.name} {row.brand ? `- ${row.brand}` : ""}
                  </div>
                  <div className="muted">
                    {row.city}/{row.state} • {formatCurrencyBR(row.avg_price_per_liter)} /L • {row.fuelings_count} abastecimentos
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}
