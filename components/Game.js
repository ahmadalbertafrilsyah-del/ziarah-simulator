"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { ASSET, CHARACTERS } from "@/lib/catalog.mjs";
import { SEED_LOCATIONS } from "@/lib/locations.mjs";
import {
  isValidParty,
  parseParty,
  PARTY_STORAGE_KEY,
} from "@/lib/party.mjs";

import Icon from "./Icon";
import Modal from "./Modal";

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

const NO_VISITS = [];

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
  const [selectedId, setSelectedId] = useState("sunan-giri");
  const [toast, setToast] = useState("");
  const [focusRequest, setFocusRequest] = useState(null);

  const mapApi = useRef(null);

  const selected =
    SEED_LOCATIONS.find((place) => place.id === selectedId) ||
    START;

  const ready = isValidParty(party);

  useEffect(() => {
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
        "Klik Mainkan arena latihan untuk mencoba dua kamera."
    );
  }

  function startPractice() {
    if (!loaded) return;

    setToast("");
    setModal(ready ? "drive" : "party");
  }

  // Diletakkan setelah seluruh hook agar urutan hook tetap konsisten.
  // State pilihan karakter tetap dipertahankan saat kembali ke menu.
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
            disabled
            title="Jurnal tersedia pada tahap berikutnya"
            aria-label="Jurnal, tahap berikutnya"
          >
            <Icon name="book" size={22} />
            <span>Jurnal</span>
          </button>

          <button
            type="button"
            disabled
            title="Bekal tersedia pada tahap berikutnya"
            aria-label="Bekal, tahap berikutnya"
          >
            <Icon name="bag" size={22} />
            <span>Bekal</span>
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

        <span className="rail-version">V 0.2</span>
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
              DUA KAMERA
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
                  <small>Waktu awal perjalanan</small>
                  <strong>
                    09:00 <em>Hari ke-1</em>
                  </strong>
                </span>
              </div>

              <div className="wallet-stat">
                <span className="stat-icon">
                  <Icon name="wallet" size={21} />
                </span>

                <span>
                  <small>Bekal awal</small>
                  <strong>Rp450.000</strong>
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

              <div className="map-stage">
                <WorldMap
                  locations={SEED_LOCATIONS}
                  position={START.coordinates}
                  route={null}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onPick={() => {}}
                  placing={false}
                  apiRef={mapApi}
                  moving={false}
                  visits={NO_VISITS}
                  focusRequest={focusRequest}
                />

                <div className="map-caption">
                  <span className="status-dot" />
                  Titik awal · Sunan Ampel, Surabaya
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
                    {String(
                      SEED_LOCATIONS.indexOf(selected) + 1
                    ).padStart(2, "0")}
                    <small>/09</small>
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
                <h2>Berdua, lebih bermakna.</h2>
                <p>Satu Vespa, dua teman perjalanan.</p>
              </div>

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
                    <strong>Coba arena latihan</strong>
                    <small>
                      Gas, rem, belok, dan mundur
                    </small>
                  </div>
                </div>

                <div className="setup-step">
                  <span>03</span>
                  <div>
                    <strong>Pilih sudut kamera</strong>
                    <small>
                      Belakang atau atas, ganti saat bermain
                    </small>
                  </div>
                </div>
              </div>

              <div className="departure-panel">
                <button
                  type="button"
                  className="button primary departure-button"
                  disabled={!loaded}
                  onClick={startPractice}
                >
                  <Icon
                    name={ready ? "play" : "users"}
                    size={18}
                  />

                  {ready
                    ? "Mainkan arena latihan"
                    : "Pilih 2 karakter"}

                  <Icon name="arrow" size={18} />
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
                  Vespa & bekal awal
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
                      <span>Bahan bakar awal</span>
                      <strong>4,0 / 5,5 L</strong>
                    </div>

                    <progress
                      max="5.5"
                      value="4"
                      aria-label="Bahan bakar awal"
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
                      setSelectedId(place.id);

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

      {modal === "help" && (
        <Modal
          title="Saatnya mencoba Vespa"
          intro="Simulator Ziarah Walisongo · Dua kamera"
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
            geometris sederhana. Rute nyata pada peta
            Indonesia, penambahan maqbarah, jurnal, bahan
            bakar, serta kejadian perjalanan belum
            dihubungkan ke arena ini.
          </p>

          <p className="muted small">
            Pilihan karakter dan kamera disimpan pada
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