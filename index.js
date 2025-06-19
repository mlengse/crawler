// index.js
// Script Node.js untuk melakukan web scraping guna mendapatkan sub-path dari beberapa URL.
// Script ini akan menjelajahi link yang ditemukan di setiap halaman hingga kedalaman tertentu,
// mengonversi SETIAP URL yang ditemukan (termasuk sub-path) ke PDF, dan menggabungkan semua PDF menjadi satu file.

// Import pustaka yang diperlukan
const axios = require('axios');     // Untuk membuat permintaan HTTP (untuk scraping statis)
const cheerio = require('cheerio');   // Untuk mem-parsing dan memanipulasi HTML (untuk scraping statis)
const readline = require('readline'); // Untuk membaca input dari konsol baris demi baris
const fs = require('fs/promises'); // Modul File System untuk operasi file (dengan Promise API)
const puppeteer = require('puppeteer'); // Untuk mengontrol browser headless (konversi PDF & penjelajahan dinamis)
const { PDFDocument } = require('pdf-lib'); // Untuk menggabungkan file PDF

// Buat antarmuka readline
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Konfigurasi kedalaman eksplorasi link
const MAX_EXPLORATION_DEPTH = 1; // Atur kedalaman eksplorasi link (0 = hanya halaman awal, 1 = halaman awal + link di dalamnya, dst.)
// PERHATIAN: Meningkatkan kedalaman dapat sangat meningkatkan waktu eksekusi dan penggunaan sumber daya.

// Fungsi untuk menjelajahi dan mengumpulkan semua URL unik dalam domain yang sama secara rekursif.
// URL yang ditemukan akan ditambahkan ke Set `allUrlsToConvert`.
async function exploreUrls(url, initialDomain, currentDepth, allUrlsToConvert, browserInstance) {
    // Hentikan rekursi jika kedalaman maksimum tercapai
    if (currentDepth > MAX_EXPLORATION_DEPTH) {
        return;
    }

    // Jika URL sudah ada di Set dan bukan URL awal di kedalaman 0, lewati.
    // Ini penting untuk menghindari loop tak terbatas dan duplikasi.
    if (allUrlsToConvert.has(url) && currentDepth > 0) {
        return;
    }

    // Tambahkan URL saat ini ke Set jika belum ada
    allUrlsToConvert.add(url);
    console.log(`[Kedalaman ${currentDepth}] Menjelajahi: ${url}`);

    let page;
    try {
        page = await browserInstance.newPage();
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 }); // Navigasi dan tunggu halaman dirender
        const htmlContent = await page.content(); // Dapatkan HTML yang dirender
        await page.close(); // Tutup halaman untuk menghemat sumber daya

        const $ = cheerio.load(htmlContent);
        const links = $('a[href]');

        for (const element of links) {
            const href = $(element).attr('href');
            if (href) {
                try {
                    const absoluteUrl = new URL(href, url); // Buat URL absolut dari href relatif
                    // Pastikan link berada dalam domain yang sama dengan domain awal
                    if (absoluteUrl.origin === initialDomain) {
                        // Secara rekursif jelajahi URL yang baru ditemukan
                        await exploreUrls(
                            absoluteUrl.href,
                            initialDomain,
                            currentDepth + 1,
                            allUrlsToConvert, // Set yang sama diteruskan untuk mengumpulkan semua URL
                            browserInstance
                        );
                    }
                } catch (e) {
                    // Abaikan URL yang tidak valid (misalnya, href="#" atau link JavaScript)
                }
            }
        }
    } catch (error) {
        console.warn(`Peringatan: Gagal menjelajahi ${url} pada kedalaman ${currentDepth}: ${error.message}`);
    } finally {
        if (page && !page.isClosed()) { // Pastikan halaman ditutup jika terjadi kesalahan sebelum ditutup secara eksplisit
            await page.close();
        }
    }
}

