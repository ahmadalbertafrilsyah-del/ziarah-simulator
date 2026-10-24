import { CHARACTERS, INITIAL_POSITION, PLACE_TYPES } from "./catalog.mjs";
import { SEED_LOCATIONS, DEMO_LOCATIONS } from "./locations.mjs";
import { cumulativeDistances, distanceMeters, positionAtDistance, validCoordinate } from "./geo.mjs";

const clamp = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0));
const builtins = [...SEED_LOCATIONS, ...DEMO_LOCATIONS];
const partyIsValid = ids => Array.isArray(ids) && ids.length === 2 && new Set(ids).size === 2 && ids.every(id => CHARACTERS.some(c => c.id === id));

export function createGame() {
  return {
    version: 1, party: [], locations: builtins.map(p => ({ ...p, coordinates: [...p.coordinates] })),
    position: [...INITIAL_POSITION], plan: ["sunan-giri"], route: null, leg: 0, progressM: 0,
    status: "idle", arrivedId: "sunan-ampel", clock: 540, speed: 60, fuel: 4, money: 450000,
    energy: [100, 100], tyre: 95, spark: 95, inventory: { tyre: 1, spark: 2, fuel: 2 },
    event: null, rng: 736519, incidentM: 0, eventCooldown: 0, visits: [], sequence: 1,
    logs: [{ id: 1, clock: 540, text: "Perjalanan dimulai dari kawasan Sunan Ampel.", kind: "info" }],
  };
}

function entry(s, text, kind = "info") {
  const sequence = s.sequence + 1;
  return { ...s, sequence, logs: [{ id: sequence, clock: s.clock, text, kind }, ...s.logs].slice(0, 50) };
}

function stoppedStatus(s, event = s.event) {
  if (event) return "broken";
  if (s.route && s.progressM >= s.route.stops[s.leg].endM - 0.1 && s.arrivedId === s.route.targetIds[s.leg]) return "arrived";
  return s.route ? "paused" : "idle";
}

export function validateLocation(p) {
  if (!p || typeof p !== "object") throw Error("Data lokasi tidak valid.");
  const name = String(p.name || "").trim(), type = String(p.type || ""), source = String(p.source || "").trim();
  if (!name || name.length > 100) throw Error("Nama lokasi wajib diisi, maksimal 100 karakter.");
  if (!Object.hasOwn(PLACE_TYPES, type)) throw Error("Pilih jenis lokasi.");
  if (!validCoordinate(p.coordinates)) throw Error("Koordinat berada di luar jangkauan peta Indonesia.");
  if (source && (!URL.canParse(source) || !["https:", "http:"].includes(new URL(source).protocol))) throw Error("Sumber harus berupa tautan http atau https.");
  return {
    id: String(p.id || "").slice(0, 100), name, type, coordinates: [...p.coordinates],
    person: String(p.person || "").trim().slice(0, 120), region: String(p.region || "").trim().slice(0, 140),
    history: String(p.history || "").trim().slice(0, 6000), source: source.slice(0, 1000),
    custom: !!p.custom, simulation: !!p.simulation, canRest: type === "hotel" || (type === "masjid" && !!p.canRest),
  };
}

export function canUsePlace(s, p) {
  return !!p && (s.arrivedId === p.id || distanceMeters(s.position, p.coordinates) <= 250);
}

