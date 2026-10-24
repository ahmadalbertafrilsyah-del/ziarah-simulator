# Ziarah Walisongo • Tahap 2

Proyek Next.js lengkap untuk memilih dua karakter, merencanakan rute jalan, dan menjalankan perjalanan Vespa otomatis di peta. Arena latihan Canvas dua kamera tetap tersedia melalui tombol tersendiri.

## Menjalankan

Gunakan Node.js 20.9 atau lebih baru (pengujian paket ini menggunakan Node.js 24).

```bash
npm ci
npm run dev
```

Buka http://localhost:3000. Untuk produksi: `npm run build`, lalu `npm start`.

## Mencoba Ampel → Giri

1. Posisi awal adalah Makam Sunan Ampel. Tujuan awal sudah Makam Sunan Giri.
2. Klik **Hitung rute jalan** untuk menggambar jalur.
3. Klik **Pilih 2 karakter**, pilih pengendara dan penumpang, lalu simpan.
4. Klik **Berangkat**. Gunakan **Jeda** dan **Lanjutkan** tanpa mengulang dari awal.
5. Kecepatan simulasi dapat dipilih 1×, 30×, atau 120×. Dasar gerak adalah 40 km/jam, bukan estimasi waktu Valhalla.
6. Saat tiba, jarak tersisa menjadi nol dan muncul pemberitahuan. Pilih tujuan berikutnya dari posisi kedatangan.

Rute dan tujuan terkunci ketika sedang bergerak maupun dijeda. Membuka menu atau menyembunyikan tab menjeda perjalanan; lanjutkan secara manual. Pembaruan geometri menggunakan jarak kumulatif setiap ruas jalan, bukan garis lurus antarmakam. Titik awal/akhir mengikuti hasil snapping layanan ke akses jalan. Riwayat kedatangan sesi menandai tujuan pada peta.

## Rute dan koneksi

Ampel → Giri memakai respons Valhalla yang sudah ada dalam unggahan, bertanggal 24 Oktober 2026. Label **Rute jalan tersimpan** membedakannya dari permintaan baru. Panjang dihitung ulang dari geometri jalan. Rute tujuan lain diminta melalui `/api/route` dengan profil `motor_scooter`.

Peta dasar tetap memerlukan internet. Layanan Valhalla publik dapat gagal atau membatasi permintaan. Kegagalan ditampilkan dan Berangkat dinonaktifkan; tidak ada rute lurus pengganti. Jika mengelola server Valhalla sendiri, salin `.env.example` menjadi `.env.local`, isi `VALHALLA_ROUTING_URL`, lalu restart server. Endpoint ini hanya dikonfigurasi di server.

Dokumentasi: https://valhalla.github.io/valhalla/api/route/api-reference/ dan https://maplibre.org/maplibre-gl-js/docs/.

## Gambar asli tidak ada di Repomix

Repomix mengecualikan 23 PNG asli. Paket ini menyertakan **ikon pengganti sederhana**, bukan rekonstruksi artwork asli. Untuk mempertahankan tampilan semula, salin seluruh folder `public/assets` dari proyek lama ke paket ini dan pilih overwrite. Nama dan lokasi PNG dipertahankan. Ikon pengganti dapat dibuat ulang dengan `node scripts/create-placeholder-assets.mjs` setelah dependensi terpasang; skrip tidak menimpa file yang sudah ada.

## Cakupan tahap ini

- Sembilan maqbarah dapat dipilih dan rute dihitung dari posisi terakhir.
- Pemilihan dua karakter wajib sebelum berangkat.
- Gerak otomatis, jeda/lanjut, jarak tersisa, dan pemberitahuan tiba aktif.
- Pilihan karakter tetap tersimpan. **Kemajuan perjalanan dan kedatangan hanya berlaku selama halaman terbuka**, belum dipulihkan setelah reload.
- Bahan bakar, uang, jam, dan energi pada panel lama masih informasi awal, belum terhubung ke perjalanan peta.
- Arena latihan tetap simulasi terpisah. Penambahan lokasi, riwayat permanen, kerusakan, serta istirahat belum diaktifkan dalam tahap ini.

## Validasi

```bash
npm test
npm run lint
npm run build
```

Tes otomatis memeriksa geometri Ampel → Giri, interpolasi ujung rute, independensi kecepatan dari jumlah frame, pembatasan jarak saat tiba, dan penolakan rute tidak valid. ESLint mempertahankan peringatan pemakaian `<img>` dari proyek awal. Lihat `VALIDASI.md` untuk hasil pengujian paket ini.
