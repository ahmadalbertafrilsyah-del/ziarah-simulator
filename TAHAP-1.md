# Simulator Ziarah Walisongo — Tahap 1

Tahap ini berisi layar utama, tampilan awal peta, serta pemilihan tepat dua karakter berbeda dari lima aset karakter yang tersedia. Pilihan pertama menjadi pengendara, pilihan kedua menjadi penumpang. Tombol Tukar posisi menukar keduanya. Pilihan disimpan pada browser melalui localStorage dan dimuat kembali ketika halaman dibuka.

## Berkas utama

- `components/Game.js`: layar utama dan dialog pemilihan karakter.
- `app/globals.css`: tampilan desktop dan seluler.
- `lib/party.mjs`: validasi dan pembacaan pilihan karakter.
- `components/WorldMap.js`: tampilan awal peta dengan penanganan kegagalan WebGL.
- `components/Modal.js`, `components/Icon.js`, `lib/catalog.mjs`, dan `lib/locations.mjs`: komponen dan data pendukung.
- `public/assets/`: aset karakter, bangunan, Vespa, dan peralatan.

## Menjalankan di komputer Anda

Buka folder proyek di VS Code. Pasang dependensi dengan `npm install`, kemudian jalankan `npm run dev`. Buka `http://localhost:3000`.

## Batas tahap ini

Pergerakan Vespa, perhitungan rute, penyuntingan maqbarah, jurnal, bahan bakar, kejadian kendaraan, serta siang–malam belum diaktifkan pada layar tahap pertama. Sebagian berkas dasar tahap berikutnya masih disertakan sebagai pekerjaan yang belum diverifikasi.

Pengujian dihentikan sesuai permintaan pengguna. Percobaan build sebelumnya terhenti dengan kesalahan lingkungan `uv_resident_set_memory`; pratinjau browser tidak tersedia. Kode ini belum dinyatakan lulus build maupun pengujian antarmuka.
