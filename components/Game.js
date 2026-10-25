"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

import {itineraryMapRoute} from "@/lib/itinerary.mjs";
import { ASSET, CHARACTERS } from "@/lib/catalog.mjs";
import { SEED_LOCATIONS } from "@/lib/locations.mjs";
import {
  isValidParty,
  parseParty,
  PARTY_STORAGE_KEY,
} from "@/lib/party.mjs";

import Icon from "./Icon";
import MaintenancePanel from "./MaintenancePanel";
import {serviceAccess} from "@/lib/route-facilities.mjs";

import { clockLabel, CAPACITY } from "@/lib/travel-resources.mjs";
import { distanceLabel } from "@/lib/catalog.mjs";
import { useJourney } from "./useJourney";
import Modal from "./Modal";
import LocationForm from "./LocationForm";
import {ItineraryPlanner,ItinerarySummary,BackupPanel} from "./JourneyTools";
import {PlaceProfile,JournalPanel,CustomLocationsPanel} from "./ZiarahPanels";

const CityScene = dynamic(()=>import("./CityScene"),{ssr:false,loading:()=> <div className="map-loading">Menyiapkan kota 3D…</div>});

const RouteSimulator = dynamic(() => import("./RouteSimulator"), { ssr: false });

const WorldMap = dynamic(() => import("./WorldMap"), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <span className="spinner" />
      Menyiapkan peta Indonesia…
    </div>
  ),
});

const DrivingScene = dynamic(() => import("./DrivingScene"), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#edf1e7",
        color: "#42664e",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span className="spinner" />
        Menyiapkan arena latihan…
      </div>
    </div>
  ),
});

const START = SEED_LOCATIONS.find(
  (place) => place.id === "sunan-ampel"
);



function PartyPicker({ initial, onSave }) {
  const [ids, setIds] = useState(initial);

  function toggle(id) {
    setIds((list) => {
      if (list.includes(id)) {
        return list.filter((item) => item !== id);
      }

      if (list.length < 2) {
        return [...list, id];
      }

      return list;
    });
  }

  return (
    <>
      <div className="party-guide">
        <span>01 · Pengendara</span>
        <Icon name="plus" size={14} />
        <span>02 · Penumpang</span>
        <strong>{ids.length}/2 dipilih</strong>
      </div>

      <div className="character-grid">
        {CHARACTERS.map((character) => {
          const order = ids.indexOf(character.id);
          const selected = order >= 0;

          return (
            <button
              key={character.id}
              type="button"
              className={
                "character-option" + (selected ? " selected" : "")
              }
              aria-pressed={selected}
              disabled={!selected && ids.length === 2}
              onClick={() => toggle(character.id)}
            >
              <div
                className="character-art"
                style={{
                  backgroundColor: character.color,
                }}
              >
                <img
                  src={`${ASSET}/characters/${character.image}`}
                  alt={character.name}
                />

                <span className="character-order">
                  {selected ? (
                    order + 1
                  ) : (
                    <Icon name="plus" size={15} />
                  )}
                </span>
              </div>

              <strong>{character.name}</strong>

              <span>
                {selected
                  ? order === 0
                    ? "Pengendara"
                    : "Penumpang"
                  : character.detail}
              </span>
            </button>
          );
        })}
      </div>

      <p className="muted small">
        Pilih tepat dua karakter berbeda. Untuk mengganti pilihan,
        klik kembali karakter yang sudah dipilih.
      </p>

      <div className="modal-actions wrap-actions">
        <button
          type="button"
          className="button secondary"
          disabled={ids.length !== 2}
          onClick={() => setIds(([first, second]) => [second, first])}
        >
          <Icon name="route" size={17} />
          Tukar posisi
        </button>

        <button
          type="button"
          className="button primary"
          disabled={!isValidParty(ids)}
          onClick={() => onSave(ids)}
        >
          <Icon name="check" size={18} />
          Simpan 2 karakter
        </button>
      </div>
    </>
  );
}

