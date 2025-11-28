# Crawler Features Documentation

## Fitur Baru yang Ditambahkan

### 1. **Dua Mode Pemrosesan URL**

Sekarang ada dua tombol berbeda untuk memproses URL:

- **Crawl & Process** - Mencari semua sub-path di domain yang diinput, lalu menampilkan daftar untuk dipilih
- **Process Only** - Langsung memproses URL yang diinput tanpa crawling

### 2. **Konfigurasi Maksimal Link Crawl**

Di Control Panel, Anda dapat mengatur maksimal jumlah link yang akan di-crawl:
- Default: 100 link
- Range: 1 - 1000 link
- Input field: "Maksimal Link Crawl"

### 3. **Preview dan Seleksi Sub-Path**

Setelah crawling selesai, muncul UI untuk:
- Melihat semua sub-path yang ditemukan
- Memilih/deselect individual path dengan checkbox
- Select All / Deselect All dengan satu tombol
- Badge **PDF** untuk file PDF yang ditemukan
- Tombol "Proses X Terpilih" untuk memulai pemrosesan

### 4. **Handling PDF Otomatis**

- File PDF **tidak** dikonversi ke markdown
- File PDF akan di-download langsung ke browser
- Pemisahan otomatis antara HTML dan PDF saat processing

### 5. **WASM Crawler Function**

Ditambahkan fungsi `extract_links_from_html()` di Rust WASM untuk:
- Ekstraksi link lebih cepat
- Parsing HTML di level WASM
- Performa lebih baik untuk crawling besar

## Cara Penggunaan

### Crawl & Process Mode

1. Masukkan URL domain (contoh: `example.com` atau `https://example.com`)
2. Klik tombol **"Crawl & Process"**
3. Tunggu sistem mencari sub-path
4. Review daftar sub-path yang ditemukan
5. Pilih path yang ingin diproses (atau gunakan "Select All")
6. Klik **"Proses X Terpilih"**
7. File PDF akan otomatis di-download
8. Halaman HTML akan dikonversi ke markdown

### Process Only Mode

1. Masukkan URL lengkap (contoh: `https://example.com/blog/post-1`)
2. Klik tombol **"Process Only"**
3. URL akan langsung diproses tanpa crawling

## Konfigurasi

### Maksimal Link Crawl
- Terletak di Control Panel
- Input number field
- Default: 100
- Minimum: 1
- Maximum: 1000

### Maksimal Retry per URL
- Tetap ada (tidak berubah)
- Default: 3
- Range: 1-10

## Technical Details

### File yang Dimodifikasi

1. **App.js**
   - Tambah state: `maxCrawlLinks`, `discoveredPaths`, `selectedPaths`, `showPathSelection`
   - Fungsi baru: `handleCrawlAndProcess`, `handleProcessSelectedPaths`, `handleTogglePathSelection`, `handleToggleAllPaths`
   - Update `crawlUrls()` untuk return object dengan `urls` dan `pdfCount`

2. **UrlInputPanel.js**
   - Ganti single submit button dengan dua button: Crawl & Process dan Process Only
   - Props baru: `onCrawlAndProcess`

3. **ControlsPanel.js**
   - Tambah input field untuk `maxCrawlLinks`
   - Props baru: `maxCrawlLinks`, `onMaxCrawlLinksChange`

4. **App.css**
   - Styling untuk path selection panel
   - Button group styling
   - PDF badge styling
   - Checkbox list styling

5. **src/lib.rs** (WASM)
   - Fungsi baru: `extract_links_from_html()`
   - Link extraction di level WASM

### Filter Link

Saat crawling, sistem otomatis memfilter:
- Link anchor (#)
- mailto:
- tel:
- javascript:
- File binary (kecuali PDF): .jpg, .png, .gif, .svg, .zip, .tar, .gz, .exe, .dmg, .iso
- Link eksternal (hanya same-origin)

### PDF Handling

File PDF dideteksi dari ekstensi `.pdf` di URL:
- Ditampilkan dengan badge merah "PDF"
- Di-download langsung saat "Proses X Terpilih" diklik
- Tidak masuk ke proses konversi markdown

## Build Instructions

### Rebuild WASM (jika perlu)

```bash
cd src
wasm-pack build --target web --out-dir pkg
```

### Build React App

```bash
npm run build
```

### Development Mode

```bash
npm start
```

## Troubleshooting

### CORS Issues
Jika crawling gagal karena CORS, fallback akan memproses root page saja.

### PDF Download Blocked
Browser mungkin memblokir multiple downloads. Pastikan allow downloads di browser settings.

### WASM Not Loading
Check browser console. Fallback JavaScript converter akan digunakan jika WASM gagal load.

## Future Improvements

Potensial fitur yang bisa ditambahkan:
- Multi-level crawling (depth > 1)
- Sitemap.xml parsing
- Robots.txt respect
- Server-side crawler untuk avoid CORS
- Export daftar discovered URLs
- Regex filter untuk URL selection
- Domain whitelist/blacklist

---

**Last Updated:** November 28, 2025
