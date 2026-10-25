# Model kota opsional

Kawasan dapat dimainkan dengan model bawaan. Letakkan GLB standar bertekstur tertanam di folder ini dan daftarkan pada `city-manifest.json`. Slot: house, shop, car, motorcycle, vespa. Null memakai bentuk dari kode. Loader hanya digunakan oleh kawasan **Kota 3D & lalu lintas**, bukan simulator rute geografis lama.

Sumbu atas Y, depan +Z, GLB versi 2 maksimal 20 MB. Dasar dan pusat model dinormalisasi otomatis. Tidak memerlukan file PNG terpisah jika semua tekstur tertanam. Jangan memakai kompresi Draco/Meshopt untuk contoh loader ini. Baca `PETUNJUK-KOTA-3D.md` di root proyek untuk detail.