// Fungsi untuk menghasilkan PDF dari sebuah URL menggunakan Puppeteer (Browserless)
async function generatePdfFromUrl(targetUrl, browserInstance) {
    console.log(`Mengonversi URL ke PDF: ${targetUrl}`);
    let page;
    try {
        page = await browserInstance.newPage();
        await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 60000 }); // Tunggu hingga jaringan idle, timeout 60s

        // Buat nama file PDF sementara yang unik untuk setiap URL
        const pdfFileName = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.pdf`;
        await page.pdf({
            path: pdfFileName,
            format: 'A4',
            printBackground: true // Menyertakan warna dan gambar latar belakang
        });
        console.log(`PDF individual berhasil dibuat untuk ${targetUrl}: ${pdfFileName}`);
        return pdfFileName;
    } catch (error) {
        console.error(`Gagal menghasilkan PDF untuk ${targetUrl}: ${error.message}`);
        return null; // Kembalikan null jika gagal
    } finally {
        if (page) {
            await page.close(); // Tutup halaman setelah selesai
        }
    }
}

// Fungsi untuk menggabungkan beberapa file PDF menjadi satu
async function mergePdfs(pdfFiles, outputFileName) {
    if (pdfFiles.length === 0) {
        console.log('Tidak ada file PDF untuk digabungkan.');
        return;
    }

    console.log(`\nMemulai penggabungan ${pdfFiles.length} file PDF...`);
    const mergedPdf = await PDFDocument.create();

    for (const filePath of pdfFiles) {
        try {
            const pdfBytes = await fs.readFile(filePath);
            const pdf = await PDFDocument.load(pdfBytes);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
            console.log(`Halaman dari ${filePath} berhasil ditambahkan.`);
        } catch (error) {
            console.error(`Gagal menggabungkan file ${filePath}: ${error.message}`);
        }
    }

    const mergedPdfBytes = await mergedPdf.save();
    await fs.writeFile(outputFileName, mergedPdfBytes);
    console.log(`Semua PDF berhasil digabungkan ke: ${outputFileName}`);

    // Hapus file PDF individual sementara setelah digabungkan
    console.log('Menghapus file PDF sementara...');
    for (const filePath of pdfFiles) {
        try {
            await fs.unlink(filePath);
            console.log(`File sementara dihapus: ${filePath}`);
        } catch (error) {
            console.warn(`Gagal menghapus file sementara ${filePath}: ${error.message}`);
        }
    }
}


// Array untuk menyimpan URL yang diinput pengguna
const urlsToProcess = [];

// Fungsi untuk meminta input URL secara berulang
function askForUrl() {
    rl.question('Masukkan URL target (ketik \'done\' jika sudah selesai): ', (input) => {
        const url = input.trim();

        if (url.toLowerCase() === 'done') {
            rl.close(); // Tutup antarmuka readline
            startProcessing(); // Mulai proses utama
            return;
        }

        // Validasi format URL dasar
        try {
            new URL(url);
            urlsToProcess.push(url);
            console.log(`URL ditambahkan: ${url}`);
        } catch (e) {
            console.error(`URL tidak valid: ${e.message}. Harap masukkan URL yang benar.`);
        }
        
        askForUrl(); // Minta URL berikutnya
    });
}

// Fungsi utama untuk mengelola seluruh proses
async function startProcessing() {
    if (urlsToProcess.length === 0) {
        console.log('\nTidak ada URL yang dimasukkan untuk diproses.');
        return;
    }

    console.log('\nMemulai proses: Mengonversi semua URL yang relevan ke PDF dan menjelajahi link...');

    let browser;
    // Set untuk menyimpan semua URL unik yang akan di-PDF-kan dan dieksplorasi
    const allUrlsToConvertAndExplore = new Set();
    const individualPdfPaths = []; // Array untuk menyimpan jalur file PDF individual yang akan digabungkan

    try {
        const BROWSERLESS_AUTH_TOKEN = process.env.BROWSERLESS_TOKEN;
        let browserWSEndpoint = 'ws://localhost:8000';
        if (BROWSERLESS_AUTH_TOKEN) {
            browserWSEndpoint = `ws://localhost:8000?token=${BROWSERLESS_AUTH_TOKEN}`;
            console.log("Menggunakan token Browserless untuk koneksi.");
        }

        browser = await puppeteer.connect({
            browserWSEndpoint: browserWSEndpoint
        });
        console.log('Terhubung ke Browserless.');

        // Tahap 1: Eksplorasi dan pengumpulan semua URL unik (URL utama + sub-path)
        for (const url of urlsToProcess) {
            const initialUrlObject = new URL(url);
            console.log(`\n--- Memulai eksplorasi dan pengumpulan URL dari: ${url} ---`);
            await exploreUrls(
                url,
                initialUrlObject.origin,
                0, // Kedalaman awal
                allUrlsToConvertAndExplore, // Set ini akan diisi oleh fungsi rekursif
                browser
            );
            console.log(`--- Selesai eksplorasi dari: ${url} ---`);
        }

        console.log(`\nTotal ${allUrlsToConvertAndExplore.size} URL unik ditemukan untuk dikonversi ke PDF.`);
        console.log('Memulai konversi semua URL yang ditemukan ke PDF individual...');
        
        // Tahap 2: Konversi setiap URL yang ditemukan ke PDF
        for (const urlToConvert of allUrlsToConvertAndExplore) {
            const pdfPath = await generatePdfFromUrl(urlToConvert, browser);
            if (pdfPath) {
                individualPdfPaths.push(pdfPath);
            }
        }

        console.log('\nSemua PDF individual telah dibuat.');
    } catch (error) {
        console.error(`Terjadi kesalahan fatal: ${error.message}`);
        console.error('Pastikan layanan Browserless Docker berjalan dan dapat diakses di http://localhost:8000.');
        console.error('Jika Anda menggunakan BROWSERLESS_TOKEN, pastikan itu disertakan dalam URL WebSocket (dan diatur di variabel lingkungan).');
        if (error.code === 'ECONNREFUSED' || error.message.includes('ERR_CONNECTION_REFUSED')) {
            console.error('Pastikan kontainer Browserless Anda sedang berjalan dan dapat diakses dari script ini.');
        } else if (error.message.includes('Target closed') || error.message.includes('Protocol error')) {
            console.error('Koneksi ke Browserless mungkin terputus. Pastikan MAX_CONCURRENT_SESSIONS dan CONNECTION_TIMEOUT di konfigurasi Browserless Anda sesuai.');
        }
    } finally {
        if (browser) {
            await browser.disconnect(); // Putuskan koneksi dari Browserless
            console.log('Koneksi ke Browserless diputus.');
        }
    }

    // Tahap 3: Gabungkan semua PDF yang berhasil dibuat
    await mergePdfs(individualPdfPaths, 'merged_webpages_report.pdf');
    console.log('\nProses selesai.');
}

// Mulai meminta URL dari pengguna
console.log('Anda dapat memasukkan beberapa URL. Ketik \'done\' dan tekan Enter setelah selesai.');
askForUrl();