function checkedRoute(r, locations) {
  if (!r || typeof r.id !== "string" || !Array.isArray(r.coordinates) || r.coordinates.length < 2 || r.coordinates.length > 30000 || !r.coordinates.every(validCoordinate)) return null;
  if (!Array.isArray(r.targetIds) || !r.targetIds.length || r.targetIds.length > 8 || new Set(r.targetIds).size !== r.targetIds.length || !r.targetIds.every(id => locations.some(p => p.id === id))) return null;
  if (!Array.isArray(r.stops) || r.stops.length !== r.targetIds.length || !r.stops.every(t => Number.isInteger(t.endIndex) && t.endIndex > 0 && t.endIndex < r.coordinates.length)) return null;
  if (!Number.isFinite(r.durationSec) || r.durationSec <= 0 || r.durationSec > 31536000) return null;
  const cumulative = cumulativeDistances(r.coordinates), distanceM = cumulative.at(-1);
  const stops = r.stops.map(t => ({ endIndex: t.endIndex, endM: cumulative[t.endIndex] }));
  if (!(distanceM > 0) || stops.at(-1).endIndex !== r.coordinates.length - 1 || !stops.every((t, i) => (i === 0 || t.endM > stops[i - 1].endM) && distanceMeters(r.coordinates[t.endIndex], locations.find(p => p.id === r.targetIds[i]).coordinates) < 1500)) return null;
  return { id: r.id, coordinates: r.coordinates, cumulative, distanceM, durationSec: r.durationSec, stops, targetIds: [...r.targetIds], source: String(r.source || "Rute jalan").slice(0, 100), retrieved: String(r.retrieved || "").slice(0, 30) };
}

export function advanceGame(s, elapsedMs) {
  if (s.status !== "moving" || !s.route || s.event) return s;
  const r = s.route, stop = r.stops[s.leg];
  if (!stop) return s;
  const seconds = clamp(elapsedMs, 0, 2000) / 1000 * s.speed, rate = r.distanceM / r.durationSec;
  const requested = Math.min(seconds * rate, Math.max(0, stop.endM - s.progressM));
  const actual = Math.min(requested, s.fuel * 38000), progressM = s.progressM + actual;
  let n = {
    ...s, progressM, position: positionAtDistance(r, progressM), clock: s.clock + actual / rate / 60,
    fuel: Math.max(0, s.fuel - actual / 38000), energy: s.energy.map(e => Math.max(0, e - actual / 20000)),
    tyre: Math.max(0, s.tyre - actual / 25000), spark: Math.max(0, s.spark - actual / 35000), incidentM: s.incidentM + actual,
  };
  if (progressM >= stop.endM - 0.1) {
    const p = s.locations.find(p => p.id === r.targetIds[s.leg]);
    return entry({ ...n, status: "arrived", arrivedId: p.id }, `Tiba di ${p.name}.`, "arrival");
  }
  if (requested > actual + 0.01 || n.fuel <= 0.000001) return entry({ ...n, fuel: 0, status: "broken", event: "fuel" }, "Bensin habis. Isi dari jeriken atau panggil bantuan.", "event");
  if (n.energy.some(e => e <= 0)) return entry({ ...n, status: "paused" }, "Energi habis. Beristirahat atau gunakan bantuan singgah.", "event");
  while (n.incidentM >= 5000) {
    const rng = (Math.imul(n.rng, 1664525) + 1013904223) >>> 0;
    n = { ...n, rng, incidentM: n.incidentM - 5000 };
    if (n.clock < n.eventCooldown) continue;
    const risk = n.tyre < 35 || n.spark < 35 ? 0.12 : 0.018, value = rng / 4294967296;
    if (value < risk || n.tyre <= 0 || n.spark <= 0) {
      const event = n.tyre <= 0 ? "tyre" : n.spark <= 0 ? "spark" : value < risk * 0.6 ? "tyre" : "spark";
      return entry({ ...n, event, status: "broken", eventCooldown: n.clock + 45 }, event === "tyre" ? "Ban bocor. Ganti ban cadangan atau panggil bengkel." : "Busi mati. Ganti busi cadangan atau panggil bengkel.", "event");
    }
  }
  return n;
}

