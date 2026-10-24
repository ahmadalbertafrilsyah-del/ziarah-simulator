# Validasi Tahap 2

Tanggal: 24 Oktober 2026.

- Build produksi Next.js 16.4.3: berhasil.
- `npm test`: 3 tes lulus. Geometri tersimpan Ampel → Giri valid, panjang dalam rentang 20–25 km; posisi ujung rute tepat; laju simulasi konsisten terhadap jumlah frame; jarak tidak melampaui tujuan; geometri tidak valid ditolak.
- ESLint: 0 error. Terdapat 10 peringatan terkait `<img>` lokal dan satu komentar lint yang tidak lagi diperlukan.
- Browser Chromium headless: hitung rute tersimpan, pilih dua karakter, berangkat, jeda tanpa kemajuan jarak, lanjutkan hingga tiba, dan jarak tersisa nol berhasil.
- Ikon Vespa pada DOM peta terbukti berubah posisi setelah Berangkat.
- Saat bergerak/dijeda, pilihan tujuan terkunci.
- Permintaan API dengan koordinat berulang ditolak dengan HTTP 400.
- Kegagalan API yang disimulasikan dengan HTTP 503 memunculkan pesan dan menonaktifkan Berangkat.
- Viewport 375 × 667: tidak ada overflow horizontal.
- Tidak ada exception halaman atau error worker yang teramati selama alur browser.

Batas verifikasi: layanan rute publik untuk delapan tujuan lain belum diuji satu per satu. Rute tersimpan dalam unggahan dipakai untuk Ampel → Giri; tanggal dan asal data dipertahankan, tidak diklaim sebagai pengambilan ulang. Peta raster eksternal gagal dimuat sepenuhnya di lingkungan pengujian; pesan gangguan tampil. Pengujian ini tidak membuktikan seluruh tile peta dapat diakses di jaringan pengguna. Aset PNG asli tidak disertakan oleh Repomix; ZIP berisi pengganti sederhana yang perlu ditimpa dengan aset asli bila ingin mempertahankan desain.
