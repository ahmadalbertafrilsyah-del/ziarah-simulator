import { validCoordinate, cumulativeDistances } from './geo.mjs';

// Validate API geometry and derive distance from the actual line, never a straight-line fallback.
export function validateJourneyRoute(data) {
  const coordinates = data?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2 || coordinates.length > 100000 ||
      coordinates.some(point => !validCoordinate(point)) || !Number.isFinite(data.durationSec) || data.durationSec <= 0) {
    throw new Error('Layanan mengembalikan rute yang tidak valid.');
  }
  const cumulative = cumulativeDistances(coordinates);
  const distanceM = cumulative.at(-1);
  if (!Number.isFinite(distanceM) || distanceM <= 0) throw new Error('Jarak rute tidak valid.');
  return { coordinates, cumulative, distanceM, durationSec: data.durationSec,
    source: typeof data.source === 'string' ? data.source : 'Rute jalan', retrieved: data.retrieved };
}

export function advanceJourney(traveled, distanceM, elapsedSec, speed) {
  const next = Math.min(distanceM, Math.max(0, traveled) + Math.max(0, elapsedSec) * (40 / 3.6) * speed);
  return { traveled: next, arrived: next >= distanceM };
}
