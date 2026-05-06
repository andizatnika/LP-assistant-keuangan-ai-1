import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import emailjs from '@emailjs/browser';

// ── Firebase Init ────────────────────────────────────────────────
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

// ── Konstanta ────────────────────────────────────────────────────
const EMAILJS_SERVICE_ID  = 'service_euvp1wfa';
const EMAILJS_TEMPLATE_ID = 'template_f0vdyjr';
const EMAILJS_PUBLIC_KEY  = 'IjIwx_pBHLVTEbyrr';
const WA_ADMIN            = '6283892802483';
const CHECKOUT_URL = 'https://rumahaistudio.my.id/checkout?step=2';

const BANK_MAP: Record<string, { label: string; rek: string; an: string }> = {
  bri:     { label: 'Bank BRI',     rek: '009201001828567', an: 'ANDI ZATNIKA'       },
  mandiri: { label: 'Bank Mandiri', rek: '1820004264586',   an: 'ANDI ZATNIKA'       },
  bca:     { label: 'Bank BCA',     rek: '0383175779',      an: 'HANA SUNDARI PUTRI' }
};

// ── State ────────────────────────────────────────────────────────
let orderData: any = {};
let uploadedImageBase64: string | null = null;

// Harga unik per sesi untuk memudahkan verifikasi
const uniquePrice       = 99000 + Math.floor(Math.random() * 999) + 1;
const formattedPriceStr = 'Rp ' + uniquePrice.toLocaleString('id-ID');

// ── DOM References ───────────────────────────────────────────────
const steps = [
  document.getElementById('step-1') as HTMLElement,
  document.getElementById('step-2') as HTMLElement,
  document.getElementById('step-3') as HTMLElement
];

const iNama     = document.getElementById('nama')             as HTMLInputElement;
const iEmail    = document.getElementById('email')            as HTMLInputElement;
const iPass     = document.getElementById('password')         as HTMLInputElement;
const iConfPass = document.getElementById('confirm-password') as HTMLInputElement;
const iWa       = document.getElementById('whatsapp')         as HTMLInputElement;
const btnNext   = document.getElementById('btn-next')         as HTMLButtonElement;
btnNext.disabled = false;
btnNext.className = 'w-full bg-amber hover:bg-yellow-500 text-darkgreen font-heading font-bold text-lg py-4 rounded-full transition flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(245,158,11,0.2)]';

const togglePass  = document.getElementById('toggle-password') as HTMLButtonElement;
const eyeIcon     = document.getElementById('eye-icon')        as HTMLElement;
const matchIcon   = document.getElementById('match-icon')      as HTMLElement;
const str1        = document.getElementById('strength-1')      as HTMLElement;
const str2        = document.getElementById('strength-2')      as HTMLElement;
const str3        = document.getElementById('strength-3')      as HTMLElement;
const strText     = document.getElementById('strength-text')   as HTMLElement;

