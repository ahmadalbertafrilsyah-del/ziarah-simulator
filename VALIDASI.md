# Validasi kawasan kota 3D versi 1.1

62 tes unit lolos, termasuk simulasi lalu lintas lima menit dengan pergantian lampu tanpa tumpang tindih antarkendaraan pada skenario tes. Build produksi berhasil. Lint: 0 error dan 13 warning lama. Browser Chromium memverifikasi WebGL 2, perubahan gambar akibat kendaraan bergerak, jeda timer lampu, kontrol keyboard/sentuh, impor GLB valid, penolakan GLB rusak, layar 375 × 667 tanpa overflow, progres utama tetap utuh, pembukaan ulang kawasan, serta penanganan kehilangan konteks grafis. Tidak ditemukan error JavaScript aplikasi.

Pengujian GLB memakai model geometri standar untuk memeriksa loader; bukan jaminan semua aset eksternal didukung. Kawasan memakai model bawaan sederhana dan belum dihubungkan ke seluruh rute Indonesia. Lihat PETUNJUK-KOTA-3D.md.

---

# Validasi versi awal 1.0.0

Tanggal laporan: 25 Oktober 2026. Lingkungan utama: Node.js 24, build produksi Next.js, Chromium headless. Pemeriksaan ini membatasi klaim pada hal yang benar-benar diuji; bukan jaminan tanpa bug di semua perangkat.

| Pemeriksaan | Hasil dan cakupan |
|---|---|
| Tes otomatis | 53 tes lolos, mencakup rute, kontrol, sumber daya, kerusakan, layanan, migrasi data, jurnal, lokasi tambahan, rangkaian, cadangan, navigasi, kualitas, pencahayaan, properti visual dan lifecycle audio |
| Build produksi | Berhasil pada sumber kerja dan hasil ekstraksi ZIP proyek lengkap |
| Instalasi bersih paket lengkap | npm ci pada folder hasil ekstraksi berhasil memasang 385 paket; 53 tes dan build produksi pada folder tersebut juga lolos |
| Lint | 0 error; 13 warning penggunaan img/aturan lama |
| Fallback Ampel–Giri | Respons aktual API lokal berhasil dimuat, lebih dari 500 titik geometri; endpoint dibandingkan dengan lokasi awal/tujuan |
| Uji sumber daya perjalanan panjang | Seluruh panjang geometri Ampel–Giri dilewatkan melalui model sumber daya/kerusakan, beberapa perbaikan, serta encode/decode progres. Bukan uji mengemudi manual penuh di browser |
| Visual browser | Cahaya siang/malam berbeda pada canvas, helm mengubah model, pasangan dipertahankan; pemeriksaan gambar internal dilakukan |
| Audio browser | Tidak dibuat sebelum tindakan pengguna; AudioContext aktif setelah izin, gain mesin berubah, jeda membisukan mesin, preferensi tersimpan dan context ditutup ketika keluar |
| Kontrol dan navigasi browser | Keyboard + sentuhan, dua jari, pembatalan sentuhan, kemudi geser, kualitas tanpa reset pose/sumber daya, reload preferensi, kehilangan fokus, peringatan keluar jalur dan pemulihan posisi lolos |
| Alur tiba/jurnal | Berkendara sentuh sampai tujuan fixture pendek lalu konfirmasi jurnal lolos |
| Tampilan HP | 375 × 667 dan 667 × 375 diperiksa; tidak ada overflow horizontal dan kelompok kontrol tidak saling menutupi pada ukuran yang diuji |
| Sembilan maqbarah | ID/nama/wilayah/sumber/cakupan koordinat diperiksa. Belum verifikasi lapangan atau pembuktian independen akurasi semua titik akses |
| Layanan eksternal | Ketersediaan semua tile/rute internet Indonesia tidak diverifikasi; regresi kontrol memakai fixture, sedangkan fallback lokal Ampel–Giri benar-benar dipanggil |

## Batas penting

Ikon dalam paket lengkap adalah pengganti dari salinan proyek, bukan artwork PNG asli pengguna. Patch tidak menimpa aset. Tidak ada model GLB atau loader impor model baru. Suara adalah sintesis dan diverifikasi secara teknis melalui node/gain/lifecycle audio, bukan penilaian kemiripan rekaman mesin oleh pendengar.

Performa FPS bukan jaminan untuk setiap perangkat. Penyimpanan lokal bisa dibatasi browser; gunakan Cadangan untuk memindahkan progres. Data lokasi buatan pengguna belum diverifikasi dan sejarah bawaan belum diisi. Penggunaan dua tab aktif pada alamat yang sama dapat membuat penulisan simpanan saling mengganti.
