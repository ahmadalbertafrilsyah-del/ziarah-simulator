"use client";

import { useEffect, useRef, useState } from "react";
import { CHARACTERS, ASSET } from "@/lib/catalog.mjs";

import {
  advanceRide,
  createSceneRenderer,
  newRide,
  nearestPlace,
  serviceRide,
  helpRide,
  PRACTICE_PLACES,
} from "@/lib/driving-scene.mjs";

import Icon from "./Icon";
import "./driving.css";

const CAMERA_KEY = "ziarah-walisongo.camera.v1";

const EMPTY = {
  left: false,
  right: false,
  gas: false,
  brake: false,
  reverse: false,
};

const rupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

function time(value) {
  const hours = String(Math.floor(value / 60) % 24).padStart(2, "0");
  const minutes = String(Math.floor(value) % 60).padStart(2, "0");

  return `${hours}:${minutes}`;
}

const LESSONS = {
  spbu: {
    title: "Mengisi bensin dengan tertib",
    question:
      "Sebelum pengisian bensin dimulai, apa yang perlu dilakukan?",
    options: [
      "Mematikan mesin dan mengikuti petunjuk petugas.",
      "Membiarkan mesin tetap menyala.",
      "Menambah gas agar mesin tetap panas.",
    ],
    answer: 0,
    explanation:
      "Berhenti, matikan mesin, dan ikuti petunjuk petugas selama pengisian.",
    action: "Isi tangki sampai 5 liter",
  },

  bengkel: {
    title: "Kenali kendala kendaraan",
    question:
      "Ban terasa kempis saat berkendara. Apa tindakan yang tepat?",
    options: [
      "Menambah kecepatan supaya cepat sampai.",
      "Berhenti di tempat aman dan meminta bantuan.",
      "Mengabaikannya selama mesin masih menyala.",
    ],
    answer: 1,
    explanation:
      "Ban yang bermasalah perlu diperiksa. Berhenti di tempat aman dan minta bantuan; jangan memaksakan perjalanan.",
    action: "Periksa dan perbaiki ban",
  },

  hotel: {
    title: "Istirahat bagian dari perjalanan",
    question:
      "Ketika mulai mengantuk dalam perjalanan, apa yang sebaiknya dilakukan?",
    options: [
      "Memaksakan diri agar cepat sampai.",
      "Mempercepat kendaraan.",
      "Berhenti di tempat singgah dan beristirahat.",
    ],
    answer: 2,
    explanation:
      "Istirahat membantu memulihkan energi. Dalam game, tidur 6 jam memulihkan energi kedua karakter.",
    action: "Istirahat 6 jam",
  },

  masjid: {
    title: "Singgah dengan tertib",
    question:
      "Sebelum menggunakan fasilitas singgah di masjid, apa yang perlu diperhatikan?",
    options: [
      "Izin pengelola, kebersihan, dan kenyamanan jamaah.",
      "Menggunakan semua ruang tanpa bertanya.",
      "Meninggalkan barang di jalur masuk.",
    ],
    answer: 0,
    explanation:
      "Ikuti ketentuan pengelola dan jaga kebersihan. Masjid latihan ini menyediakan fasilitas singgah dalam game.",
    action: "Istirahat di fasilitas singgah",
  },

  maqbarah: {
    title: "Menjaga adab saat berziarah",
    question:
      "Perilaku apa yang tepat saat berada di kawasan maqbarah?",
    options: [
      "Membuang sampah di sekitar makam.",
      "Menjaga ketenangan, kebersihan, dan mengikuti aturan setempat.",
      "Mengganggu pengunjung lain.",
    ],
    answer: 1,
    explanation:
      "Bersikap sopan, jaga kebersihan, dan hormati aturan serta pengunjung lain.",
    action: "Catat kunjungan latihan",
  },
};

function snapshot(state) {
  return {
    ...state,
    lessons: [...state.lessons],
    logs: [...state.logs],
    triggered: { ...state.triggered },
  };
}