const dropArea      = document.getElementById('drop-area')      as HTMLElement;
const fileInput     = document.getElementById('file-input')     as HTMLInputElement;
const uploadPrompt  = document.getElementById('upload-prompt')  as HTMLElement;
const uploadPreview = document.getElementById('upload-preview') as HTMLElement;
const previewImage  = document.getElementById('preview-image')  as HTMLImageElement;
const fileNameEl    = document.getElementById('file-name')      as HTMLElement;
const fileSizeEl    = document.getElementById('file-size')      as HTMLElement;
const removeBtn     = document.getElementById('remove-file')    as HTMLButtonElement;
const btnConfirm    = document.getElementById('btn-confirm')    as HTMLButtonElement;
const btnConfirmTxt = document.getElementById('btn-confirm-text') as HTMLElement;
const btnSpinner    = document.getElementById('btn-spinner')    as HTMLElement;
const verifyMsg     = document.getElementById('verify-message') as HTMLElement;
const btnManualWa   = document.getElementById('btn-manual-wa')  as HTMLButtonElement;
// ── Auto-redirect ke step 2 kalau ada ?step=2 di URL ─────────────
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('step') === '2') {
  // Ambil data dari sessionStorage kalau ada
  const saved = sessionStorage.getItem('keuanganAiOrder');
  if (saved) {
    orderData = JSON.parse(saved);
    
    const b = BANK_MAP[orderData.bank] || BANK_MAP['bca'];
    
    document.getElementById('display-name')!.textContent = orderData.name || 'Kak';
    
    const rekCard = document.getElementById('rek-card') as HTMLElement;
    rekCard.innerHTML = `
      <p class="font-heading text-lg font-bold text-white mb-2">🏦 ${b.label}</p>
      <p class="text-sm text-gray-400 mb-0.5">No. Rekening:</p>
      <p class="font-mono text-2xl font-bold tracking-widest text-emerald mb-3">${b.rek}</p>
      <p class="text-sm text-gray-300 mb-1">Atas Nama: <strong class="text-white">${b.an}</strong></p>
      <p class="text-sm text-gray-300 mb-4">Jumlah Transfer: <strong class="text-white">${formattedPriceStr}</strong></p>
      <button type="button"
        class="btn-copy text-sm bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg flex items-center gap-2 transition"
        data-copy="${b.rek}">
        Salin Nomor Rekening
      </button>`;

    rekCard.querySelector('.btn-copy')!.addEventListener('click', function(this: HTMLElement) {
      navigator.clipboard.writeText(this.getAttribute('data-copy')!);
      const orig = this.innerHTML;
      this.innerHTML = '✓ Tersalin!';
      this.classList.add('text-emerald');
      setTimeout(() => { this.innerHTML = orig; this.classList.remove('text-emerald'); }, 2000);
    });

    showStep(1); // index 1 = halaman 2 (pembayaran)
    
  } else {
    // Tidak ada data → tampilkan pesan minta isi form dulu
    const rekCard = document.getElementById('rek-card') as HTMLElement;
    document.getElementById('display-name')!.textContent = 'Kak';
    rekCard.innerHTML = `
      <div class="text-center py-4">
        <p class="text-amber font-semibold mb-2">⚠️ Sesi habis atau link sudah dipakai</p>
        <p class="text-gray-400 text-sm mb-4">Silakan daftar ulang untuk melanjutkan pembayaran.</p>
        <a href="/checkout" class="bg-amber text-darkgreen font-bold py-2 px-6 rounded-full text-sm">
          Daftar Ulang →
        </a>
      </div>`;
    showStep(1);
  }
}
// ── Init UI ──────────────────────────────────────────────────────
document.querySelectorAll('.dynamic-price').forEach(el => { el.textContent = formattedPriceStr; });
document.getElementById('exact-price-warning')!.innerHTML =
  `⚠️ Transfer TEPAT <strong>${formattedPriceStr}</strong> (tidak kurang/lebih) agar mudah diverifikasi dan otomatis aktif.`;

