# Pembaruan loader pada versi 1.1

Kawasan **Kota 3D & lalu lintas** sekarang memuat GLB statis melalui pemilihan file atau `public/assets/models/city-manifest.json`. Baca `PETUNJUK-KOTA-3D.md`. Keterangan versi 1.0 di bawah adalah riwayat rancangan; integrasi model/rig ke seluruh rute Indonesia masih pengembangan lanjutan.

# Aset untuk pengembangan visual berikutnya

Versi 1.0 memakai model prosedural dan PNG yang tersedia. File GLB belum otomatis dimuat dari folder aset. Daftar berikut merupakan spesifikasi produksi awal untuk tahap integrasi mesin 3D berikutnya, bukan instruksi bahwa cukup menyalin GLB lalu model langsung muncul.

## Prioritas produksi

| Prioritas | Aset | Spesifikasi awal yang dapat diuji pada HP |
|---|---|---|
| 1 | Vespa | GLB, skala meter, roda terpisah, setang terpisah, asal model di lantai, menghadap +Z, sekitar 10–20 ribu segitiga |
| 2 | Lima karakter | GLB per karakter, identitas/pakaian mengikuti artwork, rig sama, pose duduk mengemudi dan membonceng; sekitar 8–15 ribu segitiga per karakter |
| 3 | Helm | GLB terpisah agar bisa dipasang pada tiap kepala |
| 4 | Bangunan modular | Rumah Jawa, warung, masjid, maqbarah, SPBU, bengkel dan penginapan; sekitar 1–5 ribu segitiga per modul |
| 5 | Lingkungan | Pohon, lampu jalan, pagar dan papan nama; varian detail rendah untuk jarak jauh |

Angka segitiga adalah anggaran awal, bukan jaminan FPS. Perlu pengukuran pada perangkat sasaran setelah loader, material, pencahayaan dan animasi GLB benar-benar diintegrasikan.

## Tekstur dan sumber gambar

Gunakan satu atlas 1.024–2.048 px per kelompok aset bila memungkinkan. Sediakan base color dan, bila memang diperlukan, normal serta roughness. Pertahankan siluet, nama karakter dan warna pakaian asli. Sertakan catatan lisensi/pemilik aset. Jangan mengemas file sumber berlapis yang sangat besar ke unduhan game.

Untuk PNG ikon peta, gunakan gambar transparan persegi sekitar 512–1.024 px dengan ruang aman dan objek yang terbaca pada ukuran kecil. Artwork yang tajam lebih berguna daripada menaikkan ukuran gambar buram tanpa detail baru. Simpan nama file sesuai `lib/catalog.mjs` dan folder `public/assets` yang sudah ada.

## Tahap integrasi model nanti

Tentukan loader GLB dan mesin 3D, validasi satu Vespa dan dua karakter dahulu, lalu uji lima kamera, animasi roda/setang, posisi tangan/kaki, skala bangunan, collider dan kualitas rendah pada HP. Setelah itu baru perluas model lingkungan. Kode versi 1.0 saat ini tidak menjalankan tahap loader tersebut.
