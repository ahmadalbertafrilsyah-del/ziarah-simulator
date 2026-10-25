# Patch perbaikan gedung, infrastruktur, dan aset multi-sisi

Pasang sesudah Patch Jaringan Jalan Kota Asli dan Blok Bangunan. Paket ini memuat file kode yang direvisi, file baru, dan folder aset baru ride-hd. Gambar lama dari assets.zip pengguna tetap dipakai pada menu/peta dan tidak dimasukkan ulang ke dalam patch.

## Memasang

1. Hentikan server dengan Ctrl+C. Cadangkan folder proyek.
2. Ekstrak isi ZIP ke folder proyek yang memiliki package.json. Gabungkan folder dan ganti file bernama sama.
3. Jalankan `npm install`. Ada dependensi baru polygon-clipping versi 0.15.7 untuk memotong tapak gedung yang bertumpang tindih dengan koridor jalan.
4. Jalankan `npm run dev`, lalu muat ulang browser dengan Ctrl+Shift+R.
5. Pilih tujuan, hitung rute, dan Berangkat. Pada Menu → Kontrol & tampilan, pilih **Ilustrasi HD · 5 arah**. Pengaturan bawaan memakai ilustrasi tersebut.
6. Pilih kualitas **Tinggi** pada komputer yang mendukung. Gunakan Seimbang atau Hemat jika perangkat melambat. Resolusi aktual tetap bergantung pada ukuran layar, rasio piksel, dan batas render.

Jika proyek Anda memiliki dependensi tambahan sendiri, gabungkan perubahan package.json dengan hati-hati. Dependensi baru yang diperlukan adalah polygon-clipping@0.15.7. Semua file public/assets/ride-hd harus disalin, bukan hanya atlasnya.

## Perbaikan gedung dan kamera

Tapak gedung tidak lagi hanya diekstrusi apa adanya. Bagian yang bertumpang tindih dengan jalan dan ruang trotoar dipotong menggunakan operasi poligon. Ruang tambahan sekitar 1,85 meter dari tepi jalan disediakan untuk trotoar dan jarak aman. Gedung yang terbelah dapat memiliki beberapa bagian; bagian yang terlalu kecil atau sepenuhnya berada di koridor dihilangkan.

Geometri tampilan, minimap, dan tabrakan menggunakan hasil pemotongan yang sama. Bentuk ini merupakan penyesuaian visual untuk permainan, bukan koreksi resmi terhadap data OSM. Ukuran dan posisi jalan tetap bersumber dari jaringan yang dimuat.

Kamera juga memeriksa penghalang di antara Vespa dan posisi kamera yang diinginkan. Ketika kamera samping mendekati dinding, jaraknya dipendekkan. Tampilan dapat terlihat lebih dekat pada jalan yang sempit.

## Detail kota

- Fasad dengan tekstur plester, jendela berbingkai, lis lantai, pintu, dan warna bangunan yang bervariasi.
- Atap genteng miring pada tapak sederhana yang memenuhi syarat; bangunan kompleks memakai atap datar bertekstur.
- Jalan bertekstur, paving trotoar, dan kanstin. Trotoar dihentikan pada bagian yang memotong cabang jalan.
- Marka tengah pada ruas yang cukup lebar dan zebra cross pada pendekat simpang yang sesuai.
- Lampu jalan, pepohonan, dan bangku pada tempat yang bebas dari jalan dan tapak gedung.
- Lampu lalu lintas bersiklus pada simpang empat yang memenuhi kriteria lebar jalan. NPC di rute aktif menahan laju saat merah/kuning dan melanjutkan saat hijau.
- Pemain mendapat pemberitahuan ketika mendekati lampu merah/kuning. Kendaraan pemain tidak direm otomatis.

Infrastruktur tambahan merupakan dekorasi dan aturan simulasi yang ditempatkan dari geometri jalan. Posisi lampu, pohon, bangku, dan zebra cross bukan hasil survei fasilitas asli. Kendaraan NPC masih mengikuti rute perjalanan aktif; belum ada lalu lintas lengkap pada semua cabang kota.

