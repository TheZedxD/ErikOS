// Fetch helpers for ErikOS backend APIs.
// Automatically includes X-User-Id header from currentUser.

import { currentUser } from '../core/globals.js';

function userHeader() {
  return currentUser && currentUser.id ? { 'X-User-Id': currentUser.id } : {};
}

export async function getJSON(url) {
  const resp = await fetch(url, { headers: userHeader() });
  if (!resp.ok) throw new Error(`GET ${url} failed: ${resp.status}`);
  return resp.json();
}

export async function postJSON(url, data) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...userHeader() },
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error(`POST ${url} failed: ${resp.status}`);
  return resp.json();
}

export async function uploadForm(url, formData) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: userHeader(),
    body: formData,
  });
  if (!resp.ok) throw new Error(`POST ${url} failed: ${resp.status}`);
  return resp.json();
}