// ── Helpers ──────────────────────────────────────────────────────
function showStep(idx: number) {
  steps.forEach((el, i) => {
    el.classList.toggle('hidden-step',  i !== idx);
    el.classList.toggle('visible-step', i === idx);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const validateEmail    = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validatePassword = (v: string) => v.length >= 6;

const formatWaNumber = (wa: string) =>
  wa.replace(/\D/g, '').replace(/^0/, '62');

// ── Password Strength ────────────────────────────────────────────
const updateStrength = (pass: string) => {
  let score = 0;
  if (pass.length >= 6) score++;
  if (pass.length >= 8 && /[0-9]/.test(pass)) score++;
  if (/[A-Z]/.test(pass) && /[^a-zA-Z0-9]/.test(pass)) score++;

  [str1, str2, str3].forEach(el => {
    el.style.width = '0%';
    el.className = 'h-full w-0 transition-all duration-300';
  });

  if (!pass.length) { strText.textContent = 'Lemah'; return; }

  if (score === 1) {
    str1.style.width = '100%'; str1.classList.add('bg-red-500');
    strText.textContent = 'Lemah';
  } else if (score === 2) {
    str1.style.width = '100%'; str1.classList.add('bg-amber');
    str2.style.width = '100%'; str2.classList.add('bg-amber');
    strText.textContent = 'Sedang';
  } else {
    str1.style.width = '100%'; str1.classList.add('bg-emerald');
    str2.style.width = '100%'; str2.classList.add('bg-emerald');
    str3.style.width = '100%'; str3.classList.add('bg-emerald');
    strText.textContent = 'Kuat';
  }
};

// ── Form Validation ──────────────────────────────────────────────
const checkFormValidity = () => {
  const valid =
    iNama.value.trim() !== '' &&
    validateEmail(iEmail.value) &&
    validatePassword(iPass.value) &&
    iPass.value !== '' && iPass.value === iConfPass.value &&
    iWa.value.trim().length >= 10 &&
    document.querySelector('input[name="bank"]:checked') !== null;

  if (iConfPass.value !== '') {
    matchIcon.classList.remove('hidden');
    matchIcon.innerHTML = iPass.value === iConfPass.value
      ? `<svg class="w-5 h-5 text-emerald" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
         </svg>`
      : `<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
         </svg>`;
  } else {
    matchIcon.classList.add('hidden');
  }
};

[iNama, iEmail, iPass, iConfPass, iWa].forEach(el =>
  el.addEventListener('input', checkFormValidity)
);
document.querySelectorAll('.bank-radio').forEach(r =>
  r.addEventListener('change', checkFormValidity)
);
iPass.addEventListener('input', e =>
  updateStrength((e.target as HTMLInputElement).value)
);

// ── Toggle Password Visibility ───────────────────────────────────
togglePass.addEventListener('click', () => {
  const show = iPass.type === 'password';
  iPass.type = show ? 'text' : 'password';
  eyeIcon.innerHTML = show
    ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
         d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7
            a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243
            M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29
            m7.532 7.532l3.29 3.29M3 3l3.59 3.59
            m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7
            a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>`
    : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
         d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
         d="M2.458 12C3.732 7.943 7.523 5 12 5
            c4.478 0 8.268 2.943 9.542 7
            -1.274 4.057-5.064 7-9.542 7
            -4.477 0-8.268-2.943-9.542-7z"/>`;
});

// ── STEP 1: Klik "Lanjut ke Pembayaran" ─────────────────────────
// Hanya simpan data ke memori. BELUM buat akun Firebase.
btnNext.addEventListener('click', () => {
  const form = document.getElementById('checkout-form') as HTMLFormElement;
  if (form && !form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  if (!validatePassword(iPass.value)) {
    alert("Password minimal harus 6 karakter.");
    iPass.focus();
    return;
  }
  if (iPass.value !== iConfPass.value) {
    alert("Konfirmasi password tidak sesuai.");
    iConfPass.focus();
    return;
  }
  if (iWa.value.trim().length < 10) {
    alert("Mohon masukkan nomor WhatsApp yang benar (minimal 10 angka).");
    iWa.focus();
    return;
  }

  const bankEl = document.querySelector('input[name="bank"]:checked') as HTMLInputElement;
  if (!bankEl) {
    alert("Mohon pilih bank untuk mentransfer.");
    return;
  }
  
  const bank = bankEl.value;
  const b    = BANK_MAP[bank];

  orderData = {
    name:     iNama.value.trim(),
    email:    iEmail.value.trim(),
    password: iPass.value,
    wa:       iWa.value.trim(),
    bank
  };
  
// Simpan ke sessionStorage untuk link email
  sessionStorage.setItem('keuanganAiOrder', JSON.stringify({
    name: orderData.name,
    email: orderData.email,
    wa: orderData.wa,
    bank: orderData.bank
  }));
  // Tampilkan info rekening di step 2
  document.getElementById('display-name')!.textContent = orderData.name;

  const rekCard = document.getElementById('rek-card') as HTMLElement;
  rekCard.innerHTML = `
    <p class="font-heading text-lg font-bold text-white mb-2">🏦 ${b.label}</p>
    <p class="text-sm text-gray-400 mb-0.5">No. Rekening:</p>
    <p class="font-mono text-2xl font-bold tracking-widest text-emerald mb-3">${b.rek}</p>
    <p class="text-sm text-gray-300 mb-1">Atas Nama: <strong class="text-white">${b.an}</strong></p>
    <p class="text-sm text-gray-300 mb-4">Jumlah Transfer: <strong class="text-white">${formattedPriceStr}</strong></p>
    <button type="button"
      class="btn-copy text-sm bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg flex items-center gap-2 transition"
      data-copy="${b.rek}">
      Salin Nomor Rekening
    </button>`;

  rekCard.querySelector('.btn-copy')!.addEventListener('click', function(this: HTMLElement) {
    navigator.clipboard.writeText(this.getAttribute('data-copy')!);
    const orig = this.innerHTML;
    this.innerHTML = '✓ Tersalin!';
    this.classList.add('text-emerald');
    setTimeout(() => { this.innerHTML = orig; this.classList.remove('text-emerald'); }, 2000);
  });

  // Kirim email notifikasi ke user
  emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    {
      to_email:     orderData.email,
      to_name:      orderData.name,
      bank_name:    b.label,
      rek_number:   b.rek,
      rek_an:       b.an,
      amount:       formattedPriceStr,
      checkout_url: CHECKOUT_URL,
      wa_number:    orderData.wa
    },
    EMAILJS_PUBLIC_KEY
  ).then(() => {
    console.log('✅ Email terkirim ke', orderData.email);
  }).catch(err => {
    console.error('EmailJS error:', err);
  });

  // Kirim reminder ke WA user
  const waMsg =
`Halo ${orderData.name} 👋

Ini instruksi pembayaran *Assistant Keuangan AI* kamu:

🏦 Bank: ${b.label}
💳 No. Rek: ${b.rek}
👤 A/N: ${b.an}
💰 Transfer TEPAT: ${formattedPriceStr}

⚠️ Nominal harus TEPAT agar terverifikasi otomatis.

Setelah transfer, upload bukti di:
👉 ${CHECKOUT_URL}

Butuh bantuan? Balas pesan ini ya!
Tim Assistant Keuangan AI`;

  setTimeout(() => {
    window.open(
      `https://wa.me/${formatWaNumber(orderData.wa)}?text=${encodeURIComponent(waMsg)}`,
      '_blank'
    );
  }, 800);

  showStep(1);
});

// ── File Upload ──────────────────────────────────────────────────
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev =>
  dropArea.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); })
);
['dragenter', 'dragover'].forEach(ev =>
  dropArea.addEventListener(ev, () => dropArea.classList.add('dragover'))
);
['dragleave', 'drop'].forEach(ev =>
  dropArea.addEventListener(ev, () => dropArea.classList.remove('dragover'))
);
dropArea.addEventListener('drop', e => handleFiles(e.dataTransfer!.files));
fileInput.addEventListener('change', function () { handleFiles(this.files!); });