export default function DrivingScene({ party, onExit }) {
  const canvas = useRef(null);
  const ride = useRef(newRide());
  const input = useRef({ ...EMPTY });
  const cameraRef = useRef("behind");
  const pausedRef = useRef(false);

  const [camera, setCamera] = useState("behind");
  const [panel, setPanel] = useState(null);
  const [stats, setStats] = useState(() => snapshot(newRide()));

  const [error, setError] = useState("");
  const [placeId, setPlaceId] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [done, setDone] = useState(false);

  const nearby = nearestPlace(stats);
  const canVisit = nearby.distance <= nearby.radius;

  const place = PRACTICE_PLACES.find((item) => item.id === placeId);
  const lesson = place ? LESSONS[place.type] : null;

  function sync() {
    setStats(snapshot(ride.current));
  }

  function openPanel(name) {
    pausedRef.current = true;
    ride.current.speed = 0;
    input.current = { ...EMPTY };

    setPanel(name);
    sync();
  }

  function resume() {
    input.current = { ...EMPTY };
    pausedRef.current = false;
    setPanel(null);
  }

  function changeCamera(value) {
    cameraRef.current = value;
    setCamera(value);

    try {
      localStorage.setItem(CAMERA_KEY, value);
    } catch {
      // Kamera tetap dapat digunakan tanpa penyimpanan browser.
    }
  }

  function openPlace(id) {
    const target = PRACTICE_PLACES.find((item) => item.id === id);

    if (!target) return;

    const distance = Math.hypot(
      ride.current.x - target.x,
      ride.current.z - target.z
    );

    if (distance > target.radius) return;

    setPlaceId(id);
    setAnswer(null);
    setFeedback("");
    setDone(false);

    openPanel("place");
  }

  function chooseAnswer(index) {
    if (!lesson) return;

    setAnswer(index);

    if (index === lesson.answer) {
      setFeedback(lesson.explanation);
    } else {
      setFeedback(
        "Belum tepat. Pertimbangkan keselamatan dan kenyamanan orang lain, lalu coba lagi."
      );
    }
  }

  function completeLesson() {
    if (!lesson || !place) return;
    if (answer !== lesson.answer || done) return;

    const result = serviceRide(ride.current, place.id);

    setFeedback(result.message);

    if (result.ok) {
      setDone(true);
    }

    sync();
  }

  function assistance() {
    helpRide(ride.current);
    sync();

    setFeedback(
      "Bantuan latihan tiba. Energi, ban, dan bahan bakar dipulihkan. Bekal tersedia minimal Rp75.000 agar pembelajaran dapat diteruskan."
    );

    setPanel("pause");
  }

  function tow() {
    const state = ride.current;

    state.x = 155 * Math.cos(-0.15);
    state.z = 225 * Math.sin(-0.15);
    state.heading = 0.15;
    state.speed = 0;
    state.clock += 30;

    state.logs.unshift(
      "Bantuan mengantar Vespa ke area bengkel."
    );

    openPlace("bengkel");
  }

  useEffect(() => {
    try {
      const savedCamera = localStorage.getItem(CAMERA_KEY);

      if (["behind", "front", "left", "right", "top"].includes(savedCamera)) {
        cameraRef.current = savedCamera;
        // Browser storage is restored once after mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCamera(savedCamera);
      }
    } catch {
      // Penyimpanan tidak wajib untuk menjalankan arena.
    }

    const element = canvas.current;
    let render;

    try {
      render = createSceneRenderer(element);
    } catch (caughtError) {
      // Report Canvas initialization failures from the browser effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(caughtError.message);
      return;
    }

    const oldOverflow = document.body.style.overflow;
    // Browser layout is synchronized inside this mount effect.
    // eslint-disable-next-line react-hooks/immutability
    document.body.style.overflow = "hidden";

    function resize() {
      const rect = element.getBoundingClientRect();
      const dpr = Math.min(2.5, Math.max(1.5, window.devicePixelRatio || 1), 3840 / Math.max(1, rect.width), 2160 / Math.max(1, rect.height));

      element.width = Math.max(
        1,
        Math.round(rect.width * dpr)
      );

      element.height = Math.max(
        1,
        Math.round(rect.height * dpr)
      );
    }

    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();

    const keyMap = {
      ArrowLeft: "left",
      a: "left",
      A: "left",

      ArrowRight: "right",
      d: "right",
      D: "right",

      ArrowUp: "gas",
      w: "gas",
      W: "gas",

      ArrowDown: "brake",
      s: "brake",
      S: "brake",

      r: "reverse",
      R: "reverse",

      " ": "brake",
    };

    function handleKey(event) {
      const targetIsControl =
        event.target instanceof HTMLElement &&
        event.target.closest(
          "button,input,textarea,select"
        );

      if (
        targetIsControl &&
        [" ", "Enter"].includes(event.key)
      ) {
        return;
      }

      const action = keyMap[event.key];

      if (action) {
        event.preventDefault();

        if (!pausedRef.current) {
          input.current[action] =
            event.type === "keydown";
        }
      }

      if (
        event.type === "keydown" &&
        !event.repeat &&
        event.key === "Escape"
      ) {
        event.preventDefault();

        if (!pausedRef.current) {
          pausedRef.current = true;
          ride.current.speed = 0;
          input.current = { ...EMPTY };
          setPanel("pause");
        }
      }
    }

    function handleBlur() {
      input.current = { ...EMPTY };

      if (!pausedRef.current) {
        pausedRef.current = true;
        ride.current.speed = 0;
        setPanel("pause");
      }
    }

    function handleVisibility() {
      if (document.hidden) {
        handleBlur();
      }
    }

    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKey);
    window.addEventListener("blur", handleBlur);

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    let frame;
    // Frame timing is initialized inside the animation effect.
    // eslint-disable-next-line react-hooks/purity
    let last = performance.now();
    let lastUi = 0;
    let lastDraw = 0;
    let active = true;
    let observedTyre = false;

    function loop(now) {
      if (!active) return;

      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (!pausedRef.current) {
        advanceRide(
          ride.current,
          input.current,
          dt
        );
      }

      if (
        ride.current.event === "tyre" &&
        !observedTyre
      ) {
        observedTyre = true;
        pausedRef.current = true;
        input.current = { ...EMPTY };
        ride.current.speed = 0;

        setPanel("incident");
      }

      if (now - lastDraw > 1000 / 30) {
        try {
          render(
            ride.current,
            cameraRef.current,
            party
          );
        } catch {
          setError(
            "Tampilan arena tidak dapat dirender. Kembali ke menu lalu coba lagi."
          );

          active = false;
          return;
        }

        lastDraw = now;
      }

      if (now - lastUi > 200) {
        setStats(snapshot(ride.current));
        lastUi = now;
      }

      frame = requestAnimationFrame(loop);
    }

    frame = requestAnimationFrame(loop);

    return () => {
      active = false;

      cancelAnimationFrame(frame);
      observer.disconnect();

      document.body.style.overflow = oldOverflow;

      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKey);
      window.removeEventListener("blur", handleBlur);

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [party]);

  function control(action) {
    return {
      onPointerDown(event) {
        event.preventDefault();

        event.currentTarget.setPointerCapture(
          event.pointerId
        );

        if (!pausedRef.current) {
          input.current[action] = true;
        }
      },

      onPointerUp() {
        input.current[action] = false;
      },

      onPointerCancel() {
        input.current[action] = false;
      },

      onLostPointerCapture() {
        input.current[action] = false;
      },

      onContextMenu(event) {
        event.preventDefault();
      },
    };
  }

  let serviceCost = 0;

  if (place?.type === "spbu") {
    serviceCost = Math.ceil(
      (5 - stats.fuel) * 12000
    );
  } else if (place?.type === "bengkel") {
    serviceCost = 20000;
  } else if (place?.type === "hotel") {
    serviceCost = 40000;
  }

  const needsHelp =
    stats.fuel <= 0 ||
    stats.energy <= 0 ||
    stats.event === "tyre";

  let hint =
    "Jelajahi kawasan dan kumpulkan lima pelajaran.";

  if (stats.event === "tyre") {
    hint = "Ban bocor. Minta bantuan ke bengkel.";
  } else if (stats.fuel <= 0) {
    hint =
      "Bensin habis. Gunakan bantuan gratis pada menu Jeda.";
  } else if (stats.energy <= 0) {
    hint =
      "Energi habis. Gunakan bantuan singgah pada menu Jeda.";
  } else if (stats.fuel < 0.5) {
    hint =
      "Bensin menipis. Cari POM Pelangi di denah.";
  } else if (stats.offroad) {
    hint =
      "Di luar jalan · kecepatan dibatasi";
  }

  return (
    <section
      className="driving-screen"
      role="region"
      aria-label="Kawasan belajar berkendara"
    >
      <canvas
        ref={canvas}
        className="driving-canvas"
        aria-label="Arena kartun tiga dimensi sederhana"
      />

      <header className="driving-header">
        <button
          className="drive-icon"
          onClick={() => openPanel("pause")}
          aria-label="Jeda permainan"
        >
          <Icon name="pause" />
        </button>

        <div className="drive-title">
          <strong>Kampung Persinggahan</strong>
          <span>ARENA BELAJAR FIKTIF</span>
        </div>

        <div
          className="camera-switch"
          role="group"
          aria-label="Pilih model kamera"
        >
          {[["behind","Belakang"],["front","Depan"],["left","Kiri"],["right","Kanan"],["top","Atas"]].map(([value,label])=>(
            <button key={value} type="button" aria-pressed={camera===value} onClick={()=>changeCamera(value)}>{label}</button>
          ))}
        </div>
      </header>

      <div className="drive-resources">
        <span
          className={stats.fuel < 0.5 ? "low" : ""}
        >
          <Icon name="fuel" size={15} />
          {stats.fuel.toFixed(1)} L
        </span>

        <span
          className={stats.energy < 20 ? "low" : ""}
        >
          <Icon name="heart" size={15} />
          {Math.round(stats.energy)}%
        </span>

        <span>
          <Icon name="clock" size={15} />
          {time(stats.clock)}
        </span>

        <span>{rupiah(stats.money)}</span>
      </div>

      <button
        className="learning-progress"
        onClick={() => openPanel("lessons")}
      >
        <Icon name="book" size={17} />

        <span>
          <strong>
            {stats.lessons.length}/5 pelajaran
          </strong>

          <small>
            {stats.lessons.length === 5
              ? "Semua tempat sudah dipelajari!"
              : "Singgah, belajar, lalu lanjutkan."}
          </small>
        </span>

        <Icon name="chevron" size={17} />
      </button>

      <div className="drive-minimap">
        <svg
          viewBox="-260 -320 520 640"
          role="img"
          aria-label="Denah arena latihan"
        >
          <rect
            x="-260"
            y="-320"
            width="520"
            height="640"
            rx="40"
            fill="#e9efc9"
          />

          <ellipse
            rx="155"
            ry="225"
            fill="none"
            stroke="#a4ad8e"
            strokeWidth="24"
          />

          {PRACTICE_PLACES.map((item, index) => (
            <g key={item.id}>
              <circle
                cx={item.x}
                cy={item.z}
                r="22"
                fill={
                  stats.lessons.includes(item.id)
                    ? "#5a9c71"
                    : "#e8ab6c"
                }
              />

              <text
                x={item.x}
                y={item.z + 9}
                textAnchor="middle"
                fontSize="27"
                fill="white"
                fontFamily="Arial"
              >
                {index + 1}
              </text>
            </g>
          ))}

          <g
            transform={
              `translate(${stats.x} ${stats.z}) ` +
              `rotate(${
                (-stats.heading * 180) / Math.PI
              })`
            }
          >
            <polygon
              points="0,19 -12,-12 12,-12"
              fill="#31564a"
              stroke="#fffce8"
              strokeWidth="4"
            />
          </g>
        </svg>

        <span>DENAH LATIHAN</span>
      </div>

      <div className="drive-hint" role="status">
        {hint}
      </div>

      {canVisit && !panel && (
        <button
          className="visit-prompt"
          onClick={() => openPlace(nearby.id)}
        >
          <img
            src={`${ASSET}/buildings/${nearby.image}`}
            alt=""
          />

          <span>
            <small>ANDA BERADA DI AREA</small>
            <strong>{nearby.name}</strong>
            <em>Singgah & belajar</em>
          </span>

          <Icon name="arrow" size={22} />
        </button>
      )}

      {needsHelp && !panel && (
        <button
          className="help-prompt"
          onClick={() =>
            stats.event === "tyre"
              ? openPanel("incident")
              : openPanel("pause")
          }
        >
          Butuh bantuan? Ketuk di sini
        </button>
      )}

      <div className="drive-speed">
        <strong>
          {Math.round(Math.abs(stats.speed) * 3.6)}
          <small>km/jam</small>
        </strong>

        <span>
          {Math.round(stats.distance)} m ditempuh
        </span>
      </div>

      <div className="touch-steering">
        <button
          {...control("left")}
          aria-label="Belok kiri"
        >
          ←
        </button>

        <button
          {...control("right")}
          aria-label="Belok kanan"
        >
          →
        </button>
      </div>

      <div className="touch-pedals">
        <button
          className="reverse"
          {...control("reverse")}
        >
          MUNDUR
        </button>

        <button
          className="brake"
          {...control("brake")}
        >
          REM
        </button>

        <button
          className="gas"
          {...control("gas")}
        >
          GAS
          <Icon name="up" size={25} />
        </button>
      </div>

      <span className="keyboard-hint">
        WASD / panah · R mundur · Esc jeda · semua
        tarif dan konsumsi merupakan simulasi
      </span>

      {(panel || error) && (
        <div className="drive-pause">
          <div
            className="learning-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={
              place && panel === "place"
                ? place.name
                : "Menu permainan"
            }
          >
            {error ? (
              <>
                <Icon name="info" size={35} />
                <h2>Arena belum tersedia</h2>
                <p>{error}</p>

                <button
                  className="button primary full-width"
                  onClick={onExit}
                >
                  Kembali ke menu
                </button>
              </>
            ) : panel === "place" && place ? (
              <>
                <div className="lesson-place">
                  <img
                    src={`${ASSET}/buildings/${place.image}`}
                    alt={place.name}
                  />

                  <div>
                    <span>
                      PERSINGGAHAN BELAJAR
                    </span>
                    <h2>{place.name}</h2>
                    <p>{lesson.title}</p>
                  </div>
                </div>

                <p className="lesson-question">
                  {lesson.question}
                </p>

                <div className="lesson-options">
                  {lesson.options.map(
                    (option, index) => (
                      <button
                        key={option}
                        disabled={done}
                        className={
                          answer === index
                            ? index === lesson.answer
                              ? "correct"
                              : "incorrect"
                            : ""
                        }
                        onClick={() =>
                          chooseAnswer(index)
                        }
                      >
                        <span>
                          {String.fromCharCode(
                            65 + index
                          )}
                        </span>

                        {option}
                      </button>
                    )
                  )}
                </div>

                {feedback && (
                  <p
                    className="lesson-feedback"
                    role="status"
                  >
                    {feedback}
                  </p>
                )}

                {!done && (
                  <button
                    className="button primary full-width"
                    disabled={
                      answer !== lesson.answer
                    }
                    onClick={completeLesson}
                  >
                    {lesson.action}
                    {" · "}
                    {serviceCost
                      ? rupiah(serviceCost)
                      : "Gratis"}
                  </button>
                )}

                <button
                  className="button secondary full-width"
                  onClick={resume}
                >
                  {done
                    ? "Selesai, lanjutkan perjalanan"
                    : "Kembali ke arena"}
                </button>

                <small>
                  Fasilitas, tarif, waktu, dan
                  konsumsi merupakan simulasi
                  belajar.
                </small>
              </>
            ) : panel === "incident" ? (
              <>
                <img
                  className="incident-picture"
                  src={`${ASSET}/items/ban_cadangan.png`}
                  alt="Ban cadangan"
                />

                <h2>Ban Vespa bocor.</h2>

                <p>
                  Vespa sudah berhenti. Jangan
                  memaksakan perjalanan. Bengkel
                  Sahabat berada di dekat sini;
                  minta bantuan agar kendaraan
                  dibawa ke sana.
                </p>

                <button
                  className="button primary full-width"
                  onClick={tow}
                >
                  Minta bantuan ke bengkel
                </button>

                <button
                  className="button secondary full-width"
                  onClick={resume}
                >
                  Lihat posisi di arena
                </button>

                <small>
                  Pengantaran ini gratis dalam
                  latihan. Di bengkel, pelajari
                  tindakan yang tepat sebelum
                  melakukan perbaikan.
                </small>
              </>
            ) : panel === "lessons" ? (
              <>
                <Icon name="book" size={32} />
                <h2>Paspor belajar</h2>

                <p>
                  Singgahi lima tempat. Jawab
                  pertanyaannya, lalu gunakan
                  fasilitas untuk mencatat
                  pelajaran.
                </p>

                <div className="lesson-list">
                  {PRACTICE_PLACES.map(
                    (item, index) => (
                      <div key={item.id}>
                        <span>
                          {stats.lessons.includes(
                            item.id
                          )
                            ? "✓"
                            : index + 1}
                        </span>

                        <div>
                          <strong>
                            {item.name}
                          </strong>

                          <small>
                            {
                              LESSONS[item.type]
                                .title
                            }
                          </small>
                        </div>

                        <em>
                          {stats.lessons.includes(
                            item.id
                          )
                            ? "Selesai"
                            : `${Math.round(
                                Math.hypot(
                                  stats.x - item.x,
                                  stats.z - item.z
                                )
                              )} m`}
                        </em>
                      </div>
                    )
                  )}
                </div>

                <button
                  className="button primary full-width"
                  onClick={resume}
                >
                  Kembali menjelajah
                </button>
              </>
            ) : (
              <>
                <Icon name="compass" size={35} />
                <h2>Singgah sejenak.</h2>

                <p>
                  {feedback ||
                    "Belajar merawat kendaraan, mengatur bekal, dan menjaga adab di setiap persinggahan."}
                </p>

                <div className="pause-party">
                  {party.map((id) => {
                    const character =
                      CHARACTERS.find(
                        (item) => item.id === id
                      );

                    if (!character) return null;

                    return (
                      <span key={id}>
                        <img
                          src={`${ASSET}/characters/${character.image}`}
                          alt=""
                        />
                        {character.name}
                      </span>
                    );
                  })}
                </div>

                <button
                  className="button primary full-width"
                  onClick={resume}
                >
                  Lanjutkan bermain
                </button>

                <button
                  className="button secondary full-width"
                  onClick={() =>
                    setPanel("lessons")
                  }
                >
                  Lihat paspor belajar
                </button>

                <button
                  className="button secondary full-width"
                  onClick={assistance}
                >
                  Bantuan latihan gratis
                </button>

                <button
                  className="button secondary full-width"
                  onClick={onExit}
                >
                  Kembali ke menu utama
                </button>

                <small>
                  Arena fiktif untuk belajar, bukan
                  peta jalan nyata. Progres arena
                  kembali ke awal setelah keluar.
                  Pilihan karakter dan kamera
                  tetap tersimpan.
                </small>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}