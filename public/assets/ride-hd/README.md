# Gambar Vespa dan karakter lima arah

Folder ini berisi 30 PNG transparan yang siap dipakai oleh patch simulator. Gambar dibuat berdasarkan referensi dari assets.zip milik pengguna. Aset lama pada buildings, characters, items, controls, dan city-cartoon tidak perlu diganti oleh paket ini.

## Isi folder

- vespa/front.png, back.png, right.png, left.png, top.png
- characters/bapak/ dengan lima nama arah yang sama
- characters/ibu/
- characters/anak/
- characters/remaja-hijau/
- characters/remaja-terakota/

Nama front berarti depan, back belakang, right samping menghadap kanan pada gambar, left samping menghadap kiri, dan top tampak atas. Karakter berada dalam pose duduk berkendara. Atlas berakhiran -5-arah.png merupakan sumber lima tampak; baris atas depan, belakang, kanan, baris bawah kiri dan atas.

Buka galeri.html untuk melihat semua gambar dan mengunduh satu per satu. Setelah server menyala, galeri juga tersedia di /assets/ride-hd/galeri.html.

## Cara menempatkan

Salin folder ride-hd ke public/assets/ride-hd. Jangan menjadikannya public/assets/assets/ride-hd. Folder vespa dan characters di dalam ride-hd harus ikut disalin. Kode menggunakan nama folder dan nama file persis seperti yang disediakan.

Gambar per sisi diekstrak dari atlas pada resolusi asli, tanpa pembesaran resolusi buatan. Dimensi persis tiap PNG tercatat pada views.json. Ini aset 2D transparan untuk tampilan 2.5D, bukan file model 3D atau animasi tulang. Kota tetap menggunakan geometri 3D. Pemain dapat memilih Ilustrasi HD · 5 arah atau Model 3D sederhana melalui menu simulator.

Ilustrasi berganti menurut posisi kamera. Karena jumlah sudutnya lima, perpindahan arah memakai pergantian gambar, bukan putaran permukaan 3D secara terus-menerus. Posisi, tabrakan, dan kendali kendaraan tetap dihitung oleh simulasi.

Prompt gambar dan metode pembuatan tersedia pada PROMPT-ASET.md. scripts/export-ride-views.mjs adalah utilitas browser opsional untuk mengekspor ulang atlas. PNG siap pakai sudah disertakan sehingga utilitas tersebut tidak perlu dijalankan untuk bermain.
