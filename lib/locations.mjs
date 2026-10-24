export const SEED_LOCATIONS = [
  {
    "id": "sunan-ampel",
    "type": "maqbarah",
    "name": "Makam Sunan Ampel",
    "person": "Sunan Ampel",
    "region": "Ampel, Surabaya",
    "coordinates": [
      112.7422732,
      -7.2299754
    ],
    "history": "",
    "source": "https://www.openstreetmap.org/node/10285718924",
    "custom": false,
    "canRest": false
  },
  {
    "id": "sunan-giri",
    "type": "maqbarah",
    "name": "Makam Sunan Giri",
    "person": "Sunan Giri",
    "region": "Kebomas, Gresik",
    "coordinates": [
      112.6310331,
      -7.1688945
    ],
    "history": "",
    "source": "https://www.openstreetmap.org/way/648801255",
    "custom": false,
    "canRest": false
  },
  {
    "id": "sunan-gresik",
    "type": "maqbarah",
    "name": "Makam Sunan Gresik",
    "person": "Maulana Malik Ibrahim",
    "region": "Gapuro Sukolilo, Gresik",
    "coordinates": [
      112.6565,
      -7.1607
    ],
    "history": "",
    "source": "https://direktoripariwisata.id/unit/4897",
    "custom": false,
    "canRest": false
  },
  {
    "id": "sunan-drajat",
    "type": "maqbarah",
    "name": "Makam Sunan Drajat",
    "person": "Sunan Drajat",
    "region": "Paciran, Lamongan",
    "coordinates": [
      112.3892583,
      -6.884424
    ],
    "history": "",
    "source": "https://www.openstreetmap.org/node/10285705417",
    "custom": false,
    "canRest": false
  },
  {
    "id": "sunan-bonang",
    "type": "maqbarah",
    "name": "Makam Sunan Bonang",
    "person": "Sunan Bonang",
    "region": "Kutorejo, Tuban",
    "coordinates": [
      112.0633171,
      -6.8945426
    ],
    "history": "",
    "source": "https://www.openstreetmap.org/relation/13930238",
    "custom": false,
    "canRest": false
  },
  {
    "id": "sunan-kudus",
    "type": "maqbarah",
    "name": "Makam Sunan Kudus",
    "person": "Sunan Kudus",
    "region": "Kauman, Kudus",
    "coordinates": [
      110.832835,
      -6.804199
    ],
    "history": "",
    "source": "https://simas.kemenag.go.id/profil/masjid/01.5.14.19.02.000001",
    "custom": false,
    "canRest": false
  },
  {
    "id": "sunan-muria",
    "type": "maqbarah",
    "name": "Makam Sunan Muria",
    "person": "Sunan Muria",
    "region": "Colo, Kudus",
    "coordinates": [
      110.8988913,
      -6.6661402
    ],
    "history": "",
    "source": "https://www.openstreetmap.org/node/3907892232",
    "custom": false,
    "canRest": false
  },
  {
    "id": "sunan-kalijaga",
    "type": "maqbarah",
    "name": "Makam Sunan Kalijaga",
    "person": "Sunan Kalijaga",
    "region": "Kadilangu, Demak",
    "coordinates": [
      110.6481794,
      -6.9106913
    ],
    "history": "",
    "source": "https://direktoripariwisata.id/pdf/2612",
    "custom": false,
    "canRest": false
  },
  {
    "id": "sunan-gunung-jati",
    "type": "maqbarah",
    "name": "Makam Sunan Gunung Jati",
    "person": "Sunan Gunung Jati",
    "region": "Astana, Cirebon",
    "coordinates": [
      108.5400589,
      -6.6711938
    ],
    "history": "",
    "source": "https://www.openstreetmap.org/way/538435100",
    "custom": false,
    "canRest": false
  }
];

// These facilities exist only in the game. Their labels must remain explicit.
export const DEMO_LOCATIONS = [
  {id:"demo-spbu",type:"spbu",name:"POM bensin simulasi Ampel",region:"Fasilitas simulasi di sekitar titik awal",coordinates:[112.7428,-7.2295]},
  {id:"demo-masjid",type:"masjid",name:"Masjid singgah simulasi Ampel",region:"Fasilitas simulasi di sekitar titik awal",coordinates:[112.7417,-7.2306],canRest:true},
  {id:"demo-bengkel",type:"bengkel",name:"Bengkel simulasi Giri",region:"Fasilitas simulasi di sekitar tujuan",coordinates:[112.6304,-7.1693]},
  {id:"demo-hotel",type:"hotel",name:"Hotel simulasi Giri",region:"Fasilitas simulasi di sekitar tujuan",coordinates:[112.6316,-7.1685],canRest:true},
].map(p=>({...p,person:"",history:"Lokasi contoh untuk mencoba fasilitas permainan. Titik ini bukan penanda fasilitas nyata.",source:"",custom:false,simulation:true,canRest:!!p.canRest}));
