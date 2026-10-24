# Ziarah Walisongo — layar utama dan karakter

ZIP ini berisi folder proyek lengkap. Ekstrak ke folder baru, lalu buka folder `ziarah-walisongo` di VS Code. Tidak perlu menyalin berkas kode satu per satu ke proyek lama.

## Cara menjalankan di komputer Anda

1. Buka terminal VS Code pada folder yang berisi `package.json`.
2. Jalankan `npm install` untuk memasang dependensi.
3. Jalankan `npm run dev`.
4. Buka `http://localhost:3000` di browser.

Folder `node_modules` dan `.next` tidak disertakan. Keduanya dibuat kembali melalui pemasangan dependensi dan menjalankan aplikasi.

## Yang tersedia

- Layar utama dengan warna hijau, krem, aset Vespa, dan tata letak responsif.
- Tampilan awal peta Indonesia dengan sembilan titik Walisongo.
- Lima karakter dari aset PNG proyek.
- Pilihan tepat dua karakter berbeda, pengendara dan penumpang.
- Tombol tukar posisi dan penyimpanan pilihan pada browser.
- Semua 23 aset PNG tetap disertakan dalam `public/assets`.

## Status pengembangan

Tahap ini berfokus pada layar utama dan pemilihan karakter. Perjalanan Vespa, rute aktif, penambahan maqbarah, jurnal, serta kejadian kendaraan belum diaktifkan di layar ini. Berkas dasar untuk pengembangan berikutnya tetap ada dalam proyek.

Peta membutuhkan internet dan dukungan WebGL. Jika peta gagal dimuat, pemilihan karakter tetap dapat digunakan.

Tidak ada aplikasi atau pengujian yang dijalankan setelah pengguna meminta penghentian eksekusi. Percobaan build sebelumnya terhenti karena kendala lingkungan `uv_resident_set_memory`. Versi ini belum dinyatakan lulus build atau pengujian antarmuka.
