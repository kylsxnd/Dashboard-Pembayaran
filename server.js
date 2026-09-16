const express = require('express');
const path = require('path');
const XLSX = require('xlsx');
const https = require('https');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index');
});

// Route API LIVE langsung mengambil dari Link Google Sheets Online
app.get('/api/sheet/:sheetName', (req, res) => {
    // 1. Ubah parameter yang dikirim frontend jadi huruf kecil semua biar aman
    const sheetNameKey = req.params.sheetName.toLowerCase();
    
    const sheetMap = {
        'monitoring_pembayaran': 'Monitoring Pembayaran',
        'pdo': 'PDO',
        // 2. Key diubah jadi huruf kecil semua ("mandiri")
        'monitoring_pembayaran_pengelolaan_mandiri': 'Monitoring Pembayaran Pengelolaan Mandiri',
        'spk_lokal': 'SPK Lokal',
        'petty_cash': 'Petty Cash',
        'surat_masuk': 'Surat Masuk',
        'disposisi': 'Disposisi',
        'sp3': 'SP3',
        'surat_keluar': 'Surat Keluar',
        'lpj_sp3': 'LPJ SP3',
        'notulensi': 'NOTULENSI',
        'dana_kontanan': 'DANA KONTANAN',
        'kontanan': 'Kontanan',
        'crash_program': 'Crash Program'
    };

    const targetSheetName = sheetMap[sheetNameKey] || sheetNameKey.replace(/_/g, ' ');
    // URL Export langsung dari Google Sheets kamu
    const googleSheetUrl = 'https://docs.google.com/spreadsheets/d/1IcxrVgQm-WXCHyLebJKcRYyNdkG0ahaTBmTXAUhqMbA/export?format=xlsx';

    https.get(googleSheetUrl, (googleRes) => {
        // Tangani redirect jika ada
        if (googleRes.statusCode >= 300 && googleRes.statusCode < 400 && googleRes.headers.location) {
            https.get(googleRes.headers.location, (redirectRes) => {
                processStream(redirectRes, targetSheetName, res);
            }).on('error', (err) => {
                console.error(err);
                res.status(500).json({ error: "Gagal mengunduh dari Google Sheets." });
            });
            return;
        }

        processStream(googleRes, targetSheetName, res);
    }).on('error', (err) => {
        console.error(err);
        res.status(500).json({ error: "Gagal terhubung ke Google Sheets." });
    });
});

function processStream(stream, targetSheetName, res) {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => {
        try {
            const buffer = Buffer.concat(chunks);
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            
            // 3. Cari sheet di Excel secara otomatis nggak peduli huruf besar/kecil (kebal typo)
            const actualSheetName = workbook.SheetNames.find(
                name => name.toLowerCase() === targetSheetName.toLowerCase()
            );

            // Kalau sheet tetep ga ketemu di dalam file Excel-nya
            if (!actualSheetName || !workbook.Sheets[actualSheetName]) {
                return res.status(404).json({ error: `Sheet "${targetSheetName}" tidak ditemukan di Google Sheets. Pastikan nama tab di Excel sama persis.` });
            }

            const worksheet = workbook.Sheets[actualSheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
            res.json({ rows });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Gagal memproses data dari Google Sheets." });
        }
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server Live Google Sheets berjalan di http://localhost:${PORT}`);
});
