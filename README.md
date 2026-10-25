# Ziarah Walisongo 1.1.0

Versi awal simulator perjalanan Vespa manual berbasis Next.js. Pembaruan tahap 1–14 tetap tersedia. Versi 1.1 menambahkan kawasan contoh Three.js melalui tombol Kota 3D & lalu lintas. Baca PETUNJUK-KOTA-3D.md untuk pemasangan dan pemakaian GLB.

## Jalankan di komputer

Gunakan Node.js 20.9 atau lebih baru dan npm. Pengujian dilakukan dengan Node.js 24. Ekstrak ZIP proyek lengkap, masuk ke folder yang berisi `package.json`, lalu jalankan:

```sh
npm ci
npm run dev
```

Buka http://localhost:3000. Jangan membuka `app/page.js` langsung sebagai file HTML. Pemasangan dependensi memerlukan koneksi internet.

Untuk build produksi lokal:

```sh
npm run build
npm start
```

Untuk pemeriksaan:

```sh
npm test
npm run lint
```

## Jika memasang ZIP pembaruan

Patch tahap 13–14 dipasang di atas proyek yang sudah menggunakan tahap 11–12. Salin isi patch ke root proyek, izinkan penggantian file, lalu restart server pengembangan. Tidak ada dependensi baru. ZIP patch tidak berisi PNG sehingga tidak menimpa artwork yang sudah dipasang.

Jika memakai ZIP proyek lengkap, semua kode tahap sebelumnya sudah ada; tidak perlu memasang ZIP tahap 1–12 satu per satu. Cadangkan progres dari menu Cadangan sebelum memindah/mengganti proyek. LocalStorage terikat alamat situs dan browser; berganti alamat/port/perangkat tidak otomatis memindahkan progres.

## Aset gambar yang perlu dipertahankan

Repomix sumber tidak menyertakan artwork PNG asli pengguna. Salinan proyek ini berisi **23 ikon pengganti sederhana**, bukan gambar asli pengguna dan bukan artwork HD baru. Jika sudah memiliki aset asli, salin folder `public/assets` dari proyek Anda ke proyek lengkap ini dengan nama file yang sama. Menggunakan ZIP pembaruan mempertahankan folder aset Anda.

Karakter, Vespa, pepohonan dan lampu jalan dalam simulator memakai geometri prosedural. Bangunan juga menggunakan PNG yang tersedia atau geometri pengganti bila gambar gagal dimuat. Kawasan Kota 3D kini dapat memuat GLB melalui menu atau city-manifest.json; simulator rute geografis sebelumnya tetap memakai renderer Canvas. Panduan aset lanjutan ada di `docs/ASSET-3D.md`.

## Mulai bermain

1. Pilih dua karakter berbeda. Karakter pertama menjadi pengendara, kedua penumpang.
2. Posisi awal ada di Makam Sunan Ampel; pilih tujuan lalu `Hitung rute jalan`.
3. Tekan `Berangkat`. Vespa tidak bergerak otomatis: gunakan GAS/W/panah atas dan kemudi kiri/kanan.
4. Ikuti jalan dan minimap. Gunakan REM/S/panah bawah/Spasi untuk mengurangi kecepatan, R atau MUNDUR untuk mundur, Esc untuk jeda.
5. `Menu` membuka sudut kamera, kualitas grafis, ukuran tombol, kemudi geser, sensitivitas, helm karakter, suara dan layanan perjalanan. Menu menjeda permainan.
6. Berhenti di dekat fasilitas simulasi yang sesuai. E atau tombol masuk membuka layanan. Fasilitas ini bukan daftar usaha nyata pada peta.
7. Ketika tiba, buka profil dan `Catat kunjungan`. Kedatangan otomatis berbeda dari konfirmasi kunjungan; progres 0–9 hanya menghitung sembilan Walisongo yang dikonfirmasi.
8. Buka `Susun rangkaian tujuan` untuk maksimal delapan tujuan berbeda. Setiap ruas harus dimulai sendiri setelah tiba di tujuan sebelumnya.
9. Tambahkan maqbarah pribadi melalui koordinat atau titik peta. Jurnal, catatan dan lokasi tambahan disimpan pada browser.
10. `Cadangan` mengekspor file JSON dan memulihkannya setelah pratinjau. Pemulihan mengganti progres lokal, bukan menggabungkan dua simpanan.

