# Jaringan jalan kota asli dan bangunan dalam blok

Patch ini memperluas **simulator perjalanan ke maqbarah** menjadi kawasan jalan yang dapat dijelajahi. Jalan cabang memakai geometri OpenStreetMap, bukan persimpangan acak yang ditempel pada satu lintasan.

## Memasang

1. Pasang setelah **Patch Rute Peta dan Panah Hijau** pada proyek terakhir.
2. Hentikan server dengan Ctrl+C dan cadangkan folder proyek.
3. Ekstrak isi ZIP ke folder proyek yang memiliki package.json. Gabungkan folder dan ganti file bernama sama. Folder app/api/world dan file data/ampel-street-snapshot.json harus ikut disalin.
4. Jalankan `npm run dev`, lalu muat ulang browser dengan Ctrl+Shift+R. Tidak ada dependensi atau gambar aset baru yang perlu dipasang.
5. Pilih dua karakter, pilih maqbarah, hitung rute, lalu tekan **Berangkat**. Buka **Menu → Jalan & blok kota asli** untuk melihat status data kawasan.

Gunakan Berangkat pada panel maqbarah. Arena kota 3D dan latihan jalan lurus merupakan arena terpisah.

## Yang berubah

- Pertigaan, perempatan, jalan lokal, jalan permukiman, dan belokan muncul berdasarkan ruas jalan yang dipetakan di OSM. Bukan seluruh persimpangan selalu memiliki empat cabang; bentuknya mengikuti data kawasan.
- Vespa dapat masuk jalan cabang yang sudah dimuat. Batas koridor lama 60 meter dilepas untuk kawasan tersebut. Penjelajahan tetap dibatasi sekitar 3 km dari rute aktif.
- Jalan yang dipetakan sebagai jalan kendaraan memakai lebarnya dari data jika tersedia; lebar yang tidak tercatat diestimasi menurut jenis jalan.
- Bangunan mengikuti poligon tapak OSM, termasuk yang berada di dalam blok dan jauh dari rute hijau. Poligon menjadi bentuk 3D sederhana dengan tabrakan yang mengikuti tapaknya.
- Tinggi memakai tag tinggi/jumlah lantai bila tersedia, dengan batas render. Jika tidak ada, tinggi diestimasi. Warna, jendela, dan tampilan fasad merupakan ilustrasi.
- Jalur hijau tetap menunjukkan rute awal ke maqbarah. Minimap sekarang menampilkan jalan-jalan sekitar dan tapak bangunan agar percabangan terbaca.
- Kawasan mengikuti posisi Vespa, bukan hanya kemajuan pada rute utama. Progres menyimpan posisi sebenarnya ketika pemain berhenti di cabang jalan.
- Menu menyediakan tombol **Muat ulang kawasan**. Jika data belum dimuat, perjalanan menjauh ke kawasan yang kosong ditahan dan pemain diberi pesan. Game tidak mengarang jaringan jalan pengganti.
- Bangunan/tanaman prosedural lama tidak menimpa kawasan yang sudah memiliki data OSM. Titik layanan simulasi di kawasan tersebut memakai penanda kecil; layanan tetap melalui menu saat berada dekat aksesnya.

## Data kawasan awal

Kawasan Ampel disertakan sebagai snapshot lokal dengan **384 potongan ruas jalan kendaraan dan 6.624 poligon tapak bangunan**. Ini jumlah data kawasan, bukan jumlah objek yang sekaligus digambar. Renderer menampilkan objek terdekat sesuai kualitas grafis.

Area snapshot sekitar 112.737–112.749 BT dan 7.234–7.222 LS. Kawasan di luar snapshot diminta bertahap melalui API proyek. Snapshot ini bukan seluruh Surabaya atau seluruh Indonesia. Ketersediaan cabang dan bangunan mengikuti kelengkapan data OSM pada lokasi tersebut.

## Batas tahap ini

- Jalan dimodelkan pada permukaan datar. Jalan bertingkat, jembatan, terowongan, jalan tol, jalan khusus pejalan kaki, dan akses yang ditandai terlarang dikecualikan untuk menghindari sambungan palsu pada persilangan berbeda tingkat.
- Tapak bangunan dari way tertutup didukung. Bangunan multipolygon dengan lubang/courtyard yang hanya direpresentasikan sebagai relation belum dimuat dari API kawasan.
- Belum ada perhitungan ulang rute saat salah belok. Cari kembali jalur hijau melalui jaringan jalan, atau gunakan Menu → **Kembali ke jalur**. Tombol tersebut tetap mempertahankan bahan bakar dan persediaan.
- NPC kendaraan masih mengikuti rute perjalanan utama. Prioritas kendaraan di seluruh persimpangan, pelanggaran satu arah, dan lampu lalu lintas geografis belum menjadi sistem lengkap pada tahap ini.
- Kualitas ini merupakan kota 3D sederhana dari geodata, bukan model fotorealistis atau replika bangunan asli. Foto/tekstur saja tidak menentukan posisi jalan maupun bangunan.
- Fitur kawasan membutuhkan server Next.js aktif dan internet untuk area lanjutan. Koneksi browser ke API lokal tidak cukup jika server tidak dapat mengakses penyedia OSM/Overpass.

## Jika kawasan belum muncul

Buka Menu dan lihat status. Pastikan file snapshot serta app/api/world/route.js sudah disalin, server sudah direstart, dan halaman sudah dimuat ulang. Coba **Muat ulang kawasan**. Saat penyedia data tidak merespons, kawasan yang sudah tersedia tetap dapat digunakan dan rute aktif tetap menjadi jalur cadangan.

Untuk pengembangan lokal, endpoint publik digunakan sebagai bawaan. Hosting dengan banyak pemain perlu layanan data/Overpass sendiri atau penyedia yang mendukung volume tersebut. Pengaturan server opsional dijelaskan pada PENGATURAN-KAWASAN.example.env; tidak diperlukan untuk mencoba kawasan awal Ampel.

## Validasi

- 105 pengujian lulus, termasuk cabang jalan lebih dari 60 meter, rejoin rute, tabrakan tapak cekung, simpan/pulih posisi cabang, penggabungan potongan ruas pada dua kawasan, dan batas cache.
- Build produksi berhasil; lint tidak memiliki error, dengan 14 peringatan lama.
- Browser produksi diperiksa pada komputer dan HP 375 piksel, termasuk gas manual pada jalan cabang, minimap, pemulihan ke jalur, API snapshot, validasi permintaan, penggabungan permintaan bersamaan, dan cache.
- Jalur pengunduhan/parsing API diuji memakai upstream lokal dengan respons XML OSM asli. Keberhasilan ini bukan jaminan ketersediaan endpoint publik setiap saat.
- Uji renderer pada 25 posisi kawasan nyata: 8–13 geometri aktif, kembali menjadi 0 setelah ditutup. Tidak ada jaminan FPS yang sama pada semua perangkat.

Rincian file dan atribusi data ada pada SUMBER-DATA-KOTA-OSM.md.
