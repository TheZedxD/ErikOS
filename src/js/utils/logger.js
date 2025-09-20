const MAX_LOG_ENTRIES = 500;
const ERROR_ENDPOINT = '/api/log-client-error';

const errorLog = [];

function normaliseEntry(payload = {}) {
  const now = new Date();
  const entry = {
    timestamp: payload.timestamp || now.toISOString(),
    app: payload.app || 'unknown',
    message: payload.message || 'Unknown error',
    stack: payload.stack || '',
  };
  return entry;
}

function persistEntry(entry) {
  try {
    const body = JSON.stringify(entry);
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(ERROR_ENDPOINT, blob);
    } else if (typeof fetch !== 'undefined') {
      fetch(ERROR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('Failed to persist error log', err);
  }
}

export const logger = {
  error(payload) {
    const entry = normaliseEntry(payload);
    errorLog.push(entry);
    if (errorLog.length > MAX_LOG_ENTRIES) {
      errorLog.splice(0, errorLog.length - MAX_LOG_ENTRIES);
    }
    try {
      window.__ERIKOS_ERROR_LOG__ = [...errorLog];
    } catch (_) {
      /* ignore */
    }
    persistEntry(entry);
    console.error('App error', entry);
  },
  getRecentErrors(limit = 50) {
    if (limit <= 0) return [];
    return errorLog.slice(-limit).map((item) => ({ ...item }));
  },
  formatRecentErrors(limit = 50) {
    const items = this.getRecentErrors(limit);
    return items
      .map((item) => `[${item.timestamp}] ${item.app}: ${item.message}\n${item.stack}`)
      .join('\n\n');
  },
};
