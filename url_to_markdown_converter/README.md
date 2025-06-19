# URL to Markdown Converter (GUI)

Aplikasi desktop sederhana yang dibuat dengan Rust dan `iced` untuk mengubah daftar URL dari sebuah file teks menjadi satu dokumen Markdown tunggal. Setiap URL diproses dengan meminta konten Markdown dari layanan eksternal (`https://urltomarkdown.herokuapp.com/`).

Fitur Utama:
*   Antarmuka pengguna grafis (GUI) yang mudah digunakan.
*   Memilih file input (`.txt`) yang berisi daftar URL.
*   Memproses setiap URL secara asinkron.
*   Menggabungkan hasil Markdown dari semua URL (atau pesan kesalahan jika terjadi masalah) ke dalam satu file.
*   Menyimpan hasil gabungan ke file Markdown (`.md`).

## Persiapan Lingkungan

Untuk dapat membangun dan menjalankan aplikasi ini dari kode sumber, Anda memerlukan beberapa hal berikut:

1.  **Instalasi Rust dan Cargo:**
    *   Aplikasi ini ditulis dalam bahasa Rust. Anda perlu menginstal Rust dan manajer paketnya, Cargo.
    *   Cara termudah untuk menginstal adalah melalui `rustup`. Kunjungi [situs resmi Rust](https://www.rust-lang.org/tools/install) untuk instruksi instalasi yang sesuai dengan sistem operasi Anda.

2.  **Dependensi Sistem (Khusus Pengguna Linux):**
    *   Aplikasi ini menggunakan pustaka `rfd` (Rust File Dialogs) untuk menampilkan dialog pemilihan file secara native.
    *   Pada sistem Linux, `rfd` bergantung pada GTK3. Anda perlu menginstal pustaka pengembangan GTK3 dan GLib2.
    *   Untuk distribusi berbasis Debian/Ubuntu, Anda dapat menginstalnya dengan perintah:
        ```bash
        sudo apt-get update
        sudo apt-get install libgtk-3-dev libglib2.0-dev
        ```
    *   Untuk distribusi Linux lainnya, silakan cari paket yang setara (misalnya, `gtk3-devel` dan `glib2-devel` pada Fedora).
    *   Pengguna macOS dan Windows umumnya tidak memerlukan langkah instalasi dependensi sistem tambahan untuk dialog file, karena `rfd` menanganinya secara berbeda pada platform tersebut.

## Menjalankan Aplikasi

Setelah lingkungan Anda siap, ikuti langkah-langkah berikut untuk menjalankan aplikasi:

1.  **Clone Repositori (Jika Perlu):**
    *   Jika Anda belum memiliki kode sumbernya, clone repositori ini (jika ini adalah proyek Git):
        ```bash
        # Ganti dengan URL repositori yang benar jika ada
        # git clone https://example.com/url_to_markdown_converter.git
        # cd url_to_markdown_converter
        ```
    *   Jika Anda mendapatkan kode sumber melalui cara lain (misalnya, unduhan ZIP), cukup ekstrak dan navigasi ke direktori utama proyek.

2.  **Navigasi ke Direktori Proyek:**
    *   Pastikan Anda berada di direktori root proyek `url_to_markdown_converter` di terminal Anda. Direktori ini adalah tempat `Cargo.toml` berada.

3.  **Jalankan dengan Cargo:**
    *   Gunakan perintah berikut untuk membangun dan menjalankan aplikasi:
        ```bash
        cargo run
        ```
    *   Perintah ini akan mengkompilasi aplikasi dalam mode debug dan menjalankannya. Kompilasi pertama kali mungkin memakan waktu lebih lama karena semua dependensi perlu diunduh dan dikompilasi.
    *   Untuk kinerja yang lebih baik (setelah pengujian awal selesai), Anda dapat menjalankan versi rilis yang dioptimalkan:
        ```bash
        cargo run --release
        ```

## Cara Menggunakan Aplikasi

Berikut adalah langkah-langkah untuk menggunakan aplikasi ini:

1.  **Siapkan File Input:**
    *   Buat sebuah file teks biasa (dengan ekstensi `.txt`).
    *   Di dalam file ini, masukkan daftar URL yang ingin Anda konversi. Setiap URL harus berada di baris baru.
    *   Contoh isi file `urls.txt`:
        ```
        https://www.rust-lang.org/
        https://docs.rs/iced/latest/iced/
        https://github.com/tokio-rs/tokio
        ```

2.  **Jalankan Aplikasi:**
    *   Gunakan `cargo run` atau `cargo run --release` seperti yang dijelaskan di bagian "Menjalankan Aplikasi". Jendela aplikasi akan muncul.

3.  **Buka File URL:**
    *   Klik tombol "**Buka File URL**".
    *   Sebuah dialog pemilihan file akan muncul. Pilih file `.txt` yang telah Anda siapkan pada langkah 1.
    *   Setelah memilih file, path (lokasi) file tersebut akan ditampilkan di bawah tombol "Buka File URL".

4.  **Mulai Proses Konversi:**
    *   Klik tombol "**Mulai Proses**".
    *   Aplikasi akan mulai mengambil konten Markdown untuk setiap URL dalam file.
    *   Anda dapat melihat progres dan status saat ini di area pesan status di bagian bawah jendela aplikasi (misalnya, "Memproses URL x dari y: ...").

5.  **Simpan Hasil Markdown:**
    *   Setelah semua URL selesai diproses, pesan status akan berubah (misalnya, "Pemrosesan selesai. X markdown diambil.").
    *   Tombol "**Simpan Markdown**" sekarang akan aktif. Klik tombol ini.
    *   Dialog penyimpanan file akan muncul. Pilih lokasi di mana Anda ingin menyimpan file hasil Markdown, dan berikan nama file (misalnya, `hasil_markdown.md`).
    *   Klik "Simpan".

6.  **Periksa Hasil:**
    *   Buka file Markdown yang baru saja Anda simpan. File ini akan berisi gabungan konten Markdown dari semua URL yang berhasil diproses.
    *   Jika terjadi kesalahan saat memproses URL tertentu, pesan kesalahan terkait URL tersebut akan disertakan dalam file hasil, sehingga Anda tahu URL mana yang gagal.

## Pengujian

Pengujian utama untuk aplikasi dengan antarmuka grafis seperti ini umumnya dilakukan secara manual. Berikut adalah beberapa skenario yang disarankan untuk diuji:

*   **Fungsionalitas Inti:**
    *   Memproses file `.txt` dengan daftar URL yang valid. Pastikan semua URL berhasil dikonversi dan hasilnya tergabung dengan benar di file output Markdown.
    *   Pemisah antar konten Markdown dari URL yang berbeda (`---`) muncul dengan benar.
*   **Penanganan Input:**
    *   Menggunakan file input yang kosong. Aplikasi seharusnya menangani ini dengan baik (misalnya, menampilkan pesan "Tidak ada URL ditemukan").
    *   Menggunakan file input dengan beberapa URL valid dan beberapa URL yang tidak valid atau tidak dapat diakses (misalnya, URL yang salah ketik, domain yang tidak ada, atau halaman yang mengembalikan error 404 atau 500 dari layanan konversi). Pastikan pesan kesalahan untuk URL yang gagal disertakan dalam output.
*   **Interaksi Pengguna:**
    *   Membatalkan dialog pemilihan file saat mengklik "Buka File URL".
    *   Membatalkan dialog penyimpanan file saat mengklik "Simpan Markdown".
    *   Mengklik tombol "Mulai Proses" tanpa memilih file terlebih dahulu.
    *   Mengklik tombol "Simpan Markdown" sebelum proses selesai atau jika tidak ada hasil.
*   **Status dan Pesan Kesalahan:**
    *   Memastikan pesan status di GUI memberikan informasi yang jelas tentang apa yang sedang dilakukan aplikasi atau jika terjadi kesalahan.

### Pengujian Kode Sumber

Selain pengujian manual, Anda juga dapat menggunakan perintah Cargo standar:

*   **Periksa Kompilasi:**
    ```bash
    cargo check
    ```
    Perintah ini akan dengan cepat memeriksa apakah kode Anda dapat dikompilasi tanpa benar-benar menghasilkan *executable*. Ini berguna untuk menangkap kesalahan sintaks atau masalah dependensi.

*   **Bangun Aplikasi (Build):**
    ```bash
    cargo build
    ```
    Perintah ini akan mengkompilasi kode Anda dan menghasilkan *executable* di direktori `target/debug/`.
    Untuk build rilis yang dioptimalkan:
    ```bash
    cargo build --release
    ```
    *Executable* akan berada di `target/release/`. Anda dapat menjalankan *executable* ini secara langsung.