Arena latihan terpisah tetap tersedia. Pengaturan suara dan tampilan yang dijelaskan pada pembaruan tahap 13–14 berlaku pada simulator perjalanan yang dibuka melalui `Berangkat`.

## Visual dan suara

Pencahayaan berubah bertahap saat fajar/senja. Ada bayangan kontak, pepohonan, lampu jalan, sorot lampu depan malam, roda dengan detail putaran, sedikit gerak miring saat membelok, serta helm yang bisa ditampilkan/disembunyikan. Ini tampilan 3D prosedural sederhana, bukan rekonstruksi bangunan asli.

Suara awalnya mati. Buka Menu dan centang `Suara perjalanan`; atur volume sesuai kebutuhan. Mesin merespons kecepatan dan gas, ada suara angin serta nada kedatangan/gangguan. Audio merupakan sintesis Web Audio, bukan rekaman mesin Vespa asli. Browser memerlukan tindakan pengguna untuk mengaktifkan audio. Jika pilihan suara sudah tersimpan tetapi browser meminta izin lagi, gunakan `Aktifkan suara` di menu. Suara mesin berhenti saat dijeda dan sumber audio ditutup ketika keluar simulator.

Mode Hemat, Seimbang dan Tinggi mengatur resolusi, jarak gambar dan dekorasi. Mode Tinggi tidak dapat menambah detail yang tidak ada pada PNG sumber. Angka frame adalah target batas penggambaran, bukan jaminan performa semua HP. Simulasi memakai langkah waktu terpisah dari jadwal gambar.

## Peta, rute dan koordinat

Peta utama memakai MapLibre dan tile OpenStreetMap. API `/api/route` memakai Valhalla dengan profil `motor_scooter`. Rute Ampel–Giri dari respons yang tersedia dalam sumber proyek disimpan sebagai fallback lokal; rute lainnya memerlukan layanan internet. Ketika layanan gagal, keberangkatan tidak diaktifkan dan tidak dibuat jalan lurus pengganti.

Layanan dapat dibatasi atau tidak tersedia. Jika memiliki Valhalla sendiri, salin `.env.example` ke `.env.local`, atur `VALHALLA_ROUTING_URL`, lalu restart server. URL layanan dikonfigurasi di server, bukan dimasukkan lewat pemain.

Minimap menggunakan geometri ruas yang sudah dihitung sehingga tidak memerlukan permintaan tile baru. Petunjuk belokan berdasarkan sudut geometri, bukan rambu, nama jalan atau panduan lajur resmi. Game ini bukan alat navigasi berkendara nyata.

Data sembilan lokasi lolos pemeriksaan struktur, cakupan koordinat, nama unik dan tautan sumber. Titik awal/akhir fallback Ampel–Giri juga dibandingkan dengan lokasi tujuan. Ini **belum verifikasi lapangan atau validasi independen seluruh titik masuk sembilan maqbarah**. Sejarah bawaan belum diisi karena naskah sejarah terverifikasi tidak tersedia. Pastikan koordinat/akses lokasi tambahan benar sebelum menghitung rute.

## Penyimpanan dan batas

Progres tetap memakai format versi 6 dan membaca versi 1–5. Preferensi grafis, kontrol, helm dan suara disimpan terpisah pada browser yang sama. Cadangan JSON berisi progres perjalanan, bukan preferensi perangkat. Perjalanan aktif dipulihkan dalam keadaan dijeda.

Batas: 100 lokasi tambahan, 100 kedatangan terbaru, 6.000 karakter per catatan, dan delapan tujuan berbeda per rangkaian. Progres sembilan Walisongo dipertahankan meskipun entri jurnal lama terlewati. Bahan bakar, uang, energi, biaya, kerusakan dan waktu adalah aturan simulasi permainan.

Belum ada akun, sinkronisasi otomatis, multi-pemain, publikasi lokasi ke semua pengguna, peta offline atau jaminan rute seluruh Indonesia. Impor GLB saat ini khusus kawasan contoh kota. Buka permainan pada satu tab aktif untuk menghindari dua tab menulis simpanan browser yang sama.

## Hasil pemeriksaan

Lihat `PETUNJUK-KOTA-3D.md`, `VALIDASI.md` dan `PETUNJUK-TAHAP-13-14.md` untuk cakupan tes, pemasangan dan batas pengujian. Berkas petunjuk tahap sebelumnya dipertahankan sebagai catatan tiap pembaruan.