function handleFiles(files: FileList) {
  if (!files.length) return;
  const file = files[0];
  if (file.size > 5 * 1024 * 1024) { alert('Ukuran file maksimal 5MB'); return; }
  if (!file.type.match('image.*'))  { alert('Hanya format gambar yang diperbolehkan'); return; }

  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onloadend = () => {
    uploadedImageBase64     = reader.result as string;
    previewImage.src        = uploadedImageBase64;
    fileNameEl.textContent  = file.name;
    const mb = file.size / (1024 * 1024);
    fileSizeEl.textContent  = mb >= 1 ? mb.toFixed(2) + ' MB' : (file.size / 1024).toFixed(0) + ' KB';

    uploadPrompt.classList.add('hidden');
    uploadPreview.classList.remove('hidden');
    uploadPreview.classList.add('flex');
    fileInput.classList.add('hidden');

    btnConfirm.disabled  = false;
    btnConfirm.className = 'w-full bg-emerald hover:bg-green-500 text-white font-heading font-bold text-lg py-4 rounded-full transition flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(16,185,129,0.3)] mt-4';
  };
}

function resetUpload() {
  fileInput.value        = '';
  previewImage.src       = '';
  uploadedImageBase64    = null;
  uploadPrompt.classList.remove('hidden');
  uploadPreview.classList.add('hidden');
  uploadPreview.classList.remove('flex');
  fileInput.classList.remove('hidden');
  btnConfirm.disabled  = true;
  btnConfirm.className = 'w-full bg-gray-500 text-gray-300 font-heading font-bold text-lg py-4 rounded-full transition flex items-center justify-center gap-2 cursor-not-allowed mt-4';
}

removeBtn.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); resetUpload(); });