export function gameReducer(s, a) {
  switch (a.type) {
    case "HYDRATE": return a.state;
    case "PARTY":
      return partyIsValid(a.ids) ? entry({ ...s, party: [...a.ids], status: s.status === "moving" ? "paused" : s.status }, "Teman perjalanan sudah dipilih.") : s;
    case "PLAN": {
      const ids = a.ids;
      if (s.status === "moving" || !Array.isArray(ids) || ids.length > 8 || new Set(ids).size !== ids.length || ids.some(id => !s.locations.some(p => p.id === id))) return s;
      return { ...s, plan: [...ids], route: null, progressM: 0, leg: 0, status: s.event ? "broken" : "idle" };
    }
    case "ROUTE": {
      const r = checkedRoute(a.route, s.locations);
      if (s.status === "moving" || !r || r.targetIds.join("|") !== s.plan.join("|") || distanceMeters(s.position, r.coordinates[0]) > 1500) return s;
      return entry({ ...s, route: r, leg: 0, progressM: 0, status: s.event ? "broken" : "ready" }, "Rute jalan siap. Periksa bekal, lalu berangkat.");
    }
    case "START": {
      if (!partyIsValid(s.party) || !s.route || s.event || s.energy.some(e => e <= 0)) return s;
      if (s.fuel <= 0) return entry({ ...s, status: "broken", event: "fuel" }, "Tangki kosong. Isi bensin sebelum melanjutkan.", "event");
      if (s.status === "arrived") return s.leg < s.route.targetIds.length - 1 ? { ...s, leg: s.leg + 1, status: "moving", arrivedId: null } : s;
      return ["ready", "paused"].includes(s.status) ? { ...s, status: "moving", arrivedId: null } : s;
    }
    case "PAUSE": return s.status === "moving" ? { ...s, status: "paused" } : s;
    case "TICK": return advanceGame(s, a.elapsedMs);
    case "SPEED": return [60, 180, 600].includes(a.speed) ? { ...s, speed: a.speed } : s;
    case "WAIT":
      return s.status !== "moving" && [60, 360].includes(a.minutes) ? entry({ ...s, clock: s.clock + a.minutes, energy: s.energy.map(e => Math.max(0, e - a.minutes / 120)) }, `Menunggu ${a.minutes / 60} jam.`) : s;
    case "LOCATION": {
      if (s.status === "moving") return s;
      let p; try { p = validateLocation(a.location); } catch { return s; }
      if (!p.id) return s;
      const old = s.locations.find(l => l.id === p.id);
      if (!old && s.locations.length >= 113) return s;
      p = { ...p, custom: old ? old.custom : true, simulation: old ? old.simulation : false };
      const moved = old && distanceMeters(old.coordinates, p.coordinates) > 0.1;
      const invalidates = moved && s.route?.targetIds.includes(p.id);
      const locations = old ? s.locations.map(l => l.id === p.id ? p : l) : [...s.locations, p];
      return entry({ ...s, locations, ...(invalidates ? { route: null, progressM: 0, leg: 0, status: s.event ? "broken" : "idle" } : {}), arrivedId: moved && s.arrivedId === p.id ? null : s.arrivedId }, `${old ? "Memperbarui" : "Menambahkan"} ${p.name}.`);
    }
    case "DELETE_LOCATION": {
      const p = s.locations.find(p => p.id === a.id);
      if (!p?.custom || s.status === "moving" || s.route?.targetIds.includes(a.id)) return s;
      return { ...s, locations: s.locations.filter(p => p.id !== a.id), plan: s.plan.filter(id => id !== a.id), arrivedId: s.arrivedId === a.id ? null : s.arrivedId };
    }
    case "VISIT": {
      const p = s.locations.find(p => p.id === s.arrivedId);
      if (!partyIsValid(s.party) || p?.type !== "maqbarah" || !canUsePlace(s, p)) return s;
      const key = `${s.route?.id || "start"}:${s.leg}:${p.id}`;
      if (s.visits.some(v => v.key === key)) return s;
      return entry({ ...s, visits: [...s.visits, { key, locationId: p.id, name: p.name, clock: s.clock, party: [...s.party] }].slice(-500) }, `Kunjungan ke ${p.name} dicatat.`, "visit");
    }
    case "REPAIR": {
      if (!s.event || s.status === "moving") return s;
      const inventory = { ...s.inventory }, n = { ...s, inventory, event: null, status: stoppedStatus(s, null) };
      if (s.event === "fuel") {
        const amt = Math.min(inventory.fuel, 5.5 - s.fuel); if (amt <= 0) return s;
        n.fuel += amt; inventory.fuel -= amt;
      } else {
        if (inventory[s.event] < 1) return s;
        inventory[s.event] -= 1; if (s.event === "tyre") n.tyre = 100; else n.spark = 100;
      }
      return entry(n, "Perbaikan selesai. Perjalanan dapat dilanjutkan.");
    }
    case "HELP": {
      if (s.status === "moving" || (!s.event && s.energy.every(e => e > 0))) return s;
      return entry({ ...s, event: null, status: stoppedStatus(s, null), clock: s.clock + 30, money: Math.max(0, s.money - 25000), fuel: Math.max(s.fuel, 2), tyre: Math.max(75, s.tyre), spark: Math.max(75, s.spark), energy: s.energy.map(e => Math.max(e, 60)) }, s.money < 25000 ? "Bantuan darurat tiba. Biaya disesuaikan sisa bekal." : "Bantuan bengkel tiba. Biaya simulasi Rp25.000.");
    }
    case "SERVICE": {
      const p = s.locations.find(p => p.id === a.id);
      if (!canUsePlace(s, p) || s.status === "moving") return s;
      if (a.service === "fuel" && p.type === "spbu") {
        const amt = Math.min(5.5 - s.fuel, s.money / 12000); if (amt <= 0) return s;
        const event = s.event === "fuel" ? null : s.event;
        return entry({ ...s, fuel: s.fuel + amt, money: Math.max(0, s.money - Math.ceil(amt * 12000)), event, status: stoppedStatus(s, event) }, "Mengisi bahan bakar di POM bensin.");
      }
      if (a.service === "workshop" && p.type === "bengkel" && s.money >= 20000) {
        const event = s.event === "fuel" ? "fuel" : null;
        return entry({ ...s, tyre: 100, spark: 100, money: s.money - 20000, inventory: { ...s.inventory, tyre: Math.max(1, s.inventory.tyre), spark: Math.max(2, s.inventory.spark) }, event, status: stoppedStatus(s, event) }, "Servis Vespa dan melengkapi suku cadang.");
      }
      if (a.service === "rest" && p.canRest && !s.event) {
        const cost = p.type === "hotel" ? 50000 : 0; if (s.money < cost) return s;
        const mod = s.clock % 1440, clock = a.untilMorning ? s.clock + (mod < 360 ? 360 - mod : 1800 - mod) : s.clock + 360;
        return entry({ ...s, clock, energy: [100, 100], money: s.money - cost, status: stoppedStatus(s) }, `Selesai beristirahat di ${p.name}.`);
      }
      return s;
    }
    case "REFUEL_CAN": {
      if (s.status === "moving" || s.inventory.fuel <= 0 || s.fuel >= 5.5) return s;
      const amt = Math.min(s.inventory.fuel, 5.5 - s.fuel), event = s.event === "fuel" ? null : s.event;
      return entry({ ...s, fuel: s.fuel + amt, inventory: { ...s.inventory, fuel: s.inventory.fuel - amt }, event, status: stoppedStatus(s, event) }, "Mengisi bahan bakar dari jeriken.");
    }
    case "TRIGGER_EVENT": {
      if (s.event || !["fuel", "tyre", "spark"].includes(a.event)) return s;
      return entry({ ...s, event: a.event, status: "broken", ...(a.event === "fuel" ? { fuel: 0 } : {}) }, `Uji kejadian: ${a.event === "fuel" ? "bensin habis" : a.event === "tyre" ? "ban bocor" : "busi mati"}.`, "event");
    }
    default: return s;
  }
}

