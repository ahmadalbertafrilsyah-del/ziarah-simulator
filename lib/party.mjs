import { CHARACTERS } from "./catalog.mjs";

export const PARTY_STORAGE_KEY = "ziarah-walisongo.party.v1";

export function isValidParty(ids) {
  return Array.isArray(ids) && ids.length === 2 && new Set(ids).size === 2 && ids.every(id => CHARACTERS.some(c => c.id === id));
}

export function parseParty(raw) {
  try {
    const saved = JSON.parse(raw);
    return saved?.version === 1 && isValidParty(saved.ids) ? [...saved.ids] : null;
  } catch { return null; }
}