export default function Game() {
  const [party, setParty] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [saveStatus, setSaveStatus] = useState(
    "Memuat pilihan…"
  );

  const [modal, setModal] = useState(null);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [profileId,setProfileId]=useState("sunan-giri");
  const [locationDraft,setLocationDraft]=useState(null);
  const [placing,setPlacing]=useState(false);
  const [selectedId, setSelectedId] = useState("sunan-giri");
  const [toast, setToast] = useState("");
  const [focusRequest, setFocusRequest] = useState(null);

  const mapApi = useRef(null);

  const ready = isValidParty(party);
  const journey = useJourney(START);
  const mapRoute=useMemo(()=>itineraryMapRoute({route:journey.route,itinerary:journey.itinerary}),[journey.route,journey.itinerary]);
  const selected = journey.destination || journey.locations.find(place=>place.id===selectedId) || START;
  const locked = journey.status === "moving" || journey.status === "paused";

  function openProfile(id){setProfileId(id);setModal('profile');}
  function addLocation(){setLocationDraft(null);setModal('location-form');}
  function saveLocation(place){const result=journey.saveLocation(place);if(result.ok){journey.clearRoute();setSelectedId(place.id);setModal(null);setToast(result.message);setFocusRequest({coordinates:place.coordinates,zoom:13,nonce:Date.now()});}return result;}
  function pickLocation(coordinates){if(!placing)return;setLocationDraft(d=>({...d,coordinates}));setPlacing(false);setModal('location-form');}
  function destinationProfile(){journey.pause();journey.save();setSimulatorOpen(false);openProfile(journey.destination.id);}

  function nextDestination(){const r=journey.nextStop();if(r.ok){setSimulatorOpen(false);setModal(null);}setToast(r.message);}
  function restoredProgress(r){setParty(r.party);setSaveStatus(r.party.length?'Pilihan tersimpan':'Belum memilih karakter');setSimulatorOpen(false);setModal(null);setPlacing(false);setSelectedId('sunan-giri');setFocusRequest({coordinates:r.origin.coordinates,zoom:12,nonce:Date.now()});setToast(r.message);}

  function selectDestination(id) {
    if (locked) {
      setToast("Selesaikan perjalanan aktif sebelum mengganti tujuan.");
      return;
    }
    journey.clearRoute();
    setSelectedId(id);
  }

  function depart() {
    if (!ready) { setModal("party"); return; }
    journey.start(party);
    setSimulatorOpen(true);
  }

  const pauseJourney = journey.pause;
  const journeyStatus = journey.status;
  const arrivedName = journey.destination?.name;
  useEffect(() => {
    if (journeyStatus !== "arrived") return;
    const timer = setTimeout(() => setToast(`Tiba di ${arrivedName}. Buka profil untuk mencatat kunjungan atau siapkan tujuan berikutnya.`), 0);
    return () => clearTimeout(timer);
  }, [journeyStatus, arrivedName]);

  useEffect(() => {
    if (modal) pauseJourney();
  }, [modal, pauseJourney]);

  useEffect(() => {
    // Restore browser-only storage after mount; intentionally synchronizes React state.
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const raw = localStorage.getItem(PARTY_STORAGE_KEY);
      const saved = raw ? parseParty(raw) : null;

      if (saved) {
        setParty(saved);
        setSaveStatus("Pilihan tersimpan");
      } else {
        setSaveStatus(
          raw
            ? "Pilih ulang dua karakter"
            : "Belum memilih karakter"
        );
      }
    } catch {
      setSaveStatus("Penyimpanan tidak tersedia");
    }

    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast("");
    }, 6000);

    return () => clearTimeout(timer);
  }, [toast]);

  function saveParty(ids) {
    if (!isValidParty(ids)) return;

    setParty([...ids]);
    setModal(null);

    try {
      localStorage.setItem(
        PARTY_STORAGE_KEY,
        JSON.stringify({
          version: 1,
          ids,
        })
      );

      setSaveStatus("Pilihan tersimpan");
    } catch {
      setSaveStatus("Pilihan belum tersimpan");

      setToast(
        "Karakter sudah dipilih, tetapi penyimpanan browser " +
          "diblokir. Pilihan hanya berlaku selama halaman ini terbuka."
      );

      return;
    }

    setToast(
      "Dua karakter siap menemani perjalanan. " +
        "Hitung rute jalan, lalu klik Berangkat."
    );
  }

  function startCity(){if(!loaded||!journey.hydrated)return;journey.pause();journey.save();setModal(ready?"city":"party");}

  function startPractice() {
    if (!loaded) return;

    setToast("");
    setModal(ready ? "drive" : "party");
  }

  // Diletakkan setelah seluruh hook agar urutan hook tetap konsisten.
  // State pilihan karakter tetap dipertahankan saat kembali ke menu.
  if (simulatorOpen && journey.route && journey.driver && isValidParty(journey.party)) {
    return <RouteSimulator route={journey.route} destination={journey.destination}
      initialDriver={journey.driver} party={journey.party} status={journey.status}
      onProgress={journey.report} onPause={journey.pause} onService={action=>journey.service(action,party)}
      onResume={()=>journey.start(party)} onProfile={destinationProfile}
      itinerary={journey.itinerary} onNext={journey.itinerary&&journey.itinerary.index+1<journey.itinerary.stopIds.length?nextDestination:undefined}
      onExit={()=>{journey.pause();journey.save();setSimulatorOpen(false);}} />;
  }
  if(modal==="city"&&ready)return <CityScene party={party} onExit={()=>setModal(null)}/>;
  if (modal === "drive" && ready) {
    return (
      <DrivingScene
        party={party}
        onExit={() => setModal(null)}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside
        className="side-rail"
        aria-label="Navigasi utama"
      >
        <a
          href="#main"
          className="brand-mark"
          aria-label="Ziarah Walisongo"
        >
          <Icon name="compass" size={28} />
        </a>

        <div className="rail-links">
          <button
            type="button"
            className={!modal ? "active" : ""}
            onClick={() => setModal(null)}
            aria-label="Layar utama"
          >
            <Icon name="map" size={22} />
            <span>Peta</span>
          </button>

          <button
            type="button"
            className={modal === "party" ? "active" : ""}
            onClick={() => setModal("party")}
            disabled={!loaded}
            aria-label="Pilih karakter"
          >
            <Icon name="users" size={22} />
            <span>Karakter</span>
          </button>

          <button
            type="button"
            disabled={!journey.hydrated}
            onClick={()=>setModal("journal")}
            title="Jurnal kunjungan"
            aria-label="Buka jurnal"
          >
            <Icon name="book" size={22} />
            <span>Jurnal</span>
          </button>

          <button
            type="button"
            disabled={!journey.hydrated}
            onClick={()=>setModal("backup")}
            title="Cadangan progres"
            aria-label="Buka cadangan progres"
          >
            <Icon name="bag" size={22} />
            <span>Cadangan</span>
          </button>
        </div>

        <button
          type="button"
          className="rail-help"
          onClick={() => setModal("help")}
          title="Tentang tahap ini"
          aria-label="Tentang tahap ini"
        >
          <Icon name="info" size={22} />
        </button>

        <span className="rail-version">V 1.1</span>
      </aside>

      <div className="app-content">
        <header className="topbar">
          <div className="wordmark">
            ziarah
            <span>WALISONGO</span>
          </div>

          <div className="topbar-divider" />

          <span className="topbar-caption">
            Sebuah perjalanan, banyak cerita.
          </span>

          <div className="topbar-actions">
            <span className="prototype-badge">
              SIMULATOR RUTE
            </span>

            <span className="save-indicator" role="status">
              <span
                className={
                  ready
                    ? "status-dot"
                    : "status-dot neutral"
                }
              />
              <span>{saveStatus}</span>
              <Icon name="save" size={17} />
            </span>
          </div>
        </header>

        <main id="main" className="main-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow">
                <span />
                SIMULATOR PERJALANAN VESPA
              </div>

              <h1>Ziarah Walisongo.</h1>

              <p>
                Berangkat berdua, mengenal jejak para wali.
                Pilih teman perjalananmu untuk memulai.
              </p>
            </div>

            <div className="heading-stats">
              <div className="time-stat">
                <span className="stat-icon">
                  <Icon name="sun" size={22} />
                </span>

                <span>
                  <small>Waktu permainan</small>
                  <strong>
                    {clockLabel(journey.resources.clock)}
                  </strong>
                </span>
              </div>

              <div className="wallet-stat">
                <span className="stat-icon">
                  <Icon name="wallet" size={21} />
                </span>

                <span>
                  <small>Bekal perjalanan</small>
                  <strong>Rp{journey.resources.money.toLocaleString("id-ID")}</strong>
                </span>
              </div>
            </div>
          </section>

          <div className="journey-layout">
            <section
              className="map-card"
              aria-label="Tampilan awal peta Indonesia"
            >
              <div className="map-toolbar">
                <div className="map-title">
                  <Icon name="map" size={18} />
                  <h2>Peta perjalanan</h2>
                  <span className="map-country">
                    INDONESIA
                  </span>
                </div>

                <div className="map-tools">
                  <button
                    type="button"
                    title="Lihat seluruh Indonesia"
                    onClick={() =>
                      mapApi.current?.indonesia()
                    }
                  >
                    <Icon name="compass" size={17} />
                    <span>Indonesia</span>
                  </button>

                  <button
                    type="button"
                    title="Kembali ke titik awal"
                    aria-label="Kembali ke titik awal"
                    onClick={() =>
                      setFocusRequest({
                        coordinates: START.coordinates,
                        zoom: 12,
                        nonce: Date.now(),
                      })
                    }
                  >
                    <Icon name="target" size={18} />
                  </button>
                </div>
              </div>

              {placing&&<div className="location-pick-note" role="status">Klik titik pada peta untuk menentukan koordinat maqbarah.<button className="text-button" onClick={()=>{setPlacing(false);setModal('location-form');}}>Batal memilih titik</button></div>}
              <div className={"map-stage"+(placing?" is-placing":"")}>
                <WorldMap
                  locations={journey.locations}
                  position={journey.position}
                  route={mapRoute}
                  selectedId={selected.id}
                  onSelect={selectDestination}
                  onPick={pickLocation}
                  placing={placing}
                  apiRef={mapApi}
                  moving={journey.status === "moving"}
                  visits={journey.visits}
                  focusRequest={focusRequest}
                />

                <div className="map-caption">
                  <span className="status-dot" />
                  {journey.status === "moving" ? "Vespa sedang dalam perjalanan" : journey.status === "paused" ? "Perjalanan dijeda" : `Posisi · ${journey.origin.name}`}
                </div>

                <div className="map-legend">
                  <span>
                    <i className="legend-dot wali" />
                    Maqbarah Walisongo
                  </span>

                  <span>
                    <img
                      src={`${ASSET}/items/vespa.png`}
                      alt=""
                    />
                    Posisi awal
                  </span>
                </div>

                <div className="map-journey-card">
                  <span className="destination-icon">
                    <Icon name="landmark" size={24} />
                  </span>

                  <div>
                    <span className="eyebrow">
                      KENALI TUJUAN ZIARAH
                    </span>
                    <strong>{selected.name}</strong>
                    <small>{selected.region}</small>
                  </div>

                  <span className="map-location-number">
                    {selected.custom?"+":String(SEED_LOCATIONS.findIndex(p=>p.id===selected.id)+1).padStart(2,"0")}
                    <small>{selected.custom?'TAMBAHAN':'/09'}</small>
                  </span>
                </div>
              </div>
            </section>

            <aside
              className="planner-card"
              aria-label="Persiapan perjalanan"
            >
              <div className="planner-heading">
                <span className="section-kicker">
                  MULAI BERMAIN
                </span>
                <h2>Tujuan berikutnya.</h2>
                <p>Satu Vespa, dua teman perjalanan.</p>
              </div>

              <section className="journey-panel" aria-label="Kontrol perjalanan">
                <label htmlFor="destination">Tujuan maqbarah</label>
                <select id="destination" value={selected.id} disabled={locked}
                  onChange={(event) => selectDestination(event.target.value)}>
                  {journey.locations.map((place) => (
                    <option key={place.id} value={place.id} disabled={place.id === journey.origin.id}>
                      {place.name}{place.custom?" (tambahan)":""}{place.id === journey.origin.id ? " (posisi saat ini)" : ""}
                    </option>
                  ))}
                </select>
                <p className="small muted">Dari {journey.origin.name} · <button type="button" className="text-button" onClick={()=>openProfile(journey.origin.id)}>Profil posisi saat ini</button></p>
                <div className="ziarah-buttons"><button type="button" className="button secondary" onClick={()=>openProfile(selected.id)}>Profil tujuan</button><button type="button" className="button secondary" disabled={!journey.hydrated||locked} onClick={addLocation}>Tambah maqbarah</button></div>
                <div className="ziarah-buttons"><button type="button" className="button secondary" disabled={!journey.hydrated} onClick={()=>setModal('locations')}>Kelola lokasi</button><button type="button" className="button secondary" disabled={!journey.hydrated} onClick={()=>setModal('journal')}>Jurnal kunjungan</button></div>
                <button type="button" className="button secondary full-width"
                  disabled={!loaded || !journey.hydrated || locked || journey.status === "loading" || selected.id === journey.origin.id}
                  onClick={() => journey.plan(selected)}>
                  {journey.status === "loading" ? "Menghitung rute…" : journey.status === "error" ? "Coba hitung lagi" : "Hitung rute jalan"}
                </button>
                <button type="button" className="button secondary full-width" disabled={!journey.hydrated||journey.status==='loading'} onClick={()=>setModal('itinerary')}>Susun rangkaian tujuan</button>
                <ItinerarySummary journey={journey} onNext={nextDestination}/>
                {journey.error && <p role="alert" className="journey-error">{journey.error}</p>}
                {journey.route && <>
                  <div className="journey-metrics">
                    <div><small>{journey.itinerary?'Jarak ruas aktif':'Jarak rute'}</small><strong>{distanceLabel(journey.route.distanceM)}</strong></div>
                    <div><small>Jarak tersisa</small><strong>{distanceLabel(journey.remaining)}</strong></div>
                  </div>
                  <progress className="journey-progress" max={journey.route.distanceM} value={journey.traveled} aria-label="Kemajuan perjalanan" />
                  <p className="small muted">{journey.route.source} · Estimasi jalan {Math.ceil(journey.route.durationSec / 60)} menit</p>
                </>}
                <p className="small muted">Berangkat membuka simulator manual. Gunakan gas, rem, kemudi kiri/kanan dan mundur. Jalan mengikuti rute terpilih; bangunan sekitar berupa ilustrasi.</p>
                {journey.resources.breakdown&&<p className="journey-error" role="alert">{journey.resources.breakdown.type==='tyre'?'Ban bocor':'Busi mati'}. Buka Inventaris & kondisi kendaraan untuk memperbaiki.</p>}
                <details><summary>Inventaris & kondisi kendaraan</summary><MaintenancePanel resources={journey.resources} onAction={action=>journey.service(action,party)} disabled={!ready||!journey.hydrated||journey.status==='moving'} canBuy={serviceAccess(journey,'buy-tyre').allowed} /></details>
                <section className="travel-services" aria-label="Bekal dan layanan simulasi">
                 <p>Bensin {journey.resources.fuel.toFixed(2)} L · {clockLabel(journey.resources.clock)}</p>
                 <p>Energi {party.map(id=>`${CHARACTERS.find(c=>c.id===id)?.name}: ${Math.round(journey.resources.energy[id])}%`).join(' · ') || 'Pilih dua karakter dahulu'}</p>
                 <button type="button" className="button secondary" disabled={!ready||!journey.hydrated||!serviceAccess(journey,'fuel').allowed} onClick={()=>setToast(journey.service('fuel',party).message)}>Isi bensin 1 L · Rp10.000</button>
                 <button type="button" className="button secondary" disabled={!ready||!journey.hydrated||!serviceAccess(journey,'rest').allowed} onClick={()=>setToast(journey.service('rest',party).message)}>Istirahat di tempat singgah</button>
                 <button type="button" className="button secondary" disabled={!ready||!journey.hydrated||journey.resources.fuel>1e-9} onClick={()=>setToast(journey.service('help',party).message)}>Panggil bantuan bensin</button>
                 <button type="button" className="button secondary" disabled={!ready||!journey.hydrated||!party.some(id=>journey.resources.energy[id]<=0)} onClick={()=>setToast(journey.service('rest-help',party).message)}>Bantuan istirahat darurat</button>
                 <small>Pos persiapan melayani sebelum berangkat dan setelah tiba. Selama perjalanan, berhenti dekat fasilitas yang sesuai. Biaya merupakan aturan simulasi.</small>
                </section>
                <p className="small muted" role="status">{journey.storageNote || "Kemajuan disimpan otomatis setiap dua detik."}</p>
                {locked && <button type="button" className="button secondary" onClick={()=>{journey.cancel();setToast("Perjalanan dibatalkan. Kembali ke titik keberangkatan.");}}>Batalkan & kembali ke titik keberangkatan</button>}
                <div className="journey-status" role="status">
                  {{idle:"Pilih tujuan, lalu hitung rute.",loading:"Sedang meminta rute jalan…",ready: ready ? "Rute siap. Silakan berangkat." : "Rute siap. Pilih dua karakter lalu berangkat.",moving:"Sedang berkendara",paused:"Perjalanan dijeda",arrived:`Tiba di ${journey.destination?.name || "tujuan"}`,error:"Rute gagal dihitung. Silakan coba lagi."}[journey.status]}
                </div>
                {journey.visits.length > 0 && <p className="small">Catatan kedatangan: {journey.visits.length} maqbarah.</p>}
              </section>

              <div className="welcome-illustration">
                <span className="illustration-halo" />

                <img
                  src={`${ASSET}/items/vespa.png`}
                  alt="Vespa hijau mint untuk perjalanan berdua"
                />

                <span className="illustration-label">
                  SIAP MENJELAJAH
                </span>
              </div>

              <div className="onboarding-steps">
                <div
                  className={
                    "setup-step current" +
                    (ready ? " done" : "")
                  }
                >
                  <span>
                    {ready ? (
                      <Icon name="check" size={16} />
                    ) : (
                      "01"
                    )}
                  </span>

                  <div>
                    <strong>Pilih teman perjalanan</strong>
                    <small>
                      {ready
                        ? "Pengendara & penumpang sudah siap"
                        : "Dua karakter, masing-masing punya cerita"}
                    </small>
                  </div>
                </div>

                <div className="setup-step">
                  <span>02</span>
                  <div>
                    <strong>Hitung rute jalan</strong>
                    <small>
                      Pilih maqbarah tujuan perjalanan
                    </small>
                  </div>
                </div>

                <div className="setup-step">
                  <span>03</span>
                  <div>
                    <strong>Berangkat dan pantau</strong>
                    <small>
                      Jeda, lanjutkan, dan tiba di tujuan
                    </small>
                  </div>
                </div>
              </div>

              <div className="departure-panel">
                <button type="button" className="button primary departure-button"
                  disabled={!loaded || !journey.hydrated || !!journey.resources.breakdown || (ready && !["ready", "moving", "paused"].includes(journey.status))}
                  onClick={() => journey.status === "moving" ? journey.pause() : depart()}>
                  <Icon name="play" size={18} />
                  {!ready ? "Pilih 2 karakter" : journey.status === "moving" ? "Jeda" : journey.status === "paused" ? "Lanjutkan" : "Berangkat"}
                </button>
                <button type="button" className="button secondary full-width" disabled={!loaded||!journey.hydrated} onClick={startCity}>Kota 3D & lalu lintas</button>
                <button type="button" className="button secondary full-width" disabled={!loaded || locked} onClick={startPractice}>
                  Buka arena latihan
                </button>

                {ready && (
                  <button
                    type="button"
                    className="button secondary full-width"
                    onClick={() => setModal("party")}
                  >
                    <Icon name="users" size={16} />
                    Lihat & ubah pasangan
                  </button>
                )}

                <span className="departure-note">
                  <Icon
                    name={ready ? "check" : "heart"}
                    size={12}
                  />

                  {ready
                    ? "Kontrol sentuh HP dan keyboard"
                    : "Awali perjalanan bersama temanmu."}
                </span>
              </div>
            </aside>
          </div>

          <section
            className="dashboard-cards"
            aria-label="Ringkasan persiapan"
          >
            <article className="summary-card party-summary">
              <div className="card-title">
                <h2>
                  <Icon name="users" size={18} />
                  Teman perjalanan
                </h2>

                <button
                  type="button"
                  className="text-button"
                  disabled={!loaded}
                  onClick={() => setModal("party")}
                >
                  {ready ? "Ganti" : "Pilih"}
                  <Icon name="chevron" size={14} />
                </button>
              </div>

              <div className="party-pair">
                {[0, 1].map((index) => {
                  const character = CHARACTERS.find(
                    (item) => item.id === party[index]
                  );

                  return (
                    <div
                      key={index}
                      className="party-person"
                    >
                      <button
                        type="button"
                        className={
                          "avatar" +
                          (!character ? " empty-avatar" : "")
                        }
                        style={
                          character
                            ? {
                                background: character.color,
                              }
                            : undefined
                        }
                        disabled={!loaded}
                        onClick={() => setModal("party")}
                        aria-label={
                          character
                            ? `Ganti ${character.name}`
                            : `Pilih ${
                                index === 0
                                  ? "pengendara"
                                  : "penumpang"
                              }`
                        }
                      >
                        {character ? (
                          <img
                            src={`${ASSET}/characters/${character.image}`}
                            alt={character.name}
                          />
                        ) : (
                          <Icon name="plus" size={23} />
                        )}
                      </button>

                      <div>
                        <small>
                          {index === 0
                            ? "PENGENDARA"
                            : "PENUMPANG"}
                        </small>

                        <strong>
                          {character?.name || "Belum dipilih"}
                        </strong>

                        <span className="person-state">
                          {character ? (
                            <>
                              <span className="status-dot" />
                              Siap menemani
                            </>
                          ) : (
                            "Pilih karakter dahulu"
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="summary-card vespa-summary">
              <div className="card-title">
                <h2>
                  <Icon name="fuel" size={18} />
                  Vespa & bekal perjalanan
                </h2>

                <span className="mini-badge">
                  PERSIAPAN
                </span>
              </div>

              <div className="vespa-overview">
                <img
                  className="vespa-art"
                  src={`${ASSET}/items/vespa.png`}
                  alt=""
                />

                <div>
                  <div className="meter">
                    <div>
                      <span>Bahan bakar tersisa</span>
                      <strong>{journey.resources.fuel.toFixed(2)} / {CAPACITY} L</strong>
                    </div>

                    <progress
                      max="5.5"
                      value={journey.resources.fuel}
                      aria-label="Bahan bakar tersisa"
                    />
                  </div>

                  <span className="vehicle-condition">
                    <i className="status-dot" />
                    Vespa siap menemani
                  </span>
                </div>
              </div>
            </article>

            <article className="summary-card journal-summary">
              <div className="card-title">
                <h2>
                  <Icon name="landmark" size={18} />
                  Sembilan tujuan
                </h2>

                <span className="mini-badge">
                  WALISONGO
                </span>
              </div>

              <div className="visit-count">
                <strong>09</strong>

                <p>
                  Maqbarah Walisongo
                  <br />
                  menanti untuk dikenali
                </p>
              </div>

              <div className="visit-dots">
                {SEED_LOCATIONS.map((place, index) => (
                  <button
                    key={place.id}
                    type="button"
                    className={
                      selectedId === place.id
                        ? "selected"
                        : ""
                    }
                    aria-pressed={selectedId === place.id}
                    aria-label={`Lihat ${place.name}`}
                    title={place.name}
                    onClick={() => {
                      selectDestination(place.id);

                      setFocusRequest({
                        coordinates: place.coordinates,
                        zoom: 11,
                        nonce: Date.now(),
                      });
                    }}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </article>
          </section>

          <footer className="page-footer">
            <span>
              <Icon name="compass" size={14} />
              Arena latihan · Kamera belakang & atas
            </span>

            <button
              type="button"
              onClick={() => setModal("help")}
            >
              Tentang prototipe
              <Icon name="external" size={12} />
            </button>
          </footer>
        </main>
      </div>

      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={18} />
          <span>{toast}</span>

          <button
            type="button"
            onClick={() => setToast("")}
            aria-label="Tutup pemberitahuan"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {modal === "party" && (
        <Modal
          wide
          title="Dengan siapa kita berangkat?"
          intro="Pilih dua karakter berbeda sebagai pengendara dan penumpang."
          onClose={() => setModal(null)}
        >
          <PartyPicker
            initial={party}
            onSave={saveParty}
          />
        </Modal>
      )}

      {modal==='itinerary'&&<Modal title="Rangkaian tujuan" onClose={()=>setModal(null)}><ItineraryPlanner journey={journey} selectedId={selected.id} onPlanned={message=>{setModal(null);setToast(message);}}/></Modal>}
      {modal==='backup'&&<Modal title="Cadangan progres" onClose={()=>setModal(null)}><BackupPanel journey={journey} party={party} start={START} onRestored={restoredProgress}/></Modal>}
      {modal==='profile'&&journey.locations.some(p=>p.id===profileId)&&<Modal title="Profil maqbarah" onClose={()=>setModal(null)}><PlaceProfile key={profileId} place={journey.locations.find(p=>p.id===profileId)} journey={journey} party={party}/></Modal>}
      {modal==='journal'&&<Modal title="Jurnal kunjungan" onClose={()=>setModal(null)}><JournalPanel journey={journey} onProfile={openProfile}/></Modal>}
      {modal==='locations'&&<Modal title="Lokasi ziarah tambahan" onClose={()=>setModal(null)}><CustomLocationsPanel journey={journey} onAdd={addLocation} onEdit={p=>{setLocationDraft(p);setModal('location-form');}} onProfile={openProfile}/></Modal>}
      {modal==='location-form'&&<Modal title={journey.customLocations.some(p=>p.id===locationDraft?.id)?'Edit maqbarah':'Tambah maqbarah'} onClose={()=>setModal(null)}><LocationForm initial={locationDraft} onSave={saveLocation} onCancel={()=>setModal(null)} onPickMap={draft=>{setLocationDraft(draft);setModal(null);setPlacing(true);}}/></Modal>}

      {modal === "help" && (
        <Modal
          title="Saatnya mencoba Vespa"
          intro="Simulator Ziarah Walisongo · Profil dan jurnal"
          onClose={() => setModal(null)}
        >
          <ol className="help-steps">
            <li>
              <strong>Pilih tepat dua karakter.</strong>
              <p>
                Karakter pertama menjadi pengendara.
                Karakter kedua menjadi penumpang.
                Gunakan Tukar posisi untuk menukar keduanya.
              </p>
            </li>

            <li>
              <strong>Masuk ke arena latihan.</strong>
              <p>
                Simpan pilihan, lalu tekan Mainkan arena
                latihan. Di HP, tahan tombol GAS sambil
                menekan panah kiri atau kanan. REM
                memperlambat Vespa dan MUNDUR membuatnya
                berjalan mundur.
              </p>
            </li>

            <li>
              <strong>Ganti kamera saat bermain.</strong>
              <p>
                Gunakan tombol Belakang dan Atas di kanan
                atas. Posisi dan kecepatan Vespa tetap sama
                ketika kamera berganti.
              </p>
            </li>

            <li>
              <strong>Jeda dan kembali ke menu.</strong>
              <p>
                Tekan tombol jeda di kiri atas. Pada
                komputer, gunakan WASD atau tombol panah,
                R untuk mundur, dan Esc untuk jeda.
              </p>
            </li>
          </ol>

          <p className="notice">
            Arena latihan memakai jalan fiktif dan model
            geometris sederhana. Simulator manual menuju maqbarah dibuka melalui panel tujuan. Profil, jurnal, lokasi tambahan, bahan bakar, serta kejadian perjalanan tersedia pada perjalanan rute. Susun beberapa tujuan melalui Rangkaian tujuan. Cadangan progres dapat diunduh dan dipulihkan melalui menu Cadangan. Saat berkendara, ikuti minimap dan petunjuk tikungan. Menu simulator menyediakan kualitas grafis, kemudi geser, sensitivitas, ukuran tombol, helm karakter, suara perjalanan dan layar penuh. Catat kunjungan melalui profil saat berada di dekat maqbarah. Lokasi tambahan dapat diisi melalui koordinat atau titik pada peta.
          </p>

          <p className="muted small">
            Kemajuan perjalanan manual dan kedatangan tersimpan di browser yang sama. Saat dimuat ulang perjalanan dijeda. Pilihan karakter dan kamera disimpan pada
            browser. Posisi dan jarak latihan kembali ke
            awal setelah keluar arena. Peta menu
            membutuhkan internet dan WebGL; arena latihan
            menggunakan Canvas.
          </p>

          <button
            type="button"
            className="button primary full-width"
            disabled={!loaded}
            onClick={startPractice}
          >
            {ready
              ? "Mainkan arena latihan"
              : "Pilih teman perjalanan"}

            <Icon name="arrow" size={18} />
          </button>
        </Modal>
      )}
    </div>
  );
}