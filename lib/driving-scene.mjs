// Arena kartun fiktif untuk latihan.
// Bukan geometri jalan Indonesia.

const TAU = Math.PI * 2;

const RX = 155;
const RZ = 225;

function norm(vector) {
  const length = Math.hypot(...vector) || 1;

  return vector.map((value) => value / length);
}

function sub(a, b) {
  return a.map((value, index) => value - b[index]);
}

function dot(a, b) {
  return a.reduce(
    (total, value, index) => total + value * b[index],
    0
  );
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function track(angle) {
  return [
    RX * Math.cos(angle),
    RZ * Math.sin(angle),
  ];
}

function shade(hex, factor) {
  const channels = hex.slice(1).match(/../g);

  return (
    "#" +
    channels
      .map((value) => {
        const adjusted = Math.max(
          0,
          Math.min(
            255,
            Math.round(parseInt(value, 16) * factor)
          )
        );

        return adjusted.toString(16).padStart(2, "0");
      })
      .join("")
  );
}

export const PRACTICE_PLACES = [
  {
    id: "pom",
    name: "POM Pelangi",
    type: "spbu",
    x: 65,
    z: -175,
    w: 19,
    d: 14,
    h: 6,
    color: "#ffe2a8",
    roof: "#ea8870",
    image: "pom_bensin.png",
    icon: "fuel",
    radius: 42,
    roadT: -1.05,
  },

  {
    id: "bengkel",
    name: "Bengkel Sahabat",
    type: "bengkel",
    x: 131,
    z: -34,
    w: 19,
    d: 16,
    h: 7,
    color: "#bce0e7",
    roof: "#5f9fba",
    image: "bengkel.png",
    icon: "wrench",
    radius: 43,
    roadT: -0.15,
  },

  {
    id: "hotel",
    name: "Penginapan Teduh",
    type: "hotel",
    x: 88,
    z: 143,
    w: 20,
    d: 17,
    h: 14,
    color: "#f6d4b0",
    roof: "#bc8dba",
    image: "hotel.png",
    icon: "bed",
    radius: 43,
    roadT: 0.8,
  },

  {
    id: "masjid",
    name: "Masjid Taman",
    type: "masjid",
    x: -84,
    z: 147,
    w: 24,
    d: 23,
    h: 10,
    color: "#fff1cc",
    roof: "#66b9a1",
    image: "masjid.png",
    icon: "moon",
    radius: 45,
    roadT: 2.3,
  },

  {
    id: "maqbarah",
    name: "Maqbarah Latihan",
    type: "maqbarah",
    x: -117,
    z: -86,
    w: 19,
    d: 18,
    h: 6,
    color: "#e6dfbb",
    roof: "#9db577",
    image: "maqbarah.png",
    icon: "landmark",
    radius: 43,
    roadT: 3.6,
  },
];

export function newRide() {
  return {
    x: 0,
    z: -225,
    heading: Math.PI / 2,

    speed: 0,
    distance: 0,
    offroad: false,

    fuel: 3,
    tyre: 100,
    energy: 100,

    clock: 540,
    money: 250000,

    event: null,
    triggered: {},

    lessons: [],
    logs: [],
  };
}

export function nearestPlace(state) {
  return PRACTICE_PLACES.map((place) => ({
    ...place,
    distance: Math.hypot(
      state.x - place.x,
      state.z - place.z
    ),
  })).sort((a, b) => a.distance - b.distance)[0];
}

export function advanceRide(state, input, deltaTime) {
  const dt = Math.max(
    0,
    Math.min(deltaTime, 0.05)
  );

  const radius = Math.hypot(
    state.x / RX,
    state.z / RZ
  );

  const onDriveway = PRACTICE_PLACES.some(
    (place) =>
      Math.hypot(
        state.x - place.x,
        state.z - place.z
      ) < 36
  );

  state.offroad =
    Math.abs(radius - 1) * RX > 9 &&
    !onDriveway;

  let maximum = state.offroad ? 7 : 20;

  if (state.event === "tyre") {
    maximum = 0;
  }

  if (state.fuel <= 0 || state.energy <= 0) {
    maximum = 0;
  }

  if (input.brake) {
    state.speed =
      Math.sign(state.speed) *
      Math.max(
        0,
        Math.abs(state.speed) - 25 * dt
      );
  } else if (input.reverse) {
    state.speed = Math.max(
      -Math.min(3, maximum),
      state.speed - 8 * dt
    );
  } else if (input.gas) {
    state.speed = Math.min(
      maximum,
      state.speed + 7 * dt
    );
  } else {
    state.speed =
      Math.sign(state.speed) *
      Math.max(
        0,
        Math.abs(state.speed) - 2.7 * dt
      );
  }

  if (Math.abs(state.speed) > maximum) {
    state.speed =
      Math.sign(state.speed) *
      Math.max(
        maximum,
        Math.abs(state.speed) - 16 * dt
      );
  }

  const steering =
    (input.right ? 1 : 0) -
    (input.left ? 1 : 0);

  state.heading +=
    steering *
    Math.max(
      -1,
      Math.min(1, state.speed / 6)
    ) *
    1.15 *
    dt;

  const nextX =
    state.x +
    Math.sin(state.heading) * state.speed * dt;

  const nextZ =
    state.z +
    Math.cos(state.heading) * state.speed * dt;

  const outsideArena =
    Math.abs(nextX) > 247 ||
    Math.abs(nextZ) > 297;

  const hitsBuilding = PRACTICE_PLACES.some(
    (building) =>
      Math.abs(nextX - building.x) <
        building.w / 2 + 0.8 &&
      Math.abs(nextZ - building.z) <
        building.d / 2 + 0.8
  );

  if (outsideArena || hitsBuilding) {
    state.speed = 0;
  } else {
    const moved = Math.hypot(
      nextX - state.x,
      nextZ - state.z
    );

    state.x = nextX;
    state.z = nextZ;
    state.distance += moved;

    // Nilai sengaja dipercepat untuk pembelajaran.
    // Bukan konsumsi bahan bakar kendaraan nyata.
    state.fuel = Math.max(
      0,
      state.fuel - moved / 900
    );

    state.energy = Math.max(
      0,
      state.energy - moved / 22
    );

    state.clock += moved / 9;
  }

  const pom = PRACTICE_PLACES[0];
  const workshop = PRACTICE_PLACES[1];

  const nearPom =
    Math.hypot(
      state.x - pom.x,
      state.z - pom.z
    ) < 75;

  if (
    !state.triggered.fuel &&
    state.distance > 30 &&
    nearPom
  ) {
    state.triggered.fuel = true;
    state.fuel = Math.min(state.fuel, 0.35);

    state.logs.unshift(
      "Latihan: bensin menipis di dekat POM."
    );
  }

  const nearWorkshop =
    Math.hypot(
      state.x - workshop.x,
      state.z - workshop.z
    ) < 78;

  if (
    !state.triggered.tyre &&
    state.distance > 180 &&
    nearWorkshop
  ) {
    state.triggered.tyre = true;
    state.tyre = 20;
    state.event = "tyre";
    state.speed = 0;

    state.logs.unshift(
      "Latihan: ban bocor di dekat bengkel. Berhenti dan pilih bantuan."
    );
  }

  state.logs = state.logs.slice(0, 20);
}

export function serviceRide(state, id) {
  const place = PRACTICE_PLACES.find(
    (item) => item.id === id
  );

  if (!place) {
    return {
      ok: false,
      message: "Fasilitas tidak ditemukan.",
    };
  }

  const distance = Math.hypot(
    state.x - place.x,
    state.z - place.z
  );

  if (
    distance > place.radius ||
    Math.abs(state.speed) > 0.2
  ) {
    return {
      ok: false,
      message:
        "Berhenti di area fasilitas terlebih dahulu.",
    };
  }

  const costs = {
    spbu: Math.ceil(
      (5 - state.fuel) * 12000
    ),
    bengkel: 20000,
    hotel: 40000,
    masjid: 0,
    maqbarah: 0,
  };

  const cost = costs[place.type];

  if (state.money < cost) {
    return {
      ok: false,
      message:
        "Bekal belum cukup. Gunakan bantuan gratis melalui menu Jeda agar latihan dapat diteruskan.",
    };
  }

  state.money -= cost;

  if (place.type === "spbu") {
    state.fuel = 5;
  }

  if (place.type === "bengkel") {
    state.tyre = 100;
    state.event = null;
  }

  if (
    place.type === "hotel" ||
    place.type === "masjid"
  ) {
    state.energy = 100;
    state.clock += 360;
  }

  if (!state.lessons.includes(id)) {
    state.lessons.push(id);
  }

  let message;

  if (place.type === "spbu") {
    message =
      "Tangki terisi. Pelajaran pengisian bensin selesai.";
  } else if (place.type === "bengkel") {
    message =
      "Ban diperbaiki. Pelajaran keselamatan selesai.";
  } else if (
    place.type === "hotel" ||
    place.type === "masjid"
  ) {
    message =
      "Energi pulih setelah istirahat 6 jam.";
  } else {
    message =
      "Kunjungan latihan tercatat. Terima kasih sudah menjaga adab.";
  }

  state.logs.unshift(message);

  return {
    ok: true,
    message,
  };
}

export function helpRide(state) {
  state.speed = 0;

  state.fuel = Math.max(2, state.fuel);
  state.tyre = 100;
  state.event = null;

  state.energy = Math.max(
    70,
    state.energy
  );

  state.money = Math.max(
    75000,
    state.money
  );

  state.clock += 30;

  state.logs.unshift(
    "Bantuan latihan gratis tiba. Perjalanan dapat dilanjutkan."
  );
}

function makeWorld() {
  const faces = [];

  function face(points, color) {
    faces.push({
      points,
      color,
    });
  }

  function box(
    x,
    y,
    z,
    width,
    height,
    depth,
    color,
    top = shade(color, 1.08)
  ) {
    const a = [
      x - width / 2,
      y,
      z - depth / 2,
    ];

    const b = [
      x + width / 2,
      y,
      z - depth / 2,
    ];

    const c = [
      x + width / 2,
      y,
      z + depth / 2,
    ];

    const d = [
      x - width / 2,
      y,
      z + depth / 2,
    ];

    const lift = (point) => [
      point[0],
      point[1] + height,
      point[2],
    ];

    face(
      [a, b, lift(b), lift(a)],
      shade(color, 0.91)
    );

    face(
      [b, c, lift(c), lift(b)],
      color
    );

    face(
      [c, d, lift(d), lift(c)],
      shade(color, 0.84)
    );

    face(
      [d, a, lift(a), lift(d)],
      color
    );

    face(
      [lift(a), lift(b), lift(c), lift(d)],
      top
    );
  }

  function cone(
    x,
    y,
    z,
    radius,
    height,
    color,
    segments = 8
  ) {
    for (
      let index = 0;
      index < segments;
      index++
    ) {
      const angleA =
        (index * TAU) / segments;

      const angleB =
        ((index + 1) * TAU) / segments;

      face(
        [
          [
            x + radius * Math.cos(angleA),
            y,
            z + radius * Math.sin(angleA),
          ],
          [
            x + radius * Math.cos(angleB),
            y,
            z + radius * Math.sin(angleB),
          ],
          [x, y + height, z],
        ],
        shade(
          color,
          0.85 + (0.22 * (index % 3)) / 2
        )
      );
    }
  }

  function road(a, b, width, y, color) {
    const normal = norm([
      -(b[1] - a[1]),
      b[0] - a[0],
    ]);

    face(
      [
        [
          a[0] + normal[0] * width,
          y,
          a[1] + normal[1] * width,
        ],
        [
          b[0] + normal[0] * width,
          y,
          b[1] + normal[1] * width,
        ],
        [
          b[0] - normal[0] * width,
          y,
          b[1] - normal[1] * width,
        ],
        [
          a[0] - normal[0] * width,
          y,
          a[1] - normal[1] * width,
        ],
      ],
      color
    );
  }

  // Permukaan kawasan.
  for (let x = -280; x < 280; x += 40) {
    for (let z = -320; z < 320; z += 40) {
      face(
        [
          [x, 0, z],
          [x + 40, 0, z],
          [x + 40, 0, z + 40],
          [x, 0, z + 40],
        ],
        ((x + z) / 40) % 2
          ? "#a6cb80"
          : "#afd28a"
      );
    }
  }

  // Jalan utama melingkar.
  for (let index = 0; index < 150; index++) {
    const a = track(
      (index / 150) * TAU
    );

    const b = track(
      ((index + 1) / 150) * TAU
    );

    road(
      a,
      b,
      10,
      0.025,
      "#efe2b5"
    );

    road(
      a,
      b,
      8,
      0.05,
      "#7a8581"
    );

    if (index % 3 === 0) {
      road(
        a,
        b,
        0.2,
        0.07,
        "#fff3c9"
      );
    }
  }

  // Bangunan fasilitas.
  for (const building of PRACTICE_PLACES) {
    road(
      track(building.roadT),
      [building.x, building.z],
      4,
      0.04,
      "#ddd4af"
    );

    box(
      building.x,
      0.08,
      building.z,
      building.w + 7,
      0.12,
      building.d + 8,
      "#eae1bd"
    );

    box(
      building.x,
      0.2,
      building.z,
      building.w,
      building.h,
      building.d,
      building.color
    );

    box(
      building.x,
      building.h + 0.2,
      building.z,
      building.w + 2,
      0.8,
      building.d + 2,
      building.roof
    );

    const windowRows =
      building.type === "hotel" ? 3 : 1;

    for (
      let row = 0;
      row < windowRows;
      row++
    ) {
      for (
        let column = -2;
        column <= 2;
        column++
      ) {
        box(
          building.x + column * 3.2,
          2 + row * 3.5,
          building.z -
            building.d / 2 -
            0.05,
          1.6,
          2,
          0.12,
          "#82b6bb",
          "#a9d8d5"
        );
      }
    }

    box(
      building.x,
      0.2,
      building.z -
        building.d / 2 -
        0.15,
      2.5,
      3,
      0.2,
      "#aa8060"
    );

    if (building.type === "masjid") {
      cone(
        building.x,
        building.h + 1,
        building.z,
        8,
        6,
        "#58b59e",
        12
      );

      box(
        building.x - 16,
        0,
        building.z,
        3,
        17,
        3,
        "#fff0c5"
      );

      cone(
        building.x - 16,
        17,
        building.z,
        2.7,
        4,
        "#58b59e"
      );
    } else if (building.type === "spbu") {
      box(
        building.x,
        5,
        building.z - 11,
        19,
        0.7,
        9,
        "#e77968"
      );

      for (const offset of [-6, 6]) {
        box(
          building.x + offset,
          0,
          building.z - 11,
          0.5,
          5,
          0.5,
          "#f8e8c5"
        );

        box(
          building.x + offset,
          0.2,
          building.z - 11,
          1.6,
          2,
          1.2,
          "#e88670"
        );

        box(
          building.x + offset,
          1.4,
          building.z - 11 - 0.65,
          1,
          0.6,
          0.1,
          "#537e81"
        );
      }
    } else if (
      building.type === "maqbarah"
    ) {
      cone(
        building.x,
        building.h + 1,
        building.z,
        13,
        6,
        building.roof,
        4
      );

      for (const offset of [-4, 4]) {
        box(
          building.x + offset,
          0.2,
          building.z - 4,
          1.3,
          1,
          3,
          "#e8e2cd"
        );
      }
    } else if (
      building.type === "bengkel"
    ) {
      box(
        building.x,
        0,
        building.z -
          building.d / 2 -
          0.1,
        9,
        4.5,
        0.2,
        "#4c6d71"
      );
    }
  }

  // Pepohonan.
  for (let index = 0; index < 100; index++) {
    const angle = index * 2.39996;
    const radius = index % 3 ? 1.23 : 0.55;

    const x =
      RX * Math.cos(angle) * radius;

    const z =
      RZ * Math.sin(angle) * radius;

    const nearBuilding =
      PRACTICE_PLACES.some(
        (building) =>
          Math.hypot(
            x - building.x,
            z - building.z
          ) < 35
      );

    if (nearBuilding) continue;

    box(
      x,
      0,
      z,
      1.1,
      4,
      1.1,
      "#bc956b"
    );

    cone(
      x,
      2,
      z,
      4,
      7,
      index % 3
        ? "#78b475"
        : "#63a786"
    );

    cone(
      x,
      5,
      z,
      3,
      6,
      "#8bc17d"
    );
  }

  // Kolam di tengah kawasan.
  const pond = [];

  for (let index = 0; index < 24; index++) {
    const angle =
      (index * TAU) / 24;

    pond.push([
      30 * Math.cos(angle),
      0.02,
      10 + 42 * Math.sin(angle),
    ]);
  }

  face(pond, "#79c7cc");

  return faces;
}

function scooter(state, party) {
  const faces = [];

  function add(points, color) {
    const transformed = points.map(
      ([x, y, z]) => [
        state.x +
          x * Math.cos(state.heading) +
          z * Math.sin(state.heading),

        y,

        state.z -
          x * Math.sin(state.heading) +
          z * Math.cos(state.heading),
      ]
    );

    faces.push({
      points: transformed,
      color,
    });
  }

  function box(
    x,
    y,
    z,
    width,
    height,
    depth,
    color,
    top = shade(color, 1.1)
  ) {
    const a = [
      x - width / 2,
      y,
      z - depth / 2,
    ];

    const b = [
      x + width / 2,
      y,
      z - depth / 2,
    ];

    const c = [
      x + width / 2,
      y,
      z + depth / 2,
    ];

    const d = [
      x - width / 2,
      y,
      z + depth / 2,
    ];

    const up = (point) => [
      point[0],
      point[1] + height,
      point[2],
    ];

    add(
      [a, b, up(b), up(a)],
      shade(color, 0.9)
    );

    add(
      [b, c, up(c), up(b)],
      color
    );

    add(
      [c, d, up(d), up(c)],
      shade(color, 0.85)
    );

    add(
      [d, a, up(a), up(d)],
      color
    );

    add(
      [up(a), up(b), up(c), up(d)],
      top
    );
  }

  // Roda depan dan belakang.
  for (const z of [-0.72, 0.78]) {
    for (let index = 0; index < 10; index++) {
      const angleA =
        (index * TAU) / 10;

      const angleB =
        ((index + 1) * TAU) / 10;

      const radius =
        state.event === "tyre" && z < 0
          ? 0.23
          : 0.35;

      add(
        [
          [
            -0.13,
            0.37 +
              Math.sin(angleA) * radius,
            z + Math.cos(angleA) * radius,
          ],
          [
            0.13,
            0.37 +
              Math.sin(angleA) * radius,
            z + Math.cos(angleA) * radius,
          ],
          [
            0.13,
            0.37 +
              Math.sin(angleB) * radius,
            z + Math.cos(angleB) * radius,
          ],
          [
            -0.13,
            0.37 +
              Math.sin(angleB) * radius,
            z + Math.cos(angleB) * radius,
          ],
        ],
        "#354940"
      );

      for (const x of [-0.135, 0.135]) {
        add(
          [
            [x, 0.37, z],
            [
              x,
              0.37 +
                Math.sin(angleA) * radius,
              z +
                Math.cos(angleA) * radius,
            ],
            [
              x,
              0.37 +
                Math.sin(angleB) * radius,
              z +
                Math.cos(angleB) * radius,
            ],
          ],
          "#54645a"
        );
      }
    }
  }

  // Bodi, dek, pelindung kaki, jok, setang, dan lampu.
  box(
    0,
    0.48,
    -0.48,
    0.66,
    0.48,
    1.08,
    "#62c2aa"
  );

  box(
    0,
    0.47,
    0.3,
    0.62,
    0.13,
    1.1,
    "#a7dbc0"
  );

  box(
    0,
    0.55,
    0.65,
    0.7,
    0.86,
    0.18,
    "#68c8ac"
  );

  box(
    0,
    1.05,
    -0.35,
    0.61,
    0.13,
    1.1,
    "#b0835b"
  );

  box(
    0,
    1.46,
    0.65,
    0.98,
    0.07,
    0.09,
    "#e5e2be"
  );

  box(
    0,
    1.41,
    0.76,
    0.3,
    0.25,
    0.16,
    "#fff0ba"
  );

  box(
    0,
    0.75,
    -1.03,
    0.24,
    0.15,
    0.04,
    "#e6896e"
  );

  // Dua karakter sederhana mengikuti pilihan pada menu.
  party.forEach((id, index) => {
    const z =
      index === 0 ? 0.02 : -0.65;

    const female = [
      "ibu",
      "remaja-hijau",
      "remaja-terakota",
    ].includes(id);

    let color = "#fff0d0";

    if (id === "remaja-terakota") {
      color = "#d99779";
    } else if (id === "remaja-hijau") {
      color = "#78b79b";
    } else if (id === "ibu") {
      color = "#e6d6ab";
    }

    box(
      0,
      1.17,
      z,
      0.4,
      0.52,
      0.34,
      color
    );

    box(
      -0.24,
      0.72,
      z,
      0.13,
      0.58,
      0.22,
      "#827056"
    );

    box(
      0.24,
      0.72,
      z,
      0.13,
      0.58,
      0.22,
      "#827056"
    );

    box(
      0,
      1.7,
      z,
      0.31,
      0.33,
      0.3,
      female ? color : "#ddb28e"
    );

    box(
      0,
      1.8,
      z + 0.157,
      0.2,
      0.15,
      0.01,
      "#e8be98"
    );

    if (!female) {
      box(
        0,
        2.01,
        z,
        0.33,
        0.12,
        0.31,
        "#3b5846"
      );
    }

    if (index === 0) {
      box(
        -0.29,
        1.43,
        0.36,
        0.12,
        0.12,
        0.65,
        color
      );

      box(
        0.29,
        1.43,
        0.36,
        0.12,
        0.12,
        0.65,
        color
      );
    }
  });

  return faces;
}

export function createSceneRenderer(canvas) {
  const context = canvas.getContext("2d", {
    alpha: false,
  });

  if (!context) {
    throw Error(
      "Canvas tidak tersedia pada browser ini."
    );
  }

  const world = makeWorld();

  return function render(
    state,
    camera,
    party
  ) {
    const width = canvas.width;
    const height = canvas.height;

    const behind = camera === "behind";

    const sin = Math.sin(state.heading);
    const cos = Math.cos(state.heading);

    const eye = behind
      ? [
          state.x - sin * 8,
          4.8,
          state.z - cos * 8,
        ]
      : [
          state.x,
          60,
          state.z - 0.1,
        ];

    const target = behind
      ? [
          state.x + sin * 6,
          1,
          state.z + cos * 6,
        ]
      : [
          state.x,
          0,
          state.z,
        ];

    const forward = norm(
      sub(target, eye)
    );

    const right = norm(
      cross([0, 1, 0], forward)
    );

    const up = cross(
      forward,
      right
    );

    const focal =
      Math.min(width, height) *
      (behind ? 0.95 : 1.1);

    function cameraPoint(point) {
      const relative = sub(point, eye);

      return [
        dot(relative, right),
        dot(relative, up),
        dot(relative, forward),
      ];
    }

    const sky =
      context.createLinearGradient(
        0,
        0,
        0,
        height
      );

    sky.addColorStop(
      0,
      "#a8d8e3"
    );

    sky.addColorStop(
      0.6,
      "#edf1d0"
    );

    sky.addColorStop(
      1,
      "#add18b"
    );

    context.fillStyle = sky;
    context.fillRect(
      0,
      0,
      width,
      height
    );

    const projected = [];

    const allFaces = [
      ...world,
      ...scooter(state, party),
    ];

    for (const face of allFaces) {
      let points = face.points.map(
        cameraPoint
      );

      const clipped = [];

      // Potong poligon pada bidang dekat kamera.
      for (
        let index = 0;
        index < points.length;
        index++
      ) {
        const a = points[index];

        const b =
          points[
            (index + 1) % points.length
          ];

        const inside = a[2] > 0.3;
        const nextInside = b[2] > 0.3;

        if (inside) {
          clipped.push(a);
        }

        if (inside !== nextInside) {
          const amount =
            (0.3 - a[2]) /
            (b[2] - a[2]);

          clipped.push(
            a.map(
              (value, component) =>
                value +
                (b[component] - value) *
                  amount
            )
          );
        }
      }

      if (clipped.length < 3) {
        continue;
      }

      const depth =
        clipped.reduce(
          (total, point) =>
            total + point[2],
          0
        ) / clipped.length;

      points = clipped.map(
        (point) => [
          width / 2 +
            (point[0] / point[2]) *
              focal,

          height / 2 -
            (point[1] / point[2]) *
              focal,
        ]
      );

      const outsideScreen =
        points.every(
          (point) => point[0] < 0
        ) ||
        points.every(
          (point) => point[0] > width
        ) ||
        points.every(
          (point) => point[1] < 0
        ) ||
        points.every(
          (point) => point[1] > height
        );

      if (outsideScreen) {
        continue;
      }

      projected.push({
        points,
        depth,
        color: face.color,
      });
    }

    projected.sort(
      (a, b) => b.depth - a.depth
    );

    for (const face of projected) {
      context.beginPath();

      face.points.forEach(
        (point, index) => {
          if (index === 0) {
            context.moveTo(
              point[0],
              point[1]
            );
          } else {
            context.lineTo(
              point[0],
              point[1]
            );
          }
        }
      );

      context.closePath();
      context.fillStyle = face.color;
      context.fill();
    }

    // Papan nama fasilitas yang dekat dengan pemain.
    const ratio =
      width /
      Math.max(1, canvas.clientWidth);

    for (const place of PRACTICE_PLACES) {
      const distance = Math.hypot(
        state.x - place.x,
        state.z - place.z
      );

      if (distance > 140) {
        continue;
      }

      const position = cameraPoint([
        place.x,
        place.h + 5,
        place.z,
      ]);

      if (position[2] < 1) {
        continue;
      }

      const screenX =
        width / 2 +
        (position[0] / position[2]) *
          focal;

      const screenY =
        height / 2 -
        (position[1] / position[2]) *
          focal;

      if (
        screenX < 20 ||
        screenX > width - 20 ||
        screenY < 30 ||
        screenY > height - 60
      ) {
        continue;
      }

      context.font =
        `bold ${11 * ratio}px Arial`;

      const labelWidth =
        context.measureText(place.name).width +
        18 * ratio;

      context.fillStyle = "#fff9e9";

      context.fillRect(
        screenX - labelWidth / 2,
        screenY - 14 * ratio,
        labelWidth,
        24 * ratio
      );

      context.fillStyle = "#42654b";
      context.textAlign = "center";

      context.fillText(
        place.name,
        screenX,
        screenY + 2 * ratio
      );
    }
  };
}