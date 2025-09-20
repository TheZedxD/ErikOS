const STORAGE_KEY = 'erikos-logs';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to load logs', err);
  }
  return {};
}

let logsData = loadFromStorage();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logsData));
  } catch (err) {
    console.warn('Failed to save logs', err);
  }
}

export function getLogsData() {
  return logsData;
}

export function addLog(message) {
  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10);
  if (!logsData[dateKey]) logsData[dateKey] = [];
  logsData[dateKey].push({ time: now.toLocaleTimeString(), message });
  if (logsData[dateKey].length > 100) {
    logsData[dateKey] = logsData[dateKey].slice(-100);
  }
  persist();
}

export function clearLogs() {
  logsData = {};
  persist();
}

export function setLogsData(data) {
  logsData = data && typeof data === 'object' ? data : {};
  persist();
}
