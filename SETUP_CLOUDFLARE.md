# Petunjuk Penting: Migrasi ke Anthropic (Cloudflare Pages)

Aplikasi ini sekarang menggunakan Anthropic Claude (Haiku) untuk verifikasi otomatis bukti transfer. Berikut adalah langkah-langkah yang **WAJIB** Anda lakukan di Dashboard Cloudflare Pages Anda:

1. **Set Environment Variable (Secret)**:
   - Masuk ke Dashboard Cloudflare Pages Anda.
   - Buka tab **Settings** -> **Environment Variables**.
   - Tambahkan variabel baru:
     - Variable name: `ANTHROPIC_API_KEY`
     - Value: (Masukkan API Key Anthropic Anda dari console.anthropic.com)
   - Pastikan variabel ini diset untuk lingkungan **Production** DAN **Preview**.

2. **Deploy Ulang**:
   - Setelah menyimpan Environment Variable, lakukan redeploy proyek Anda agar folder `functions/` terbaca dan backend serverless aktif.

3. **Struktur Folder**:
   - Pastikan folder `functions/` tetap berada di root project (sejajar dengan `package.json`). Aplikasi sudah dikonfigurasi untuk memanggil `/api/verify-receipt`.

4. **Monitoring**:
   - Anda bisa melihat log verifikasi di tab "Functions" pada dashboard Cloudflare Pages jika terjadi error.

**Catatan Keamanan**:
- File `src/checkout.ts` sekarang bersih dari API Key dan `process.env`.
- Semua kunci rahasia hanya tersimpan dengan aman di server (Cloudflare Functions).
