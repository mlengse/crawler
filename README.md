# Konverter URL ke Markdown

Alat berbasis web yang powerful untuk mengkonversi halaman web ke format Markdown. Dibuat dengan React dan dilengkapi backend Rust/WASM untuk performa yang ditingkatkan.

## 🌟 Fitur

- **Pemrosesan URL Tunggal**: Konversi halaman web individual ke Markdown secara instan
- **Pemrosesan Batch**: Upload file teks dengan multiple URL dan proses semuanya sekaligus
- **Mekanisme Retry**: Percobaan ulang yang dapat dikonfigurasi (1-10) untuk permintaan yang gagal
- **Jeda/Lanjutkan**: Kontrol pemrosesan batch dengan fungsi jeda dan lanjutkan
- **Service Worker untuk CORS**: Mengatasi masalah CORS dengan Service Worker yang otomatis menggunakan proxy
- **Opsi Simpan Multiple**: 
  - Simpan sebagai file individual per URL
  - Simpan sebagai satu file gabungan
- **Preview Real-time**: Lihat Markdown yang dikonversi secara real-time
- **Pelacakan Progress**: Monitor kemajuan pemrosesan batch
- **Penanganan Error**: Pelaporan dan kategorisasi error yang komprehensif
- **Desain Responsif**: Bekerja di desktop dan perangkat mobile

## 🚀 Demo Langsung

Kunjungi aplikasi live: [Konverter URL ke Markdown](https://client-seven-flame-93.vercel.app/)

## 🛠️ Teknologi yang Digunakan

- **Frontend**: React 19.1.0
- **Styling**: CSS3 dengan layout flexbox modern
- **Backend**: Rust dikompilasi ke WebAssembly (WASM)
- **Build Tool**: Create React App
- **Deployment**: Vercel
- **Testing**: Jest, React Testing Library

## 📦 Instalasi

### Prasyarat

- Node.js (versi 18 atau lebih tinggi)
- npm atau yarn package manager

### Development Lokal

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd crawler
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Jalankan development server**
   ```bash
   npm start
   ```

4. **Buka browser**
   Navigasi ke `http://localhost:3000`

### Build untuk Production

```bash
npm run build
```

Ini akan membuat folder `build` dengan file production yang dioptimasi.

## 🎯 Cara Penggunaan

### Pemrosesan URL Tunggal

1. Masukkan URL di field input
2. Klik "Proses URL"
3. Lihat Markdown yang dikonversi di panel preview
4. Klik "Simpan Markdown" untuk download hasilnya

### Pemrosesan Batch

1. Buat file teks dengan satu URL per baris
2. Klik "Pilih File" dan pilih daftar URL Anda
3. Konfigurasi max retries jika diperlukan (default: 3)
4. Klik "Mulai Memproses File"
5. Monitor progress dan gunakan jeda/lanjutkan sesuai kebutuhan
6. Pilih opsi simpan:
   - **Gabungan**: Semua URL dalam satu file
   - **Terpisah**: File individual per URL

### Opsi Konfigurasi

- **Max Retries**: Atur percobaan ulang untuk URL yang gagal (1-10)
- **Mode Simpan**: Pilih antara download file gabungan atau terpisah

## 🏗️ Struktur Project

```
crawler/
├── public/                  # Static assets
│   ├── index.html
│   ├── favicon.ico
│   ├── rust_backend.js      # WASM bindings
│   └── rust_backend_bg.wasm # Kode Rust yang dikompilasi
├── src/
│   ├── App.js              # Komponen aplikasi utama
│   ├── App.css             # Style aplikasi
│   ├── UrlInputPanel.js    # Komponen input URL
│   ├── StatusDisplay.js    # Komponen pesan status
│   ├── PreviewPanel.js     # Komponen preview Markdown
│   ├── ControlsPanel.js    # Komponen tombol kontrol
│   └── index.js            # Entry point React
├── build/                  # Output build production
├── package.json            # Dependencies dan scripts
├── vercel.json            # Config deployment Vercel
└── README.md              # File ini
```

## 🔧 Konfigurasi

### Deployment Vercel

Project ini menyertakan file konfigurasi `vercel.json` untuk deployment yang seamless:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Environment Variables

Tidak ada environment variables yang diperlukan untuk fungsionalitas dasar.

## 🎨 Kustomisasi

### Styling

Modifikasi `src/App.css` untuk menyesuaikan tampilan. Desain mengikuti prinsip UI modern dengan:
- Interface yang bersih dan minimalis
- Desain responsif untuk semua ukuran layar
- Skema warna dan tipografi yang konsisten
- Kontrol form yang dapat diakses

### Menambahkan Fitur

Arsitektur berbasis komponen memudahkan penambahan fitur baru:
- Buat komponen baru di direktori `src/`
- Import dan gunakan di `App.js`
- Tambahkan style yang sesuai di `App.css`

## 🧪 Testing

Jalankan test suite:

```bash
npm test
```

Jalankan test dalam mode CI:

```bash
npm test -- --coverage --watchAll=false
```

## 🚀 Deployment

### Vercel (Direkomendasikan)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login ke Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Platform Lain

Aplikasi yang telah di-build dapat di-deploy ke layanan static hosting mana pun:
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Google Cloud Storage

## 🐛 Isu yang Diketahui

- Loading WASM mungkin fallback ke implementasi JavaScript di beberapa browser
- Pemrosesan batch besar mungkin dibatasi oleh memori browser
- Beberapa website mungkin memblokir cross-origin requests (CORS)

## 🤝 Kontribusi

1. Fork repository
2. Buat feature branch (`git checkout -b feature/fitur-keren`)
3. Commit perubahan Anda (`git commit -m 'Tambah fitur keren'`)
4. Push ke branch (`git push origin feature/fitur-keren`)
5. Buka Pull Request

## 📝 Lisensi

Project ini dilisensikan di bawah MIT License - lihat file [LICENSE](LICENSE) untuk detail.

## 🙏 Pengakuan

- Tim React untuk framework yang luar biasa
- Komunitas Rust dan WebAssembly
- Vercel untuk deployment yang seamless
- Semua kontributor dan pengguna

## 📞 Dukungan

Jika Anda mengalami masalah atau memiliki pertanyaan:
1. Periksa bagian [Issues](../../issues)
2. Buat issue baru dengan informasi detail
3. Sertakan langkah-langkah untuk mereproduksi bug

---

**Dibuat dengan ❤️ menggunakan React dan Rust/WASM**
