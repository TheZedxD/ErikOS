// Global state for ErikOS.
// Profiles, current user and settings are kept here.

export const profiles = [];
export let currentUser = null;
export const settings = {};

export function setCurrentUser(user) {
  currentUser = user;
}
