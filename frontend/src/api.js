function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

async function request(path, { method = "GET", body } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    const csrf = getCookie("csrftoken");
    if (csrf) headers["X-CSRFToken"] = csrf;
  }

  const resp = await fetch(path, {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (resp.status === 204) return null;
  const contentType = resp.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await resp.json() : await resp.text();
  if (!resp.ok) {
    const detail = data?.detail || data || "request_failed";
    throw new Error(detail);
  }
  return data;
}

export async function ensureCsrf() {
  try {
    await request("/api/auth/csrf/");
  } catch {
    // ignore
  }
}

export async function register({ username, password }) {
  return request("/api/auth/register/", { method: "POST", body: { username, password } });
}

export async function login({ username, password }) {
  return request("/api/auth/login/", { method: "POST", body: { username, password } });
}

export async function logout() {
  return request("/api/auth/logout/", { method: "POST", body: {} });
}

export async function getMe() {
  try {
    return await request("/api/auth/me/");
  } catch {
    return null;
  }
}

export async function listVehicles() {
  const data = await request("/api/vehicles/");
  return data.results ?? data;
}

export async function getVehicle(vehicleId) {
  return request(`/api/vehicles/${encodeURIComponent(vehicleId)}/`);
}

export async function getFueling(fuelingId) {
  return request(`/api/fuelings/${encodeURIComponent(fuelingId)}/`);
}

export async function createVehicle(payload) {
  return request("/api/vehicles/", { method: "POST", body: payload });
}

export async function listFuelings(vehicleId) {
  const data = await request(`/api/fuelings/?vehicle=${encodeURIComponent(vehicleId)}`);
  return data.results ?? data;
}

export async function listFuelingsFiltered(vehicleId, { start, end } = {}) {
  const qs = new URLSearchParams();
  qs.set("vehicle", String(vehicleId));
  if (start) qs.set("start", start);
  if (end) qs.set("end", end);
  const data = await request(`/api/fuelings/?${qs.toString()}`);
  return { items: data.results ?? data, next: data.next ?? null, previous: data.previous ?? null, count: data.count ?? null };
}

export async function listFuelingsByUrl(url) {
  const data = await request(url);
  return { items: data.results ?? data, next: data.next ?? null, previous: data.previous ?? null, count: data.count ?? null };
}

export async function createFueling(payload) {
  return request("/api/fuelings/", { method: "POST", body: payload });
}

export async function updateFueling(fuelingId, payload) {
  return request(`/api/fuelings/${encodeURIComponent(fuelingId)}/`, { method: "PATCH", body: payload });
}

export async function vehicleMetrics(vehicleId) {
  return request(`/api/vehicles/${encodeURIComponent(vehicleId)}/metrics/`);
}

export async function vehicleMetricsFiltered(vehicleId, { start, end } = {}) {
  const qs = new URLSearchParams();
  if (start) qs.set("start", start);
  if (end) qs.set("end", end);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request(`/api/vehicles/${encodeURIComponent(vehicleId)}/metrics/${suffix}`);
}
