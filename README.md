# Dompetku v3.2

Web3-style local wallet + Go Work + Chat World (in-chat) + Marketplace — matte black UI.

## Perubahan v3.2

### Chat World (gaya MLBB, di dalam Chat)
- **Tidak ada tombol World terpisah** — buka **Chat** → tab **🌍 World**
- Feed pesan publik seperti chat global game: **avatar kiri**, nama, jarak GPS, teks
- Hanya **user nyata** (ada di `dk_users` + GPS) — **tanpa bot / akun palsu**
- Tab **Teman** dari Add Teman di pesan World
- PM / chat pribadi tetap lewat tab Chat

### Header lebih lega
- Spacing tombol & padding atas diperbaiki agar tidak sesak

### Laporan keuangan PDF
- Di bawah ringkasan bulan (Okt 2026 dll.)
- Pilih **bulan** + **tahun** → **⬇ PDF Laporan**
- Unduh ringkasan pemasukan / pengeluaran / netto + detail transaksi

### Marketplace & Go Work
- Tetap ada (tombol Market & Work)

## Cara pakai

1. Buka `index.html` (Chrome/Edge, izinkan lokasi).
2. Login → **Chat** → tab **World** → GPS → ketik pesan.
3. Portfolio → pilih bulan/tahun → **PDF Laporan**.

## File

- index.html, style.css, app.js, i18n.js
- chat_v2.js, chatworld.js, gowork.js, marketplace.js
- logo.png, gowork-data.json

## v3.3
- Marketplace tampilan baru: putih bersih, aksen hijau tua, grid produk 2 kolom, kategori, detail bottom-sheet, layar penuh ramah APK/HP.
- Tidak ada lagi postingan bot/demo: Marketplace, Go Work, dan Chat Dunia hanya menampilkan akun yang benar-benar terdaftar.
- Akun "ghost" tidak lagi dibuat otomatis; data ghost/demo lama dibersihkan saat aplikasi dibuka.