// ── STEP 2: Konfirmasi Pembayaran ────────────────────────────────
// Akun Firebase baru dibuat setelah bukti diverifikasi
btnConfirm.addEventListener('click', async () => {
  btnConfirm.disabled = true;
  btnConfirmTxt.classList.add('hidden');
  btnSpinner.classList.remove('hidden');
  verifyMsg.classList.remove('hidden');

  try {
    const res = await fetch('/api/verify-receipt', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64:   uploadedImageBase64,
        expectedPrice: uniquePrice.toLocaleString('id-ID'),
        expectedBank:  orderData.bank.toUpperCase()
      })
    });

    if (!res.ok) throw new Error('Terjadi kesalahan sistem. Silakan coba lagi atau konfirmasi manual via WA.');

    const result = await res.json();

    if (!result.isValid) {
      alert(
        '⚠️ Verifikasi Gagal:\n' + result.reason +
        '\n\nPastikan bukti transfer jelas dan nominal sesuai ' + formattedPriceStr
      );
      btnConfirm.disabled = false;
      btnConfirmTxt.classList.remove('hidden');
      btnSpinner.classList.add('hidden');
      verifyMsg.classList.add('hidden');
      return;
    }

    // Verifikasi lolos → buat akun
    await finalizePayment();

  } catch (err: any) {
    let msg = err.message || String(err);
    try { const p = JSON.parse(msg); if (p.error) msg = p.error; } catch (_) {}
    alert(msg);
    btnConfirm.disabled = false;
    btnConfirmTxt.classList.remove('hidden');
    btnSpinner.classList.add('hidden');
    verifyMsg.classList.add('hidden');
  }
});

// ── Konfirmasi Manual via WA ─────────────────────────────────────
// Akun BELUM dibuat — admin aktifkan manual setelah terima WA
btnManualWa.addEventListener('click', () => {
  const catatan = (document.getElementById('catatan') as HTMLTextAreaElement).value;
  const tanggal = new Date().toLocaleString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long',
    day:     'numeric', hour: '2-digit', minute: '2-digit'
  });
  const msg =
`🔔 *KONFIRMASI MANUAL PEMBAYARAN*

👤 Nama: ${orderData.name}
📧 Email: ${orderData.email}
📱 WhatsApp: ${orderData.wa}
🏦 Bank: ${orderData.bank.toUpperCase()}
💰 Jumlah: ${formattedPriceStr}
📝 Catatan: ${catatan || '-'}
🕐 Waktu: ${tanggal}

Tolong segera diaktifkan ya Min! 🙏`;

  window.open(`https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(msg)}`, '_blank');
  showStep(3);
});

// ── finalizePayment ──────────────────────────────────────────────
// Buat akun Firebase Auth + Firestore HANYA setelah verifikasi lolos
async function finalizePayment() {
  // 1. Buat Firebase Auth user
  const { user } = await createUserWithEmailAndPassword(auth, orderData.email, orderData.password);
  orderData.uid = user.uid;

  // 2. Hitung masa berlaku 1 tahun
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  // 3. Simpan profil ke Firestore — langsung isVerified: true
  await setDoc(doc(db, 'users', user.uid), {
    name:       orderData.name,
    email:      orderData.email,
    whatsapp:   orderData.wa,
    role:       'user',
    isVerified: true,
    expiresAt,
    createdAt:  serverTimestamp()
  });

  // 4. Update halaman sukses
  document.getElementById('success-name')!.textContent  = orderData.name;
  document.getElementById('success-email')!.textContent = orderData.email;

  // 5. Kirim data ke Google Sheets
  fetch(
    'https://script.google.com/macros/s/AKfycbxD29eqPOOhXWBlsDQ5CXI1rMVYPUBpskr8T0Ak6B7MrXptHuuQpD5VLlR1ov_z4zzhTw/exec',
    {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama:      orderData.name,
        email:     orderData.email,
        whatsapp:  orderData.wa,
        bank:      orderData.bank.toUpperCase(),
        timestamp: new Date().toISOString()
      })
    }
  ).catch(err => console.error('Google Sheets error:', err));

  // 6. Tampilkan halaman sukses
  showStep(3);
}