export function restoreGame(raw) {
  let x; try { x = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return null; }
  if (!x || x.version !== 1 || !Array.isArray(x.locations) || x.locations.length > 113) return null;
  const initial = createGame(), locations = [], ids = new Set();
  try {
    for (const item of x.locations) {
      const p = validateLocation(item), builtin = builtins.find(b => b.id === p.id);
      if (!p.id || ids.has(p.id)) return null;
      ids.add(p.id); locations.push({ ...p, custom: !builtin, simulation: !!builtin?.simulation });
    }
  } catch { return null; }
  for (const p of builtins) if (!ids.has(p.id)) { locations.push({ ...p }); ids.add(p.id); }
  if (locations.length > 113) return null;
  const n = {
    ...initial, locations, party: partyIsValid(x.party) ? [...x.party] : [],
    position: validCoordinate(x.position) ? [...x.position] : initial.position,
    clock: clamp(x.clock, 0, 5256000), fuel: clamp(x.fuel, 0, 5.5), money: clamp(x.money, 0, 1e9),
    energy: Array.isArray(x.energy) && x.energy.length === 2 ? x.energy.map(e => clamp(e, 0, 100)) : [100, 100],
    tyre: clamp(x.tyre, 0, 100), spark: clamp(x.spark, 0, 100), speed: [60, 180, 600].includes(x.speed) ? x.speed : 60,
    arrivedId: ids.has(x.arrivedId) ? x.arrivedId : null,
    inventory: { tyre: Math.floor(clamp(x.inventory?.tyre, 0, 99)), spark: Math.floor(clamp(x.inventory?.spark, 0, 99)), fuel: clamp(x.inventory?.fuel, 0, 20) },
    event: ["fuel", "tyre", "spark"].includes(x.event) ? x.event : null, rng: Number.isInteger(x.rng) ? x.rng >>> 0 : initial.rng,
    eventCooldown: clamp(x.eventCooldown, 0, 5256000), incidentM: clamp(x.incidentM, 0, 5000),
    plan: Array.isArray(x.plan) ? [...new Set(x.plan)].filter(id => ids.has(id)).slice(0, 8) : [],
    visits: Array.isArray(x.visits) ? x.visits.filter(v => typeof v?.key === "string" && ids.has(v.locationId) && typeof v.name === "string" && Number.isFinite(v.clock)).slice(-500).map(v => ({ key: v.key.slice(0, 250), locationId: v.locationId, name: v.name.slice(0, 100), clock: clamp(v.clock, 0, 5256000), party: partyIsValid(v.party) ? [...v.party] : [] })) : [],
    logs: Array.isArray(x.logs) ? x.logs.filter(l => typeof l?.text === "string" && Number.isFinite(l.clock)).slice(0, 49).map((l, i) => ({ id: i + 1, text: l.text.slice(0, 500), clock: clamp(l.clock, 0, 5256000), kind: ["info", "event", "arrival", "visit"].includes(l.kind) ? l.kind : "info" })) : initial.logs,
  };
  n.sequence = n.logs.length + 1;
  const r = checkedRoute(x.route, locations);
  if (r && r.targetIds.join("|") === n.plan.join("|")) {
    n.route = r; n.leg = Math.floor(clamp(x.leg, 0, r.stops.length - 1));
    n.progressM = clamp(x.progressM, n.leg ? r.stops[n.leg - 1].endM : 0, r.stops[n.leg].endM);
    n.position = positionAtDistance(r, n.progressM);
    n.arrivedId = n.progressM >= r.stops[n.leg].endM - 0.1 ? r.targetIds[n.leg] : null;
    n.status = stoppedStatus(n);
  } else if (n.arrivedId && distanceMeters(n.position, locations.find(p => p.id === n.arrivedId).coordinates) > 1500) n.arrivedId = null;
  if (n.event) n.status = "broken";
  return entry(n, "Perjalanan tersimpan berhasil dimuat.");
}
