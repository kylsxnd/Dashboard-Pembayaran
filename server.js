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
    // Ubah jadi huruf kecil semua biar kebal error besar/kecil
    const sheetNameKey = req.params.sheetName.toLowerCase();
    
    // KAMUS PINTAR TRANSLASI NAMA SHEET
    const sheetMap = {
        'monitoring_pembayaran': 'Monitoring Pembayaran',
        'pdo': 'PDO',
        // INI KUNCINYA: Web minta nama panjang, tapi kita arahin server buat nyari nama pendek (31 huruf limit Excel)
        'monitoring_pembayaran_pengelolaan_mandiri': 'Monitoring Pembayaran Pengelola',
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
            
            // Cari nama sheet di dalam Excel tanpa peduli huruf besar/kecil
            const actualSheetName = workbook.SheetNames.find(
                name => name.toLowerCase() === targetSheetName.toLowerCase()
            );

            // Kalau nama tab beneran nggak ada di file Excel
            if (!actualSheetName || !workbook.Sheets[actualSheetName]) {
                return res.status(404).json({ error: `Sheet "${targetSheetName}" tidak ditemukan di Google Sheets. Cek limit 31 karakter Excel.` });
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
