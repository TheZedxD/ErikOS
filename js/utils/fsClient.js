// Simple wrapper around fetch to communicate with the ErikOS backend
// adding the X-User-Id header and convenient JSON helpers.

export async function apiFetch(url, options = {}) {
  const opts = { ...options };
  opts.headers = { 'X-User-Id': window.currentUserId || 'guest', ...(opts.headers || {}) };
  const resp = await fetch(url, opts);
  if (!resp.ok) throw new Error(`Request failed: ${resp.status}`);
  return resp;
}

export async function apiJson(url, options = {}) {
  const resp = await apiFetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  return resp.json();
}
