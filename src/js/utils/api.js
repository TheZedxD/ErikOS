export class APIClient {
  constructor(ctx = {}) {
    this.ctx = ctx;
    this.baseURL = '';
  }

  _userId() {
    if (this.ctx && this.ctx.currentUser && this.ctx.currentUser.id) {
      return this.ctx.currentUser.id;
    }
    if (typeof window !== 'undefined' && window.currentUser && window.currentUser.id) {
      return window.currentUser.id;
    }
    return null;
  }

  async request(endpoint, options = {}, responseType = 'json') {
    const start = performance.now();
    try {
      const opts = { ...options };
      const headers = { ...(opts.headers || {}) };
      const uid = this._userId();
      if (uid) headers['X-User-Id'] = uid;
      opts.headers = headers;
      opts.method = opts.method || 'GET';
      const res = await fetch(this.baseURL + endpoint, opts);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let data;
      switch (responseType) {
        case 'text':
          data = await res.text();
          break;
        case 'blob':
          data = await res.blob();
          break;
        case 'arrayBuffer':
          data = await res.arrayBuffer();
          break;
        default:
          data = await res.json();
      }
      console.debug('API', endpoint, 'took', Math.round(performance.now() - start), 'ms');
      return { ok: true, data };
    } catch (err) {
      console.error('API error', { endpoint, options }, err);
      return { ok: false, error: String(err) };
    }
  }

  get(endpoint, options = {}, responseType = 'json') {
    return this.request(endpoint, { ...options, method: 'GET' }, responseType);
  }

  post(endpoint, body, options = {}, responseType = 'json') {
    const opts = { ...options, method: 'POST' };
    if (body !== undefined) opts.body = body;
    return this.request(endpoint, opts, responseType);
  }

  getJSON(endpoint, options = {}) {
    return this.get(endpoint, options, 'json');
  }

  postJSON(endpoint, data, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    return this.post(endpoint, JSON.stringify(data), { ...options, headers }, 'json');
  }
}
