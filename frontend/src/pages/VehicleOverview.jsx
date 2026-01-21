import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getVehicle, listFuelingsByUrl, listFuelingsFiltered, vehicleMetricsFiltered } from "../api.js";

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toLocalDateString(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfDayIso(localDateStr) {
  if (!localDateStr) return null;
  const [y, m, d] = localDateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

function endOfDayIso(localDateStr) {
  if (!localDateStr) return null;
  const [y, m, d] = localDateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

export default function VehicleOverviewPage() {
  const { id } = useParams();
  const vehicleId = useMemo(() => Number(id), [id]);
  const location = useLocation();

  const refreshToken = location.state?.refresh ?? null;

  const [vehicle, setVehicle] = useState(null);
  const [fuelings, setFuelings] = useState([]);
  const [fuelingsMeta, setFuelingsMeta] = useState({ count: null, next: null, previous: null });
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const today = useMemo(() => toLocalDateString(new Date()), []);
  const [filters, setFilters] = useState({ startDate: "", endDate: "" });
  const [applied, setApplied] = useState({ startDate: "", endDate: "" });

  useEffect(() => {
    setFilters((prev) => ({ ...prev, endDate: prev.endDate || today }));
    setApplied((prev) => ({ ...prev, endDate: prev.endDate || today }));
  }, [today]);

  const startIso = useMemo(() => startOfDayIso(applied.startDate), [applied.startDate]);
  const endIso = useMemo(() => endOfDayIso(applied.endDate), [applied.endDate]);

  useEffect(() => {
    let active = true;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const [v, f, m] = await Promise.all([
          getVehicle(vehicleId),
          listFuelingsFiltered(vehicleId, { start: startIso, end: endIso }),
          vehicleMetricsFiltered(vehicleId, { start: startIso, end: endIso })
        ]);
        if (!active) return;
        setVehicle(v);
        setFuelings(f.items);
        setFuelingsMeta({ count: f.count, next: f.next, previous: f.previous });
        setMetrics(m);
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
  }, [vehicleId, startIso, endIso, refreshToken]);

  const vehicleTitle = vehicle ? vehicle.nickname || `${vehicle.brand} ${vehicle.model}` : `Veículo #${vehicleId}`;

  function applyFilters(e) {
    e.preventDefault();
    setApplied(filters);
  }

  function clearFilters() {
    setFilters({ startDate: "", endDate: "" });
    setApplied({ startDate: "", endDate: "" });
  }

  async function loadMore() {
    if (!fuelingsMeta.next || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const next = await listFuelingsByUrl(fuelingsMeta.next);
      setFuelings((prev) => [...prev, ...next.items]);
      setFuelingsMeta((prev) => ({ ...prev, next: next.next, previous: next.previous, count: next.count ?? prev.count }));
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="vehicleLayout">
      <div className="card">
        <div className="row">
          <div>
            <h2 style={{ margin: 0 }}>{vehicleTitle}</h2>
            <div className="muted">Abastecimentos e métricas</div>
          </div>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Link className="button secondary" to="/vehicles">
              Voltar
            </Link>
            <Link className="button" to={`/vehicles/${vehicleId}/fuelings/new`}>
              Novo abastecimento
            </Link>
          </div>
        </div>

        <form className="filters" onSubmit={applyFilters}>
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
              <button className="button secondary" type="button" onClick={clearFilters}>
                Limpar
              </button>
              <button className="button" type="submit">
                Aplicar
              </button>
            </div>
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            Filtro afeta a listagem e as métricas.
          </div>
        </form>

        {error ? <div className="error">{error}</div> : null}

        <div className="split">
          <div className="panel">
            <div className="row" style={{ marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Abastecimentos</h3>
              <div className="muted" style={{ fontSize: 13 }}>
                {fuelingsMeta.count != null && fuelings.length ? `Mostrando ${fuelings.length} de ${fuelingsMeta.count}` : ""}
              </div>
            </div>

            {loading ? (
              <p className="muted">Carregando…</p>
            ) : fuelings.length === 0 ? (
              <p className="muted">Nenhum abastecimento encontrado para o filtro.</p>
            ) : (
              <>
                <div className="scrollList">
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
                        <Link className="button secondary" to={`/vehicles/${vehicleId}/fuelings/${f.id}/edit`}>
                          Editar
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                {fuelingsMeta.next ? (
                  <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                    <button className="button secondary" type="button" onClick={loadMore} disabled={loadingMore}>
                      {loadingMore ? "Carregando…" : "Carregar mais"}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Métricas</h3>
            {loading ? (
              <p className="muted">Carregando…</p>
            ) : metrics ? (
              <>
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
                <div className="muted" style={{ fontSize: 13 }}>
                  Baseado em eventos de “tanque cheio” dentro do período filtrado.
                </div>
              </>
            ) : (
              <p className="muted">Sem dados para o período.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