## Vespa dan karakter

Tersedia 30 PNG transparan: enam subjek, masing-masing depan, belakang, samping kanan, samping kiri, dan atas. Enam subjek itu adalah Vespa, Bapak, Ibu, Anak, Remaja hijau, serta Remaja terakota.

Folder gambar berada di public/assets/ride-hd. Buka public/assets/ride-hd/galeri.html untuk melihat seluruh gambar. Penjelasan nama file ada di README.md dalam folder tersebut. Atlas sumber juga disertakan.

Kode telah menghubungkan gambar dengan dua karakter terpilih dan sudut kamera. PNG tidak perlu dipasang secara manual satu per satu di komponen. Jika gambar tidak tersedia, model 3D sederhana tetap menjadi cadangan. Model Vespa GLB yang diimpor pada arena kota tetap mengutamakan model tersebut.

Mode ilustrasi merupakan tampilan **2.5D** di dalam kota 3D. Gambar lebih rinci daripada bentuk dasar, tetapi bukan model 3D bertekstur atau animasi tubuh/roda yang lengkap. Untuk putaran bebas tanpa pergantian gambar dan animasi penuh, tahap berikutnya membutuhkan model GLB beserta rig dan animasi yang sesuai. Memperbesar PNG tidak otomatis menghasilkan model 3D.

## Pengujian

- 111 pengujian otomatis lulus.
- Pemeriksaan ruang jalan pada jaringan asli kawasan Ampel tidak menemukan tapak gedung yang memasuki titik-titik sampel aspal dan margin pengujian.
- Pengujian mencakup pemotongan bangunan menjadi beberapa bagian, kamera terhadap dinding, simpang dan fase lampu, berhenti/jalan NPC, pilihan gaya gambar, serta keberadaan 30 PNG dengan kanal alpha.
- Build produksi berhasil; lint tidak memiliki error, dengan 14 peringatan lama.
- Browser produksi diperiksa pada komputer dan layar HP 375 piksel: kelima kamera, penyimpanan pilihan gaya, gas manual, jalan cabang, pemulihan ke jalur, dan galeri 30 gambar.
- Semua karakter serta cadangan model 3D saat gambar gagal dimuat diperiksa tanpa error JavaScript.
- Kelima sudut kamera diperiksa melalui renderer. Geometri dilepas saat renderer ditutup. Angka FPS dari renderer perangkat lunak pengujian tidak dipakai sebagai klaim performa perangkat pengguna.

## File utama

| File | Fungsi |
| --- | --- |
| lib/street-clearance.mjs | Pemotongan tapak gedung terhadap ruang jalan |
| lib/street-world.mjs, street-geometry.mjs, ride-collision.mjs | Bagian gedung, minimap, dan tabrakan yang sesuai |
| lib/street-renderer.mjs, city-textures.mjs | Geometri dan tekstur kota |
| lib/street-furniture.mjs | Penempatan infrastruktur dan fase lampu |
| lib/route-3d-layout.mjs, route-collision.mjs | Respons NPC dan pemberitahuan lampu |
| lib/camera-clearance.mjs | Pencegahan kamera masuk dinding |
| lib/ride-art.mjs, ride-art-scene.mjs | Pemilihan gambar dan tampilan karakter/Vespa |
| lib/city-scene.mjs, ride-settings.mjs | Integrasi renderer dan pilihan kualitas/gaya |
| components/RouteSimulator.js, CityScene.js, RideControls.js | Pengaturan dan tampilan simulator |
| public/assets/ride-hd | Seluruh aset baru dan galeri |

Data jaringan dan tapak tetap © OpenStreetMap contributors menurut ODbL 1.0, seperti dijelaskan pada SUMBER-DATA-KOTA-OSM.md dari patch sebelumnya. Library pemotongan menggunakan polygon-clipping berlisensi MIT: https://github.com/mfogel/polygon-clipping.
