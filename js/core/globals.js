// Global state for ErikOS.
// Profiles, current user and settings are kept here.

import { addLog as addLogEntry, clearLogs, getLogsData, setLogsData } from './logs.js';

const PROFILE_STORAGE_KEY = 'erikos-profiles';
const CURRENT_PROFILE_KEY = 'erikos-current-profile';

function loadProfiles() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((p) => p && typeof p.id === 'string');
  } catch (err) {
    console.warn('Failed to load profiles', err);
  }
  return [];
}

export const profiles = loadProfiles();
export let currentUser = null;
export const settings = {};

export function saveProfiles() {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
  } catch (err) {
    console.warn('Failed to save profiles', err);
  }
}

export function setCurrentUser(user) {
  currentUser = user;
  if (user && user.id) {
    localStorage.setItem(CURRENT_PROFILE_KEY, user.id);
  } else {
    localStorage.removeItem(CURRENT_PROFILE_KEY);
  }
}

export function ensureCurrentUser(preferredId) {
  if (currentUser && (!preferredId || currentUser.id === preferredId)) {
    return currentUser;
  }

  let profile = null;
  if (preferredId) {
    profile = profiles.find((p) => p.id === preferredId) || null;
  }

  if (!profile) {
    if (profiles.length === 0) {
      const profileId = `profile-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      profile = { id: profileId, name: 'Guest' };
      profiles.push(profile);
      saveProfiles();
    } else {
      const storedId = localStorage.getItem(CURRENT_PROFILE_KEY);
      profile = profiles.find((p) => p.id === storedId) || profiles[0];
    }
  }

  setCurrentUser(profile);
  return profile;
}

export function createProfile(name) {
  const profile = {
    id: `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: name || 'New User',
  };
  profiles.push(profile);
  saveProfiles();
  return profile;
}

export function renameProfile(id, name) {
  const profile = profiles.find((p) => p.id === id);
  if (profile && name) {
    profile.name = name;
    saveProfiles();
  }
}

export function deleteProfile(id) {
  const idx = profiles.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  profiles.splice(idx, 1);
  saveProfiles();
  if (currentUser && currentUser.id === id) {
    setCurrentUser(null);
  }
  return true;
}

export function addLog(message) {
  addLogEntry(message);
}

export { clearLogs, getLogsData, setLogsData };
