# Sumber data dan lisensi kawasan

Data jalan dan tapak bangunan: © OpenStreetMap contributors, tersedia menurut Open Database License (ODbL) 1.0.

- Atribusi dan informasi hak cipta: https://www.openstreetmap.org/copyright
- Lisensi database: https://opendatacommons.org/licenses/odbl/1-0/
- Sumber snapshot Ampel: https://www.openstreetmap.org/api/0.6/map?bbox=112.737,-7.234,112.749,-7.222
- Diambil pada 25 Oktober 2026. Waktu pengambilan ada pada atribut retrieved di JSON.
- Dokumentasi API: https://wiki.openstreetmap.org/wiki/API_v0.6
- Dokumentasi kueri kawasan: https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL

Snapshot JSON merupakan olahan data OSM: way jalan kendaraan dipilih dan dipotong ke batas kawasan, sedangkan tapak bangunan tertutup diproyeksikan menjadi bentuk 3D sederhana. Nama pengguna penyunting, alamat rumah, dan riwayat penyuntingan tidak disertakan. Dataset olahan ini disediakan menurut ODbL 1.0. Kode program memiliki status lisensi sesuai proyek pengguna.

## File baru

- app/api/world/route.js: API pemuatan kawasan, snapshot awal, penggabungan permintaan dan cache server.
- data/ampel-street-snapshot.json: snapshot kawasan asli Ampel.
- lib/street-data.mjs: grid kawasan, parser OSM XML, filter dan validasi data, pembatas ukuran geometri.
- lib/street-geometry.mjs: perhitungan jarak, poligon, dan tabrakan tapak bangunan.
- lib/street-world.mjs: proyeksi koordinat, indeks spasial, penggabungan kawasan dan pencarian jalan.
- lib/street-loader.mjs: pemuatan kawasan di browser, cache terbatas, retry dan pembatalan.
- lib/street-renderer.mjs: batch geometri jalan dan bangunan, dengan pelepasan sumber daya grafis.
- tests/street-world.test.mjs: pengujian jaringan, tabrakan, streaming dan penyimpanan.

## File diperbarui

- lib/route-drive.mjs: konversi koordinat geografis ke posisi dunia.
- lib/route-collision.mjs: berkendara di cabang, tabrakan bangunan OSM dan pemulihan ke rute.
- lib/ride-collision.mjs: dukungan poligon tapak bangunan.
- lib/route-3d-environment.mjs: integrasi jaringan kawasan dan penggantian dekorasi prosedural pada area terpetakan.
- lib/route-3d-layout.mjs: posisi lajur NPC menyesuaikan lebar jalan yang dimuat.
- lib/route-guidance.mjs: posisi jalur hijau menyesuaikan lebar jalan.
- lib/ride-navigation.mjs dan components/RideNavigation.js: jaringan sekitar pada minimap.
- lib/journey-save.mjs: validasi posisi perjalanan pada cabang ketika dipulihkan.
- components/RouteSimulator.js dan components/route-simulator.css: streaming kawasan, status/menu dan atribusi.
- components/Game.js: petunjuk masuk simulator perjalanan.
